<template>
    <div class="pdf-viewer-container">
        <VPdfViewer 
            v-if="pdfUrl"
            :src="pdfUrl" 
            :initialScrollMode="ScrollMode.Page" 
            :initialScale="ZoomLevel.PageWidth"
            :toolbar-options="true"
            ref="vpvRef"
            @loaded="onPdfLoaded"
            @error="onPdfError"
        />
        <div v-else class="no-preview">
            <p>No PDF selected</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ScrollMode, VPdfViewer, ZoomLevel } from '@vue-pdf-viewer/viewer'
import { ref, computed, onMounted, watch, nextTick } from 'vue'

// Create a ref to hold the VPdfViewer component
const vpvRef = ref<InstanceType<typeof VPdfViewer>>()
const pdfLoaded = ref(false)

const pageControl = computed(() => vpvRef.value?.pageControl)

const props = defineProps<{
    pdfUrl: string
    pageToShow: number
    scrollPercent?: number
}>()

const emit = defineEmits<{
    pdfLoaded: []
    pdfError: [error: any]
}>()

function scrollToPDFPage(pageNumber: number, scrollPercent?: number) {
    if (!pdfLoaded.value || !pageControl.value || !pageNumber || pageNumber < 1) {
        return
    }

    try {
        pageControl.value.goToPage(pageNumber)

        // If a scroll percentage is specified, scroll within the page
        if (scrollPercent !== undefined && vpvRef.value) {
            nextTick(() => {
                const viewerElement = vpvRef.value?.$el?.querySelector('.vue-pdf-viewer__body')
                if (viewerElement) {
                    const scrollHeight = viewerElement.scrollHeight - viewerElement.clientHeight
                    const scrollPosition = (scrollPercent / 100) * scrollHeight
                    viewerElement.scrollTop = scrollPosition
                }
            })
        }
    } catch (error) {
        console.error('Error navigating to page:', error)
    }
}

function onPdfLoaded() {
    pdfLoaded.value = true
    emit('pdfLoaded')

    // Navigate to initial page after PDF is loaded
    nextTick(() => {
        if (props.pageToShow) {
            scrollToPDFPage(props.pageToShow, props.scrollPercent)
        }
    })
}

function onPdfError(error: any) {
    console.error('PDF loading error:', error)
    pdfLoaded.value = false
    emit('pdfError', error)
}

// Watch for changes in pageToShow or scrollPercent props
watch(() => [props.pageToShow, props.scrollPercent], ([newPage, newScrollPercent]) => {
    if (newPage && pdfLoaded.value) {
        nextTick(() => {
            scrollToPDFPage(newPage as number, newScrollPercent as number | undefined)
        })
    }
}, { immediate: false })

// Watch for PDF URL changes
watch(() => props.pdfUrl, () => {
    pdfLoaded.value = false
}, { immediate: false })

// Clean up on unmount
onMounted(() => {
    // Initial setup if needed
})
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
    border: 1px solid #ddd;
    background-color: #f9f9f9;
    overflow-y: auto;
    overflow-x: hidden;
}

.no-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 500px;
    color: #999;
    text-align: center;
    flex: 1;
}

/* Ensure the PDF viewer takes full height */
:deep(.vue-pdf-viewer) {
    height: 100%;
}
</style>