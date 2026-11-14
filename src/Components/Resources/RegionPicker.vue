<script setup lang="ts">
/*
  Shows one page of a PDF and lets the user drag a rectangle on it. The region
  is in percentages of the page (see `Utils/PdfRegion.ts`), so it does not
  depend on the size the page is drawn at.

  It renders with pdf.js directly (not the viewer used elsewhere), because it
  needs full control of the page's position to map the mouse onto it.
*/
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { RenderTask } from 'pdfjs-dist'
import { clampRegion, formatRegion, MIN_REGION_SIZE, type PdfRegion } from '@/Utils/PdfRegion'

const props = defineProps<{
  pdfUrl: string
  page: number
  region: PdfRegion | null
}>()

const emit = defineEmits<{
  'update:page': [page: number]
  'update:region': [region: PdfRegion | null]
  /** Enter pressed with a region selected. */
  confirm: []
}>()

//#region DOCUMENT -------------------------------------------------------------
const pdf = shallowRef<PDFDocumentProxy | null>(null)
const pageCount = computed(() => pdf.value?.numPages ?? 0)
const loadError = ref('')

watch(
  () => props.pdfUrl,
  async (url) => {
    pdf.value = null
    loadError.value = ''
    if (!url) return
    try {
      const doc = await openDocument(url)
      if (url === props.pdfUrl) pdf.value = doc
    } catch (error) {
      console.error('[RegionPicker] Cannot open the PDF:', error)
      loadError.value = 'This PDF cannot be opened.'
    }
  },
  { immediate: true },
)

function goTo(page: number) {
  if (!pageCount.value) return
  const target = Math.min(pageCount.value, Math.max(1, Math.round(page) || 1))
  if (target !== props.page) {
    emit('update:page', target)
    emit('update:region', null)
  }
}

// Keep the page inside the document (e.g. after switching to a shorter PDF)
watch([pageCount, () => props.page], ([count, page]) => {
  if (count && (page < 1 || page > count)) goTo(page)
})
//#endregion -------------------------------------------------------------------

//#region RENDERING ------------------------------------------------------------
const scrollArea = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const pageSize = ref({ width: 0, height: 0 })
const rendering = ref(false)
let renderTask: RenderTask | null = null
let renderId = 0

async function render() {
  const doc = pdf.value
  const area = scrollArea.value
  const target = canvas.value
  if (!doc || !area || !target || props.page < 1 || props.page > doc.numPages) return

  const id = ++renderId
  renderTask?.cancel()
  rendering.value = true
  try {
    const page = await doc.getPage(props.page)
    if (id !== renderId) return
    // Fit the page to the width of the panel
    const base = page.getViewport({ scale: 1 })
    const width = Math.max(120, area.clientWidth - 2)
    const viewport = page.getViewport({ scale: width / base.width })
    const ratio = window.devicePixelRatio || 1

    target.width = Math.floor(viewport.width * ratio)
    target.height = Math.floor(viewport.height * ratio)
    pageSize.value = { width: viewport.width, height: viewport.height }

    renderTask = page.render({
      canvas: target,
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
    })
    await renderTask.promise
  } catch (error: any) {
    if (error?.name !== 'RenderingCancelledException') console.error('[RegionPicker] Render failed:', error)
  } finally {
    if (id === renderId) rendering.value = false
  }
}

watch([pdf, () => props.page], render)

let resizeObserver: ResizeObserver | null = null
let lastWidth = 0
onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => {
    const width = Math.round(entry.contentRect.width)
    if (Math.abs(width - lastWidth) < 4) return
    lastWidth = width
    render()
  })
  if (scrollArea.value) resizeObserver.observe(scrollArea.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  renderTask?.cancel()
  renderId++
})
//#endregion -------------------------------------------------------------------

//#region SELECTION ------------------------------------------------------------
const surface = ref<HTMLElement | null>(null)
/** Region being dragged (not emitted until the mouse is released). */
const draft = ref<PdfRegion | null>(null)
let anchor: { x: number; y: number } | null = null

const shown = computed(() => draft.value ?? props.region)

/** Pointer position in % of the page. */
function percentAt(event: PointerEvent): { x: number; y: number } {
  const rect = surface.value!.getBoundingClientRect()
  return {
    x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
    y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)),
  }
}

function between(a: { x: number; y: number }, b: { x: number; y: number }): PdfRegion {
  return clampRegion({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  })
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 || !pageSize.value.width) return
  event.preventDefault()
  surface.value?.focus({ preventScroll: true })
  surface.value?.setPointerCapture(event.pointerId)
  anchor = percentAt(event)
  draft.value = { ...anchor, w: 0, h: 0 }
}

function onPointerMove(event: PointerEvent) {
  if (!anchor) return
  draft.value = between(anchor, percentAt(event))
}

function onPointerUp(event: PointerEvent) {
  if (!anchor) return
  const region = between(anchor, percentAt(event))
  anchor = null
  draft.value = null
  // A click (or a tiny drag) clears the selection
  const big = region.w >= MIN_REGION_SIZE && region.h >= MIN_REGION_SIZE
  emit('update:region', big ? region : null)
}

function onPointerCancel() {
  anchor = null
  draft.value = null
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && (props.region || anchor)) {
    // Clear the selection instead of closing the editor
    event.preventDefault()
    event.stopPropagation()
    onPointerCancel()
    emit('update:region', null)
  } else if (event.key === 'Enter' && props.region) {
    event.preventDefault()
    emit('confirm')
  } else if (event.key === 'PageDown' || (event.key === 'ArrowRight' && !props.region)) {
    event.preventDefault()
    goTo(props.page + 1)
  } else if (event.key === 'PageUp' || (event.key === 'ArrowLeft' && !props.region)) {
    event.preventDefault()
    goTo(props.page - 1)
  }
}

const regionStyle = computed(() => {
  const r = shown.value
  return r ? { left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` } : undefined
})
//#endregion -------------------------------------------------------------------

defineExpose({ pageCount })
</script>

<script lang="ts">
/* Module scope: shared by every picker */
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/* Documents stay open for the whole session: object URLs of uploaded PDFs do
   not change, and reopening the editor should not parse them again. */
const documents = new Map<string, Promise<PDFDocumentProxy>>()

function openDocument(url: string): Promise<PDFDocumentProxy> {
  let doc = documents.get(url)
  if (!doc) {
    doc = pdfjs.getDocument({ url }).promise
    doc.catch(() => documents.delete(url))
    documents.set(url, doc)
  }
  return doc
}
</script>

<template>
  <div class="region-picker">
    <div class="picker-bar">
      <button type="button" class="nav" title="Previous page (Page Up)" :disabled="page <= 1"
        @click="goTo(page - 1)">‹</button>
      <label class="page-field">
        Page
        <input type="number" min="1" :max="pageCount || undefined" :value="page" aria-label="Page number"
          @change="goTo(Number(($event.target as HTMLInputElement).value))" @keydown.enter.stop />
        <span v-if="pageCount" class="muted">/ {{ pageCount }}</span>
      </label>
      <button type="button" class="nav" title="Next page (Page Down)" :disabled="!pageCount || page >= pageCount"
        @click="goTo(page + 1)">›</button>
      <code v-if="region" class="region-code" title="How the region is written in the study set">
        {{ page }}{{ formatRegion(region) }}
      </code>
    </div>

    <div ref="scrollArea" class="picker-scroll">
      <p v-if="loadError" class="picker-message">{{ loadError }}</p>
      <div v-else class="page-wrap" :style="{ width: pageSize.width ? `${pageSize.width}px` : '100%' }">
        <canvas ref="canvas" class="page-canvas"
          :style="{ width: `${pageSize.width}px`, height: `${pageSize.height}px` }" />
        <div ref="surface" class="surface" tabindex="0" role="application"
          aria-label="PDF page: drag to select a region, Enter to use it, Escape to clear it"
          :class="{ dragging: !!draft }" @pointerdown="onPointerDown" @pointermove="onPointerMove"
          @pointerup="onPointerUp" @pointercancel="onPointerCancel" @keydown="onKeydown">
          <div v-if="regionStyle" class="selection" :style="regionStyle" />
        </div>
        <p v-if="!pageSize.width" class="picker-message">Loading page…</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.region-picker {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.picker-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--ed-muted, #a39dc8);
}

.nav {
  font: inherit;
  font-size: 1.1rem;
  line-height: 1;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 7px;
  border: 1px solid var(--ed-border, rgba(255, 255, 255, 0.09));
  background: var(--ed-input, rgba(255, 255, 255, 0.045));
  color: var(--ed-text, #f3f0ff);
  cursor: pointer;
}

.nav:hover:not(:disabled) {
  background: var(--ed-hover, rgba(255, 255, 255, 0.07));
}

.nav:disabled {
  opacity: 0.4;
  cursor: default;
}

.page-field {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.page-field input {
  font: inherit;
  width: 3.6rem;
  padding: 0.2rem 0.4rem;
  border-radius: 7px;
  border: 1px solid var(--ed-border, rgba(255, 255, 255, 0.09));
  background: var(--ed-input, rgba(255, 255, 255, 0.045));
  color: var(--ed-text, #f3f0ff);
}

.region-code {
  margin-left: auto;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.75rem;
  color: var(--ed-accent, #ff8bf7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.picker-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* A scrollbar showing up would resize (and re-render) the page */
  scrollbar-gutter: stable;
  border: 1px solid var(--ed-border, rgba(255, 255, 255, 0.09));
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
}

.page-wrap {
  position: relative;
  margin: 0 auto;
  overflow: hidden;
}

.page-canvas {
  display: block;
  background: #fff;
}

.surface {
  position: absolute;
  inset: 0;
  cursor: crosshair;
  touch-action: none;
  outline: none;
}

.surface:focus-visible {
  box-shadow: inset 0 0 0 2px var(--ed-accent, #ff8bf7);
}

.selection {
  position: absolute;
  border-radius: 3px;
  background: rgba(255, 115, 250, 0.12);
  box-shadow: inset 0 0 0 2px #ff4ff8, 0 0 0 9999px rgba(8, 6, 24, 0.45);
  pointer-events: none;
}

.surface.dragging .selection {
  box-shadow: inset 0 0 0 2px #ff4ff8, 0 0 0 9999px rgba(8, 6, 24, 0.3);
}

.picker-message {
  margin: 0;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--ed-muted, #a39dc8);
  font-size: 0.88rem;
}

.muted {
  color: var(--ed-muted, #a39dc8);
}
</style>
