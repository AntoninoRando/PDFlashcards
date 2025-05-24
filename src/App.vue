<script setup lang="ts">
import { ref, reactive } from 'vue'
import StudySet from './components/Flashcards/StudySet.vue'
import PDFPreview from './components/PDFPreview.vue'
import FileParser from './components/FileParser.vue'
import PDFUploader from './components/PDFUploader.vue'

// Define types
interface Flashcard {
    frontText: string
    pageRef: number
    reviewedAt: Date
    ease: number
    [key: string]: any
}

interface StudySetData {
    title: string
    resources: string[]
    flashcards: Flashcard[]
}

interface FileUploadItem {
    file: File
    url: string
}

// Reactive data
const pageToShow = ref<number>(1)
const studySet = ref<StudySetData | null>(null)
const pdfCache = reactive<Record<string, string>>({})

// Methods
function showPage(flashcard: Flashcard | null) {
    if (!flashcard) {
        console.error('Revealed nothing')
        return
    }

    if (!flashcard.pageRef) {
        console.error('Revealed card has no page')
        return
    }

    pageToShow.value = flashcard.pageRef
    console.log(`Showing page ${pageToShow.value}`)
}

function loadStudySet(newStudySet: StudySetData) {
    studySet.value = newStudySet
    console.info(`Loaded study set: 
        - title: ${newStudySet.title}
        - resources: ${newStudySet.resources}
        - flashcards: ${newStudySet.flashcards.length}`)
}

function addToCache(item: FileUploadItem) {
    if (!item.file?.name || !item.url) {
        console.error('Invalid file upload item:', item)
        return
    }
    
    pdfCache[item.file.name] = item.url
    console.log(`Added to cache: ${item.file.name}; ${item.url}`)
}
</script>

<template>
    <div class="app-container">
        <div class="row">
            <div class="pdf-section column">
                <PDFUploader @file-selected="addToCache" />
                <PDFPreview 
                    v-if="studySet?.resources?.length" 
                    ref="PDF"
                    :pageToShow="pageToShow" 
                    :pdf-url="pdfCache[studySet.resources[0].trim()]" 
                />
                <div v-else class="no-pdf-message">
                    <p>Upload a study set file to see PDF preview</p>
                </div>
            </div>

            <div class="flashcards-section column">
                <FileParser @setUploaded="loadStudySet" />
                <hr class="divider">
                <StudySet 
                    v-if="studySet"
                    @reveal="showPage"
                    :flashcards="studySet.flashcards"
                    :title="studySet.title"
                    :resources="studySet.resources" 
                />
                <div v-else class="no-studyset-message">
                    <p>Upload a study set file to begin studying</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.app-container {
    height: 100vh;
    width: 100vw;
    overflow: hidden;
}

.row {
    display: flex;
    height: 100%;
}

.column {
    flex: 1;
    width: 50%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.pdf-section {
    border-right: 1px solid #e0e0e0;
    background-color: #fafafa;
}

.flashcards-section {
    background-color: #ffffff;
}

.divider {
    margin: 20px 0;
    border: none;
    border-top: 1px solid #e0e0e0;
}

.no-pdf-message,
.no-studyset-message {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: #666;
    text-align: center;
    padding: 40px;
}

.no-pdf-message p,
.no-studyset-message p {
    font-size: 16px;
    margin: 0;
}

/* Responsive design */
@media (max-width: 768px) {
    .row {
        flex-direction: column;
    }
    
    .column {
        width: 100%;
        height: 50vh;
    }
    
    .pdf-section {
        border-right: none;
        border-bottom: 1px solid #e0e0e0;
    }
}
</style>