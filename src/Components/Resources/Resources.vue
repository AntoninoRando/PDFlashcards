<template>
  <div class="resources-container">
    <div class="controls" v-if="queue.length > 1">
      <button class="nav-btn" @click="prev" title="Previous resource">&lsaquo;</button>
      <button class="nav-btn" @click="next" title="Next resource">&rsaquo;</button>
    </div>

    <div class="stack">
      <div v-if="!current" class="empty">No resources</div>

      <!-- Render only the top resource -->
      <div v-else class="stack-item top">
        <component
          :is="resolveComponent(current)"
          v-bind="resolveProps(current)"
          @pdfLoaded="onPdfLoaded"
          @pdfError="onPdfError"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PDFPreview from './PDFPreview.vue'
import type { PdfRegion } from '@/Utils/PdfRegion'

type PDFResource = {
  type: 'pdf'
  pdfUrl: string
  pageToShow?: number
  scrollPercent?: number
  region?: PdfRegion
  trigger?: number
}

type ResourceItem = PDFResource // | { type: 'image', ... } | { type: 'video', ... } etc.

const props = defineProps<{
  resources: ResourceItem[]
}>()

const emit = defineEmits<{
  changed: [current: ResourceItem]
  pdfLoaded: []
  pdfError: [error: any]
}>()

// Maintain a local queue to rotate items without mutating the prop
const queue = ref<ResourceItem[]>([...props.resources])

watch(
  () => props.resources,
  (newVal) => {
    queue.value = [...newVal]
  },
  { deep: true }
)

const current = computed<ResourceItem | undefined>(() => queue.value[0])

function next() {
  if (queue.value.length <= 1) return
  const first = queue.value.shift()!
  queue.value.push(first)
  if (queue.value[0]) emit('changed', queue.value[0])
}

function prev() {
  if (queue.value.length <= 1) return
  const last = queue.value.pop()!
  queue.value.unshift(last)
  if (queue.value[0]) emit('changed', queue.value[0])
}

function resolveComponent(item: ResourceItem) {
  switch (item.type) {
    case 'pdf':
      return PDFPreview
    default:
      return 'div'
  }
}

function resolveProps(item: ResourceItem): Record<string, any> {
  switch (item.type) {
    case 'pdf': {
      const pdf = item as PDFResource
      return {
        pdfUrl: pdf.pdfUrl,
        pageToShow: pdf.pageToShow ?? 1,
        scrollPercent: pdf.scrollPercent,
        region: pdf.region,
        trigger: pdf.trigger,
      }
    }
    default:
      return { innerHTML: 'Unsupported resource type' }
  }
}

function onPdfLoaded() {
  emit('pdfLoaded')
}

function onPdfError(error: any) {
  emit('pdfError', error)
}
</script>

<style scoped>
.resources-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.controls {
  position: absolute;
  z-index: 20;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 8px;
}

.nav-btn {
  display: inline-grid;
  place-items: center;
  width: 2.2rem;
  height: 2.2rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
  background: rgba(20, 16, 50, 0.8);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.nav-btn:hover {
  background: var(--grad-nitro);
  box-shadow: var(--glow-pink);
}

.stack {
  position: absolute;
  inset: 0;
}

.stack-item.top {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-dim);
}
</style>

