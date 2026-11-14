<script setup lang="ts">
/*
  Shows one page of a PDF and lets the user drag a rectangle on it ("Box"
  tool) or select its text ("Text" tool). The region is in percentages of the
  page (see `Utils/PdfRegion.ts`), so it does not depend on the size the page
  is drawn at. Selecting text emits the text and makes the area it covers the
  region.

  It renders a single page with pdf.js (not the scrolling viewer of
  `PDFPreview.vue`), because it needs full control of the page's position to
  map the mouse onto it.
*/
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { TextLayer } from 'pdfjs-dist'
import type { PageViewport, PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import 'pdfjs-dist/web/pdf_viewer.css'
import { openDocument } from '@/Utils/Pdfjs'
import { clampRegion, formatRegion, MIN_REGION_SIZE, regionAround, type PdfRegion } from '@/Utils/PdfRegion'

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
  /** Text selected with the Text tool (as the browser copies it). */
  selectText: [text: string]
}>()

/** Box: drag a rectangle. Text: select words, like in a PDF reader. */
const tool = ref<'box' | 'text'>('box')

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
    clearTextSelection()
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
const textLayerEl = ref<HTMLElement | null>(null)
const pageSize = ref({ width: 0, height: 0 })
/** Zoom of the page: the text layer sizes its text with it. */
const pageScale = ref(1)
const rendering = ref(false)
let renderTask: RenderTask | null = null
let textLayer: TextLayer | null = null
let renderId = 0

/** Lays the page's text over the canvas, transparent but selectable (pdf.js text layer). */
async function renderText(page: PDFPageProxy, viewport: PageViewport, id: number) {
  const container = textLayerEl.value
  if (!container) return
  textLayer?.cancel()
  container.replaceChildren()
  textLayer = new TextLayer({ textContentSource: page.streamTextContent(), container, viewport })
  try {
    await textLayer.render()
  } catch (error: any) {
    if (error?.name !== 'AbortException') console.error('[RegionPicker] Text layer failed:', error)
    return
  }
  if (id !== renderId) return
  // Like pdf.js's viewer: dragging past the last line selects up to the end, instead of jumping around
  const end = document.createElement('div')
  end.className = 'endOfContent'
  container.append(end)
}

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
    pageScale.value = viewport.scale

    renderTask = page.render({
      canvas: target,
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
    })
    await Promise.all([renderTask.promise, renderText(page, viewport, id)])
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
  textLayer?.cancel()
  renderId++
  window.removeEventListener('pointerup', onTextPointerUp)
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

//#region TEXT TOOL ------------------------------------------------------------
function textSelectionRange(): Range | null {
  const layer = textLayerEl.value
  const selection = window.getSelection()
  if (!layer || !selection || selection.isCollapsed || !selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  return layer.contains(range.commonAncestorContainer) ? range : null
}

function clearTextSelection() {
  if (textSelectionRange()) window.getSelection()?.removeAllRanges()
}

/**
 * Area of the page covered by the selected text, in %. Only the selected text
 * counts: the range may also contain helper elements spanning the whole page.
 */
function regionOfRange(range: Range): PdfRegion | null {
  const layer = textLayerEl.value
  if (!layer) return null
  const rects: DOMRect[] = []
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!range.intersectsNode(node)) continue
    const part = document.createRange()
    part.selectNodeContents(node)
    if (node === range.startContainer) part.setStart(node, range.startOffset)
    if (node === range.endContainer) part.setEnd(node, range.endOffset)
    for (const rect of part.getClientRects()) if (rect.width > 0 && rect.height > 0) rects.push(rect)
  }
  const page = layer.getBoundingClientRect()
  if (!rects.length || !page.width || !page.height) return null
  return regionAround(
    rects.map((r) => ({
      x: ((r.left - page.left) / page.width) * 100,
      y: ((r.top - page.top) / page.height) * 100,
      w: (r.width / page.width) * 100,
      h: (r.height / page.height) * 100,
    })),
  )
}

function onTextPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  // While selecting, pdf.js's CSS makes the blank parts of the page select up to the end
  textLayerEl.value?.classList.add('selecting')
  window.addEventListener('pointerup', onTextPointerUp, { once: true })
}

function onTextPointerUp() {
  textLayerEl.value?.classList.remove('selecting')
  // The selection is final only after the event
  requestAnimationFrame(() => {
    const range = textSelectionRange()
    const text = range?.toString() ?? ''
    if (!range || !text.trim()) return
    const region = regionOfRange(range)
    if (region) emit('update:region', region)
    emit('selectText', text)
    // Enter / Escape go to the picker
    surface.value?.focus({ preventScroll: true })
  })
}

function setTool(next: 'box' | 'text') {
  tool.value = next
  if (next === 'box') clearTextSelection()
}
//#endregion -------------------------------------------------------------------

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && (props.region || anchor || textSelectionRange())) {
    // Clear the selection instead of closing the editor
    event.preventDefault()
    event.stopPropagation()
    onPointerCancel()
    clearTextSelection()
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
      <div class="tool-switch" role="radiogroup" aria-label="Selection tool">
        <button type="button" role="radio" :aria-checked="tool === 'box'" :class="{ active: tool === 'box' }"
          title="Drag a box around the answer" @click="setTool('box')">Box</button>
        <button type="button" role="radio" :aria-checked="tool === 'text'" :class="{ active: tool === 'text' }"
          title="Select words on the page: they become the question" @click="setTool('text')">Text</button>
      </div>
      <code v-if="region" class="region-code" title="How the region is written in the study set">
        {{ page }}{{ formatRegion(region) }}
      </code>
    </div>

    <div ref="scrollArea" class="picker-scroll">
      <p v-if="loadError" class="picker-message">{{ loadError }}</p>
      <div v-else class="page-wrap" :class="`tool-${tool}`" :style="{
        width: pageSize.width ? `${pageSize.width}px` : '100%',
        '--total-scale-factor': pageScale,
      }">
        <canvas ref="canvas" class="page-canvas"
          :style="{ width: `${pageSize.width}px`, height: `${pageSize.height}px` }" />
        <div ref="textLayerEl" class="textLayer" @pointerdown="onTextPointerDown" />
        <div ref="surface" class="surface" tabindex="0" role="application"
          :aria-label="tool === 'box'
            ? 'PDF page: drag to select a region, Enter to use it, Escape to clear it'
            : 'PDF page: select text to use it as the question, Enter to create the card'"
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
  min-width: 0;
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

/* Box tool: the surface takes the mouse. Text tool: the mouse goes through it
   to the text layer below, the surface only shows the region. */
.tool-box .textLayer {
  pointer-events: none;
}

.tool-text .surface {
  pointer-events: none;
}

/* Keep the page readable while selecting more text */
.tool-text .selection {
  box-shadow: inset 0 0 0 2px #ff4ff8;
  background: transparent;
}

.tool-switch {
  display: inline-flex;
  margin-left: 0.4rem;
  border: 1px solid var(--ed-border, rgba(255, 255, 255, 0.09));
  border-radius: 7px;
  overflow: hidden;
}

.tool-switch button {
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border: none;
  background: var(--ed-input, rgba(255, 255, 255, 0.045));
  color: var(--ed-muted, #a39dc8);
  cursor: pointer;
}

.tool-switch button + button {
  border-left: 1px solid var(--ed-border, rgba(255, 255, 255, 0.09));
}

.tool-switch button.active {
  background: var(--ed-accent-soft, rgba(255, 115, 250, 0.13));
  color: var(--ed-accent, #ff8bf7);
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
