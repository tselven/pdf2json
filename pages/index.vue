<template>
    <div>
      <!-- Colorful header banner -->
      <div class="py-5 bg-gradient-primary text-white mb-5">
        <div class="container">
          <div class="row justify-content-center">
            <div class="col-md-10 text-center">
              <h1 class="display-4 fw-bold">PDF to JSON Converter</h1>
              <p class="lead">Transform your PDF documents into structured JSON data</p>
            </div>
          </div>
        </div>
      </div>
  
      <div class="container pb-5">
        <div class="row justify-content-center">
          <div class="col-md-10">
            <!-- Main conversion card -->
            <div class="card shadow-lg border-0 mb-5 bg-light">
              <div class="card-header bg-primary text-white py-3">
                <h2 class="h4 mb-0"><i class="bi bi-file-earmark-arrow-down me-2"></i>Upload & Convert</h2>
              </div>
              <div class="card-body p-4">
                <div class="mb-4">
                  <div 
                    class="border border-3 border-dashed rounded-3 p-5 text-center position-relative"
                    :class="{'bg-light border-primary': isDragging, 'upload-zone': !isDragging}"
                    @dragover.prevent="isDragging = true"
                    @dragleave.prevent="isDragging = false"
                    @drop.prevent="handleFileDrop"
                  >
                    <div v-if="!selectedFile">
                      <i class="bi bi-cloud-arrow-up display-1 text-primary mb-3"></i>
                      <h3 class="h5 text-primary">Drop Your PDF File Here</h3>
                      <p class="text-muted mb-4">or use the button below to browse files</p>
                      <input
                        type="file"
                        ref="fileInput"
                        accept="application/pdf"
                        class="d-none"
                        @change="handleFileSelect"
                      />
                      <button
                        type="button"
                        @click="$refs.fileInput.click()"
                        class="btn btn-primary btn-lg px-4 fw-bold"
                      >
                        <i class="bi bi-folder me-2"></i>Select PDF File
                      </button>
                    </div>
                    <div v-else class="text-start">
                      <div class="alert alert-success d-flex align-items-center p-3">
                        <i class="bi bi-file-earmark-pdf fs-3 text-danger me-3"></i>
                        <div class="flex-grow-1">
                          <h4 class="h5 mb-1">{{ selectedFile.name }}</h4>
                          <p class="mb-0 text-muted small">{{ formatFileSize(selectedFile.size) }}</p>
                        </div>
                        <button
                          @click="clearFile"
                          class="btn btn-outline-danger ms-auto"
                        >
                          <i class="bi bi-x-lg"></i>
                        </button>
                      </div>
                      <div class="mt-4">
                        <button
                          @click="convertFile"
                          class="btn btn-success btn-lg"
                          :disabled="isConverting"
                        >
                          <span v-if="isConverting">
                            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Converting...
                          </span>
                          <span v-else>
                            <i class="bi bi-lightning-charge me-2"></i>Convert to JSON
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
  
                <div v-if="conversionOptions" class="border rounded-3 p-4 bg-white mt-4">
                  <h3 class="h5 mb-3 text-primary"><i class="bi bi-sliders me-2"></i>Conversion Options</h3>
                  <div class="row">
                    <div class="col-md-6">
                      <div class="form-check form-switch mb-3">
                        <input class="form-check-input" type="checkbox" v-model="conversionOptions.includeMetadata" id="includeMetadata">
                        <label class="form-check-label" for="includeMetadata">Include document metadata</label>
                      </div>
                      <div class="form-check form-switch mb-3">
                        <input class="form-check-input" type="checkbox" v-model="conversionOptions.extractTables" id="extractTables">
                        <label class="form-check-label" for="extractTables">Extract tables</label>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="mb-3">
                        <label for="outputFormat" class="form-label">Output format</label>
                        <select class="form-select form-select-lg" id="outputFormat" v-model="conversionOptions.outputFormat">
                          <option value="structured">Structured JSON</option>
                          <option value="raw">Raw text with positions</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
  
            <!-- Result card -->
            <div v-if="conversionResult" class="card shadow-lg border-0 bg-light mb-5">
              <div class="card-header bg-success text-white py-3 d-flex justify-content-between align-items-center">
                <h3 class="h4 mb-0"><i class="bi bi-check-circle me-2"></i>Conversion Result</h3>
                <div>
                  <button class="btn btn-light me-2" @click="copyToClipboard">
                    <i class="bi bi-clipboard me-1"></i> Copy
                  </button>
                  <button class="btn btn-warning" @click="downloadJson">
                    <i class="bi bi-download me-1"></i> Download JSON
                  </button>
                </div>
              </div>
              <div class="card-body p-4">
                <pre class="bg-dark text-light p-4 rounded-3 overflow-auto" style="max-height: 400px;">{{ formattedResult }}</pre>
              </div>
            </div>
  
            <!-- Error alert -->
            <div v-if="conversionError" class="alert alert-danger d-flex align-items-center p-4 shadow">
              <i class="bi bi-exclamation-triangle-fill fs-3 me-3"></i>
              <div>
                <h4 class="alert-heading h5">Conversion Failed</h4>
                <p class="mb-0">{{ conversionError }}</p>
              </div>
            </div>
  
            <!-- How it works section -->
            <div class="card border-0 shadow-lg mb-5">
              <div class="card-header bg-info text-white py-3">
                <h3 class="h4 mb-0"><i class="bi bi-info-circle me-2"></i>How It Works</h3>
              </div>
              <div class="card-body p-4">
                <div class="row text-center">
                  <div class="col-md-4 mb-4 mb-md-0">
                    <div class="p-4 rounded-circle bg-primary bg-opacity-10 mx-auto mb-3" style="width: 100px; height: 100px; display: flex; align-items: center; justify-content: center;">
                      <i class="bi bi-upload fs-1 text-primary"></i>
                    </div>
                    <h4 class="h5 text-primary">Upload</h4>
                    <p class="text-muted">Upload any PDF document through our secure interface</p>
                  </div>
                  <div class="col-md-4 mb-4 mb-md-0">
                    <div class="p-4 rounded-circle bg-success bg-opacity-10 mx-auto mb-3" style="width: 100px; height: 100px; display: flex; align-items: center; justify-content: center;">
                      <i class="bi bi-gear fs-1 text-success"></i>
                    </div>
                    <h4 class="h5 text-success">Process</h4>
                    <p class="text-muted">Our advanced system extracts text and structure with precision</p>
                  </div>
                  <div class="col-md-4">
                    <div class="p-4 rounded-circle bg-info bg-opacity-10 mx-auto mb-3" style="width: 100px; height: 100px; display: flex; align-items: center; justify-content: center;">
                      <i class="bi bi-code-square fs-1 text-info"></i>
                    </div>
                    <h4 class="h5 text-info">Convert</h4>
                    <p class="text-muted">Download your structured JSON data ready for use</p>
                  </div>
                </div>
              </div>
            </div>
  
            <!-- Features section -->
            <div class="row g-4 mb-5">
              <div class="col-md-6">
                <div class="card h-100 border-0 shadow">
                  <div class="card-body p-4">
                    <div class="feature-icon bg-warning bg-opacity-10 p-3 rounded-3 mb-3 d-inline-block">
                      <i class="bi bi-shield-check text-warning fs-3"></i>
                    </div>
                    <h3 class="h5 text-warning">Secure Conversion</h3>
                    <p class="text-muted mb-0">Your documents are processed securely and never stored on our servers.</p>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="card h-100 border-0 shadow">
                  <div class="card-body p-4">
                    <div class="feature-icon bg-danger bg-opacity-10 p-3 rounded-3 mb-3 d-inline-block">
                      <i class="bi bi-lightning text-danger fs-3"></i>
                    </div>
                    <h3 class="h5 text-danger">Fast Processing</h3>
                    <p class="text-muted mb-0">Get your JSON data in seconds with our high-performance conversion engine.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  
      <!-- Colorful footer -->
      <footer class="bg-dark text-white py-4">
        <div class="container">
          <div class="row">
            <div class="col-md-10 mx-auto text-center">
              <p class="mb-0">PDF to JSON Converter - Extract structured data from PDF documents</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </template>
  
  <script>
  export default {
    name: 'PdfToJsonConverter',
    data() {
      return {
        isDragging: false,
        selectedFile: null,
        isConverting: false,
        conversionOptions: null,
        conversionResult: null,
        conversionError: null
      }
    },
    computed: {
      formattedResult() {
        return this.conversionResult ? JSON.stringify(this.conversionResult, null, 2) : ''
      }
    },
    methods: {
      handleFileSelect(event) {
        const file = event.target.files[0]
        if (file && file.type === 'application/pdf') {
          this.selectedFile = file
          this.initializeOptions()
          this.conversionResult = null
          this.conversionError = null
        }
      },
      handleFileDrop(event) {
        this.isDragging = false
        const file = event.dataTransfer.files[0]
        if (file && file.type === 'application/pdf') {
          this.selectedFile = file
          this.initializeOptions()
          this.conversionResult = null
          this.conversionError = null
        }
      },
      clearFile() {
        this.selectedFile = null
        this.conversionOptions = null
        this.conversionResult = null
        this.conversionError = null
        if (this.$refs.fileInput) {
          this.$refs.fileInput.value = ''
        }
      },
      initializeOptions() {
        this.conversionOptions = {
          includeMetadata: true,
          extractTables: true,
          outputFormat: 'structured'
        }
      },
      async convertFile() {
        if (!this.selectedFile) return
  
        this.isConverting = true
        this.conversionError = null
        
        try {
          // Create form data to send to the API
          const formData = new FormData()
          formData.append('pdfFile', this.selectedFile)
          formData.append('options', JSON.stringify(this.conversionOptions))
          
          // Make API request to our server endpoint
          const response = await fetch('/api/convert-pdf', {
            method: 'POST',
            body: formData
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Conversion failed')
          }
          
          const result = await response.json()
          this.conversionResult = result
          this.isConverting = false
        } catch (error) {
          console.error('Conversion error:', error)
          this.conversionError = error.message || 'An error occurred during conversion. Please try again.'
          this.isConverting = false
        }
      },
      copyToClipboard() {
        if (!this.formattedResult) return
        
        navigator.clipboard.writeText(this.formattedResult)
          .then(() => {
            alert('JSON copied to clipboard!')
          })
          .catch(err => {
            console.error('Failed to copy: ', err)
          })
      },
      downloadJson() {
        if (!this.conversionResult) return
        
        const dataStr = JSON.stringify(this.conversionResult, null, 2)
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
        
        const fileName = this.selectedFile.name.replace('.pdf', '') + '.json'
        
        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', fileName)
        linkElement.click()
      },
      formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
      }
    },
    head() {
      return {
        title: 'PDF to JSON Converter',
        link: [
          { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css' },
          { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css' }
        ],
        style: [
          { 
            type: 'text/css', 
            innerHTML: `
              .bg-gradient-primary {
                background: linear-gradient(135deg, #4a6cf7 0%, #2451e1 100%);
              }
              .upload-zone {
                background: linear-gradient(to bottom, #f8f9fa, #ffffff);
                transition: all 0.3s ease;
              }
              .upload-zone:hover {
                border-color: #0d6efd !important;
                box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
              }
            ` 
          }
        ]
      }
    }
  }
  </script>