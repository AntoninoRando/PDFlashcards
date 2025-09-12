<script setup lang="ts">
import { ref, reactive, computed, onBeforeUnmount } from 'vue'


//#region EMITS ----------------------------------------------------------------
const emit = defineEmits<{
  uploaded: [{
    file: File;
    url: string
  }]
}>()
//#endregion -------------------------------------------------------------------



//#region COMPUTED DATA --------------------------------------------------------
const uploadedCount = computed(() => files.size);
//#endregion -------------------------------------------------------------------



const files = reactive(new Map<File, string>());
const isDragging = ref(false)
const errorMessage = ref<string | null>(null)
const dragCounter = ref(0)

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const list = target.files
  if (list && list.length) {
    for (const file of Array.from(list)) {
      validateAndProcessFile(file)
    }
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

  const list = event.dataTransfer?.files
  if (list && list.length) {
    for (const file of Array.from(list)) {
      validateAndProcessFile(file)
    }
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
    const filesMap = files as Map<File, string>;
    if (filesMap.has(file)) {
      console.log('[PDFUploader] File already uploaded!');
      return;
    }

    const url = URL.createObjectURL(file)
    filesMap.set(file, url);

    emit('uploaded', {
      file,
      url: url
    })

    console.log(`[PDFUploader] Uploaded: ${file.name} (${formatFileSize(file.size)})`)
  } catch (error) {
    console.error('[PDFUploader] Error processing file:', error)
    errorMessage.value = 'Error processing the file. Please try again.'
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
  const filesMap = files as Map<File, string>;
  for (const url of filesMap.values()) {
    URL.revokeObjectURL(url)
  }
})
</script>



<template>
  <div class="pdf-uploader">
    <h2 class="text-xl font-bold mb-4">PDF Uploader</h2>

    <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6"
      :class="{ 'border-blue-500 bg-blue-50': isDragging }" @dragover.prevent="handleDragOver"
      @dragenter.prevent="handleDragEnter" @dragleave.prevent="handleDragLeave" @drop.prevent="handleFileDrop">
      <div class="text-center">

        <label for="pdf-upload" class="upload-btn">Select PDF ({{ uploadedCount }})</label>
        <input id="pdf-upload" type="file" class="hidden" accept="application/pdf" multiple @change="handleFileChange" />

      </div>
    </div>

    <!-- Error message display -->
    <div v-if="errorMessage" class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>
  </div>
</template>



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
