<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits(['close', 'save'])

function parseBlocks(text: string): string[] {
  const lines = text.split(/\r?\n/)
  const result: string[] = []
  let current: string[] = []

  lines.forEach((line) => {
    if (/^\S/.test(line)) {
      if (current.length) {
        result.push(current.join('\n'))
        current = []
      }
    }
    current.push(line)
  })

  if (current.length) {
    result.push(current.join('\n'))
  }

  return result
}

const blocks = ref<string[]>(parseBlocks(props.modelValue))

watch(
  () => props.modelValue,
  (val) => {
    blocks.value = parseBlocks(val)
  }
)

function save() {
  const content = blocks.value.join('\n')
  emit('save', content)
}
</script>

<template>
  <div class="editor-overlay">
    <div class="editor-modal">
      <div class="blocks-container">
        <div class="block-row" v-for="(block, index) in blocks" :key="index">
          <div class="block-index">{{ index + 1 }}</div>
          <textarea v-model="blocks[index]" class="block-textarea"></textarea>
        </div>
      </div>
      <div class="editor-actions">
        <button class="nav-btn" @click="emit('close')">Close</button>
        <button class="nav-btn" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.editor-modal {
  background: #fff;
  padding: 1rem;
  width: 80%;
  height: 80%;
  display: flex;
  flex-direction: column;
}

.blocks-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.block-row {
  display: flex;
  align-items: flex-start;
}

.block-index {
  width: 2rem;
  text-align: center;
  padding: 0.25rem;
  background: #f0f0f0;
  margin-right: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.block-textarea {
  flex: 1;
  resize: vertical;
  min-height: 3rem;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
