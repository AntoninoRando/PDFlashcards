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
    <div class="dropzone" :class="{ dragging: isDragging }" @dragover.prevent="handleDragOver"
      @dragenter.prevent="handleDragEnter" @dragleave.prevent="handleDragLeave" @drop.prevent="handleFileDrop">
      <label for="pdf-upload" class="upload-btn" title="Add PDFs (or drop them here)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14 3H6v18h12V7zM14 3v4h4M12 11v6M9 14h6" />
        </svg>
        <span>Add PDF</span>
        <span class="count">{{ uploadedCount }}</span>
      </label>
      <input id="pdf-upload" type="file" class="hidden-input" accept="application/pdf" multiple
        @change="handleFileChange" />
    </div>

    <!-- Error message display -->
    <div v-if="errorMessage" class="upload-error" role="alert">
      {{ errorMessage }}
    </div>
  </div>
</template>



<style scoped>
.pdf-uploader {
  position: relative;
}

.dropzone {
  border-radius: var(--radius-md);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.dropzone.dragging {
  transform: scale(1.06);
  box-shadow: 0 0 0 2px var(--pink), var(--glow-pink);
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.88rem;
  color: #fff;
  background: linear-gradient(var(--bg-2), var(--bg-2)) padding-box, var(--grad-nitro) border-box;
  border: 1px solid transparent;
  padding: 0.5rem 0.6rem 0.5rem 0.9rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  white-space: nowrap;
  transition: box-shadow 0.2s ease, background 0.2s ease;
}

.upload-btn:hover {
  background: linear-gradient(var(--bg-3), var(--bg-3)) padding-box, var(--grad-nitro) border-box;
  box-shadow: 0 0 20px rgba(255, 115, 250, 0.35);
}

.count {
  min-width: 1.4rem;
  padding: 0 0.4rem;
  font-size: 0.75rem;
  line-height: 1.4rem;
  text-align: center;
  border-radius: var(--radius-pill);
  background: var(--grad-nitro);
  font-variant-numeric: tabular-nums;
}

.hidden-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.upload-error {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: max-content;
  max-width: 16rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.82rem;
  color: #ffd1da;
  background: rgba(255, 92, 124, 0.15);
  border: 1px solid rgba(255, 92, 124, 0.45);
  border-radius: var(--radius-sm);
  backdrop-filter: blur(10px);
}
</style>
