<script setup lang="ts">
import { ScrollMode, VPdfViewer, ZoomLevel } from '@vue-pdf-viewer/viewer'
</script>


<template>
    <VPdfViewer
        :src="pdfUrl"
        :initialScrollMode="ScrollMode.Horizontal"
        :initialScale="ZoomLevel.PageWidth" 
        ref="vpvRef" />
</template>

<script lang="ts">
export default {
    props: {
        pdfUrl: String
    },
    methods: {
        scrollToPDFPage(pageNumber: number) {
            this.pageControl.goToPage(pageNumber)
        }
    }
}
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