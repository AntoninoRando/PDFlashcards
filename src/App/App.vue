<script setup lang="ts">
import StudySet from '../Components/Flashcards/StudySet.vue'
import Resources from '../Components/Resources.vue'
import FileParser from '../Components/FileParser.vue'
import PDFUploader from '../Components/PDFUploader.vue'
import GestureRecognizer from '../Components/GestureRecognizer/GestureRecognizer.vue'
import VoiceRecognizer from '../Components/VoiceRecognizer/VoiceRecognizer.vue'
import TextEditor from '../Components/TextEditor.vue'
import ShuffleMenu from '../Components/ShuffleMenu.vue'
import ShortcutsSidebar from '../Components/ShortcutsSidebar.vue'
import { useApp } from './UseApp'
import { SortModes } from '@/FlashcardsScheduler'
import { computed } from 'vue'

const {
  pageToShow,
  scrollPercentToShow,
  studySet,
  pdfCache,
  pdfToShow,
  resourcePages,
  isScrolled,
  mousePosition,
  cardRevealed,
  uploadedText,
  editorVisible,
  studySetComponent,
  gestureRecognizer,
  showPage,
  cardHidden,
  loadStudySet,
  openEditor,
  closeEditor,
  saveEdited,
  addStudyResource,
  handleMouseMove,
  commandRecognized,
  highlightPointing,
  isPointing,
  totalCards,
  remainingCards,
  progressPercent
} = useApp()

const shuffleOriginalOrder = () => {
  studySetComponent.value?.shuffleFlashcards(SortModes.originalOrder)
}
const shuffleRandomOrder = () => {
  studySetComponent.value?.shuffleFlashcards(SortModes.random)
}
const shuffleLearnOrder = () => {
  studySetComponent.value?.shuffleFlashcards(SortModes.learningPriority)
}

// Build the resources list (PDF-only for now) and keep the current one on top
const resourcesList = computed(() => {
  const set = studySet.value
  if (!set) return [] as any[]

  const aliases = Object.keys(set.resources || {})
  const items: any[] = []

  for (const pdfFileName of Object.keys(pdfCache)) {
    const url = pdfCache[pdfFileName];
    if (!url) continue;
    const page = resourcePages[pdfFileName] ?? (pdfToShow.value === pdfFileName ? pageToShow.value : 1)
    const scrollPercent = pdfToShow.value === pdfFileName ? scrollPercentToShow.value : undefined
    let alias = aliases.find(a => set.resources[a] === pdfFileName) || null;
    alias = alias !== null ? set.resources[alias] : pdfFileName;
    items.push({ type: 'pdf', pdfUrl: url, pageToShow: page, scrollPercent, _alias: alias })
  }

  // Ensure the currently selected PDF (pdfToShow) appears first in the list
  const idx = items.findIndex(it => it._alias === pdfToShow.value)
  if (idx > 0) {
    const [sel] = items.splice(idx, 1)
    items.unshift(sel)
  }

  return items
})

function onResourceChanged(item: any) {
  if (item && typeof item === 'object' && item._alias) {
    pdfToShow.value = item._alias
    const page = resourcePages[item._alias]
    if (typeof page === 'number' && page > 0) {
      pageToShow.value = page
    }
  }
}
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
        <img src="@/Assets/WebLogo.svg" alt="Logo" class="logo" />
      </div>

      <nav class="navbar" :class="{ 'sticky': isScrolled }">
        <div class="navbar-buttons">
          <button class="nav-btn">PDF</button>
          <button class="nav-btn">Studysets</button>
          <button class="nav-btn" v-if="studySet" @click="openEditor">Edit</button>
          <!-- <GestureRecognizer ref="gestureRecognizer" class=" nav-btn" @command-recognized="commandRecognized"
            @pointing-changed="highlightPointing" /> -->
          <VoiceRecognizer class="nav-btn" @command-recognized="commandRecognized" />
        </div>
      </nav>
    </div>


    <!-- Sticky Navbar -->
    <div v-if="studySet" class="progress-container">
      <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
      <div class="progress-label">{{ remainingCards }}/{{ totalCards }}</div>
    </div>

    <!-- Shortcuts Sidebar -->
    <ShortcutsSidebar id="shortcuts-sidebar" v-if="studySet" :cardRevealed="cardRevealed" />


    <div class="content-wrapper" :class="{ 'pointing': isPointing }">
      <div class="single-column">
        <PDFUploader @uploaded="addStudyResource" />
        <div v-if="studySet && cardRevealed" class="pdf-section">
          <Resources :resources="resourcesList" @changed="onResourceChanged" />
        </div>

        <div class="flashcard-wrapper" :class="{ revealed: cardRevealed, initial: !studySet }">
          <FileParser v-if="!studySet" @setUploaded="loadStudySet" />
          <StudySet ref="studySetComponent" v-else @reveal="showPage" @hide="cardHidden" :studySet="studySet" />
        </div>
      </div>
    </div>

    <!-- The text editor that allows to modify the StudySet file directly in 
    app. -->
    <TextEditor v-if="editorVisible" :model-value="uploadedText" @close="closeEditor" @save="saveEdited" />

    <!-- Wheel of options to manipulate the StudySet, e.g. by showing the cards
    in order instead of "randomly". -->
    <ShuffleMenu v-if="studySet" @order-original="shuffleOriginalOrder" @order-random="shuffleRandomOrder"
      @order-learn="shuffleLearnOrder" />

  </div>
</template>





<style scoped>
#shortcuts-sidebar {
  position: fixed;
  top: 150px;
  z-index: 1000;
  left: 0; /* override previous left so we can animate via transform */
  transform: translateX(-200px);
  transition: transform 300ms cubic-bezier(.2,.9,.2,1);
  will-change: transform;
}
#shortcuts-sidebar:hover {
  transform: translateX(0);
}

.pointing-border {
  border: 5px solid rgb(255, 0, 0) !important;
  border-radius: 8px !important;
  transition: all 0.3s ease !important;
  box-shadow: 0 0 20px rgba(255, 0, 0, 0.3) !important;
}

.app-container {
  position: relative;
  min-height: 120vh;
  width: 90vw;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  display: flex;
  flex-direction: column;
}

/* Logo Banner */
.logo-banner {
  position: relative;
  width: calc(100% - 2rem);
  height: 120px;
  background: linear-gradient(135deg, rgba(237, 246, 249, 0.9) 0%, rgba(237, 246, 249, 0.9) 100%);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.3s ease;
  transform: translateY(-20px);
  opacity: 1;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.3);
  border-radius: 16px;
}

.logo-banner.hidden {
  transform: translateY(-100%);
  opacity: 0;
  height: 0;
  margin: 0;
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
  border-radius: 16px;
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
  border-radius: 16px;
}

.logo-banner:hover .dots-pattern::before {
  opacity: 1;
}

.logo-container {
  position: relative;
  margin-left: 25px;
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
  width: calc(100% - 2rem);
  height: 3px;
  background-color: transparent;
  margin: 0 1rem;
  border-radius: 2px;
  overflow: visible;
  /* Changed from hidden to visible */
}

.progress-bar {
  height: 100%;
  background-color: rgb(180, 0, 0);
  transition: width 0.3s ease;
}

.progress-label {
  position: absolute;
  top: -25px;
  /* Moved further up for better visibility */
  left: 50%;
  /* Centered horizontally */
  transform: translateX(-50%);
  /* Perfect center alignment */
  font-size: 0.875rem;
  /* Slightly larger for better readability */
  font-weight: 600;
  /* Bolder for better visibility */
  color: #374151;
  /* Darker color for better contrast */
  background-color: rgba(255, 255, 255, 0.9);
  /* Semi-transparent background */
  padding: 2px 8px;
  /* Padding for better readability */
  border-radius: 4px;
  /* Rounded corners */
  backdrop-filter: blur(4px);
  /* Subtle blur effect */
  border: 1px solid rgba(0, 0, 0, 0.1);
  /* Subtle border */
  pointer-events: none;
  white-space: nowrap;
  /* Prevent text wrapping */
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

.pdf-section.blurred :deep(.pdf-preview),
.pdf-section.blurred :deep(canvas),
.pdf-section.blurred :deep(.pdf-page),
.pdf-section.blurred :deep(.pdf-container) {
  filter: blur(6px) brightness(0.95);
  transition: filter 0.2s ease;
}

.pdf-section {
  position: absolute;
  height: 90vh;
  top: -5rem;
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
  bottom: 20px;
  /* Align hidden flashcard with hovered recall options */
  transform: translateX(-50%);
  transition: all 0.5s ease;
  z-index: 10;
}

.flashcard-wrapper.initial {
  top: 50%;
  bottom: auto;
  transform: translate(-50%, -50%);
}

.flashcard-wrapper.revealed {
  top: auto;
  bottom: -130px;
  /* leave a small strip visible */
  transform: translateX(-50%);
}

.flashcard-wrapper.revealed:hover {
  bottom: 20px;
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
    margin: 0.5rem;
    width: calc(100% - 1rem);
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
    height: 2px;
    margin: 0 0.5rem;
    width: calc(100% - 1rem);
  }
}

/* Smooth scrolling for the entire page */
html {
  scroll-behavior: smooth;
}
</style>
