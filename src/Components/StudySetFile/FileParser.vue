<script setup lang="ts">
import { ref } from 'vue'
import { parseStudyset } from '@/FlashcardParser/StudySetParser'
import type { IStudySet } from '@/FlashcardParser/Types/Types'

const emit = defineEmits<{
  setUploaded: [studySet: IStudySet, content: string]
}>()

const fileContent = ref('')
const error = ref<string | null>(null)

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  error.value = null
  fileContent.value = ''

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
  // Allow selecting the same file again (e.g. after fixing it)
  target.value = ''
}

function parseFileContent() {
  if (!fileContent.value) {
    error.value = 'File content is empty'
    return
  }

  // Handle both LF and CRLF line endings
  const lines = fileContent.value.split(/\r?\n/)
  console.log('[parser] Start parsing')
  const studyset = parseStudyset(lines)
  if (studyset == null) {
    error.value = 'The study set could not be parsed (see the console for details)'
    console.error('[parser] Fail')
  } else {
    console.log('[parser] Success')
    emit('setUploaded', studyset, fileContent.value)
  }
}
</script>

<template>
  <div class="upload-container">
    <label for="file-input" class="upload-orb" title="Open a study set (.txt)">
      <span class="orb-core">
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17,8 12,3 7,8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </span>
      <input type="file" id="file-input" accept=".txt" @change="handleFileUpload" class="hidden-input" />
    </label>
    <span class="upload-caption">Open study set</span>
    <p v-if="error" class="upload-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
}

.upload-caption {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.upload-error {
  max-width: 18rem;
  color: var(--red);
  text-align: center;
  font-size: 0.85rem;
}

/* Iridescent orb: a spinning conic ring around a dark glass core */
.upload-orb {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  isolation: isolate;
  transition: transform 0.3s ease;
  animation: bob 4s ease-in-out infinite;
}

.upload-orb::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--grad-iridescent);
  z-index: -1;
  animation: spin 6s linear infinite;
  box-shadow: 0 0 30px rgba(155, 92, 255, 0.6), 0 0 70px rgba(255, 115, 250, 0.3);
}

.upload-orb::after {
  /* soft halo */
  content: '';
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  background: var(--grad-iridescent);
  filter: blur(22px);
  opacity: 0.45;
  z-index: -2;
  animation: spin 6s linear infinite;
}

.orb-core {
  width: calc(100% - 6px);
  height: calc(100% - 6px);
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 35% 30%, #3a2f8a, #15123a 70%);
  box-shadow: inset 0 2px 10px rgba(255, 255, 255, 0.18);
}

.upload-orb:hover {
  transform: scale(1.08);
}

.upload-orb:active {
  transform: scale(0.95);
}

.upload-icon {
  width: 30px;
  height: 30px;
  color: #fff;
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.6));
  transition: transform 0.2s ease;
}

.upload-orb:hover .upload-icon {
  transform: translateY(-2px);
}

.hidden-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes bob {

  0%,
  100% {
    translate: 0 0;
  }

  50% {
    translate: 0 -6px;
  }
}
</style>
