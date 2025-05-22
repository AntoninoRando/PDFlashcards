<template>
    <VPdfViewer :src="pdfUrl" :initialScrollMode="ScrollMode.Page" :initialScale="ZoomLevel.PageFit"
        ref="vpvRef" />
</template>

<script setup lang="ts">
import { ScrollMode, VPdfViewer, ZoomLevel } from '@vue-pdf-viewer/viewer'
import { ref, computed, onMounted, watch } from 'vue'

// Create a ref to hold the VPdfViewer component
const vpvRef = ref<InstanceType<typeof VPdfViewer>>()
const pageControl = computed(() => vpvRef.value?.pageControl)

const props = defineProps<{
    pdfUrl: string
    pageToShow: number
}>()

function scrollToPDFPage(pageNumber: number) {
    if (pageControl.value) {
        pageControl.value.goToPage(pageNumber)
    }
}

// Use onMounted to ensure the component is ready before scrolling
onMounted(() => {
    if (props.pageToShow) {
        scrollToPDFPage(props.pageToShow)
    }
})

// Watch for changes in pageToShow prop
watch(() => props.pageToShow, (newPage) => {
    if (newPage) {
        scrollToPDFPage(newPage)
    }
}, { immediate: false })

</script>

<style scoped>
.preview-section {
    flex: 1;
    padding: 20px;
    overflow: hidden;
    /* Changed from auto to hidden */
    display: flex;
    flex-direction: column;
}

#pdf-preview {
    width: 100%;
    height: 100%;
    border: 1px solid #ddd;
    background-color: #f9f9f9;
    overflow-y: auto;
    /* Added scroll for this container only */
    overflow-x: hidden;
}

.no-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 500px;
    color: #999;
    text-align: center;
}
</style>