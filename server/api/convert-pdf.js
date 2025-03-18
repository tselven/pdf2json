import fs from 'fs'
import { promisify } from 'util'
import os from 'os'
import formidable from 'formidable'
import PDFParser from 'pdf2json'

// Make fs.unlink into promises
const unlink = promisify(fs.unlink)

// Helper to extract text from PDF parser objects
function extractText(textArray) {
  if (!textArray) return ''
  return textArray.map(item => decodeURIComponent(item.R?.[0]?.T || '')).join(' ')
}

// Helper to parse PDF structure into our required format
function parsePDFStructure(pdfData) {
  // Create default book structure
  const book = {
    id: 1,
    name: 'Extracted PDF Document',
    chapters: [],
    pages: []
  }

  let currentChapter = null
  let pageCounter = 1
  let chapterCounter = 1

  // Process each page in the PDF
  pdfData.Pages.forEach((page, pageIndex) => {
    // Extract texts from the page
    const texts = page.Texts || []
    if (texts.length === 0) return

    // Get the first text element which is usually a heading
    const firstText = extractText([texts[0]])
    
    // Create HTML content from page text
    let htmlContent = '<div>'
    
    // Process text elements and group them into coherent paragraphs
    let currentHeading = ''
    let paragraphBuffer = ''
    let inParagraph = false
    
    texts.forEach((text, index) => {
      const textContent = extractText([text])
      
      // Simple heuristic: if text is short and at the beginning, treat as heading
      if (index === 0 || (index < 3 && textContent.length < 50 && textContent.trim() && !paragraphBuffer)) {
        // If we were building a paragraph, close it before starting a heading
        if (inParagraph && paragraphBuffer) {
          htmlContent += `<p>${paragraphBuffer.trim()}</p>`
          paragraphBuffer = ''
          inParagraph = false
        }
        
        currentHeading = textContent
        htmlContent += `<h2>${textContent}</h2>`
      } else {
        // This is paragraph content
        inParagraph = true
        
        // Check if this text seems to end a paragraph
        const endsWithPunctuation = /[.!?:;]\s*$/.test(textContent)
        
        paragraphBuffer += (paragraphBuffer ? ' ' : '') + textContent
        
        // If this text ends with punctuation or it's the last text element,
        // we consider it the end of a paragraph
        if (endsWithPunctuation || index === texts.length - 1) {
          htmlContent += `<p>${paragraphBuffer.trim()}</p>`
          paragraphBuffer = ''
          inParagraph = false
        }
      }
    })
    
    // If we have any remaining paragraph content, add it
    if (paragraphBuffer) {
      htmlContent += `<p>${paragraphBuffer.trim()}</p>`
    }
    
    htmlContent += '</div>'
    
    // Determine if this page should be a chapter start
    // Heuristic: first page or page with very few text elements that starts with Chapter/Section
    const isChapterStart = pageIndex === 0 || 
      (texts.length < 5 && 
       (firstText.toLowerCase().includes('chapter') || 
        firstText.toLowerCase().includes('section')))
    
    if (isChapterStart) {
      // Create a new chapter
      currentChapter = {
        id: chapterCounter++,
        name: firstText || `Chapter ${chapterCounter-1}`,
        pages: []
      }
      book.chapters.push(currentChapter)
    }
    
    // Create page object
    const pageObj = {
      id: pageCounter++,
      name: currentHeading || `Page ${pageCounter-1}`,
      html: htmlContent
    }
    
    // Add page to current chapter if exists, otherwise to book pages
    if (currentChapter) {
      currentChapter.pages.push(pageObj)
    } else {
      book.pages.push(pageObj)
    }
  })

  return { book }
}

export default defineEventHandler(async (event) => {
  try {
    // Set up formidable options
    const form = formidable({
      multiples: true,
      keepExtensions: true,
      uploadDir: os.tmpdir(),
      maxFileSize: 50 * 1024 * 1024 // 50MB limit
    })
    
    // Parse the form with the uploaded PDF
    const { files } = await new Promise((resolve, reject) => {
      form.parse(event.node.req, (err, fields, files) => {
        if (err) reject(err)
        resolve({ fields, files })
      })
    })
    
    // Get the uploaded PDF file
    const pdfFile = files.pdf?.[0] || files.pdf // Handle both array and single file formats
    
    if (!pdfFile || !pdfFile.filepath) {
      return createError({
        statusCode: 400,
        message: 'No PDF file uploaded'
      })
    }
    
    // Create a new PDFParser instance
    const pdfParser = new PDFParser()
    
    // Process the PDF file
    const pdfData = await new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', (errData) => {
        reject(new Error(errData.parserError || 'PDF parsing error'))
      })
      
      pdfParser.on('pdfParser_dataReady', (data) => {
        resolve(data)
      })
      
      // Fix: Pass the file path correctly
      pdfParser.loadPDF(pdfFile.filepath)
    })
    
    // Parse the PDF data into our required structure
    const result = parsePDFStructure(pdfData)
    
    // Clean up the temporary file
    await unlink(pdfFile.filepath).catch(() => {})
    
    // Return the structured JSON data
    return result
    
  } catch (error) {
    console.error('Error processing PDF:', error)
    
    return createError({
      statusCode: 500,
      message: `Error processing PDF: ${error.message || 'Unknown error'}`
    })
  }
})