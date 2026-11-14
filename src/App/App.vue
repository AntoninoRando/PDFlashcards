<script setup lang="ts">
import StudySet from '@/Components/Flashcards/StudySet.vue'
import Resources from '@/Components/Resources/Resources.vue'
import PDFUploader from '@/Components/Resources/PDFUploader.vue'
import FileParser from '@/Components/StudySetFile/FileParser.vue'
import StudySetEditor from '@/Components/StudySetFile/Editor/StudySetEditor.vue'
// import GestureRecognizer from '@/Components/Recognizers/GestureRecognizer.vue'
import VoiceRecognizer from '@/Components/Recognizers/VoiceRecognizer.vue'
import ShuffleMenu from '@/Components/Layout/ShuffleMenu.vue'
import ShortcutsSidebar from '@/Components/Layout/ShortcutsSidebar.vue'
import { useApp } from './UseApp'
import { SortModes } from '@/Scheduler/FlashcardsScheduler'
import { computed } from 'vue'
import type { PdfRegion } from '@/Utils/PdfRegion'

const {
  pageToShow,
  scrollPercentToShow,
  regionToShow,
  studySet,
  pdfCache,
  pdfToShow,
  resourcePages,
  isScrolled,
  mousePosition,
  cardRevealed,
  uploadedText,
  editorVisible,
  editorMode,
  studySetKey,
  studySetComponent,
  gestureRecognizer,
  showPage,
  cardHidden,
  cardPresented,
  loadStudySet,
  openCreator,
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
  progressPercent,
  revealTrigger
} = useApp()

const shuffleOriginalOrder = () => {
  studySetComponent.value?.shuffleFlashcards(SortModes.originalOrder)
}
const shuffleRandomOrder = () => {
  studySetComponent.value?.shuffleFlashcards(SortModes.random)
}
const shuffleDefaultOrder = () => {
  studySetComponent.value?.shuffleFlashcards(SortModes.sectionLearningPriority)
}

interface PdfResourceItem {
  type: 'pdf'
  pdfUrl: string
  pageToShow: number
  scrollPercent?: number
  region?: PdfRegion
  trigger: number
  /** File name of the PDF (key of `pdfCache`). */
  fileName: string
}

// Build the resources list (PDF-only for now) and keep the current one on top
const resourcesList = computed<PdfResourceItem[]>(() => {
  if (!studySet.value) return []

  const items: PdfResourceItem[] = []
  for (const [fileName, url] of Object.entries(pdfCache)) {
    if (!url) continue

    // Active PDF uses the live page, the others the last page they showed
    const isCurrent = pdfToShow.value === fileName
    items.push({
      type: 'pdf',
      pdfUrl: url,
      pageToShow: isCurrent ? pageToShow.value : (resourcePages[fileName] ?? -1),
      scrollPercent: isCurrent ? scrollPercentToShow.value : undefined,
      region: isCurrent ? regionToShow.value : undefined,
      trigger: isCurrent ? revealTrigger.value : 0,
      fileName,
    })
  }

  // Ensure the currently selected PDF (pdfToShow) appears first in the list
  const idx = items.findIndex(it => it.fileName === pdfToShow.value)
  if (idx > 0) {
    const [sel] = items.splice(idx, 1)
    items.unshift(sel)
  }

  return items
})

function onResourceChanged(item: PdfResourceItem) {
  if (!item?.fileName) return
  pdfToShow.value = item.fileName
  // The scroll and region of the card's step belong to the PDF it was in
  scrollPercentToShow.value = undefined
  regionToShow.value = undefined
  const page = resourcePages[item.fileName]
  if (typeof page === 'number' && page > 0) {
    pageToShow.value = page
  }
}
</script>





<template>
  <div class="app-container">
    <!-- Decorative floating orbs behind everything -->
    <div class="bg-orbs" aria-hidden="true">
      <span class="orb orb-1"></span>
      <span class="orb orb-2"></span>
      <span class="orb orb-3"></span>
      <span class="orb orb-4"></span>
      <span class="sparkle sparkle-1"></span>
      <span class="sparkle sparkle-2"></span>
      <span class="sparkle sparkle-3"></span>
    </div>

    <!-- Top navigation -->
    <header class="topbar" :class="{ scrolled: isScrolled }" @mousemove="handleMouseMove" :style="{
      '--mouse-x': mousePosition.x + 'px',
      '--mouse-y': mousePosition.y + 'px'
    }">
      <div class="brand">
        <img src="@/Assets/LogoMark.svg" alt="" class="brand-mark" />
        <span class="brand-word">PDFlashcards</span>
      </div>

      <nav class="nav-links">
        <button class="nav-link">PDF</button>
        <button class="nav-link">Studysets</button>
        <button class="nav-link" @click="openCreator">New</button>
        <button class="nav-link" v-if="studySet" @click="openEditor">Edit</button>
        <!-- <GestureRecognizer ref="gestureRecognizer" class="nav-link" @command-recognized="commandRecognized"
          @pointing-changed="highlightPointing" /> -->
      </nav>

      <div class="nav-actions">
        <VoiceRecognizer class="voice-btn" @command-recognized="commandRecognized" />
        <PDFUploader @uploaded="addStudyResource" />
      </div>
    </header>

    <!-- Study progress -->
    <div v-if="studySet" class="progress-container">
      <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
      <div class="progress-label">{{ remainingCards }}/{{ totalCards }}</div>
    </div>

    <!-- Shortcuts Sidebar -->
    <ShortcutsSidebar id="shortcuts-sidebar" v-if="studySet" :cardRevealed="cardRevealed" />


    <div class="content-wrapper" :class="{ 'pointing': isPointing }">
      <div class="single-column">
        <div v-if="studySet && cardRevealed" class="pdf-section">
          <Resources :resources="resourcesList" @changed="onResourceChanged" />
        </div>

        <div class="flashcard-wrapper" :class="{ revealed: cardRevealed, initial: !studySet }">
          <section v-if="!studySet" class="hero">
            <span class="pill-badge">✦ Study smarter</span>
            <h1 class="display hero-title">Turn your PDFs into flashcards</h1>
            <p class="hero-sub">
              Open a study set or build one from scratch. Every card stays linked to the exact PDF page it came
              from.
            </p>

            <div class="start-options">
              <FileParser @setUploaded="loadStudySet" />
              <span class="start-divider">or</span>
              <button class="btn-primary create-btn" @click="openCreator">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create a new study set
              </button>
            </div>

            <p class="hero-fineprint">Study sets are plain .txt files · Add PDFs anytime from the top bar</p>
          </section>
          <StudySet ref="studySetComponent" v-else :key="studySetKey" @reveal="showPage" @hide="cardHidden" @present="cardPresented" :studySet="studySet" />
        </div>
      </div>
    </div>

    <!-- The text editor that allows to modify the StudySet file directly in
    app. -->
    <StudySetEditor v-if="editorVisible" :mode="editorMode" :initial-text="uploadedText" :pdf-cache="pdfCache"
      :replacing="editorMode === 'create' && !!studySet" @close="closeEditor" @save="saveEdited"
      @upload-pdf="addStudyResource" />

    <!-- Wheel of options to manipulate the StudySet, e.g. by showing the cards
    in order instead of "randomly". -->
    <ShuffleMenu v-if="studySet" @order-original="shuffleOriginalOrder" @order-random="shuffleRandomOrder"
      @order-default="shuffleDefaultOrder" />

  </div>
</template>





<style scoped>
#shortcuts-sidebar {
  position: fixed;
  top: 150px;
  z-index: 1000;
  left: 0;
  /* Peek from the left edge; slide in on hover */
  transform: translateX(-200px);
  transition: transform 300ms cubic-bezier(.2, .9, .2, 1);
  will-change: transform;
}

#shortcuts-sidebar:hover {
  transform: translateX(0);
}

.pointing-border {
  border: 3px solid var(--pink) !important;
  border-radius: var(--radius-md) !important;
  transition: all 0.3s ease !important;
  box-shadow: var(--glow-pink) !important;
}

.app-container {
  position: relative;
  min-height: 120vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  isolation: isolate;
}

/* BACKGROUND -------------------------------------------------------------- */
.bg-orbs {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
  opacity: 0.75;
  animation: float 14s ease-in-out infinite;
}

.orb::after {
  /* Specular highlight */
  content: '';
  position: absolute;
  top: 18%;
  left: 22%;
  width: 30%;
  height: 22%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  filter: blur(4px);
}

.orb-1 {
  width: 120px;
  height: 120px;
  top: 16%;
  left: 12%;
  background: radial-gradient(circle at 30% 30%, #ffb3fb, #c04de0 45%, #4a1a9e 80%);
  box-shadow: 0 0 60px rgba(255, 115, 250, 0.45);
}

.orb-2 {
  width: 70px;
  height: 70px;
  top: 58%;
  left: 20%;
  background: radial-gradient(circle at 30% 30%, #b9c3ff, #5865f2 50%, #1c1f7a 85%);
  box-shadow: 0 0 40px rgba(88, 101, 242, 0.5);
  filter: blur(5px);
  animation-delay: -4s;
  animation-duration: 18s;
}

.orb-3 {
  width: 150px;
  height: 150px;
  top: 30%;
  right: 9%;
  background: radial-gradient(circle at 30% 30%, #d4f7ff, #5ee1ff 25%, #7a5cff 60%, #2a0f6e 90%);
  box-shadow: 0 0 80px rgba(130, 110, 255, 0.45);
  animation-delay: -8s;
  animation-duration: 20s;
}

.orb-4 {
  width: 46px;
  height: 46px;
  top: 12%;
  right: 30%;
  background: radial-gradient(circle at 30% 30%, #ffd6fc, #ff73fa 50%, #8a1f9e 90%);
  filter: blur(7px);
  opacity: 0.5;
  animation-delay: -2s;
}

.sparkle {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #fff;
  box-shadow:
    120px 80px 0 0 rgba(255, 255, 255, 0.5),
    340px 260px 0 -1px rgba(255, 255, 255, 0.7),
    -180px 420px 0 0 rgba(255, 255, 255, 0.35),
    520px 520px 0 -1px rgba(255, 255, 255, 0.6),
    760px 140px 0 0 rgba(255, 255, 255, 0.4),
    -60px 680px 0 -1px rgba(255, 255, 255, 0.5);
  animation: twinkle 5s ease-in-out infinite;
}

.sparkle-1 {
  top: 10%;
  left: 18%;
}

.sparkle-2 {
  top: 22%;
  left: 52%;
  animation-delay: -1.7s;
}

.sparkle-3 {
  top: 5%;
  left: 78%;
  animation-delay: -3.3s;
}

@keyframes float {

  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  33% {
    transform: translate(10px, -22px) rotate(6deg);
  }

  66% {
    transform: translate(-8px, 12px) rotate(-4deg);
  }
}

@keyframes twinkle {

  0%,
  100% {
    opacity: 0.9;
  }

  50% {
    opacity: 0.25;
  }
}

/* TOP BAR ----------------------------------------------------------------- */
.topbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  height: var(--header-height);
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 0 2rem;
  border-bottom: 1px solid transparent;
  transition: background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease;
}

/* Soft light that follows the mouse */
.topbar::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(220px circle at var(--mouse-x, -200px) var(--mouse-y, -200px), rgba(255, 140, 250, 0.16), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.topbar:hover::before {
  opacity: 1;
}

.topbar.scrolled {
  background: rgba(13, 11, 36, 0.72);
  backdrop-filter: blur(16px);
  border-bottom-color: var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.brand-mark {
  width: 34px;
  height: 34px;
  filter: drop-shadow(0 0 10px rgba(255, 115, 250, 0.5));
}

.brand-word {
  font-family: var(--font-display);
  font-weight: 900;
  font-style: italic;
  font-stretch: 125%;
  font-variation-settings: 'wdth' 125;
  text-transform: uppercase;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
  color: #fff;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.nav-link {
  position: relative;
  font: inherit;
  font-weight: 600;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  background: none;
  border: none;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: color 0.2s ease;
}

.nav-link::after {
  content: '';
  position: absolute;
  left: 0.75rem;
  right: 0.75rem;
  bottom: 0.1rem;
  height: 2px;
  border-radius: 2px;
  background: #fff;
  transform: scaleX(0);
  transition: transform 0.2s ease;
}

.nav-link:hover {
  color: #fff;
}

.nav-link:hover::after {
  transform: scaleX(1);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

/* VoiceRecognizer root button */
.voice-btn {
  font: inherit;
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--text);
  background: rgba(20, 16, 50, 0.65);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.55rem 1rem;
  cursor: pointer;
  white-space: nowrap;
  backdrop-filter: blur(10px);
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.voice-btn:hover {
  background: rgba(40, 32, 90, 0.8);
  border-color: rgba(255, 160, 250, 0.4);
  box-shadow: 0 0 18px rgba(255, 115, 250, 0.2);
}

/* PROGRESS ---------------------------------------------------------------- */
.progress-container {
  position: relative;
  width: calc(100% - 4rem);
  height: 4px;
  margin: 1.75rem 2rem 0;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
}

.progress-bar {
  height: 100%;
  border-radius: inherit;
  background: var(--grad-nitro);
  box-shadow: 0 0 12px rgba(255, 115, 250, 0.7);
  transition: width 0.4s ease;
}

.progress-label {
  position: absolute;
  top: -1.55rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #fff;
  background: rgba(255, 115, 250, 0.2);
  border: 1px solid rgba(255, 160, 250, 0.3);
  padding: 0 0.6rem;
  border-radius: var(--radius-pill);
  backdrop-filter: blur(6px);
  pointer-events: none;
  white-space: nowrap;
}

/* CONTENT ----------------------------------------------------------------- */
.content-wrapper {
  flex: 1;
}

.single-column {
  position: relative;
  width: 100%;
  min-height: calc(100vh - var(--header-height) - 2rem);
}

.pdf-section :deep(.pdf-viewer-container) {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-lg), var(--glow-violet);
  transition: filter 0.2s ease;
}

.pdf-section.blurred :deep(.pdf-viewer-container) {
  filter: blur(6px) brightness(0.8);
}

.pdf-section {
  position: absolute;
  top: 0.5rem;
  left: 2rem;
  right: 2rem;
  height: calc(100vh - var(--header-height) - 3rem);
  padding: 0 0 1rem;
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
  top: 46%;
  bottom: auto;
  width: min(980px, calc(100vw - 2rem));
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

/* HERO -------------------------------------------------------------------- */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.4rem;
  animation: rise 0.7s cubic-bezier(.2, .9, .2, 1) both;
}

.hero-title {
  max-width: 100%;
  font-size: clamp(2rem, 5.4vw, 4.6rem);
  text-wrap: balance;
  overflow-wrap: anywhere;
  text-shadow: 0 6px 40px rgba(120, 40, 200, 0.55);
}

.hero-sub {
  max-width: 34rem;
  font-size: 1.05rem;
  color: var(--text-muted);
}

.start-options {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 0.75rem;
}

.start-divider {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

.create-btn {
  padding: 0.95rem 1.8rem;
}

.hero-fineprint {
  font-size: 0.8rem;
  color: var(--text-dim);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* RESPONSIVE -------------------------------------------------------------- */
@media (max-width: 900px) {
  .topbar {
    gap: 1rem;
    padding: 0 1rem;
  }

  .brand-word {
    display: none;
  }

  .nav-link {
    padding: 0.5rem;
    font-size: 0.88rem;
  }
}

@media (max-width: 768px) {
  .pdf-section {
    left: 1rem;
    right: 1rem;
  }

  .progress-container {
    width: calc(100% - 2rem);
    margin: 1.75rem 1rem 0;
  }

  .start-options {
    flex-direction: column;
    gap: 1rem;
  }

  .orb-3 {
    width: 90px;
    height: 90px;
  }
}

@media (max-width: 560px) {
  .topbar {
    height: auto;
    flex-wrap: wrap;
    padding: 0.6rem 1rem;
    row-gap: 0.4rem;
  }

  .nav-links {
    order: 3;
    flex-basis: 100%;
    overflow-x: auto;
  }

  .nav-actions {
    margin-left: auto;
  }
}
</style>
