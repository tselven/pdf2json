<template>
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-md-10">
        <div class="card shadow-sm">
          <div class="card-header bg-primary text-white">
            <h3 class="mb-0"><i class="bi bi-file-earmark-pdf-fill me-2"></i>PDF to JSON Converter</h3>
          </div>
          <div class="card-body">
            <div v-if="isLoading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="mt-3">Converting your PDF to JSON, please wait...</p>
            </div>
            
            <div v-else>
              <div class="mb-4">
                <div class="upload-area p-4 text-center border border-dashed rounded" 
                     :class="{ 'border-primary bg-light': isDragging }"
                     @dragover.prevent="isDragging = true"
                     @dragleave.prevent="isDragging = false"
                     @drop.prevent="handleFileDrop($event)">
                  <i class="bi bi-cloud-arrow-up display-4 text-primary"></i>
                  <h4 class="mt-3">Drag & Drop your PDF file here</h4>
                  <p class="text-muted">or</p>
                  <label class="btn btn-primary">
                    <input type="file" class="d-none" accept=".pdf" @change="handleFileInput">
                    <i class="bi bi-upload me-2"></i>Browse Files
                  </label>
                </div>
                <div v-if="selectedFile" class="mt-3 d-flex align-items-center">
                  <i class="bi bi-file-earmark-pdf text-danger me-2"></i>
                  <span>{{ selectedFile.name }}</span>
                  <button class="btn btn-sm btn-link text-danger ms-auto" @click="removeFile">
                    <i class="bi bi-x-circle"></i>
                  </button>
                </div>
              </div>
              
              <div v-if="selectedFile" class="d-grid">
                <button class="btn btn-lg btn-success" @click="convertPDF" :disabled="isConverting">
                  <i class="bi bi-arrow-right-circle me-2"></i>
                  {{ isConverting ? 'Converting...' : 'Convert to JSON' }}
                </button>
              </div>
              
              <div v-if="error" class="alert alert-danger mt-4">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                {{ error }}
              </div>
              
              <div v-if="jsonResult" class="mt-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h4 class="mb-0"><i class="bi bi-braces me-2"></i>JSON Result</h4>
                  <div>
                    <button class="btn btn-sm btn-outline-primary me-2" @click="copyJSON">
                      <i class="bi bi-clipboard me-1"></i>Copy
                    </button>
                    <button class="btn btn-sm btn-outline-success" @click="downloadJSON">
                      <i class="bi bi-download me-1"></i>Download
                    </button>
                  </div>
                </div>
                
                <div class="json-preview p-3 bg-light rounded border">
                  <pre class="mb-0"><code>{{ formatJSON(jsonResult) }}</code></pre>
                </div>
                
                <div class="mt-4">
                  <h4 class="mb-3"><i class="bi bi-book me-2"></i>Book Preview</h4>
                  <div class="book-preview border rounded">
                    <div class="book-header bg-light p-3 border-bottom">
                      <h3>{{ jsonResult.book.name }}</h3>
                    </div>
                    
                    <!-- Book Pages -->
                    <div v-if="jsonResult.book.pages && jsonResult.book.pages.length" class="p-3">
                      <h5 class="mb-3">Book Pages</h5>
                      <div class="list-group">
                        <div v-for="page in jsonResult.book.pages" :key="page.id" class="list-group-item">
                          <h6>{{ page.name }}</h6>
                          <div v-html="page.html"></div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Chapters -->
                    <div v-if="jsonResult.book.chapters && jsonResult.book.chapters.length">
                      <div v-for="chapter in jsonResult.book.chapters" :key="chapter.id" class="p-3 border-top">
                        <h5 class="mb-3">Chapter: {{ chapter.name }}</h5>
                        <div class="list-group">
                          <div v-for="page in chapter.pages" :key="page.id" class="list-group-item">
                            <h6>{{ page.name }}</h6>
                            <div v-html="page.html"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      selectedFile: null,
      isDragging: false,
      isConverting: false,
      isLoading: false,
      jsonResult: null,
      error: null
    }
  },
  head() {
    return {
      link: [
        { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css' },
        { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css' }
      ]
    }
  },
  methods: {
    handleFileInput(event) {
      const file = event.target.files[0]
      if (file && file.type === 'application/pdf') {
        this.selectedFile = file
        this.error = null
      } else {
        this.error = 'Please select a valid PDF file.'
      }
    },
    handleFileDrop(event) {
      this.isDragging = false
      const file = event.dataTransfer.files[0]
      if (file && file.type === 'application/pdf') {
        this.selectedFile = file
        this.error = null
      } else {
        this.error = 'Please drop a valid PDF file.'
      }
    },
    removeFile() {
      this.selectedFile = null
      this.jsonResult = null
    },
    async convertPDF() {
      if (!this.selectedFile) return
      
      this.isConverting = true
      this.error = null
      
      try {
        const formData = new FormData()
        formData.append('pdf', this.selectedFile)
        
        const response = await fetch('/api/convert-pdf', {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to convert PDF')
        }
        
        this.jsonResult = await response.json()
      } catch (err) {
        this.error = err.message || 'An error occurred during conversion'
      } finally {
        this.isConverting = false
      }
    },
    formatJSON(json) {
      return JSON.stringify(json, null, 2)
    },
    copyJSON() {
      navigator.clipboard.writeText(JSON.stringify(this.jsonResult, null, 2))
        .then(() => {
          alert('JSON copied to clipboard!')
        })
        .catch(err => {
          console.error('Failed to copy:', err)
        })
    },
    downloadJSON() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.jsonResult, null, 2))
      const downloadAnchorNode = document.createElement('a')
      downloadAnchorNode.setAttribute("href", dataStr)
      downloadAnchorNode.setAttribute("download", "converted_pdf.json")
      document.body.appendChild(downloadAnchorNode)
      downloadAnchorNode.click()
      downloadAnchorNode.remove()
    }
  }
}
</script>

<style scoped>
.border-dashed {
  border-style: dashed !important;
}
.json-preview {
  max-height: 300px;
  overflow-y: auto;
}
.upload-area {
  transition: all 0.3s ease;
  cursor: pointer;
}
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>