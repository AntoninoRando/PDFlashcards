<script setup lang="ts">
/*
  Full-screen editor to create a study set from scratch or edit the loaded one.

  The "Visual" view edits a structured `EditorDocument` (cards, sections,
  resources); the "Text" view edits the `.txt` syntax directly. Both are
  validated live with the real parser, and saving emits the file content.
*/
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PDFPreview from '@/Components/Resources/PDFPreview.vue'
import RegionPicker from '@/Components/Resources/RegionPicker.vue'
import { PageRef } from '@/Commands/All/PageRef'
import type { PdfRegion } from '@/Utils/PdfRegion'
import CardRow from './CardRow.vue'
import ResourcesPanel from './ResourcesPanel.vue'
import EditorIcon from './EditorIcon.vue'
import {
  addRegionToCard,
  cardFrontFromText,
  checkParses,
  cloneEntry,
  defaultResourceFile,
  documentFromText,
  documentToText,
  downloadText,
  emptyDocument,
  fileNameFor,
  isEmptyCard,
  newCard,
  newHeader,
  newRegionCard,
  pageRefOf,
  resourceNameFor,
  resourceNames,
  validateDocument,
  type CardEntry,
  type EditorDocument,
  type Entry,
  type Issue,
  type ParseCheck,
} from './EditorDocument'

//#region PROPS & EMITS --------------------------------------------------------
const props = defineProps<{
  mode: 'create' | 'edit'
  /** Study-set file to edit (edit mode). */
  initialText: string
  /** Uploaded PDFs: file name -> object URL. */
  pdfCache: Record<string, string>
  /** Saving replaces the study set the user is studying. */
  replacing?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [content: string]
  uploadPdf: [item: { file: File; url: string }]
}>()
//#endregion -------------------------------------------------------------------



//#region DRAFT ----------------------------------------------------------------
/* A new study set is kept in the browser until it is saved, so that closing
   the editor (or the tab) does not lose the work. */
const DRAFT_KEY = 'pdflashcards.editor.draft'

function readDraft(): string | null {
  try {
    return localStorage.getItem(DRAFT_KEY)
  } catch {
    return null
  }
}

function writeDraft(text: string | null) {
  try {
    if (text === null) localStorage.removeItem(DRAFT_KEY)
    else localStorage.setItem(DRAFT_KEY, text)
  } catch {
    // Storage may be unavailable (private mode): the draft is best effort
  }
}

const draftRestored = ref(false)
//#endregion -------------------------------------------------------------------



//#region DOCUMENT -------------------------------------------------------------
function freshDocument(): EditorDocument {
  return emptyDocument(Object.keys(props.pdfCache))
}

function withOneCard(doc: EditorDocument): EditorDocument {
  if (!doc.entries.some((e) => e.kind === 'card')) doc.entries.push(newCard())
  return doc
}

function initialDocument(): EditorDocument {
  if (props.mode === 'edit') return withOneCard(documentFromText(props.initialText))
  const draft = readDraft()
  if (draft?.trim()) {
    draftRestored.value = true
    return withOneCard(documentFromText(draft))
  }
  return freshDocument()
}

const doc = ref<EditorDocument>(initialDocument())
const view = ref<'visual' | 'text'>('visual')
const rawText = ref('')

/** The study-set file as it would be saved now. */
const content = computed(() => (view.value === 'text' ? rawText.value : documentToText(doc.value)))
const baseline = content.value
const emptyText = documentToText(freshDocument())
const dirty = computed(() => content.value !== baseline)

const cards = computed(() =>
  doc.value.entries.filter((e): e is CardEntry => e.kind === 'card' && !isEmptyCard(e)),
)
const resourceOptions = computed(() => [...resourceNames(doc.value).keys()])
const sectionCount = computed(() => doc.value.entries.filter((e) => e.kind === 'header').length)

/** Card number shown next to each card (1-based, in file order). */
const cardNumbers = computed(() => {
  const numbers = new Map<number, number>()
  let n = 0
  for (const e of doc.value.entries) if (e.kind === 'card') numbers.set(e.id, ++n)
  return numbers
})

function setView(next: 'visual' | 'text') {
  if (next === view.value) return
  if (next === 'text') {
    rawText.value = documentToText(doc.value)
  } else {
    doc.value = withOneCard(documentFromText(rawText.value))
    focusedId.value = null
  }
  view.value = next
}
//#endregion -------------------------------------------------------------------



//#region VALIDATION -----------------------------------------------------------
const parseCheck = ref<ParseCheck>(checkParses(content.value))
let parseTimer: ReturnType<typeof setTimeout> | undefined

watch(content, (text) => {
  clearTimeout(parseTimer)
  parseTimer = setTimeout(() => (parseCheck.value = checkParses(text)), 250)
})

/** Parser messages use 0-based line indexes: show them 1-based. */
function humanize(message: string): string {
  return message.replace(/\bline (\d+)/gi, (_, n) => `line ${Number(n) + 1}`)
}

const parseIssues = computed<Issue[]>(() => {
  const { studySet, messages } = parseCheck.value
  let unique = [...new Set(messages.map(humanize))]
  // "Fail at line N" only repeats the reason reported just before it
  if (unique.length > 1) unique = unique.filter((m) => !m.startsWith('Fail at line'))
  if (studySet) return unique.map((message) => ({ severity: 'warning' as const, message }))
  return unique.length
    ? unique.map((message) => ({ severity: 'error' as const, message }))
    : [{ severity: 'error' as const, message: 'The study set cannot be read' }]
})

const docIssues = computed<Issue[]>(() => (view.value === 'visual' ? validateDocument(doc.value) : []))

const allIssues = computed<Issue[]>(() => {
  // In the visual view the editor's own checks are more precise: show parser
  // errors only when they add something.
  const own = docIssues.value
  const ownErrors = own.some((i) => i.severity === 'error')
  const parser = ownErrors ? parseIssues.value.filter((i) => i.severity === 'warning') : parseIssues.value
  return [...own, ...parser]
})

const errorCount = computed(() => allIssues.value.filter((i) => i.severity === 'error').length)
const warningCount = computed(() => allIssues.value.filter((i) => i.severity === 'warning').length)

const issuesById = computed(() => {
  const map = new Map<number, Issue[]>()
  for (const issue of docIssues.value) {
    if (issue.targetId === undefined) continue
    if (!map.has(issue.targetId)) map.set(issue.targetId, [])
    map.get(issue.targetId)!.push(issue)
  }
  return map
})

const showIssues = ref(false)
//#endregion -------------------------------------------------------------------



//#region ENTRIES --------------------------------------------------------------
const focusedId = ref<number | null>(null)
const query = ref('')

function indexOfId(id: number | null): number {
  return doc.value.entries.findIndex((e) => e.id === id)
}

async function focusEntry(id: number, selector = '.front-input') {
  focusedId.value = id
  await nextTick()
  const row = document.querySelector<HTMLElement>(`[data-entry-id="${id}"]`)
  row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  row?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true })
}

/** The card the new one copies its answer settings from. */
function referenceCard(index: number): CardEntry | undefined {
  for (let i = Math.min(index, doc.value.entries.length - 1); i >= 0; i--) {
    const e = doc.value.entries[i]
    if (e.kind === 'card') return e
  }
  return undefined
}

function addCard(afterIndex = doc.value.entries.length - 1) {
  query.value = ''
  const ref = referenceCard(afterIndex)
  const card = newCard({ answer: ref?.answer ?? 'pages', resource: ref?.resource ?? '' })
  doc.value.entries.splice(afterIndex + 1, 0, card)
  focusEntry(card.id)
}

function addHeader(afterIndex = doc.value.entries.length - 1) {
  query.value = ''
  // A new section starts at the level of the previous one
  let level = 1
  for (let i = afterIndex; i >= 0; i--) {
    const e = doc.value.entries[i]
    if (e?.kind === 'header') {
      level = e.level
      break
    }
  }
  const header = newHeader({ level })
  doc.value.entries.splice(afterIndex + 1, 0, header)
  focusEntry(header.id)
}

async function moveEntry(index: number, direction: -1 | 1) {
  const list = doc.value.entries
  const target = index + direction
  if (target < 0 || target >= list.length) return
  // Moving the row in the DOM blurs it: give the focus back afterwards
  const active = document.activeElement as HTMLElement | null
  ;[list[index], list[target]] = [list[target], list[index]]
  await nextTick()
  active?.focus({ preventScroll: true })
  active?.scrollIntoView({ block: 'nearest' })
}

function duplicateEntry(index: number) {
  const copy = cloneEntry(doc.value.entries[index])
  doc.value.entries.splice(index + 1, 0, copy)
  focusEntry(copy.id)
}

function removeEntry(index: number) {
  const [entry] = doc.value.entries.splice(index, 1)
  if (focusedId.value === entry.id) focusedId.value = null
  const what = entry.kind === 'card' ? 'Card' : entry.kind === 'header' ? 'Section' : 'Lines'
  showToast(`${what} deleted`, () => {
    doc.value.entries.splice(Math.min(index, doc.value.entries.length), 0, entry)
    focusEntry(entry.id)
  })
}

function matches(entry: Entry, q: string): boolean {
  const texts =
    entry.kind === 'card'
      ? [entry.front, entry.pages, entry.textBox, entry.resource, ...entry.details.map((d) => d.value)]
      : [entry.text]
  return texts.some((t) => t.toLowerCase().includes(q))
}

const visibleEntries = computed(() => {
  const q = query.value.trim().toLowerCase()
  const all = doc.value.entries.map((entry, index) => ({ entry, index }))
  return q ? all.filter(({ entry }) => matches(entry, q)) : all
})

const matchCount = computed(() => visibleEntries.value.filter(({ entry }) => entry.kind === 'card').length)

interface OutlineItem {
  id: number | null
  text: string
  level: number
  cards: number
  errors: number
}

const outline = computed<OutlineItem[]>(() => {
  const items: OutlineItem[] = []
  let current: OutlineItem | null = null
  for (const e of doc.value.entries) {
    if (e.kind === 'header') {
      current = { id: e.id, text: e.text.trim() || 'Untitled section', level: e.level, cards: 0, errors: 0 }
      items.push(current)
    } else if (e.kind === 'card' && !isEmptyCard(e)) {
      if (!current) {
        current = { id: null, text: 'Before the first section', level: 1, cards: 0, errors: 0 }
        items.push(current)
      }
      current.cards++
      if (issuesById.value.get(e.id)?.some((i) => i.severity === 'error')) current.errors++
    }
  }
  return items
})

function jumpTo(id: number | null) {
  query.value = ''
  const target = id ?? doc.value.entries[0]?.id
  if (target !== undefined) focusEntry(target)
}

function jumpToIssue(issue: Issue) {
  showIssues.value = false
  if (issue.targetId === undefined) return
  if (indexOfId(issue.targetId) !== -1) {
    jumpTo(issue.targetId)
  } else {
    const el = document.querySelector<HTMLElement>(`[data-resource-id="${issue.targetId}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    el?.querySelector<HTMLElement>('input')?.focus({ preventScroll: true })
  }
}
//#endregion -------------------------------------------------------------------



//#region PREVIEW --------------------------------------------------------------
const previewOpen = ref(Object.keys(props.pdfCache).length > 0 && window.innerWidth >= 1280)
const previewIndex = ref(0)

const focusedCard = computed(() => {
  const e = doc.value.entries.find((x) => x.id === focusedId.value)
  return e?.kind === 'card' ? e : undefined
})

interface PreviewStep {
  file: string
  label: string
  page: number
  scroll?: number
  region?: PdfRegion
}

/** Pages the focused card opens, in order (like the study view). */
const previewSteps = computed<PreviewStep[]>(() => {
  const card = focusedCard.value
  if (!card || card.answer !== 'pages') return []
  const names = resourceNames(doc.value)
  const defaultFile = defaultResourceFile(doc.value)
  const refs = [pageRefOf(card), ...card.details.filter((d) => d.type === 'pages').map((d) => d.value)]
  const steps: PreviewStep[] = []
  for (const ref of refs) {
    if (!ref.trim()) continue
    for (const [alias, page, scroll, region] of new PageRef(ref).allPageRefs) {
      const file = alias ? (names.get(alias) ?? alias) : defaultFile
      steps.push({ file, label: alias || defaultFile, page, scroll, region })
      if (steps.length >= 40) return steps
    }
  }
  return steps
})

const currentStep = computed(() => {
  const steps = previewSteps.value
  return steps.length ? steps[Math.min(previewIndex.value, steps.length - 1)] : undefined
})
const previewUrl = computed(() => (currentStep.value ? props.pdfCache[currentStep.value.file] : undefined))

watch(focusedId, () => (previewIndex.value = 0))
//#endregion -------------------------------------------------------------------



//#region CAPTURE --------------------------------------------------------------
/* "Capture" tab of the preview: drag a box on a PDF page (or select its text)
   to create a card whose answer is that region, or to add it to the selected
   card. Selected text becomes the question of the new card. */
const previewTab = ref<'card' | 'capture'>('card')
const captureFile = ref('')
const capturePage = ref(1)
const captureRegion = ref<PdfRegion | null>(null)
/** Front of the next card: typed, or filled by selecting text on the page. */
const captureQuestion = ref('')

function onSelectText(text: string) {
  captureQuestion.value = cardFrontFromText(text)
}

/** Resources of the study set whose PDF is uploaded (only those can be shown). */
const captureFiles = computed(() =>
  doc.value.resources.map((r) => r.file.trim()).filter((file) => file && props.pdfCache[file]),
)
const captureUrl = computed(() => (captureFile.value ? props.pdfCache[captureFile.value] : undefined))

/** The card a region can be added to: the selected one, if it is a page card or still empty. */
const captureTarget = computed(() => {
  const card = focusedCard.value
  return card && (card.answer === 'pages' || isEmptyCard(card)) ? card : undefined
})

function captureLabel(file: string): string {
  const name = resourceNameFor(doc.value, file)
  return name === file ? file : `${name} (${file})`
}

/** Opens the capture tab on the page the preview shows (or the first PDF). */
function openCapture() {
  previewOpen.value = true
  previewTab.value = 'capture'
  const step = currentStep.value
  if (step && props.pdfCache[step.file]) {
    captureFile.value = step.file
    capturePage.value = step.page
  } else if (!captureFiles.value.includes(captureFile.value)) {
    captureFile.value = captureFiles.value[0] ?? ''
    capturePage.value = 1
  }
  captureRegion.value = null
  nextTick(() => document.querySelector<HTMLElement>('.region-picker .surface')?.focus({ preventScroll: true }))
}

function toggleCapture() {
  if (previewOpen.value && previewTab.value === 'capture') previewTab.value = 'card'
  else openCapture()
}

watch(captureFile, () => (captureRegion.value = null))
// Uploading the first PDF while the tab is open selects it
watch(captureFiles, (files) => {
  if (!files.includes(captureFile.value)) captureFile.value = files[0] ?? ''
})

/** Creates a card answered by the selected region, or fills the selected card if it is empty. */
function createCardFromRegion() {
  const region = captureRegion.value
  if (!region || !captureFile.value) return
  query.value = ''
  const page = capturePage.value
  const focused = focusedCard.value

  const question = oneLineText(captureQuestion.value)

  let card: CardEntry
  const filled = !!focused && isEmptyCard(focused)
  if (focused && filled) {
    addRegionToCard(doc.value, focused, captureFile.value, page, region)
    card = focused
  } else {
    card = newRegionCard(doc.value, captureFile.value, page, region)
    const index = indexOfId(focusedId.value)
    doc.value.entries.splice(index === -1 ? doc.value.entries.length : index + 1, 0, card)
  }
  card.front = question
  captureRegion.value = null
  captureQuestion.value = ''
  const number = cardNumbers.value.get(card.id) ?? ''

  if (!question) {
    // Write the question right away; the capture tab stays open for the next one
    focusEntry(card.id)
    showToast(`Card ${number} created from page ${page}: write its question`)
    return
  }
  // The card is complete: stay on the page for the next one, which goes after this card
  focusedId.value = card.id
  nextTick(() => {
    document.querySelector(`[data-entry-id="${card.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    document.querySelector<HTMLElement>('.region-picker .surface')?.focus({ preventScroll: true })
  })
  showToast(`Card ${number} created from page ${page}`, () => undoCapture(card, filled))
}

/** Undo for a card made in the capture tab: empties the card it filled, or removes the one it created. */
function undoCapture(card: CardEntry, filled: boolean) {
  if (filled) {
    Object.assign(card, { front: '', resource: '', pages: '' })
    return
  }
  const index = indexOfId(card.id)
  if (index !== -1) doc.value.entries.splice(index, 1)
  if (focusedId.value === card.id) focusedId.value = null
}

function oneLineText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** Adds the selected region to the pages the selected card opens. */
function addRegionToSelected() {
  const region = captureRegion.value
  const card = captureTarget.value
  if (!region || !card || !captureFile.value) return
  addRegionToCard(doc.value, card, captureFile.value, capturePage.value, region)
  captureRegion.value = null
  showToast(`Region added to card ${cardNumbers.value.get(card.id) ?? ''}`)
}
//#endregion -------------------------------------------------------------------



//#region SAVE, CLOSE, DOWNLOAD ------------------------------------------------
const toast = ref<{ message: string; undo?: () => void } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

function showToast(message: string, undo?: () => void) {
  clearTimeout(toastTimer)
  toast.value = { message, undo }
  toastTimer = setTimeout(() => (toast.value = null), 6000)
}

function runUndo() {
  toast.value?.undo?.()
  toast.value = null
}

function save() {
  const text = content.value
  clearTimeout(parseTimer)
  parseCheck.value = checkParses(text)
  if (errorCount.value > 0 || !parseCheck.value.studySet) {
    showIssues.value = true
    showToast('Fix the errors before saving')
    return
  }
  if (props.replacing && !confirm('Replace the study set you are studying with this one?')) return
  if (props.mode === 'create') writeDraft(null)
  saved = true
  emit('save', text)
}

let saved = false
let draftTimer: ReturnType<typeof setTimeout> | undefined

function persistDraft() {
  clearTimeout(draftTimer)
  if (props.mode !== 'create' || saved) return
  writeDraft(content.value === emptyText ? null : content.value)
}

if (props.mode === 'create') {
  watch(content, () => {
    clearTimeout(draftTimer)
    draftTimer = setTimeout(persistDraft, 400)
  })
}

function startOver() {
  if (dirty.value && !confirm('Discard the draft and start from an empty study set?')) return
  writeDraft(null)
  doc.value = freshDocument()
  rawText.value = documentToText(doc.value)
  draftRestored.value = false
  focusTitle()
}

function requestClose() {
  if (props.mode === 'edit' && dirty.value && !confirm('Discard the changes to the study set?')) return
  persistDraft()
  emit('close')
}

function download() {
  const title = view.value === 'visual' ? doc.value.title : (parseCheck.value.studySet?.title ?? '')
  downloadText(fileNameFor(title), content.value)
}
//#endregion -------------------------------------------------------------------



//#region KEYBOARD -------------------------------------------------------------
function onKeydown(event: KeyboardEvent) {
  // Keep the study shortcuts (reveal, grade, change page...) out of the editor
  event.stopPropagation()
  const mod = event.ctrlKey || event.metaKey

  if (mod && event.key.toLowerCase() === 's') {
    event.preventDefault()
    save()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    if (showIssues.value) showIssues.value = false
    else requestClose()
  } else if (view.value !== 'visual') {
    return
  } else if (mod && event.key === 'Enter') {
    event.preventDefault()
    const i = indexOfId(focusedId.value)
    addCard(i === -1 ? undefined : i)
  } else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && !query.value) {
    const i = indexOfId(focusedId.value)
    if (i === -1) return
    event.preventDefault()
    moveEntry(i, event.key === 'ArrowUp' ? -1 : 1)
  }
}

/** Tab inserts a tab character: indentation is meaningful in study sets. */
function onTextKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey) return
  event.preventDefault()
  const area = event.target as HTMLTextAreaElement
  const { selectionStart: start, selectionEnd: end, value } = area
  if (event.shiftKey) {
    // Outdent the current line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    if (value[lineStart] !== '\t') return
    area.setSelectionRange(lineStart, lineStart + 1)
    document.execCommand('delete')
    area.setSelectionRange(Math.max(lineStart, start - 1), Math.max(lineStart, end - 1))
  } else if (!document.execCommand('insertText', false, '\t')) {
    // Fallback without native undo support
    rawText.value = value.slice(0, start) + '\t' + value.slice(end)
    nextTick(() => area.setSelectionRange(start + 1, start + 1))
  }
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  persistDraft()
  if (props.mode === 'edit' && dirty.value) event.preventDefault()
}

function focusTitle() {
  nextTick(() => document.querySelector<HTMLInputElement>('.title-input')?.focus())
}

let previousOverflow = ''
onMounted(() => {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('beforeunload', onBeforeUnload)
  if (props.mode === 'create' && !doc.value.title) focusTitle()
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  window.removeEventListener('beforeunload', onBeforeUnload)
  clearTimeout(parseTimer)
  clearTimeout(toastTimer)
  persistDraft()
})
//#endregion -------------------------------------------------------------------
</script>



<template>
  <div class="editor-overlay" @keydown="onKeydown">
    <div class="editor" role="dialog" aria-modal="true" aria-label="Study set editor">
      <!-- TOP BAR -->
      <header class="topbar">
        <div class="title-block">
          <span class="eyebrow">{{ mode === 'create' ? 'New study set' : 'Edit study set' }}</span>
          <input v-if="view === 'visual'" v-model="doc.title" class="title-input" type="text"
            placeholder="Untitled study set" aria-label="Title" @keydown.enter.prevent="jumpTo(null)" />
          <span v-else class="title-input static">{{ parseCheck.studySet?.title || doc.title || 'Untitled study set' }}</span>
        </div>

        <div class="segmented view-switch" role="tablist" aria-label="Editor view">
          <button type="button" role="tab" :aria-selected="view === 'visual'" :class="{ active: view === 'visual' }"
            @click="setView('visual')">Visual</button>
          <button type="button" role="tab" :aria-selected="view === 'text'" :class="{ active: view === 'text' }"
            @click="setView('text')">Text</button>
        </div>

        <div class="topbar-actions">
          <button v-if="view === 'visual'" type="button" class="ghost-btn" :class="{ active: previewOpen }"
            :aria-pressed="previewOpen" title="Show the PDF page of the selected card" @click="previewOpen = !previewOpen">
            <EditorIcon name="eye" /> Preview
          </button>
          <button v-if="view === 'visual'" type="button" class="ghost-btn"
            :class="{ active: previewOpen && previewTab === 'capture' }"
            :aria-pressed="previewOpen && previewTab === 'capture'"
            title="Drag a box on a PDF page to make a card from it" @click="toggleCapture">
            <EditorIcon name="crop" /> Capture
          </button>
          <button type="button" class="ghost-btn" title="Download the study set as a .txt file" @click="download">
            <EditorIcon name="download" /> .txt
          </button>
          <button type="button" class="ghost-btn" @click="requestClose">Cancel</button>
          <button type="button" class="primary-btn" title="Ctrl+S" @click="save">
            {{ mode === 'create' ? 'Create & study' : 'Save changes' }}
          </button>
        </div>
      </header>

      <div v-if="draftRestored" class="banner">
        <span>Your unsaved draft was restored.</span>
        <button type="button" class="link-btn" @click="startOver">Start over</button>
        <button type="button" class="icon-btn" title="Dismiss" @click="draftRestored = false">
          <EditorIcon name="x" :size="14" />
        </button>
      </div>

      <div class="workspace" :class="{
        'with-preview': previewOpen && view === 'visual',
        capturing: previewOpen && view === 'visual' && previewTab === 'capture',
        'text-view': view === 'text',
      }">
        <!-- SIDEBAR -->
        <aside v-if="view === 'visual'" class="sidebar">
          <section class="panel">
            <h3 class="panel-title">Outline</h3>
            <ul v-if="outline.length" class="outline">
              <li v-for="item in outline" :key="item.id ?? 'start'">
                <button type="button" class="outline-item" :class="{ unsectioned: item.id === null }"
                  :style="{ paddingLeft: `${0.5 + (item.level - 1) * 0.85}rem` }" @click="jumpTo(item.id)">
                  <span class="outline-text">{{ item.text }}</span>
                  <span v-if="item.errors" class="error-dot" :title="`${item.errors} card(s) with errors`" />
                  <span class="count">{{ item.cards }}</span>
                </button>
              </li>
            </ul>
            <p class="panel-hint">
              Sections group cards: studying goes section by section, starting from the one with the most due cards.
            </p>
          </section>
          <ResourcesPanel :doc="doc" :pdf-cache="pdfCache" :issues-by-id="issuesById"
            @upload-pdf="emit('uploadPdf', $event)" />
        </aside>

        <!-- VISUAL VIEW -->
        <main v-if="view === 'visual'" class="entries">
          <div class="entries-toolbar">
            <label class="search">
              <EditorIcon name="search" :size="15" />
              <input v-model="query" type="search" placeholder="Filter cards" aria-label="Filter cards" />
            </label>
            <span class="muted">
              <template v-if="query.trim()">{{ matchCount }} of {{ cards.length }} cards</template>
              <template v-else>{{ cards.length }} card{{ cards.length === 1 ? '' : 's' }} · {{ sectionCount }}
                section{{ sectionCount === 1 ? '' : 's' }}</template>
            </span>
          </div>

          <div class="entry-list">
            <template v-for="{ entry, index } in visibleEntries" :key="entry.id">
              <CardRow v-if="entry.kind === 'card'" :card="entry" :number="cardNumbers.get(entry.id) ?? 0"
                :issues="issuesById.get(entry.id) ?? []" :resource-options="resourceOptions"
                :default-resource="doc.resources[0]?.file ?? ''" :focused="focusedId === entry.id"
                :can-move="!query.trim()" @focus="focusedId = entry.id" @add-after="addCard(index)"
                @move="moveEntry(index, $event)" @duplicate="duplicateEntry(index)" @remove="removeEntry(index)" />

              <section v-else-if="entry.kind === 'header'" class="header-row" :class="`level-${entry.level}`"
                :data-entry-id="entry.id" @focusin="focusedId = entry.id">
                <select v-model.number="entry.level" class="level-select" aria-label="Section level"
                  title="Level: subsections nest under sections">
                  <option :value="1">Section</option>
                  <option :value="2">Subsection</option>
                  <option :value="3">Level 3</option>
                  <option v-if="entry.level > 3" :value="entry.level">Level {{ entry.level }}</option>
                </select>
                <input v-model="entry.text" class="front-input header-input" type="text" placeholder="Section title"
                  aria-label="Section title" @keydown.enter.prevent="addCard(index)" />
                <div class="row-actions">
                  <button type="button" class="icon-btn" title="Move up" :disabled="!!query.trim()"
                    @click="moveEntry(index, -1)"><EditorIcon name="up" /></button>
                  <button type="button" class="icon-btn" title="Move down" :disabled="!!query.trim()"
                    @click="moveEntry(index, 1)"><EditorIcon name="down" /></button>
                  <button type="button" class="icon-btn danger" title="Delete section (keeps its cards)"
                    @click="removeEntry(index)"><EditorIcon name="trash" /></button>
                </div>
                <textarea v-if="entry.extra" v-model="entry.extra" class="raw-input header-extra" spellcheck="false"
                  aria-label="Lines under the section" />
                <p v-for="(issue, k) in issuesById.get(entry.id) ?? []" :key="k" class="row-issue">{{ issue.message }}</p>
              </section>

              <section v-else class="raw-row" :data-entry-id="entry.id" @focusin="focusedId = entry.id">
                <div class="raw-head">
                  <span class="raw-label" title="Lines the visual editor does not handle are kept exactly as written">
                    Kept as written
                  </span>
                  <div class="row-actions">
                    <button type="button" class="icon-btn" title="Move up" :disabled="!!query.trim()"
                      @click="moveEntry(index, -1)"><EditorIcon name="up" /></button>
                    <button type="button" class="icon-btn" title="Move down" :disabled="!!query.trim()"
                      @click="moveEntry(index, 1)"><EditorIcon name="down" /></button>
                    <button type="button" class="icon-btn danger" title="Delete"
                      @click="removeEntry(index)"><EditorIcon name="trash" /></button>
                  </div>
                </div>
                <textarea v-model="entry.text" class="raw-input front-input" spellcheck="false"
                  :rows="Math.min(8, entry.text.split('\n').length)" aria-label="Raw lines" />
              </section>

              <div v-if="!query.trim()" class="insert-bar">
                <button type="button" @click="addCard(index)"><EditorIcon name="plus" :size="13" /> Card</button>
                <button type="button" @click="addHeader(index)"><EditorIcon name="plus" :size="13" /> Section</button>
              </div>
            </template>

            <p v-if="query.trim() && !visibleEntries.length" class="empty-filter">No card matches “{{ query }}”.</p>
          </div>

          <div class="entries-footer">
            <button type="button" class="add-big" @click="addCard()">
              <EditorIcon name="card" /> Add card
            </button>
            <button type="button" class="add-big secondary" @click="addHeader()">
              <EditorIcon name="section" /> Add section
            </button>
          </div>
        </main>

        <!-- TEXT VIEW -->
        <main v-else class="text-view-main">
          <textarea v-model="rawText" class="raw-editor" spellcheck="false" aria-label="Study set file"
            @keydown="onTextKeydown" />
          <aside class="syntax-help">
            <h3 class="panel-title">Syntax</h3>
            <dl>
              <dt><code>[Title]</code> <code>[Resources]</code> <code>[Cards]</code></dt>
              <dd>Sections of the file</dd>
              <dt><code>book.pdf</code><br /><code>⇥@ book</code></dt>
              <dd>A resource and its alias</dd>
              <dt><code>Front .. 12, 14-16</code></dt>
              <dd>Card opening pages 12, 14, 15 and 16</dd>
              <dt><code>Front .. book: 3%50</code></dt>
              <dd>Page 3 of “book”, scrolled halfway</dd>
              <dt><code>Front .. 12{10,20,60,30}</code></dt>
              <dd>A region of page 12: left, top, width, height in % (use Capture in the visual view)</dd>
              <dt><code>Front ... answer</code></dt>
              <dd>Card with a text answer</dd>
              <dt><code>Chapter 1</code><br /><code>⇥^ 1</code></dt>
              <dd>Section header (level 1)</dd>
              <dt><code>⇥+ text</code> <code>⇥# tag</code></dt>
              <dd>Remember / tag, under a card</dd>
              <dt><code>⇥note …</code> <code>⇥example …</code> <code>⇥recap …</code></dt>
              <dd>Notes shown on the card</dd>
              <dt><code>// comment</code></dt>
              <dd>Ignored line</dd>
            </dl>
            <p class="panel-hint">⇥ is a tab: press Tab to indent, Shift+Tab to outdent.</p>
          </aside>
        </main>

        <!-- PREVIEW -->
        <aside v-if="previewOpen && view === 'visual'" class="preview">
          <header class="preview-header">
            <div class="segmented preview-tabs" role="tablist" aria-label="Preview">
              <button type="button" role="tab" :aria-selected="previewTab === 'card'"
                :class="{ active: previewTab === 'card' }" @click="previewTab = 'card'">Card</button>
              <button type="button" role="tab" :aria-selected="previewTab === 'capture'"
                :class="{ active: previewTab === 'capture' }" @click="openCapture">Capture</button>
            </div>
            <button type="button" class="icon-btn" title="Close preview" @click="previewOpen = false">
              <EditorIcon name="x" :size="14" />
            </button>
          </header>

          <!-- CAPTURE: make cards from regions of the PDF -->
          <template v-if="previewTab === 'capture'">
            <p v-if="!captureFiles.length" class="preview-empty">
              Upload a PDF of the study set (Resources, on the left) to make cards from its pages.
            </p>
            <template v-else>
              <select v-if="captureFiles.length > 1" v-model="captureFile" class="capture-resource"
                aria-label="PDF to capture from">
                <option v-for="file in captureFiles" :key="file" :value="file">{{ captureLabel(file) }}</option>
              </select>
              <p class="capture-hint">
                <strong>Box</strong>: drag around the answer. <strong>Text</strong>: select words, they become the
                question and their area the answer. <kbd>Enter</kbd> creates the card, <kbd>Esc</kbd> clears.
              </p>
              <RegionPicker v-if="captureUrl" v-model:page="capturePage" v-model:region="captureRegion"
                :pdf-url="captureUrl" @confirm="createCardFromRegion" @select-text="onSelectText" />
              <label class="capture-question">
                <span>Question</span>
                <input v-model="captureQuestion" type="text" spellcheck="true"
                  placeholder="Optional: select text on the page, or type it"
                  @keydown.enter.prevent="createCardFromRegion" />
              </label>
              <div class="capture-actions">
                <button type="button" class="primary-btn" :disabled="!captureRegion" @click="createCardFromRegion">
                  <EditorIcon name="plus" :size="14" />
                  {{ focusedCard && isEmptyCard(focusedCard) ? `Use for card ${cardNumbers.get(focusedCard.id)}` : 'New card' }}
                </button>
                <button v-if="captureTarget && !isEmptyCard(captureTarget)" type="button" class="ghost-btn"
                  :disabled="!captureRegion" :title="`Add the region to the pages card ${cardNumbers.get(captureTarget.id)} opens`"
                  @click="addRegionToSelected">
                  Add to card {{ cardNumbers.get(captureTarget.id) }}
                </button>
              </div>
            </template>
          </template>

          <p v-else-if="!focusedCard" class="preview-empty">Select a card to see the page it opens.</p>
          <template v-else>
            <div class="preview-card">
              <span class="eyebrow">Card {{ cardNumbers.get(focusedCard.id) }}</span>
              <p class="preview-front">{{ focusedCard.front.trim() || 'Untitled card' }}</p>
            </div>
            <div v-if="focusedCard.answer === 'textbox'" class="preview-textbox">
              {{ focusedCard.textBox.trim() || 'No answer yet' }}
            </div>
            <template v-else-if="currentStep">
              <div class="steps">
                <button v-for="(step, i) in previewSteps" :key="i" type="button" class="step"
                  :class="{ active: step === currentStep }" :title="`${step.label}, page ${step.page}`"
                  @click="previewIndex = i">
                  p. {{ step.page }}<template v-if="step.region"> · region</template><template
                    v-else-if="step.scroll !== undefined"> · {{ step.scroll }}%</template>
                </button>
              </div>
              <div v-if="previewUrl" class="pdf-frame">
                <PDFPreview :pdf-url="previewUrl" :page-to-show="currentStep.page" :scroll-percent="currentStep.scroll"
                  :region="currentStep.region" />
              </div>
              <p v-else class="preview-empty">
                Upload <strong>{{ currentStep.file || 'a PDF' }}</strong> (Resources, on the left) to preview
                page {{ currentStep.page }}.
              </p>
            </template>
            <p v-else class="preview-empty">This card has no pages yet.</p>
          </template>
        </aside>
      </div>

      <!-- STATUS BAR -->
      <footer class="statusbar">
        <button type="button" class="status-btn"
          :class="errorCount ? 'has-errors' : warningCount ? 'has-warnings' : 'is-ok'"
          :disabled="!allIssues.length" @click="showIssues = !showIssues">
          <EditorIcon :name="errorCount ? 'alert' : 'check'" :size="14" />
          <template v-if="errorCount">{{ errorCount }} error{{ errorCount === 1 ? '' : 's' }}</template>
          <template v-else>Ready to save</template>
          <template v-if="warningCount"> · {{ warningCount }} warning{{ warningCount === 1 ? '' : 's' }}</template>
        </button>
        <span v-if="dirty" class="muted">Unsaved changes</span>
        <span class="shortcuts">
          <kbd>Enter</kbd> next field · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> new card · <kbd>Alt</kbd>+<kbd>↑↓</kbd> move ·
          <kbd>Ctrl</kbd>+<kbd>S</kbd> save · <kbd>Esc</kbd> close
        </span>
      </footer>

      <div v-if="showIssues && allIssues.length" class="issues-popover" role="dialog" aria-label="Problems">
        <header>
          <h3 class="panel-title">Problems</h3>
          <button type="button" class="icon-btn" title="Close" @click="showIssues = false">
            <EditorIcon name="x" :size="14" />
          </button>
        </header>
        <ul>
          <li v-for="(issue, i) in allIssues" :key="i">
            <button type="button" :class="issue.severity" :disabled="issue.targetId === undefined"
              @click="jumpToIssue(issue)">
              <EditorIcon name="alert" :size="13" />
              <span>
                <template v-if="issue.targetId !== undefined && cardNumbers.has(issue.targetId)">
                  Card {{ cardNumbers.get(issue.targetId) }}:
                </template>
                {{ issue.message }}
              </span>
            </button>
          </li>
        </ul>
      </div>

      <div v-if="toast" class="toast" role="status">
        <span>{{ toast.message }}</span>
        <button v-if="toast.undo" type="button" class="link-btn" @click="runUndo">
          <EditorIcon name="undo" :size="14" /> Undo
        </button>
      </div>
    </div>
  </div>
</template>



<style scoped>
.editor-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(5, 4, 18, 0.72);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 2vh 2vw;
}

.editor {
  --ed-bg: #0f0c2a;
  --ed-surface: #18153f;
  --ed-input: rgba(255, 255, 255, 0.045);
  --ed-border: rgba(255, 255, 255, 0.09);
  --ed-border-strong: rgba(255, 255, 255, 0.2);
  --ed-text: #f3f0ff;
  --ed-muted: #a39dc8;
  --ed-hover: rgba(255, 255, 255, 0.07);
  --ed-accent: #ff8bf7;
  --ed-accent-hover: #ffb0fa;
  --ed-accent-soft: rgba(255, 115, 250, 0.13);
  --ed-accent-ring: rgba(255, 115, 250, 0.28);
  --ed-error: #ff6b86;
  --ed-error-soft: rgba(255, 92, 124, 0.14);
  --ed-warn: #ffc46b;
  --ed-ok: #4be3a7;
  --ed-ok-soft: rgba(75, 227, 167, 0.13);
  --ed-warn-soft: rgba(255, 196, 107, 0.13);

  position: relative;
  width: 100%;
  max-width: 1680px;
  display: flex;
  flex-direction: column;
  background: var(--ed-bg);
  color: var(--ed-text);
  border-radius: var(--radius-lg);
  border: 1px solid var(--ed-border);
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(3, 2, 14, 0.7), 0 0 120px rgba(155, 92, 255, 0.18);
  font-family: var(--font-body);
  font-size: 0.95rem;
  line-height: 1.45;
}

/* TOP BAR ------------------------------------------------------------------ */
.topbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem 0.75rem 1.25rem;
  background: var(--ed-surface);
  border-bottom: 1px solid var(--ed-border);
}

.title-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.eyebrow {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ed-accent);
}

.title-input {
  font: inherit;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--ed-text);
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  padding: 0.1rem 0.35rem;
  margin-left: -0.35rem;
  outline: none;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-input:hover {
  border-color: var(--ed-border);
}

.title-input:focus {
  border-color: var(--ed-accent);
  box-shadow: 0 0 0 3px var(--ed-accent-ring);
}

.title-input.static,
.title-input.static:hover {
  border-color: transparent;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.segmented {
  display: inline-flex;
  border: 1px solid var(--ed-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--ed-input);
}

.segmented button {
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.4rem 0.9rem;
  border: none;
  background: transparent;
  color: var(--ed-muted);
  cursor: pointer;
}

.segmented button+button {
  border-left: 1px solid var(--ed-border);
}

.segmented button.active {
  background: var(--ed-surface);
  color: var(--ed-accent);
}

.ghost-btn,
.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  padding: 0.5rem 0.85rem;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.ghost-btn {
  background: transparent;
  color: var(--ed-text);
}

.ghost-btn:hover {
  background: var(--ed-hover);
}

.ghost-btn.active {
  background: var(--ed-accent-soft);
  color: var(--ed-accent);
}

.primary-btn {
  background: #fff;
  color: var(--text-on-light);
  box-shadow: 0 0 18px rgba(170, 120, 255, 0.5);
}

.primary-btn:hover {
  background: #fff;
  box-shadow: 0 0 0 1px #fff, 0 0 26px rgba(180, 130, 255, 0.75), 0 0 50px rgba(255, 115, 250, 0.35);
}

button:focus-visible {
  outline: 2px solid var(--ed-accent);
  outline-offset: 2px;
}

.banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 1.25rem;
  font-size: 0.85rem;
  background: var(--ed-warn-soft);
  border-bottom: 1px solid rgba(255, 196, 107, 0.3);
  color: #ffdca3;
}

.banner .icon-btn {
  margin-left: auto;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font: inherit;
  font-weight: 600;
  color: var(--ed-accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.15rem 0.3rem;
  border-radius: 5px;
}

.link-btn:hover {
  background: var(--ed-accent-soft);
}

/* WORKSPACE ---------------------------------------------------------------- */
.workspace {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
}

.workspace.with-preview {
  grid-template-columns: 270px minmax(0, 1fr) minmax(320px, 38%);
}

.workspace.text-view {
  grid-template-columns: minmax(0, 1fr);
}

.sidebar {
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  border-right: 1px solid var(--ed-border);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.panel-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ed-muted);
}

.panel-hint {
  font-size: 0.78rem;
  color: var(--ed-muted);
  line-height: 1.4;
}

.outline {
  list-style: none;
  padding: 0;
  margin: 0;
}

.outline-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font: inherit;
  font-size: 0.88rem;
  text-align: left;
  color: var(--ed-text);
  background: none;
  border: none;
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
  cursor: pointer;
}

.outline-item:hover {
  background: var(--ed-hover);
}

.outline-item.unsectioned {
  font-style: italic;
  color: var(--ed-muted);
}

.outline-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ed-muted);
  font-variant-numeric: tabular-nums;
}

.error-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--ed-error);
}

/* ENTRIES ------------------------------------------------------------------ */
.entries {
  overflow-y: auto;
  padding: 0 1.5rem 2rem;
  scroll-padding: 4rem 0 2rem;
}

.entries-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0 0.6rem;
  background: var(--ed-bg);
}

.search {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--ed-muted);
  background: var(--ed-surface);
  border: 1px solid var(--ed-border);
  border-radius: 8px;
  padding: 0 0.6rem;
  width: min(22rem, 100%);
}

.search:focus-within {
  border-color: var(--ed-accent);
  box-shadow: 0 0 0 3px var(--ed-accent-ring);
}

.search input {
  flex: 1;
  font: inherit;
  font-size: 0.88rem;
  border: none;
  outline: none;
  background: transparent;
  color: var(--ed-text);
  padding: 0.45rem 0;
}

.muted {
  font-size: 0.82rem;
  color: var(--ed-muted);
}

.entry-list {
  display: flex;
  flex-direction: column;
}

/* The bar reaches into the gap around it (negative margins) so that its
   hover zone is easy to hit without spacing the rows further apart. */
.insert-bar {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  height: 1.5rem;
  margin-block: -0.45rem;
  align-items: center;
  opacity: 0;
  transition: opacity 0.12s ease, height 0.12s ease;
}

.insert-bar:hover,
.insert-bar:focus-within {
  opacity: 1;
  height: 2.6rem;
}

.insert-bar button {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 1.9rem;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ed-accent);
  background: var(--ed-surface);
  border: 1px dashed var(--ed-border-strong);
  border-radius: 999px;
  padding: 0.3rem 1rem;
  cursor: pointer;
}

/* Invisible padding around each button: clicks slightly outside still land */
.insert-bar button::before {
  content: '';
  position: absolute;
  inset: -0.35rem -0.3rem;
}

.insert-bar button:hover {
  border-color: var(--ed-accent);
}

.header-row,
.raw-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.6rem 0.5rem 0.35rem;
  margin-top: 0.9rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.4);
}

.header-row.level-2 {
  margin-left: 1rem;
  border-bottom-width: 1px;
  border-bottom-color: var(--ed-border-strong);
}

.header-row.level-3,
.header-row[class*='level-']:not(.level-1):not(.level-2) {
  margin-left: 2rem;
  border-bottom-width: 1px;
  border-bottom-style: dashed;
  border-bottom-color: var(--ed-border-strong);
}

.level-select {
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ed-accent);
  background: var(--ed-accent-soft);
  border: none;
  border-radius: 6px;
  padding: 0.25rem 0.35rem;
  cursor: pointer;
}

.header-input {
  font: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ed-text);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  padding: 0.25rem 0.4rem;
  outline: none;
  min-width: 0;
}

.level-2 .header-input {
  font-size: 1rem;
}

.level-3 .header-input {
  font-size: 0.95rem;
}

.header-input:hover {
  border-color: var(--ed-border);
}

.header-input:focus {
  border-color: var(--ed-accent);
  background: var(--ed-surface);
  box-shadow: 0 0 0 3px var(--ed-accent-ring);
}

.header-extra,
.row-issue {
  grid-column: 1 / -1;
}

.row-issue {
  font-size: 0.8rem;
  color: var(--ed-error);
}

.raw-row {
  grid-template-columns: 1fr;
  border: 1px dashed var(--ed-border-strong);
  border-radius: 10px;
  background: var(--ed-surface);
  padding: 0.5rem 0.75rem 0.75rem;
  margin: 0.25rem 0 0;
}

.raw-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.raw-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ed-muted);
}

.raw-input {
  font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-size: 0.82rem;
  tab-size: 4;
  color: var(--ed-text);
  background: var(--ed-input);
  border: 1px solid var(--ed-border);
  border-radius: 7px;
  padding: 0.4rem 0.6rem;
  resize: vertical;
  outline: none;
}

.raw-input:focus {
  border-color: var(--ed-accent);
  box-shadow: 0 0 0 3px var(--ed-accent-ring);
}

.row-actions {
  display: flex;
  gap: 0.1rem;
  opacity: 0.45;
}

.header-row:hover .row-actions,
.header-row:focus-within .row-actions,
.raw-row:hover .row-actions,
.raw-row:focus-within .row-actions {
  opacity: 1;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ed-muted);
  cursor: pointer;
}

.icon-btn:hover:not(:disabled) {
  background: var(--ed-hover);
  color: var(--ed-text);
}

.icon-btn.danger:hover:not(:disabled) {
  color: var(--ed-error);
  background: var(--ed-error-soft);
}

.icon-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.empty-filter {
  text-align: center;
  color: var(--ed-muted);
  padding: 2rem;
}

.entries-footer {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.add-big {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font: inherit;
  font-weight: 600;
  color: var(--ed-accent);
  background: var(--ed-surface);
  border: 1.5px dashed var(--ed-border-strong);
  border-radius: 10px;
  padding: 0.85rem;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.add-big:hover {
  border-color: var(--ed-accent);
  background: var(--ed-accent-soft);
}

.add-big.secondary {
  flex: 0 0 auto;
  padding-inline: 1.5rem;
  color: var(--ed-text);
}

.entry-list :deep(.card-row) {
  margin-top: 0.25rem;
}

/* TEXT VIEW ---------------------------------------------------------------- */
.text-view-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  min-height: 0;
}

.raw-editor {
  font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-size: 0.9rem;
  line-height: 1.55;
  tab-size: 4;
  color: var(--ed-text);
  background: var(--ed-surface);
  border: none;
  outline: none;
  resize: none;
  padding: 1.25rem 1.5rem;
  white-space: pre;
  overflow: auto;
}

.syntax-help {
  overflow-y: auto;
  padding: 1rem;
  border-left: 1px solid var(--ed-border);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.syntax-help dl {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.82rem;
}

.syntax-help dt {
  margin-top: 0.5rem;
}

.syntax-help dd {
  color: var(--ed-muted);
  margin: 0;
}

code {
  font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-size: 0.8rem;
  background: var(--ed-hover);
  border-radius: 4px;
  padding: 0.05rem 0.3rem;
  white-space: nowrap;
}

/* PREVIEW ------------------------------------------------------------------ */
.preview {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem;
  background: var(--ed-surface);
  border-left: 1px solid var(--ed-border);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-card {
  display: flex;
  flex-direction: column;
}

.preview-front {
  font-weight: 700;
  font-size: 1.05rem;
}

.preview-textbox {
  background: var(--ed-input);
  border: 1px solid var(--ed-border);
  border-radius: 8px;
  padding: 0.75rem;
  white-space: pre-wrap;
}

.preview-empty {
  color: var(--ed-muted);
  font-size: 0.88rem;
  padding: 1.5rem 0.5rem;
  text-align: center;
}

.steps {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.step {
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  border: 1px solid var(--ed-border);
  background: var(--ed-input);
  color: var(--ed-text);
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
  cursor: pointer;
}

.step.active {
  border-color: var(--ed-accent);
  background: var(--ed-accent-soft);
  color: var(--ed-accent);
}

.pdf-frame {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--ed-border);
  border-radius: 8px;
  overflow: hidden;
}

.preview-tabs button {
  padding: 0.25rem 0.8rem;
}

.capture-resource {
  font: inherit;
  font-size: 0.88rem;
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--ed-border);
  background: var(--ed-input);
  color: var(--ed-text);
}

.capture-resource option {
  background: var(--ed-surface);
}

.capture-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ed-muted);
}

.capture-hint kbd {
  font-size: 0.72rem;
}

.capture-question {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ed-muted);
}

.capture-question input {
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 400;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--ed-border);
  background: var(--ed-input);
  color: var(--ed-text);
  outline: none;
}

.capture-question input:focus {
  border-color: var(--ed-accent);
  box-shadow: 0 0 0 3px var(--ed-accent-ring);
}

.capture-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.capture-actions .ghost-btn {
  border-color: var(--ed-border);
}

.capture-actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

/* STATUS BAR --------------------------------------------------------------- */
.statusbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.4rem 1rem;
  background: var(--ed-surface);
  border-top: 1px solid var(--ed-border);
  font-size: 0.8rem;
}

.status-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font: inherit;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  padding: 0.25rem 0.55rem;
  cursor: pointer;
}

.status-btn:disabled {
  cursor: default;
}

.status-btn.is-ok {
  color: var(--ed-ok);
  background: var(--ed-ok-soft);
}

.status-btn.has-warnings {
  color: var(--ed-warn);
  background: var(--ed-warn-soft);
}

.status-btn.has-errors {
  color: var(--ed-error);
  background: var(--ed-error-soft);
}

.shortcuts {
  margin-left: auto;
  color: var(--ed-muted);
}

kbd {
  font-family: inherit;
  font-size: 0.72rem;
  border: 1px solid var(--ed-border-strong);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 0 0.3rem;
  background: var(--ed-input);
}

.issues-popover {
  position: absolute;
  left: 1rem;
  bottom: 2.75rem;
  z-index: 5;
  width: min(32rem, calc(100% - 2rem));
  max-height: 50%;
  overflow-y: auto;
  background: var(--ed-surface);
  border: 1px solid var(--ed-border);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(3, 2, 14, 0.6);
  padding: 0.6rem;
}

.issues-popover header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.2rem 0.3rem;
}

.issues-popover ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.issues-popover li button {
  width: 100%;
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  text-align: left;
  font: inherit;
  font-size: 0.85rem;
  background: none;
  border: none;
  border-radius: 6px;
  padding: 0.35rem 0.45rem;
  cursor: pointer;
}

.issues-popover li button:hover:not(:disabled) {
  background: var(--ed-hover);
}

.issues-popover li button:disabled {
  cursor: default;
}

.issues-popover li button .editor-icon {
  margin-top: 0.2rem;
}

.issues-popover .error {
  color: var(--ed-error);
}

.issues-popover .warning {
  color: var(--ed-warn);
}

.toast {
  position: absolute;
  left: 50%;
  bottom: 3.25rem;
  transform: translateX(-50%);
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #241f55;
  border: 1px solid var(--ed-border-strong);
  color: #fff;
  border-radius: 10px;
  padding: 0.55rem 0.6rem 0.55rem 1rem;
  font-size: 0.88rem;
  box-shadow: 0 10px 30px rgba(3, 2, 14, 0.6), 0 0 30px rgba(155, 92, 255, 0.3);
}

.toast .link-btn {
  color: var(--ed-accent);
}

.toast .link-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* RESPONSIVE --------------------------------------------------------------- */
@media (max-width: 1100px) {
  .workspace.with-preview {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .workspace.with-preview .preview {
    display: none;
  }

  /* No room for a third column: capturing slides the panel over the cards */
  .workspace.with-preview.capturing .preview {
    display: flex;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(460px, 100%);
    z-index: 5;
    box-shadow: -18px 0 40px rgba(3, 2, 14, 0.6);
  }

  .shortcuts {
    display: none;
  }
}

@media (max-width: 760px) {
  .editor-overlay {
    padding: 0;
  }

  .editor {
    border-radius: 0;
  }

  .topbar {
    flex-wrap: wrap;
  }

  .workspace,
  .workspace.with-preview {
    grid-template-columns: minmax(0, 1fr);
  }

  .sidebar {
    display: none;
  }

  .entries {
    padding: 0 0.75rem 1.5rem;
  }

  .text-view-main {
    grid-template-columns: minmax(0, 1fr);
  }

  .syntax-help {
    display: none;
  }
}
</style>
