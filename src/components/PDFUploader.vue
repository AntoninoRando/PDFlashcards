<template>
    <div class="pdf-uploader">
        <h2 class="text-xl font-bold mb-4">PDF Uploader</h2>

        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6"
            :class="{ 'border-blue-500 bg-blue-50': isDragging }" 
            @dragover.prevent="handleDragOver"
            @dragenter.prevent="handleDragEnter"
            @dragleave.prevent="handleDragLeave" 
            @drop.prevent="handleFileDrop">
            <div class="text-center">
                <div v-if="!selectedFile" class="space-y-2">
                    <label for="pdf-upload" class="upload-btn">Select PDF</label>
                    <input id="pdf-upload" type="file" class="hidden" accept="application/pdf" @change="handleFileChange" />
                    <p class="text-sm text-gray-600">or drag and drop</p>
                </div>
                <div v-else class="text-left">
                    <div class="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                        <div class="flex space-x-2">
                            <button @click="downloadPdf" 
                                class="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors">
                                Download
                            </button>
                            <button @click="removeFile" 
                                class="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Error message display -->
        <div v-if="errorMessage" class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {{ errorMessage }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

const emit = defineEmits<{
  'file-selected': [{ file: File; url: string }]
  'file-removed': []
}>()

const selectedFile = ref<File | null>(null)
const pdfUrl = ref<string | null>(null)
const isDragging = ref(false)
const errorMessage = ref<string | null>(null)
const dragCounter = ref(0)

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    validateAndProcessFile(file)
  }
  target.value = ''
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
}

function handleDragEnter(event: DragEvent) {
  event.preventDefault()
  dragCounter.value++
  isDragging.value = true
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragging.value = false
  }
}

function handleFileDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
  dragCounter.value = 0

  const file = event.dataTransfer?.files?.[0]
  if (file) {
    validateAndProcessFile(file)
  }
}

function validateAndProcessFile(file: File) {
  errorMessage.value = null

  if (file.type !== 'application/pdf') {
    errorMessage.value = 'Please upload a PDF file only.'
    return
  }

  const maxSize = 10 * 1024 * 1024
  // Size validation commented out in original

  if (!file.name || file.name.trim() === '') {
    errorMessage.value = 'Invalid file name.'
    return
  }

  processFile(file)
}

function processFile(file: File) {
  try {
    if (pdfUrl.value) {
      URL.revokeObjectURL(pdfUrl.value)
    }

    selectedFile.value = file
    pdfUrl.value = URL.createObjectURL(file)

    emit('file-selected', {
      file,
      url: pdfUrl.value
    })

    console.log(`PDF uploaded: ${file.name} (${formatFileSize(file.size)})`)
  } catch (error) {
    console.error('Error processing file:', error)
    errorMessage.value = 'Error processing the file. Please try again.'
  }
}

function removeFile() {
  try {
    if (pdfUrl.value) {
      URL.revokeObjectURL(pdfUrl.value)
    }

    selectedFile.value = null
    pdfUrl.value = null
    errorMessage.value = null

    emit('file-removed')

    console.log('PDF file removed')
  } catch (error) {
    console.error('Error removing file:', error)
  }
}

function downloadPdf() {
  if (!pdfUrl.value || !selectedFile.value) {
    errorMessage.value = 'No file available for download.'
    return
  }

  try {
    const link = document.createElement('a')
    link.href = pdfUrl.value
    link.download = selectedFile.value.name
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log(`Downloaded: ${selectedFile.value.name}`)
  } catch (error) {
    console.error('Error downloading file:', error)
    errorMessage.value = 'Error downloading the file. Please try again.'
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onBeforeUnmount(() => {
  if (pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
  }
})
</script>

<style scoped>
.pdf-uploader {
    max-width: 100%;
}

.border-dashed {
    transition: all 0.2s ease-in-out;
}

.border-dashed:hover {
    border-color: #93c5fd;
    background-color: #eff6ff;
}

.upload-btn {
    display: inline-block;
    background-color: #4f46e5;
    color: white;
    padding: 0.5rem 1.25rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.upload-btn:hover {
    background-color: #4338ca;
}

/* Remove unused styles that don't belong to uploader */
</style>