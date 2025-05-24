<template>
    <div class="pdf-uploader">
        <h2 class="text-xl font-bold mb-4">PDF Uploader</h2>

        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6"
            :class="{ 'border-blue-500 bg-blue-50': isDragging }" 
            @dragover.prevent="handleDragOver"
            @dragenter.prevent="handleDragEnter"
            @dragleave.prevent="handleDragLeave" 
            @drop.prevent="handleFileDrop">
            <div class="text-center">
                <div v-if="!selectedFile">
                   <input type="file" class="hidden" accept="application/pdf" @change="handleFileChange" />
                </div>
                <div v-else class="text-left">
                    <div class="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                        <div class="flex space-x-2">
                            <button @click="downloadPdf" 
                                class="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors">
                                Download
                            </button>
                            <button @click="removeFile" 
                                class="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Error message display -->
        <div v-if="errorMessage" class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {{ errorMessage }}
        </div>
    </div>
</template>

<script lang="ts">
export default {
    emits: ['file-selected', 'file-removed'],
    data() {
        return {
            selectedFile: null as File | null,
            pdfUrl: null as string | null,
            isDragging: false,
            errorMessage: null as string | null,
            dragCounter: 0
        }
    },
    methods: {
        handleFileChange(event: Event) {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
                this.validateAndProcessFile(file);
            }
            // Reset input value to allow selecting the same file again
            target.value = '';
        },

        handleDragOver(event: DragEvent) {
            event.preventDefault();
        },

        handleDragEnter(event: DragEvent) {
            event.preventDefault();
            this.dragCounter++;
            this.isDragging = true;
        },

        handleDragLeave(event: DragEvent) {
            event.preventDefault();
            this.dragCounter--;
            if (this.dragCounter === 0) {
                this.isDragging = false;
            }
        },

        handleFileDrop(event: DragEvent) {
            event.preventDefault();
            this.isDragging = false;
            this.dragCounter = 0;
            
            const files = event.dataTransfer?.files;
            const file = files?.[0];
            
            if (file) {
                this.validateAndProcessFile(file);
            }
        },

        validateAndProcessFile(file: File) {
            this.errorMessage = null;

            // Validate file type
            if (file.type !== 'application/pdf') {
                this.errorMessage = 'Please upload a PDF file only.';
                return;
            }

            // Validate file size (10MB limit)
            const maxSize = 10 * 1024 * 1024; // 10MB in bytes
            if (file.size > maxSize) {
                this.errorMessage = 'File size exceeds 10MB limit. Please choose a smaller file.';
                return;
            }

            // Validate file name
            if (!file.name || file.name.trim() === '') {
                this.errorMessage = 'Invalid file name.';
                return;
            }

            this.processFile(file);
        },

        processFile(file: File) {
            try {
                // Clean up previous file URL
                if (this.pdfUrl) {
                    URL.revokeObjectURL(this.pdfUrl);
                }

                this.selectedFile = file;
                this.pdfUrl = URL.createObjectURL(file);

                // Emit event with file data
                this.$emit('file-selected', {
                    file: file,
                    url: this.pdfUrl
                });

                console.log(`PDF uploaded: ${file.name} (${this.formatFileSize(file.size)})`);
            } catch (error) {
                console.error('Error processing file:', error);
                this.errorMessage = 'Error processing the file. Please try again.';
            }
        },

        removeFile() {
            try {
                // Clean up object URL
                if (this.pdfUrl) {
                    URL.revokeObjectURL(this.pdfUrl);
                }

                // Reset state
                this.selectedFile = null;
                this.pdfUrl = null;
                this.errorMessage = null;

                // Emit removal event
                this.$emit('file-removed');

                console.log('PDF file removed');
            } catch (error) {
                console.error('Error removing file:', error);
            }
        },

        downloadPdf() {
            if (!this.pdfUrl || !this.selectedFile) {
                this.errorMessage = 'No file available for download.';
                return;
            }

            try {
                const link = document.createElement('a');
                link.href = this.pdfUrl;
                link.download = this.selectedFile.name;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                console.log(`Downloaded: ${this.selectedFile.name}`);
            } catch (error) {
                console.error('Error downloading file:', error);
                this.errorMessage = 'Error downloading the file. Please try again.';
            }
        },

        formatFileSize(bytes: number): string {
            if (bytes === 0) return '0 Bytes';

            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    },

    beforeUnmount() {
        // Clean up object URL to prevent memory leaks
        if (this.pdfUrl) {
            URL.revokeObjectURL(this.pdfUrl);
        }
    }
}
</script>

<style scoped>
.pdf-uploader {
    max-width: 100%;
}

.border-dashed {
    transition: all 0.2s ease-in-out;
}

.border-dashed:hover {
    border-color: #93c5fd;
    background-color: #eff6ff;
}

/* Remove unused styles that don't belong to uploader */
</style>