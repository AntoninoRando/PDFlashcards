<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, useTemplateRef } from 'vue'
import StudySet from './components/Flashcards/StudySet.vue'
import PDFPreview from './components/PDFPreview.vue'
import FileParser from './components/FileParser.vue'
import PDFUploader from './components/PDFUploader.vue'
import GestureRecognizer from './components/GestureRecognizer/GestureRecognizer.vue'
import VoiceRecognizer from './components/VoiceRecognizer/VoiceRecognizer.vue'

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
const isScrolled = ref<boolean>(false)
const mousePosition = ref({ x: 0, y: 0 })

// Refs
const studySetComponent = ref(null)

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

function handleScroll() {
    isScrolled.value = window.scrollY > 50
}

function handleMouseMove(event: MouseEvent) {
    const banner = event.currentTarget as HTMLElement
    const rect = banner.getBoundingClientRect()
    mousePosition.value = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    }
}

function commandRecognized(command: string) {
    console.log('Executing action for command ' + command)
    command = command.toLowerCase().trim()

    if (command == 'show') {
        studySetComponent.value.revealCurrent();
    }

    const recallTypes = ['hide', 'forgot', 'bad', 'not bad', 'ok']
    recallTypes.forEach((t) => {
        if (command == t) {
            studySetComponent.value.hideCurrent(t);
        }
    });
}

onMounted(() => {
    window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
    <div class="app-container">
        <!-- Logo Banner -->
        <div class="logo-banner" :class="{ 'hidden': isScrolled }" @mousemove="handleMouseMove">
            <div class="dots-pattern" :style="{
                '--mouse-x': mousePosition.x + 'px',
                '--mouse-y': mousePosition.y + 'px'
            }"></div>
            <div class="logo-container">
                <img src="@/assets/WebLogo.svg" alt="Logo" class="logo" />
            </div>
        </div>

        <!-- Sticky Navbar -->
        <nav class="navbar" :class="{ 'sticky': isScrolled }">
            <div class="navbar-buttons">
                <button class="nav-btn">PDF</button>
                <button class="nav-btn">Studysets</button>
                <GestureRecognizer @command-recognized="commandRecognized" />
                <VoiceRecognizer @command-recognized="commandRecognized" />
            </div>
        </nav>

        <div class="content-wrapper">
            <div class="row">
                <div class="pdf-section column">
                    <PDFUploader @file-selected="addToCache" />
                    <PDFPreview v-if="studySet?.resources?.length" ref="PDF" :pageToShow="pageToShow"
                        :pdf-url="pdfCache[studySet.resources[0].trim()]" />
                </div>

                <div class="flashcards-section column">
                    <FileParser v-if="!studySet" @setUploaded="loadStudySet" />
                    <StudySet ref="studySetComponent" v-else @reveal="showPage" :flashcards="studySet.flashcards"
                        :title="studySet.title" :resources="studySet.resources" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.app-container {
    min-height: 100vh;
    width: 100vw;
    font-family: 'Inter', 'Segoe UI', sans-serif;
    display: flex;
    flex-direction: column;
}

/* Logo Banner */
.logo-banner {
    position: relative;
    width: 100%;
    height: 120px;
    background: linear-gradient(135deg, #edf6f9 0%, #edf6f9 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: all 0.3s ease;
    transform: translateY(0);
    opacity: 1;
}

.logo-banner.hidden {
    transform: translateY(-100%);
    opacity: 0;
    height: 0;
}

.dots-pattern {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
        radial-gradient(circle at 25px 25px, rgba(87, 87, 87, 0.3) 2px, transparent 2px),
        radial-gradient(circle at 75px 75px, rgba(87, 87, 87, 0.3) 2px, transparent 2px);
    background-size: 50px 50px;
    background-position: 0 0, 25px 25px;
    transition: opacity 0.3s ease;
    --mouse-x: 0px;
    --mouse-y: 0px;
}

.dots-pattern::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
        radial-gradient(circle at 25px 25px, rgba(87, 87, 87, 0.8) 2px, transparent 2px),
        radial-gradient(circle at 75px 75px, rgba(87, 87, 87, 0.8) 2px, transparent 2px);
    background-size: 50px 50px;
    background-position: 0 0, 25px 25px;
    opacity: 0;
    transition: opacity 0.2s ease;
    -webkit-mask: radial-gradient(circle 120px at var(--mouse-x) var(--mouse-y), black 0%, black 50%, transparent 70%);
    mask: radial-gradient(circle 120px at var(--mouse-x) var(--mouse-y), black 0%, black 50%, transparent 70%);
}

.logo-banner:hover .dots-pattern::before {
    opacity: 1;
}

.logo-container {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo {
    height: 60px;
    width: auto;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

/* Sticky Navbar */
.navbar {
    width: 100%;
    height: 25px;
    background-color: #000000;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    transition: all 0.3s ease;
    box-shadow: 0 -4px 8px 0 rgba(0, 0, 0, 0.3), 0 -6px 20px 0 rgba(0, 0, 0, 0.19);
}

.navbar.sticky {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.navbar-buttons {
    display: flex;
    gap: 2rem;
}

.nav-btn {
    background-color: transparent;
    color: #ffffff;
    border: none;
    padding: 0.75rem 2rem;
    font-size: 1em;
    font-weight: bolder;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.nav-btn:hover {
    background-color: #ffffff;
    color: #000000;
    border-color: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(255, 255, 255, 0.2);
}

/* Content */
.content-wrapper {
    flex: 1;
    padding-top: 0;
    transition: padding-top 0.3s ease;
}

.navbar.sticky+.content-wrapper {
    padding-top: 60px;
}

.row {
    display: flex;
    min-height: calc(100vh - 180px);
    width: 100vw;
    margin: 0;
    padding: 0;
}

.column {
    width: 50vw;
    display: flex;
    flex-direction: column;
    border-radius: 0;
    overflow: auto;
}

.pdf-section {
    padding: 1.5rem;
    box-sizing: border-box;
    border-right: 1px solid #e5e7eb;
}

.flashcards-section {
    padding: 1.5rem;
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
    .logo-banner {
        height: 80px;
    }

    .logo {
        height: 40px;
    }

    .navbar {
        height: 50px;
    }

    .navbar.sticky+.content-wrapper {
        padding-top: 50px;
    }

    .row {
        flex-direction: column;
        min-height: calc(100vh - 130px);
    }

    .column {
        width: 100vw;
        min-height: 50vh;
    }

    .pdf-section {
        border-right: none;
        border-bottom: 1px solid #e5e7eb;
    }

    .navbar-buttons {
        gap: 1rem;
    }

    .nav-btn {
        padding: 0.5rem 1.5rem;
        font-size: 0.9rem;
    }
}

/* Smooth scrolling for the entire page */
html {
    scroll-behavior: smooth;
}
</style>