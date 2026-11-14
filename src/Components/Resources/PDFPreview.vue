<template>
    <div ref="containerRef" class="pdf-viewer-container">
        <VPdfViewer v-if="pdfUrl" :src="pdfUrl" :initialScrollMode="ScrollMode.Page" :initialScale="ZoomLevel.PageWidth"
            :toolbar-options="true" ref="vpvRef" @loaded="onPdfLoaded" @error="onPdfError" />
        <div v-else class="no-preview">
            <p>No PDF selected</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ScrollMode, VPdfViewer, ZoomLevel } from '@vue-pdf-viewer/viewer'
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import type { PdfRegion } from '@/Utils/PdfRegion'

// Create a ref to hold the VPdfViewer component
const vpvRef = ref<InstanceType<typeof VPdfViewer>>()
const containerRef = ref<HTMLElement | null>(null)
const pdfLoaded = ref(false)

const pageControl = computed(() => vpvRef.value?.pageControl)

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

//#region VIEWER DOM -----------------------------------------------------------
/* The viewer has no API to scroll inside a page or to draw on it, so these
   rely on its markup: one element per page and a scrolling wrapper. */
const SCROLLER_SELECTOR = '.vpv-pages-container-wrapper'
const HIGHLIGHT_CLASS = 'pdf-region-highlight'

function pageElement(pageNumber: number): HTMLElement | null {
    return containerRef.value?.querySelector<HTMLElement>(
        `.page-inner-container[data-page-index="${pageNumber - 1}"]`,
    ) ?? null
}

function scrollerElement(): HTMLElement | null {
    return containerRef.value?.querySelector<HTMLElement>(SCROLLER_SELECTOR) ?? null
}

/** Waits for a page to be laid out (pages render asynchronously). */
async function waitForPage(pageNumber: number, timeoutMs = 15000): Promise<HTMLElement | null> {
    const start = performance.now()
    while (performance.now() - start < timeoutMs) {
        const el = pageElement(pageNumber)
        if (el && el.getBoundingClientRect().height > 0) return el
        await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return null
}

/** Scrolls so that `offset` px from the top of `page` is `margin` px below the top of the view. */
function scrollPageOffsetIntoView(page: HTMLElement, offset: number, margin: number) {
    const scroller = scrollerElement()
    if (!scroller) return
    const pageTop = page.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
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
    if (getComputedStyle(page).position === 'static') page.style.position = 'relative'
    page.appendChild(highlight)
    return true
}

/** Keeps the highlight on its page when the viewer re-renders the pages (zoom, resize...). */
function keepHighlight(pageNumber: number, region: PdfRegion) {
    observer?.disconnect()
    const root = containerRef.value
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
    if (!pdfLoaded.value || !pageControl.value || !pageNumber || pageNumber < 1) {
        return
    }

    const current = ++navigation
    removeHighlight()

    try {
        pageControl.value.goToPage(pageNumber)
    } catch (error) {
        console.error('Error navigating to page:', error)
        return
    }

    if (!region && scrollPercent === undefined) return

    // Draws the region as soon as its page is rendered, and again if the viewer re-renders it
    if (region) keepHighlight(pageNumber, region)

    const page = await waitForPage(pageNumber)
    if (!page || current !== navigation) return
    // Let the viewer finish its own scroll to the page first
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    if (current !== navigation) return

    const scroller = scrollerElement()
    const pageHeight = page.getBoundingClientRect().height
    const viewHeight = scroller?.clientHeight ?? pageHeight

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

function onPdfLoaded() {
    pdfLoaded.value = true
    emit('pdfLoaded')

    // Navigate to initial page after PDF is loaded
    nextTick(() => {
        if (props.pageToShow) {
            scrollToPDFPage(props.pageToShow, props.scrollPercent, props.region)
        }
    })
}

function onPdfError(error: any) {
    console.error('PDF loading error:', error)
    pdfLoaded.value = false
    emit('pdfError', error)
}

// Watch for changes in the page, scroll, region or trigger props
watch(() => [props.pageToShow, props.scrollPercent, props.region, props.trigger], () => {
    if (props.pageToShow && pdfLoaded.value) {
        nextTick(() => {
            scrollToPDFPage(props.pageToShow, props.scrollPercent, props.region)
        })
    }
}, { immediate: true })

// A new document must be loaded before navigating in it
watch(() => props.pdfUrl, () => {
    pdfLoaded.value = false
    removeHighlight()
})

onBeforeUnmount(removeHighlight)
</script>

<style scoped>
.pdf-viewer-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.preview-section {
    flex: 1;
    padding: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

#pdf-preview {
    width: 100%;
    height: 100%;
    border: 1px solid var(--border);
    background-color: var(--bg-2);
    overflow-y: auto;
    overflow-x: hidden;
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

/* Ensure the PDF viewer takes full height */
:deep(.vue-pdf-viewer) {
    height: 100%;
}
</style>

<style>
/* Not scoped: the highlight is created outside of Vue, inside the viewer. The
   viewer resets borders, so the frame is an inset shadow. */
.page-inner-container > .pdf-region-highlight {
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
