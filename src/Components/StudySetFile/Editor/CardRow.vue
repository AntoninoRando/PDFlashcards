<script setup lang="ts">
/*
  One flashcard in the study-set editor: front text, answer (PDF pages or a
  text box) and the details tabbed under it (remember, notes, tags...).
*/
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import EditorIcon from './EditorIcon.vue'
import SlashMenu from './SlashMenu.vue'
import {
  DETAIL_KINDS,
  newDetail,
  type CardEntry,
  type DetailType,
  type Issue,
} from './EditorDocument'
import { filterCommands, findSlashQuery, removeSlashQuery, type SlashCommand } from './SlashCommands'

const props = defineProps<{
  card: CardEntry
  number: number
  issues: Issue[]
  /** Aliases and file names the pages can point to. */
  resourceOptions: string[]
  defaultResource: string
  focused: boolean
  canMove: boolean
}>()

const emit = defineEmits<{
  focus: []
  addAfter: []
  /** Add a section right after this card. */
  addSection: []
  /** Open the Capture tab, to draw this card's answer on a PDF page. */
  capture: []
  move: [direction: -1 | 1]
  duplicate: []
  remove: []
}>()

const answerInput = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)
const detailsList = ref<HTMLElement | null>(null)

const hasError = computed(() => props.issues.some((i) => i.severity === 'error'))

const addableKinds = computed(() =>
  Object.values(DETAIL_KINDS).filter(
    // Auto-reveal and reverse make sense once per card
    (k) => k.addable && !((k.type === 'autoReveal' || k.type === 'reverse') && props.card.details.some((d) => d.type === k.type)),
  ),
)

function focusAnswer() {
  answerInput.value?.focus()
}

function addDetail(event: Event) {
  const select = event.target as HTMLSelectElement
  const type = select.value as DetailType
  select.value = ''
  if (!type) return
  addDetailOfType(type)
}

/** Adds a detail; returns whether it has a field (which gets the focus, so that the user can type right away). */
function addDetailOfType(type: DetailType): boolean {
  const detail = newDetail(type)
  props.card.details.push(detail)
  const hasField = type !== 'autoReveal' && type !== 'reverse'
  if (hasField) {
    nextTick(() => {
      detailsList.value?.querySelector<HTMLInputElement>(`[data-detail-id="${detail.id}"] .detail-input`)?.focus()
    })
  }
  return hasField
}

//#region SLASH MENU -----------------------------------------------------------
/* Typing "/" in a field of the card opens a menu of commands (see
   SlashCommands.ts). The "/query" is removed from the field when one runs. */
interface CardCommand extends SlashCommand {
  run: () => void
}

/** What some details are for, when the "+ Detail" placeholder does not say it. */
const DETAIL_HINTS: Partial<Record<DetailType, string>> = {
  tag: 'Group cards by topic',
  pages: 'Another page the card opens',
  autoReveal: 'Open the answer as soon as the card is shown',
  reverse: 'Also study it the other way: the answer first',
}

const DETAIL_KEYWORDS: Partial<Record<DetailType, string[]>> = {
  remember: ['+', 'hint'],
  tag: ['#', 'label', 'topic'],
  pages: ['..', 'pdf', 'page'],
  autoReveal: ['open', 'show'],
  reverse: ['<>', 'flip', 'both', 'backwards'],
}

const DETAIL_SHORTCUTS: Partial<Record<DetailType, string>> = {
  remember: '+',
  tag: '#',
  pages: '..',
  reverse: '<>',
}

const slashCommands = computed<CardCommand[]>(() => {
  const details: CardCommand[] = addableKinds.value.map((kind) => ({
    id: kind.type,
    label: kind.type === 'reverse' ? 'Reverse card' : kind.label,
    hint: DETAIL_HINTS[kind.type] ?? kind.placeholder,
    keywords: DETAIL_KEYWORDS[kind.type] ?? [],
    shortcut: DETAIL_SHORTCUTS[kind.type],
    // Details without a field (reverse, auto-reveal) leave the focus where it is
    run: () => void addDetailOfType(kind.type),
  }))

  const textAnswer = props.card.answer === 'textbox'
  return [
    ...details,
    textAnswer
      ? { id: 'answer-pages', label: 'PDF pages answer', hint: 'The answer is in the PDF', keywords: ['pdf', 'page'], run: () => switchAnswer('pages') }
      : { id: 'answer-text', label: 'Text answer', hint: 'Write the answer instead of pointing to a page', keywords: ['...', 'textbox'], shortcut: '...', run: () => switchAnswer('textbox') },
    { id: 'capture', label: 'Capture from PDF', hint: 'Draw this card’s answer on a page', keywords: ['region', 'box', 'select', 'highlight'], run: () => emit('capture') },
    { id: 'card', label: 'New card below', hint: 'Ctrl+Enter', keywords: ['add', 'create'], run: () => emit('addAfter') },
    { id: 'section', label: 'New section below', hint: 'Group the next cards', keywords: ['header', 'chapter', 'add'], shortcut: '^', run: () => emit('addSection') },
    { id: 'duplicate', label: 'Duplicate card', hint: 'A copy right after this one', keywords: ['copy', 'clone'], run: () => emit('duplicate') },
  ]
})

function switchAnswer(answer: CardEntry['answer']) {
  props.card.answer = answer
  nextTick(focusAnswer)
}

interface SlashState {
  el: HTMLInputElement | HTMLTextAreaElement
  start: number
  query: string
  /** Writes a new value of the field into the card. */
  apply: (value: string) => void
}

const slash = ref<SlashState | null>(null)
const slashIndex = ref(0)
const slashPosition = ref<{ left: number; top?: number; bottom?: number }>({ left: 0, top: 0 })
/** A "/" the user closed the menu of (Esc): it does not open again while it is there. */
let dismissed: { el: EventTarget; start: number } | null = null

const slashItems = computed(() => (slash.value ? filterCommands(slashCommands.value, slash.value.query) : []))

const MENU_WIDTH = 300
const MENU_HEIGHT = 340

function placeMenu(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8))
  // Above the field when there is no room below it
  slashPosition.value = rect.bottom + MENU_HEIGHT + 8 > window.innerHeight && rect.top > MENU_HEIGHT
    ? { left, bottom: window.innerHeight - rect.top + 4 }
    : { left, top: rect.bottom + 4 }
}

/** Opens, updates or closes the menu from the text before the caret. */
function updateSlash(event: Event, apply: (value: string) => void) {
  const el = event.target as HTMLInputElement | HTMLTextAreaElement
  const found = findSlashQuery(el.value, el.selectionStart ?? el.value.length)
  if (!found) {
    dismissed = null
    closeSlash()
    return
  }
  if (dismissed?.el === el && dismissed.start === found.start) return

  const isNew = !slash.value || slash.value.el !== el || slash.value.start !== found.start
  slash.value = { el, start: found.start, query: found.query, apply }
  if (!slashItems.value.length) {
    // Nothing matches: it was not a command
    closeSlash()
    return
  }
  if (isNew) slashIndex.value = 0
  slashIndex.value = Math.min(slashIndex.value, slashItems.value.length - 1)
  placeMenu(el)
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', closeSlash)
}

function closeSlash() {
  slash.value = null
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', closeSlash)
}

function onScroll(event: Event) {
  // Scrolling the list of commands itself is fine
  if ((event.target as HTMLElement | null)?.closest?.('.slash-menu')) return
  closeSlash()
}

/** Handles the menu keys; returns true if the event was for the menu. */
function slashKeydown(event: KeyboardEvent): boolean {
  if (!slash.value || !slashItems.value.length) return false
  const count = slashItems.value.length
  switch (event.key) {
    case 'ArrowDown':
      slashIndex.value = (slashIndex.value + 1) % count
      break
    case 'ArrowUp':
      slashIndex.value = (slashIndex.value - 1 + count) % count
      break
    case 'Enter':
    case 'Tab':
      if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return false
      runSlash(slashIndex.value)
      break
    case 'Escape':
      dismissed = { el: slash.value.el, start: slash.value.start }
      closeSlash()
      break
    default:
      return false
  }
  // Not the field's own Enter (next field, new card) nor the editor's Escape (close)
  event.preventDefault()
  event.stopPropagation()
  return true
}

function runSlash(index: number) {
  const state = slash.value
  const command = slashItems.value[index] as CardCommand | undefined
  if (!state || !command) return
  closeSlash()
  const { el, start, apply } = state
  const { value, caret } = removeSlashQuery(el.value, start, el.selectionStart ?? el.value.length)
  apply(value)
  // The field keeps the focus unless the command moves it
  nextTick(() => el.setSelectionRange?.(caret, caret))
  command.run()
}

/** Listeners for a field of the card: `apply` writes its new value. */
function slashField(apply: (value: string) => void) {
  return {
    input: (event: Event) => updateSlash(event, apply),
    // Moving the caret with the keyboard or the mouse may leave the "/query"
    keyup: (event: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) updateSlash(event, apply)
    },
    click: (event: Event) => slash.value && updateSlash(event, apply),
    blur: () => closeSlash(),
  }
}

const frontField = slashField((value) => (props.card.front = value))
const pagesField = slashField((value) => (props.card.pages = value))
const textBoxField = slashField((value) => (props.card.textBox = value))

onBeforeUnmount(closeSlash)
//#endregion -------------------------------------------------------------------

function removeDetail(index: number) {
  const detail = props.card.details[index]
  if (detail.type === 'recall' && !confirm('Reset the review progress of this card?')) return
  if (detail.type === 'reverse' && detail.value.includes('***') &&
    !confirm('Remove the reverse card and its review progress?')) return
  props.card.details.splice(index, 1)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Human-readable summary of a `*** date, ease, interval, learning` line. */
function recallSummary(line: string): string {
  const [date, , interval] = line.replace(/^\S+\s*/, '').split(',').map((p) => p.trim())
  const reviewed = new Date(date)
  const days = parseFloat(interval)
  if (isNaN(reviewed.getTime()) || isNaN(days)) return line
  const next = new Date(reviewed.getTime() + days * 86_400_000)
  return `Last reviewed ${formatDate(reviewed)} · next review ${formatDate(next)}`
}

function skipSummary(line: string): string {
  const until = new Date(line.replace(/^\S+\s*/, ''))
  return isNaN(until.getTime()) ? line : `Hidden until ${formatDate(until)}`
}

/** What a reverse detail does, plus the progress of the reverse card (kept under it). */
function reverseSummary(value: string): string {
  const what = props.card.answer === 'textbox'
    ? 'Also studied the other way: the text first, then this front'
    : 'Also studied the other way: the page first, then this front'
  const recall = value.split('\n').map((l) => l.trim()).find((l) => l.startsWith('***'))
  return recall ? `${what} · ${recallSummary(recall)}` : what
}

function rowsOf(text: string): number {
  return Math.min(8, Math.max(1, text.split('\n').length))
}

function onFrontKeydown(event: KeyboardEvent) {
  if (slashKeydown(event)) return
  // Enter on the front goes to the answer
  if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault()
    focusAnswer()
  }
}

function onAnswerKeydown(event: KeyboardEvent) {
  if (slashKeydown(event)) return
  // Enter on the answer adds the next card; Shift+Enter is a plain new line
  if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault()
    emit('addAfter')
  }
}
</script>

<template>
  <article class="card-row" :class="{ focused, invalid: hasError }" :data-entry-id="card.id" @focusin="emit('focus')"
    @click="emit('focus')">
    <div class="card-number" :title="`Card ${number}`">{{ number }}</div>

    <div class="card-body">
      <input class="front-input" v-model="card.front" type="text" spellcheck="true"
        placeholder="Front of the card: a question or a prompt · / for commands" aria-label="Front of the card"
        aria-haspopup="listbox" v-on="frontField" @keydown="onFrontKeydown" />

      <div class="answer-line">
        <div class="segmented" role="radiogroup" aria-label="Answer type">
          <button type="button" role="radio" :aria-checked="card.answer === 'pages'"
            :class="{ active: card.answer === 'pages' }" @click="card.answer = 'pages'">PDF pages</button>
          <button type="button" role="radio" :aria-checked="card.answer === 'textbox'"
            :class="{ active: card.answer === 'textbox' }" @click="card.answer = 'textbox'">Text</button>
        </div>

        <template v-if="card.answer === 'pages'">
          <select class="resource-select" v-model="card.resource" aria-label="Resource">
            <option value="">{{ defaultResource ? `Default (${defaultResource})` : 'Default resource' }}</option>
            <option v-for="name in resourceOptions" :key="name" :value="name">{{ name }}</option>
            <option v-if="card.resource && !resourceOptions.includes(card.resource)" :value="card.resource">
              {{ card.resource }} (missing)
            </option>
          </select>
          <input ref="answerInput" class="pages-input" v-model="card.pages" type="text" inputmode="numeric"
            placeholder="Pages: 12 · 14-16 · 20%50" aria-label="Pages" v-on="pagesField" @keydown="onAnswerKeydown" />
        </template>
        <textarea v-else ref="answerInput" class="textbox-input" v-model="card.textBox" :rows="rowsOf(card.textBox)"
          placeholder="Answer shown when the card is revealed" aria-label="Answer text"
          v-on="textBoxField" @keydown="onAnswerKeydown" />
      </div>

      <ul v-if="card.details.length" ref="detailsList" class="details">
        <li v-for="(detail, i) in card.details" :key="detail.id" class="detail" :class="`detail-${detail.type}`"
          :data-detail-id="detail.id">
          <span class="detail-label">{{ DETAIL_KINDS[detail.type].label }}</span>
          <span v-if="detail.type === 'recall'" class="detail-info" :title="detail.value">
            {{ recallSummary(detail.value) }}
          </span>
          <span v-else-if="detail.type === 'skip'" class="detail-info" :title="detail.value">
            {{ skipSummary(detail.value) }}
          </span>
          <span v-else-if="detail.type === 'autoReveal'" class="detail-info">
            The answer opens as soon as the card is shown
          </span>
          <span v-else-if="detail.type === 'reverse'" class="detail-info" :title="detail.value || undefined">
            {{ reverseSummary(detail.value) }}
          </span>
          <textarea v-else-if="detail.type === 'raw'" class="detail-input raw-input" v-model="detail.value"
            :rows="rowsOf(detail.value)" spellcheck="false" aria-label="Raw lines" />
          <input v-else class="detail-input" v-model="detail.value" type="text"
            :placeholder="DETAIL_KINDS[detail.type].placeholder" :aria-label="DETAIL_KINDS[detail.type].label"
            aria-haspopup="listbox" v-on="slashField((value) => (detail.value = value))" @keydown="slashKeydown" />
          <button type="button" class="icon-btn small"
            :title="detail.type === 'recall' ? 'Reset review progress' : 'Remove'" @click="removeDetail(i)">
            <EditorIcon name="x" :size="14" />
          </button>
        </li>
      </ul>

      <ul v-if="issues.length" class="issues">
        <li v-for="(issue, i) in issues" :key="i" :class="issue.severity">
          <EditorIcon name="alert" :size="13" /> {{ issue.message }}
        </li>
      </ul>
    </div>

    <div class="card-actions">
      <select class="add-detail" aria-label="Add a detail" title="Add a detail under this card" @change="addDetail">
        <option value="" selected>+ Detail</option>
        <option v-for="kind in addableKinds" :key="kind.type" :value="kind.type">{{ kind.label }}</option>
      </select>
      <div class="action-buttons">
        <button type="button" class="icon-btn" title="Move up (Alt+↑)" :disabled="!canMove" @click="emit('move', -1)">
          <EditorIcon name="up" />
        </button>
        <button type="button" class="icon-btn" title="Move down (Alt+↓)" :disabled="!canMove"
          @click="emit('move', 1)">
          <EditorIcon name="down" />
        </button>
        <button type="button" class="icon-btn" title="Duplicate" @click="emit('duplicate')">
          <EditorIcon name="copy" />
        </button>
        <button type="button" class="icon-btn danger" title="Delete card" @click="emit('remove')">
          <EditorIcon name="trash" />
        </button>
      </div>
    </div>

    <!-- Fixed to the window, next to the field being typed in -->
    <SlashMenu v-if="slash && slashItems.length" :items="slashItems" :active-index="slashIndex"
      :position="slashPosition" :query="slash.query" @hover="slashIndex = $event" @pick="runSlash" />
  </article>
</template>

<style scoped>
.card-row {
  display: grid;
  grid-template-columns: 2.25rem 1fr auto;
  gap: 0.75rem;
  padding: 0.85rem 0.9rem 0.85rem 0.6rem;
  background: var(--ed-surface);
  border: 1px solid var(--ed-border);
  border-left: 3px solid transparent;
  border-radius: 10px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.card-row:hover {
  border-color: var(--ed-border-strong);
}

.card-row.focused {
  border-color: var(--ed-border-strong);
  border-left-color: var(--ed-accent);
  box-shadow: 0 4px 14px rgba(3, 2, 14, 0.5), 0 0 22px rgba(255, 115, 250, 0.12);
}

.card-row.invalid .card-number {
  color: #1a0a14;
  background: var(--ed-error);
  border-radius: 999px;
  text-align: center;
  padding: 0;
  margin-top: 0.4rem;
  height: 1.4rem;
  line-height: 1.4rem;
}

.card-number {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ed-muted);
  text-align: right;
  padding-top: 0.55rem;
  font-variant-numeric: tabular-nums;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

input,
select,
textarea {
  font: inherit;
  color: var(--ed-text);
  background: var(--ed-input);
  border: 1px solid var(--ed-border);
  border-radius: 7px;
  padding: 0.4rem 0.6rem;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--ed-accent);
  background: var(--ed-surface);
  box-shadow: 0 0 0 3px var(--ed-accent-ring);
}

.front-input {
  font-size: 1rem;
  font-weight: 600;
  background: transparent;
  border-color: transparent;
  padding-left: 0.5rem;
}

.front-input:hover {
  border-color: var(--ed-border);
}

.answer-line {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.segmented {
  display: inline-flex;
  border: 1px solid var(--ed-border);
  border-radius: 7px;
  overflow: hidden;
  flex-shrink: 0;
}

.segmented button {
  font: inherit;
  font-size: 0.8rem;
  padding: 0.4rem 0.7rem;
  border: none;
  background: var(--ed-input);
  color: var(--ed-muted);
  cursor: pointer;
}

.segmented button+button {
  border-left: 1px solid var(--ed-border);
}

.segmented button.active {
  background: var(--ed-accent-soft);
  color: var(--ed-accent);
  font-weight: 600;
}

.resource-select {
  max-width: 13rem;
  font-size: 0.85rem;
}

.pages-input {
  flex: 1;
  min-width: 10rem;
  font-variant-numeric: tabular-nums;
}

.textbox-input {
  flex: 1;
  min-width: 12rem;
  resize: vertical;
  line-height: 1.4;
  field-sizing: content;
  max-height: 12rem;
}

.details {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border-left: 2px solid var(--ed-border);
  padding-left: 0.6rem;
  margin-left: 0.25rem;
}

.detail {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-label {
  flex-shrink: 0;
  width: 6.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ed-muted);
}

.detail-input {
  flex: 1;
  min-width: 0;
  font-size: 0.9rem;
  padding: 0.3rem 0.55rem;
}

.raw-input {
  field-sizing: content;
  max-height: 14rem;
  font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-size: 0.8rem;
  tab-size: 4;
  resize: vertical;
}

.detail-info {
  flex: 1;
  font-size: 0.85rem;
  color: var(--ed-muted);
}

.detail-recall .detail-label,
.detail-skip .detail-label {
  color: var(--ed-ok);
}

.issues {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.issues li {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.issues .error {
  color: var(--ed-error);
}

.issues .warning {
  color: var(--ed-warn);
}

.card-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
}

.add-detail {
  font-size: 0.8rem;
  padding: 0.3rem 0.4rem;
  cursor: pointer;
}

.action-buttons {
  display: flex;
  gap: 0.1rem;
  opacity: 0.45;
  transition: opacity 0.15s ease;
}

.card-row:hover .action-buttons,
.card-row.focused .action-buttons {
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

.icon-btn.small {
  width: 1.5rem;
  height: 1.5rem;
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

.icon-btn:focus-visible,
.segmented button:focus-visible {
  outline: 2px solid var(--ed-accent);
  outline-offset: 1px;
}

@media (max-width: 720px) {
  .card-row {
    grid-template-columns: 1fr;
  }

  .card-number {
    display: none;
  }

  .card-actions {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .action-buttons {
    opacity: 1;
  }
}
</style>
