<script setup lang="ts">
import { ref } from 'vue'
import { parseStudyset, IStudySet } from '@/FlashcardParser/FlashcardsParser'

const emit = defineEmits<{
  setUploaded: [studySet: IStudySet]
}>()

const fileContent = ref('')
const resources = ref<string[]>([])
const title = ref('')
const flashcards = ref<any[]>([])
const error = ref<string | null>(null)

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  error.value = null
  fileContent.value = ''
  flashcards.value = []
  resources.value = []
  title.value = ''

  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      fileContent.value = e.target?.result as string
      parseFileContent()
    } catch (err: any) {
      error.value = `Error reading file: ${err.message}`
    }
  }

  reader.onerror = () => {
    error.value = 'Failed to read the file'
  }

  reader.readAsText(file)
}

function parseFileContent() {
  if (!fileContent.value) {
    error.value = 'File content is empty'
    return
  }

  const lines = fileContent.value.split('\n')
  console.log('Start studyset parsing')
  const studyset = parseStudyset(lines)
  if (studyset == null) {
    console.error('Parse failed')
  } else {
    console.log('Parse succeded')
    emit('setUploaded', studyset)
  }
}
</script>

<template>
  <div class="upload-container">
    <label for="file-input" class="upload-circle">
      <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17,8 12,3 7,8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <input type="file" id="file-input" accept=".txt" @change="handleFileUpload" class="hidden-input" />
    </label>
  </div>
</template>

<style scoped>
.upload-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: rgb(180, 0, 0);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(180, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
}

.upload-circle:hover {
  background-color: rgb(150, 0, 0);
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(150, 0, 0, 0.4);
}

.upload-circle:active {
  transform: scale(0.95);
}

.upload-icon {
  width: 32px;
  height: 32px;
  color: white;
  transition: transform 0.2s ease;
}

.upload-circle:hover .upload-icon {
  transform: translateY(-2px);
}

.hidden-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}
</style>