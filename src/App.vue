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
        <nav class="navbar">
            <div class="navbar-buttons">
                <button class="nav-btn">PDFs</button>
                <button class="nav-btn">Studysets</button>
            </div>
        </nav>

        <div class="row">
            <div class="pdf-section column">
                <PDFUploader @file-selected="addToCache" />
                <PDFPreview 
                    v-if="studySet?.resources?.length" 
                    ref="PDF"
                    :pageToShow="pageToShow" 
                    :pdf-url="pdfCache[studySet.resources[0].trim()]" 
                />
            </div>

            <div class="flashcards-section column">
                <FileParser v-if="!studySet" 
                    @setUploaded="loadStudySet" />
                <StudySet 
                    v-else
                    @reveal="showPage"
                    :flashcards="studySet.flashcards"
                    :title="studySet.title"
                    :resources="studySet.resources" 
                />
            </div>
        </div>
    </div>
</template>



<style scoped>
.navbar {
    width: 100%;
    height: 80px;
    background-color: #0d1b2a;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 1000;
}

.navbar-buttons {
    display: flex;
    gap: 1.5rem;
}

.nav-btn {
    background-color: #0d1b2a;
    color: #ffffff;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.nav-btn:hover {
    background-color: #4b5563;
}


.app-container {
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    font-family: 'Inter', 'Segoe UI', sans-serif;
    display: flex;
    flex-direction: column;
}

.row {
    display: flex;
    flex: 1;
    width: 100vw;
    margin: 0;
    padding: 0;
    overflow: hidden;
}

.column {
    width: 50vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    border-radius: 0;
    overflow: hidden;
}

.pdf-section {
    padding: 1rem;
    box-sizing: border-box;
}

.flashcards-section {
    padding: 1rem;
    box-sizing: border-box;
}

.divider {
    margin: 24px 0;
    border: none;
    border-top: 1px solid #e5e7eb;
}

.no-pdf-message,
.no-studyset-message {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: #6b7280;
    text-align: center;
    padding: 2rem;
    background-color: #fefefe;
    border: 1px dashed #d1d5db;
    border-radius: 12px;
    margin-top: 1rem;
}

.no-pdf-message p,
.no-studyset-message p {
    font-size: 17px;
    margin: 0;
    line-height: 1.6;
}

/* Responsive design */
@media (max-width: 768px) {
    .row {
        flex-direction: column;
    }

    .column {
        width: 100vw;
        height: 50vh;
    }

    .pdf-section {
        border-right: none;
        border-bottom: 1px solid #e5e7eb;
    }
}
</style>

