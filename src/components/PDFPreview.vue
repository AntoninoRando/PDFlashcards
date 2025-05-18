<script setup lang="ts">
import { ScrollMode, VPdfViewer, ZoomLevel } from '@vue-pdf-viewer/viewer'
</script>


<template>
    <div class="pdf-uploader">
        <h2 class="text-xl font-bold mb-4">PDF Uploader</h2>

        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6"
            :class="{ 'border-blue-500 bg-blue-50': isDragging }" @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false" @drop.prevent="handleFileDrop">
            <div class="text-center">
                <div v-if="!selectedFile">
                    <p class="mt-1 text-sm text-gray-600">
                        Drag and drop your PDF here, or
                        <label class="cursor-pointer text-blue-600 hover:text-blue-800">
                            <input type="file" class="hidden" accept="application/pdf" @change="handleFileChange" />
                        </label>
                    </p>
                    <p class="mt-1 text-xs text-gray-500">PDF files only (max 10MB)</p>
                </div>
                <div v-else class="text-left">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="ml-2">
                                <p class="text-sm font-medium text-gray-900">{{ selectedFile.name }}</p>
                                <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
                            </div>
                        </div>
                        <button @click="removeFile" class="text-red-600 hover:text-red-800 text-sm font-medium">
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <VPdfViewer v-if="pdfUrl" :src="pdfUrl" :initialScrollMode="ScrollMode.Horizontal"
            :initialScale="ZoomLevel.PageWidth" ref="vpvRef" />
    </div>
</template>

<script lang="ts">
export default {
    data() {
        return {
            selectedFile: null,
            pdfUrl: null,
            isDragging: false,
        }
    },
    computed: {
        pageControl() {
            return this.$refs.vpvRef.pageControl
        }
    },
    props: {
        pageToShow: Number
    },
    watch: {
        pageToShow(newVal) {
            if (!newVal) return
            this.scrollToPDFPage(newVal)
        }
    },
    methods: {
        handleFileChange(event) {
            const file = event.target.files[0];
            if (file && file.type === 'application/pdf') {
                this.processFile(file);
            }
        },
        handleFileDrop(event) {
            this.isDragging = false;
            const file = event.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                this.processFile(file);
            } else {
                alert('Please upload a PDF file');
            }
        },
        processFile(file) {
            // Check file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size exceeds 10MB limit');
                return;
            }

            this.selectedFile = file;

            // Create blob URL for preview
            if (this.pdfUrl) {
                URL.revokeObjectURL(this.pdfUrl);
            }
            this.pdfUrl = URL.createObjectURL(file);

            // Emit an event with the file for parent components
            this.$emit('file-selected', file)
        },
        removeFile() {
            this.selectedFile = null;
            if (this.pdfUrl) {
                URL.revokeObjectURL(this.pdfUrl);
                this.pdfUrl = null;
            }
            this.$emit('file-removed');
        },
        downloadPdf() {
            if (!this.pdfUrl) return;

            const link = document.createElement('a');
            link.href = this.pdfUrl;
            link.download = this.selectedFile.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';

            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },
        scrollToPDFPage(pageNumber: number) {
            this.pageControl.goToPage(pageNumber)
        }
    },
    beforeUnmount() {
        // Clean up any object URLs to prevent memory leaks
        if (this.pdfUrl) {
            URL.revokeObjectURL(this.pdfUrl);
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