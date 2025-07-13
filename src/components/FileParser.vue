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

  const lines = fileContent.value.split('\n').filter((l) => l.trim() !== '')
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
    <div class="p-6 max-w-3xl mx-auto">
        <h1 class="text-2xl font-bold mb-4">Text File Parser</h1>

        <div class="mb-6">
            <input type="file" id="file-input" accept=".txt" @change="handleFileUpload"
                class="border rounded py-2 px-3 w-full bg-gray-50" />
        </div>
    </div>
</template>
