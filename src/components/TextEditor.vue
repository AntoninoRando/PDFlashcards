<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits(['close', 'save'])

const content = ref(props.modelValue)

watch(
  () => props.modelValue,
  (val) => {
    content.value = val
  }
)

function save() {
  emit('save', content.value)
}
</script>

<template>
  <div class="editor-overlay">
    <div class="editor-modal">
      <textarea v-model="content" class="editor-textarea"></textarea>
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

.editor-textarea {
  flex: 1;
  width: 100%;
  resize: none;
  margin-bottom: 1rem;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
