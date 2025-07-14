<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import StudySet from './components/Flashcards/StudySet.vue'
import PDFPreview from './components/PDFPreview.vue'
import FileParser from './components/FileParser.vue'
import PDFUploader from './components/PDFUploader.vue'
import GestureRecognizer from './components/GestureRecognizer/GestureRecognizer.vue'
import VoiceRecognizer from './components/VoiceRecognizer/VoiceRecognizer.vue'
import { IStudySet } from './FlashcardParser/FlashcardsParser'

// Define types
interface Flashcard {
    frontText: string;
    pageRef: number;
    reviewedAt: Date;
    ease: number;
    interval: number;
    learningPhase: boolean;
    subParts: any[];
    [key: string]: any;
}


interface FileUploadItem {
    file: File;
    url: string;
}

// Reactive data
const pageToShow = ref<number>(1)
const studySet = ref<IStudySet | null>(null)
const pdfCache = reactive<Record<string, string>>({})
const isScrolled = ref<boolean>(false)
const mousePosition = ref({ x: 0, y: 0 })
const cardRevealed = ref<boolean>(false)

// Refs
const studySetComponent = ref(null)
const gestureRecognizer = ref(null)

// Methods
function showPage(flashcard: Flashcard | null) {
    if (!flashcard) {
        console.error('Revealed nothing')
        return
    }

    let pageRefNum = null;
    for (let component of (flashcard.subParts || [])) {
        if (component.name == 'pageref') {
            pageRefNum = component.ref;
            break;
        }
    }

    if (!pageRefNum) {
        console.error('Revealed card has no page')
        return
    }

    pageToShow.value = pageRefNum
    console.log(`Showing page ${pageToShow.value}`)
    cardRevealed.value = true
}

function cardHidden() {
    cardRevealed.value = false
}

function loadStudySet(newStudySet: IStudySet) {
    studySet.value = newStudySet
    console.info(`Loaded study set: ${JSON.stringify(newStudySet, null, 2)}`)
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

    if (command == 'next page') {
        pageToShow.value = pageToShow.value + 1
    } else if (command == 'previous page') {
        pageToShow.value = pageToShow.value - 1
    }

    if (command == 'point') {
        gestureRecognizer.value.enablePointing();
    } else if (command == 'stop point' || command == 'that') {
        gestureRecognizer.value.disablePointing();
        commandRecognized(gestureRecognizer.value.currentPointing);
    }
}

function highlightPointing(command: string) {
    console.log('Passing over: ' + command);
    studySetComponent.value.point(command);
}

const isPointing = computed(() => gestureRecognizer.value?.pointing || false)

const totalCards = computed(() => studySet.value?.flashcards.length || 0)
const studiedCards = computed(() => studySet.value?.studiedCards || 0)
const progressPercent = computed(() => {
    if (!totalCards.value) return 0
    return (studiedCards.value / totalCards.value) * 100
})

onMounted(() => {
    // let vid = document.getElementById("video-bg");
    // vid.playbackRate = 0.3;
    window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
    <!-- Full Screen Video Background -->
    <!-- <video autoplay muted loop id="video-bg">
        <source src="./bg.mp4" type="video/mp4">
        Your browser does not support the video tag.
    </video> -->

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
                <GestureRecognizer ref="gestureRecognizer" class=" nav-btn" @command-recognized="commandRecognized"
                    @pointing-changed="highlightPointing" />
                <VoiceRecognizer class="nav-btn" @command-recognized="commandRecognized" />
            </div>
        </nav>
        <div v-if="studySet" class="progress-container">
            <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
            <div class="progress-label">{{ studiedCards }}/{{ totalCards }}</div>
        </div>

        <div class="content-wrapper" :class="{ 'pointing': isPointing }">
            <div class="single-column">
                <div v-if="studySet" class="pdf-section">
                    <PDFUploader @file-selected="addToCache" />
                    <PDFPreview v-show="cardRevealed" ref="PDF" :pageToShow="pageToShow"
                        :pdf-url="pdfCache[studySet.resources[0].trim()]" />
                </div>

                <div class="flashcard-wrapper" :class="{ revealed: cardRevealed }">
                    <FileParser v-if="!studySet" @setUploaded="loadStudySet" />
                    <StudySet ref="studySetComponent" v-else @reveal="showPage" @hide="cardHidden"
                        :flashcards="studySet.flashcards"
                        :resources="studySet.resources"
                        :studySet="studySet"/>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Full Screen Video Background */
#video-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    object-fit: cover;
    z-index: -1;
}

.pointing-border {
    border: 5px solid rgb(255, 0, 0) !important;
    border-radius: 8px !important;
    transition: all 0.3s ease !important;
    box-shadow: 0 0 20px rgba(255, 0, 0, 0.3) !important;
}

.app-container {
    position: relative;
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
    background: linear-gradient(135deg, rgba(237, 246, 249, 0.9) 0%, rgba(237, 246, 249, 0.9) 100%);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: all 0.3s ease;
    transform: translateY(0);
    opacity: 1;
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.3);
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
    height: 60px;
    color: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    transition: all 0.3s ease;
}

.navbar.sticky {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
}

.navbar-buttons {
    display: flex;
    gap: 2rem;
}

.progress-container {
    position: relative;
    width: 100%;
    height: 20px;
    background-color: #e5e7eb;
    margin-top: 4px;
    border-radius: 10px;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    background-color: rgb(180, 0, 0);
    transition: width 0.3s ease;
}

.progress-label {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: 600;
    color: #000;
    pointer-events: none;
}

.nav-btn {
    background-color: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #000000;
    padding: 0.75rem 2rem;
    font-size: 1em;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.nav-btn:hover {
    background-color: rgba(255, 255, 255, 0.25);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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

.single-column {
    position: relative;
    width: 100%;
    min-height: calc(100vh - 180px);
}

/* PDF Preview Component Shadows */
.pdf-section :deep(.pdf-preview),
.pdf-section :deep(canvas),
.pdf-section :deep(.pdf-page),
.pdf-section :deep(.pdf-container) {
    box-shadow: 
        0 20px 25px -5px rgba(0, 0, 0, 0.1),
        0 10px 10px -5px rgba(0, 0, 0, 0.04),
        0 0 0 1px rgba(0, 0, 0, 0.05);
    border-radius: 8px;
}

.pdf-section {
    position: absolute;
    top: 2rem;
    left: 2rem;
    right: 2rem;
    bottom: 2rem;
    padding: 1.5rem;
    box-sizing: border-box;
    overflow: auto;
    display: flex;
    flex-direction: column;
}

.flashcard-wrapper {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    transition: all 0.5s ease;
    z-index: 10;
}

.flashcard-wrapper.revealed {
    top: auto;
    bottom: 20px;
    transform: translateX(-50%);
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
    background-color: rgba(254, 254, 254, 0.95);
    backdrop-filter: blur(10px);
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

    .single-column {
        min-height: calc(100vh - 130px);
    }

    .pdf-section {
        top: 1rem;
        left: 1rem;
        right: 1rem;
        bottom: 1rem;
    }

    .navbar-buttons {
        gap: 1rem;
    }

    .nav-btn {
        padding: 0.5rem 1.5rem;
        font-size: 0.9rem;
    }
    .progress-container {
        height: 16px;
    }
}

/* Smooth scrolling for the entire page */
html {
    scroll-behavior: smooth;
}
</style>