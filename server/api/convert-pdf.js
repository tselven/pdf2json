import PDFParser from "pdf2json";
import fs from "fs";
import path from "path";

// Create temporary directory for PDF processing if it doesn't exist
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

export default defineEventHandler(async (event) => {
  try {
    // Parse multipart form data
    const formData = await readMultipartFormData(event);
    if (!formData || formData.length === 0) {
      return createError({
        statusCode: 400,
        statusMessage: 'No file uploaded'
      });
    }

    // Find the PDF file in the form data
    const pdfFile = formData.find(part => part.name === 'pdfFile');
    if (!pdfFile || !pdfFile.filename || !pdfFile.data) {
      return createError({
        statusCode: 400,
        statusMessage: 'Invalid PDF file'
      });
    }

    // Find options in the form data
    const optionsData = formData.find(part => part.name === 'options');
    let options = {
      includeMetadata: true,
      extractTables: true,
      outputFormat: 'structured'
    };

    if (optionsData && optionsData.data) {
      try {
        const optionsStr = optionsData.data.toString('utf-8');
        const parsedOptions = JSON.parse(optionsStr);
        options = { ...options, ...parsedOptions };
      } catch (error) {
        console.error('Error parsing options:', error);
      }
    }

    // Create a unique filename for this upload
    const uniqueFileName = `pdf_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, uniqueFileName);

    // Write the uploaded PDF to a temporary file
    fs.writeFileSync(filePath, pdfFile.data);

    // Parse the PDF using pdf2json
    const result = await parsePDF(filePath, options);

    // Remove the temporary file
    fs.unlinkSync(filePath);

    // Return the parsed data
    return result;
  } catch (error) {
    console.error('Error processing PDF:', error);
    return createError({
      statusCode: 500,
      statusMessage: error.message || 'Error processing PDF'
    });
  }
});

/**
 * Parse a PDF file into JSON using pdf2json
 * @param {string} filePath - Path to the PDF file
 * @param {object} options - Conversion options
 * @returns {Promise<object>} Parsed PDF data
 */
function parsePDF(filePath, options) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", errData => {
      reject(new Error(errData.parserError || 'PDF parsing error'));
    });

    pdfParser.on("pdfParser_dataReady", pdfData => {
      try {
        // Create structured result based on options
        const result = processParserResult(pdfData, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    pdfParser.loadPDF(filePath);
  });
}

/**
 * Process the raw pdf2json parser result into more structured data
 * @param {object} pdfData - Raw data from pdf2json
 * @param {object} options - Processing options
 * @returns {object} Structured JSON data
 */
function processParserResult(pdfData, options) {
  // Handle different output formats
  if (options.outputFormat === 'raw') {
    return pdfData;
  }

  // Create structured output
  const result = {
    documentInfo: {},
    pages: []
  };

  // Include metadata if requested
  if (options.includeMetadata && pdfData.Meta) {
    result.documentInfo = {
      title: decodeURIComponent(pdfData.Meta.Title || ''),
      author: decodeURIComponent(pdfData.Meta.Author || ''),
      subject: decodeURIComponent(pdfData.Meta.Subject || ''),
      creator: decodeURIComponent(pdfData.Meta.Creator || ''),
      producer: decodeURIComponent(pdfData.Meta.Producer || ''),
      creationDate: pdfData.Meta.CreationDate || '',
      pageCount: pdfData.Pages ? pdfData.Pages.length : 0
    };
  }

  // Process pages
  if (pdfData.Pages && pdfData.Pages.length > 0) {
    result.pages = pdfData.Pages.map((page, pageIndex) => {
      const processedPage = {
        pageNumber: pageIndex + 1,
        width: page.Width || 0,
        height: page.Height || 0,
        content: []
      };

      // Process text elements
      if (page.Texts && page.Texts.length > 0) {
        page.Texts.forEach(textElem => {
          if (textElem.R && textElem.R.length > 0) {
            const text = textElem.R.map(r => decodeURIComponent(r.T || '')).join(' ');
            
            if (text.trim()) {
              processedPage.content.push({
                type: 'text',
                text: text,
                position: {
                  x: textElem.x,
                  y: textElem.y,
                  width: textElem.w,
                  height: textElem.h
                },
                fontSize: textElem.R && textElem.R[0] ? textElem.R[0].TS[0] : 0,
                fontFamily: textElem.R && textElem.R[0] ? textElem.R[0].TS[1] : 0
              });
            }
          }
        });
      }

      // Process fills (colored areas)
      if (page.Fills && page.Fills.length > 0) {
        const fills = page.Fills.map(fill => ({
          type: 'fill',
          position: {
            x: fill.x,
            y: fill.y,
            width: fill.w,
            height: fill.h
          },
          color: fill.clr
        }));
        
        processedPage.fills = fills;
      }

      // Add table detection if requested (simplified approach)
      if (options.extractTables) {
        // A very simplified approach to detect tables - looking for text in grid-like positions
        // In a real app, you'd want more sophisticated table detection algorithms
        const potentialTableAreas = detectPotentialTableAreas(processedPage.content);
        if (potentialTableAreas.length > 0) {
          processedPage.tables = potentialTableAreas;
        }
      }

      return processedPage;
    });
  }

  return result;
}

/**
 * Very simplified table detection by looking for content in grid-like positions
 * Note: This is just a basic implementation. Real table detection is much more complex.
 * @param {Array} contentItems - Content items on a page
 * @returns {Array} Potential table areas
 */
function detectPotentialTableAreas(contentItems) {
  // This is a very simplified approach just for demonstration
  // Real table detection would analyze text positions, look for lines, etc.
  
  // Group text items by their y-position (within a small threshold)
  const rowGroups = {};
  const yThreshold = 1; // Threshold for considering text items on the same row
  
  contentItems.forEach(item => {
    const y = Math.round(item.position.y / yThreshold) * yThreshold;
    if (!rowGroups[y]) {
      rowGroups[y] = [];
    }
    rowGroups[y].push(item);
  });
  
  // Sort rows by y-position
  const sortedYPositions = Object.keys(rowGroups)
    .map(y => parseFloat(y))
    .sort((a, b) => a - b);
  
  // Only consider as potential table if we have at least 2 rows
  if (sortedYPositions.length < 2) {
    return [];
  }
  
  // Find grid-like patterns (at least 3 rows with similar number of cells)
  const tables = [];
  let currentTable = null;
  
  for (let i = 0; i < sortedYPositions.length; i++) {
    const y = sortedYPositions[i];
    const row = rowGroups[y];
    
    // Sort cells in the row by x-position
    row.sort((a, b) => a.position.x - b.position.x);
    
    if (!currentTable) {
      // Start a new potential table
      currentTable = {
        rows: [row],
        position: {
          x: Math.min(...row.map(cell => cell.position.x)),
          y: row[0].position.y,
          // These will be updated as we add more rows
          width: 0,
          height: 0
        }
      };
    } else {
      // Check if this row could be part of the current table
      // (very simple heuristic: similar number of cells)
      const prevRowCellCount = currentTable.rows[currentTable.rows.length - 1].length;
      
      if (Math.abs(row.length - prevRowCellCount) <= 1) {
        // Consider it part of the same table
        currentTable.rows.push(row);
      } else {
        // Finish current table if it has at least 2 rows
        if (currentTable.rows.length >= 2) {
          finalizeTable(currentTable);
          tables.push(currentTable);
        }
        
        // Start a new table
        currentTable = {
          rows: [row],
          position: {
            x: Math.min(...row.map(cell => cell.position.x)),
            y: row[0].position.y,
            width: 0,
            height: 0
          }
        };
      }
    }
    
    // If we're at the last row, check if we have a table to finalize
    if (i === sortedYPositions.length - 1 && currentTable && currentTable.rows.length >= 2) {
      finalizeTable(currentTable);
      tables.push(currentTable);
    }
  }
  
  return tables;
}

/**
 * Finalize table data structure by calculating dimensions and extracting cell text
 * @param {object} table - Table data structure to finalize
 */
function finalizeTable(table) {
  // Extract just the text from cells for the final representation
  table.data = table.rows.map(row => row.map(cell => cell.text));
  
  // Calculate table dimensions
  const minX = Math.min(...table.rows.flat().map(cell => cell.position.x));
  const maxX = Math.max(...table.rows.flat().map(cell => cell.position.x + cell.position.width));
  const minY = Math.min(...table.rows.flat().map(cell => cell.position.y));
  const maxY = Math.max(...table.rows.flat().map(cell => cell.position.y + cell.position.height));
  
  table.position = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
  
  // Remove the original rows with full cell objects to simplify the output
  delete table.rows;
}