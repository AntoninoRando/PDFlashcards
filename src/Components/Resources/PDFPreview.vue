<template>
    <div class="pdf-viewer-container">
        <template v-if="pdfUrl">
            <div class="pdf-toolbar" role="toolbar" aria-label="PDF controls">
                <div class="group">
                    <button type="button" class="tool" title="Previous page" :disabled="!ready || currentPage <= 1"
                        @click="goTo(currentPage - 1)">‹</button>
                    <label class="page-field">
                        <input type="number" min="1" :max="pageCount || undefined" :value="currentPage"
                            aria-label="Page number" :disabled="!ready"
                            @change="goTo(Number(($event.target as HTMLInputElement).value))" />
                        <span class="muted">/ {{ pageCount || '–' }}</span>
                    </label>
                    <button type="button" class="tool" title="Next page"
                        :disabled="!ready || currentPage >= pageCount" @click="goTo(currentPage + 1)">›</button>
                </div>

                <div class="group">
                    <button type="button" class="tool" title="Zoom out" :disabled="!ready"
                        @click="viewer?.decreaseScale()">−</button>
                    <span class="zoom muted">{{ Math.round(scale * 100) }}%</span>
                    <button type="button" class="tool" title="Zoom in" :disabled="!ready"
                        @click="viewer?.increaseScale()">+</button>
                    <button type="button" class="tool wide" title="Fit to width" :disabled="!ready"
                        @click="fitWidth">Fit</button>
                </div>

                <form class="group search" role="search" @submit.prevent="find(false)">
                    <input v-model="query" type="search" placeholder="Search" aria-label="Search in the PDF"
                        :disabled="!ready" @input="find(false, '')"
                        @keydown.enter.shift.prevent="find(true)" />
                    <span v-if="query && matches.total" class="muted count">
                        {{ matches.current }}/{{ matches.total }}
                    </span>
                    <span v-else-if="query && searchDone" class="muted count">0</span>
                    <button type="button" class="tool" title="Previous match (Shift+Enter)"
                        :disabled="!matches.total" @click="find(true)">↑</button>
                    <button type="submit" class="tool" title="Next match (Enter)"
                        :disabled="!matches.total">↓</button>
                </form>
            </div>

            <div class="pdf-stage">
                <div ref="scrollerRef" class="pdf-scroller">
                    <div class="pdfViewer"></div>
                </div>
                <p v-if="loadError" class="pdf-message">{{ loadError }}</p>
                <p v-else-if="!ready" class="pdf-message">Loading PDF…</p>
            </div>
        </template>
        <div v-else class="no-preview">
            <p>No PDF selected</p>
        </div>
    </div>
</template>

<script setup lang="ts">
/*
  PDF viewer built on the pdf.js viewer components (free, no watermark). Besides
  showing the document it scrolls to a page, to a position in it or to a region
  of it, and highlights that region.
*/
import 'pdfjs-dist/web/pdf_viewer.css'
import { ref, shallowRef, watch, nextTick, onBeforeUnmount } from 'vue'
import type { EventBus, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'
import type { PdfRegion } from '@/Utils/PdfRegion'
import { loadViewer, openDocument } from '@/Utils/Pdfjs'

const props = defineProps<{
    pdfUrl: string
    pageToShow: number
    scrollPercent?: number
    /** Region of the page to scroll to and highlight. */
    region?: PdfRegion
    trigger?: number
}>()

const emit = defineEmits<{
    pdfLoaded: []
    pdfError: [error: any]
}>()

//#region VIEWER ---------------------------------------------------------------
const scrollerRef = ref<HTMLDivElement | null>(null)
const viewer = shallowRef<PDFViewer | null>(null)
let eventBus: EventBus | null = null
let linkService: any = null
let resizeObserver: ResizeObserver | null = null

const ready = ref(false)
const loadError = ref('')
const pageCount = ref(0)
const currentPage = ref(1)
const scale = ref(1)

/** Creates the viewer in the scrolling element (once per element). */
async function createViewer(scroller: HTMLDivElement) {
    const { EventBus, PDFLinkService, PDFFindController, PDFViewer } = await loadViewer()
    if (scroller !== scrollerRef.value) return

    eventBus = new EventBus()
    linkService = new PDFLinkService({ eventBus })
    const findController = new PDFFindController({ eventBus, linkService })
    const created = new PDFViewer({ container: scroller, eventBus, linkService, findController })
    linkService.setViewer(created)

    eventBus.on('pagesinit', onPagesInit)
    eventBus.on('pagechanging', (e: { pageNumber: number }) => (currentPage.value = e.pageNumber))
    eventBus.on('scalechanging', (e: { scale: number }) => (scale.value = e.scale))
    eventBus.on('updatefindmatchescount', (e: any) => (matches.value = e.matchesCount))
    eventBus.on('updatefindcontrolstate', (e: any) => {
        matches.value = e.matchesCount
        searchDone.value = e.state !== 3 // FindState.PENDING
    })

    // Keep fitting the page to the width when the panel is resized
    let scheduled = false
    resizeObserver = new ResizeObserver(() => {
        if (scheduled) return
        scheduled = true
        requestAnimationFrame(() => {
            scheduled = false
            if (created.pdfDocument && created.currentScaleValue === 'page-width') {
                created.currentScaleValue = 'page-width'
            }
        })
    })
    resizeObserver.observe(scroller)

    viewer.value = created
}

/** Incremented on each load, so that a slow one does not override a newer one. */
let loadId = 0

async function load(url: string) {
    const id = ++loadId
    ready.value = false
    loadError.value = ''
    pageCount.value = 0
    currentPage.value = 1
    resetSearch()
    removeHighlight()
    try {
        const doc = await openDocument(url)
        if (id !== loadId || !viewer.value) return
        viewer.value.setDocument(doc)
        linkService.setDocument(doc, null)
        pageCount.value = doc.numPages
    } catch (error) {
        if (id !== loadId) return
        console.error('PDF loading error:', error)
        loadError.value = 'This PDF cannot be opened.'
        emit('pdfError', error)
    }
}

function onPagesInit() {
    if (!viewer.value) return
    viewer.value.currentScaleValue = 'page-width'
    ready.value = true
    emit('pdfLoaded')
    nextTick(() => {
        if (props.pageToShow) scrollToPDFPage(props.pageToShow, props.scrollPercent, props.region)
    })
}

function destroyViewer() {
    loadId++
    resizeObserver?.disconnect()
    resizeObserver = null
    viewer.value?.setDocument(null as any)
    viewer.value = null
    eventBus = null
    linkService = null
    ready.value = false
}

// The scrolling element only exists while there is a PDF to show
watch(scrollerRef, async (scroller, old) => {
    if (scroller === old) return
    destroyViewer()
    removeHighlight()
    if (!scroller) return
    await createViewer(scroller)
    if (props.pdfUrl && viewer.value) load(props.pdfUrl)
}, { flush: 'post' })

// A new document must be loaded before navigating in it
watch(() => props.pdfUrl, (url) => {
    if (url && viewer.value) load(url)
})

onBeforeUnmount(() => {
    destroyViewer()
    removeHighlight()
})
//#endregion -------------------------------------------------------------------

//#region TOOLBAR --------------------------------------------------------------
function goTo(page: number) {
    if (!viewer.value || !pageCount.value) return
    viewer.value.currentPageNumber = Math.min(pageCount.value, Math.max(1, Math.round(page) || 1))
}

function fitWidth() {
    if (viewer.value) viewer.value.currentScaleValue = 'page-width'
}

const query = ref('')
const matches = ref({ current: 0, total: 0 })
const searchDone = ref(false)

function resetSearch() {
    query.value = ''
    matches.value = { current: 0, total: 0 }
    searchDone.value = false
}

/** Searches `query`: a new search when `type` is '', otherwise the next/previous match. */
function find(previous: boolean, type: '' | 'again' = 'again') {
    eventBus?.dispatch('find', {
        source: null,
        type,
        query: query.value,
        caseSensitive: false,
        entireWord: false,
        highlightAll: true,
        findPrevious: previous,
        matchDiacritics: false,
    })
}
//#endregion -------------------------------------------------------------------

//#region VIEWER DOM -----------------------------------------------------------
/* The viewer has no API to scroll inside a page or to draw on it, so these
   rely on its markup: one `.page` element per page in the scrolling element. */
const HIGHLIGHT_CLASS = 'pdf-region-highlight'

function pageElement(pageNumber: number): HTMLElement | null {
    return scrollerRef.value?.querySelector<HTMLElement>(`.page[data-page-number="${pageNumber}"]`) ?? null
}

/** Waits for a page to be laid out (pages are created asynchronously). */
async function waitForPage(pageNumber: number, timeoutMs = 15000): Promise<HTMLElement | null> {
    const start = performance.now()
    while (performance.now() - start < timeoutMs) {
        const el = pageElement(pageNumber)
        if (el && el.clientHeight > 0) return el
        await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return null
}

/** Scrolls so that `offset` px from the top of `page` is `margin` px below the top of the view. */
function scrollPageOffsetIntoView(page: HTMLElement, offset: number, margin: number) {
    const scroller = scrollerRef.value
    if (!scroller) return
    const pageTop = page.getBoundingClientRect().top + page.clientTop
        - scroller.getBoundingClientRect().top + scroller.scrollTop
    scroller.scrollTop = Math.max(0, pageTop + offset - margin)
}
//#endregion -------------------------------------------------------------------

//#region REGION HIGHLIGHT -----------------------------------------------------
let highlight: HTMLElement | null = null
let observer: MutationObserver | null = null

function removeHighlight() {
    highlight?.remove()
    highlight = null
    observer?.disconnect()
    observer = null
}

/** Draws the region on its page; true if the page is in the DOM. */
function drawHighlight(pageNumber: number, region: PdfRegion): boolean {
    const page = pageElement(pageNumber)
    if (!page) return false
    if (highlight?.parentElement === page) return true

    highlight?.remove()
    highlight = document.createElement('div')
    highlight.className = HIGHLIGHT_CLASS
    highlight.setAttribute('aria-hidden', 'true')
    Object.assign(highlight.style, {
        left: `${region.x}%`,
        top: `${region.y}%`,
        width: `${region.w}%`,
        height: `${region.h}%`,
    })
    page.appendChild(highlight)
    return true
}

/** Keeps the highlight on its page when the viewer re-renders it (zoom, resize...). */
function keepHighlight(pageNumber: number, region: PdfRegion) {
    observer?.disconnect()
    const root = scrollerRef.value
    if (!root) return
    let scheduled = false
    observer = new MutationObserver(() => {
        if (scheduled || highlight?.isConnected) return
        scheduled = true
        requestAnimationFrame(() => {
            scheduled = false
            if (props.region && !highlight?.isConnected) drawHighlight(pageNumber, region)
        })
    })
    observer.observe(root, { childList: true, subtree: true })
    drawHighlight(pageNumber, region)
}
//#endregion -------------------------------------------------------------------

/** Incremented on each navigation, so that a slow one does not override a newer one. */
let navigation = 0

async function scrollToPDFPage(pageNumber: number, scrollPercent?: number, region?: PdfRegion) {
    if (!ready.value || !viewer.value || !pageNumber || pageNumber < 1) return

    const current = ++navigation
    removeHighlight()
    goTo(pageNumber)

    if (!region && scrollPercent === undefined) return

    // Draws the region as soon as its page exists, and again if the viewer re-renders it
    if (region) keepHighlight(pageNumber, region)

    const page = await waitForPage(pageNumber)
    if (!page || current !== navigation) return
    // Let the viewer finish its own scroll to the page first
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    if (current !== navigation) return

    const pageHeight = page.clientHeight
    const viewHeight = scrollerRef.value?.clientHeight ?? pageHeight

    if (region) {
        drawHighlight(pageNumber, region)
        // Center the region, or show its top with some context when it is taller than the view
        const top = (region.y / 100) * pageHeight
        const height = (region.h / 100) * pageHeight
        const margin = height < viewHeight ? (viewHeight - height) / 2 : viewHeight * 0.08
        scrollPageOffsetIntoView(page, top, margin)
    } else if (scrollPercent !== undefined) {
        // Scrolling the whole page: 0% shows its top, 100% its bottom
        const offset = (scrollPercent / 100) * Math.max(0, pageHeight - viewHeight)
        scrollPageOffsetIntoView(page, offset, 0)
    }
}

// Watch for changes in the page, scroll, region or trigger props
watch(() => [props.pageToShow, props.scrollPercent, props.region, props.trigger], () => {
    if (props.pageToShow && ready.value) {
        nextTick(() => scrollToPDFPage(props.pageToShow, props.scrollPercent, props.region))
    }
})
</script>

<style scoped>
.pdf-viewer-container {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-1, #0d0b24);
}

.pdf-toolbar {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem 0.9rem;
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.09));
    background: var(--bg-2, #15123a);
    font-size: 0.85rem;
    color: var(--text, #f5f2ff);
}

.group {
    display: flex;
    align-items: center;
    gap: 0.3rem;
}

.tool {
    font: inherit;
    line-height: 1;
    min-width: 1.9rem;
    height: 1.9rem;
    padding: 0 0.4rem;
    border-radius: 7px;
    border: 1px solid var(--border, rgba(255, 255, 255, 0.09));
    background: var(--surface, rgba(255, 255, 255, 0.04));
    color: inherit;
    cursor: pointer;
}

.tool:hover:not(:disabled) {
    background: var(--surface-3, rgba(255, 255, 255, 0.11));
}

.tool:focus-visible,
.pdf-toolbar input:focus-visible {
    outline: 2px solid var(--pink, #ff73fa);
    outline-offset: 1px;
}

.tool:disabled {
    opacity: 0.4;
    cursor: default;
}

.pdf-toolbar input {
    font: inherit;
    height: 1.9rem;
    box-sizing: border-box;
    padding: 0 0.45rem;
    border-radius: 7px;
    border: 1px solid var(--border, rgba(255, 255, 255, 0.09));
    background: var(--surface, rgba(255, 255, 255, 0.04));
    color: inherit;
}

.page-field {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.page-field input {
    width: 3.4rem;
}

.zoom {
    min-width: 3rem;
    text-align: center;
    font-variant-numeric: tabular-nums;
}

.search input {
    width: 9rem;
}

.count {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.muted {
    color: var(--text-muted, #aaa4cc);
}

.pdf-stage {
    position: relative;
    flex: 1;
    min-height: 0;
}

/* pdf.js requires an absolutely positioned scrolling element */
.pdf-scroller {
    position: absolute;
    inset: 0;
    overflow: auto;
    background: var(--bg-0, #07061a);
}

.pdf-message {
    position: absolute;
    inset: 0;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim, #7a74a3);
    pointer-events: none;
}

.no-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 500px;
    color: var(--text-dim);
    text-align: center;
    flex: 1;
}
</style>

<style>
/* Not scoped: the highlight is created outside of Vue, inside the viewer. */
.pdfViewer .page > .pdf-region-highlight {
    position: absolute;
    z-index: 5;
    pointer-events: none;
    border-radius: 4px;
    background: rgba(255, 115, 250, 0.1);
    box-shadow: inset 0 0 0 3px #ff4ff8, 0 0 0 2px rgba(255, 255, 255, 0.85), 0 0 22px rgba(255, 79, 248, 0.55);
    animation: pdf-region-pulse 1.2s ease-out 2;
}

@keyframes pdf-region-pulse {
    0% {
        box-shadow: inset 0 0 0 3px #ff4ff8, 0 0 0 2px rgba(255, 255, 255, 0.85), 0 0 0 0 rgba(255, 79, 248, 0.75);
    }

    100% {
        box-shadow: inset 0 0 0 3px #ff4ff8, 0 0 0 2px rgba(255, 255, 255, 0.85), 0 0 0 16px rgba(255, 79, 248, 0);
    }
}

@media (prefers-reduced-motion: reduce) {
    .pdf-region-highlight {
        animation: none;
    }
}
</style>
