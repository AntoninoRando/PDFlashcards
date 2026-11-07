<script setup lang="ts">
/*
  Sidebar panel of the study-set editor: the PDF resources (with their aliases
  and whether the PDF is uploaded) and the acronyms.
*/
import { nextTick, ref } from 'vue'
import EditorIcon from './EditorIcon.vue'
import { newAcronym, newResource, type EditorDocument, type Issue } from './EditorDocument'

const props = defineProps<{
  doc: EditorDocument
  /** Uploaded PDFs: file name -> object URL. */
  pdfCache: Record<string, string>
  issuesById: Map<number, Issue[]>
}>()

const emit = defineEmits<{
  uploadPdf: [item: { file: File; url: string }]
}>()

const aliasDrafts = ref<Record<number, string>>({})
const uploadError = ref<string | null>(null)

function addResource() {
  props.doc.resources.push(newResource())
  nextTick(() => {
    const inputs = document.querySelectorAll<HTMLInputElement>('.resource-file-input')
    inputs[inputs.length - 1]?.focus()
  })
}

function removeResource(index: number) {
  const r = props.doc.resources[index]
  if ((r.file.trim() || r.aliases.length) && !confirm(`Remove the resource "${r.file || 'unnamed'}"?`)) return
  props.doc.resources.splice(index, 1)
}

function moveResource(index: number, direction: -1 | 1) {
  const target = index + direction
  const list = props.doc.resources
  if (target < 0 || target >= list.length) return
  ;[list[index], list[target]] = [list[target], list[index]]
}

function commitAlias(resourceId: number) {
  const resource = props.doc.resources.find((r) => r.id === resourceId)
  const value = (aliasDrafts.value[resourceId] ?? '').trim().replace(/\s+/g, '-')
  if (!resource || !value) return
  if (!resource.aliases.includes(value)) resource.aliases.push(value)
  aliasDrafts.value[resourceId] = ''
}

function onAliasKeydown(event: KeyboardEvent, resourceId: number) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    commitAlias(resourceId)
  }
}

function onUpload(event: Event) {
  const input = event.target as HTMLInputElement
  uploadError.value = null
  for (const file of Array.from(input.files ?? [])) {
    if (file.type !== 'application/pdf') {
      uploadError.value = `"${file.name}" is not a PDF`
      continue
    }
    emit('uploadPdf', { file, url: URL.createObjectURL(file) })
    // Uploading a PDF the study set does not reference adds it as a resource
    if (!props.doc.resources.some((r) => r.file.trim() === file.name)) {
      const empty = props.doc.resources.find((r) => !r.file.trim())
      if (empty) empty.file = file.name
      else props.doc.resources.push(newResource(file.name))
    }
  }
  input.value = ''
}

function isUploaded(file: string): boolean {
  return !!props.pdfCache[file.trim()]
}
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <h3>Resources</h3>
      <label class="text-btn" title="Upload PDFs: the ones not in the study set are added as resources">
        <EditorIcon name="upload" :size="14" /> Upload PDF
        <input type="file" accept="application/pdf" multiple class="visually-hidden" @change="onUpload" />
      </label>
    </header>
    <p v-if="uploadError" class="panel-error">{{ uploadError }}</p>
    <p v-if="!doc.resources.length" class="panel-hint">
      Cards point to pages of a PDF. Upload one, or add its file name.
    </p>

    <ul class="resource-list">
      <li v-for="(resource, i) in doc.resources" :key="resource.id" class="resource" :data-resource-id="resource.id"
        :class="{ invalid: issuesById.get(resource.id)?.some((x) => x.severity === 'error') }">
        <div class="resource-main">
          <span class="status" :class="isUploaded(resource.file) ? 'ok' : 'missing'"
            :title="isUploaded(resource.file) ? 'PDF uploaded' : 'PDF not uploaded yet: upload a file with this name'">
            <EditorIcon :name="isUploaded(resource.file) ? 'check' : 'file'" :size="14" />
          </span>
          <input class="resource-file-input" v-model="resource.file" type="text" placeholder="book.pdf"
            aria-label="PDF file name" spellcheck="false" />
          <span v-if="i === 0" class="default-badge" title="Pages without a resource use this one">default</span>
          <div class="resource-actions">
            <button type="button" class="icon-btn" title="Move up (the first one is the default)" :disabled="i === 0"
              @click="moveResource(i, -1)">
              <EditorIcon name="up" :size="13" />
            </button>
            <button type="button" class="icon-btn danger" title="Remove resource" @click="removeResource(i)">
              <EditorIcon name="x" :size="13" />
            </button>
          </div>
        </div>
        <div class="aliases">
          <span v-for="(alias, j) in resource.aliases" :key="alias + j" class="chip">
            @{{ alias }}
            <button type="button" :title="`Remove alias ${alias}`" @click="resource.aliases.splice(j, 1)">
              <EditorIcon name="x" :size="11" />
            </button>
          </span>
          <input class="alias-input" v-model="aliasDrafts[resource.id]" type="text" placeholder="+ alias"
            aria-label="New alias" spellcheck="false" @keydown="onAliasKeydown($event, resource.id)"
            @blur="commitAlias(resource.id)" />
        </div>
        <ul v-if="issuesById.get(resource.id)?.length" class="panel-issues">
          <li v-for="(issue, k) in issuesById.get(resource.id)" :key="k">{{ issue.message }}</li>
        </ul>
      </li>
    </ul>
    <button type="button" class="add-btn" @click="addResource">
      <EditorIcon name="plus" :size="14" /> Add resource
    </button>
  </section>

  <details class="panel" :open="doc.acronyms.length > 0">
    <summary class="panel-header">
      <h3>Acronyms <span class="count">{{ doc.acronyms.length }}</span></h3>
    </summary>
    <ul class="acronym-list">
      <li v-for="(acronym, i) in doc.acronyms" :key="acronym.id" class="acronym">
        <input v-model="acronym.alias" type="text" placeholder="PCB" aria-label="Acronym" />
        <input v-model="acronym.value" type="text" placeholder="Process Control Block" aria-label="Meaning" />
        <button type="button" class="icon-btn danger" title="Remove" @click="doc.acronyms.splice(i, 1)">
          <EditorIcon name="x" :size="13" />
        </button>
      </li>
    </ul>
    <button type="button" class="add-btn" @click="doc.acronyms.push(newAcronym())">
      <EditorIcon name="plus" :size="14" /> Add acronym
    </button>
  </details>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

details.panel>summary {
  list-style: none;
  cursor: pointer;
}

details.panel>summary::-webkit-details-marker {
  display: none;
}

details.panel>summary h3::before {
  content: '▸ ';
  color: var(--ed-muted);
}

details.panel[open]>summary h3::before {
  content: '▾ ';
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h3 {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ed-muted);
}

.count {
  font-weight: 600;
  color: var(--ed-muted);
  opacity: 0.8;
}

.panel-hint,
.panel-error {
  font-size: 0.8rem;
  color: var(--ed-muted);
  line-height: 1.4;
}

.panel-error {
  color: var(--ed-error);
}

.resource-list,
.acronym-list,
.panel-issues {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.resource {
  background: var(--ed-surface);
  border: 1px solid var(--ed-border);
  border-radius: 8px;
  padding: 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.resource.invalid {
  border-color: var(--ed-error);
}

.resource-main {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.status {
  display: inline-flex;
  width: 1.4rem;
  height: 1.4rem;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.status.ok {
  color: var(--ed-ok);
  background: var(--ed-ok-soft);
}

.status.missing {
  color: var(--ed-muted);
  background: var(--ed-hover);
}

input {
  font: inherit;
  font-size: 0.85rem;
  color: var(--ed-text);
  background: var(--ed-input);
  border: 1px solid var(--ed-border);
  border-radius: 6px;
  padding: 0.3rem 0.45rem;
  outline: none;
  min-width: 0;
}

input:focus {
  border-color: var(--ed-accent);
  background: var(--ed-surface);
  box-shadow: 0 0 0 3px var(--ed-accent-ring);
}

.resource-file-input {
  flex: 1;
}

.default-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--ed-accent);
  background: var(--ed-accent-soft);
  border-radius: 4px;
  padding: 0.05rem 0.3rem;
}

.resource-actions {
  display: flex;
}

.aliases {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding-left: 1.75rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.78rem;
  background: var(--ed-hover);
  border-radius: 999px;
  padding: 0.05rem 0.25rem 0.05rem 0.55rem;
}

.chip button {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--ed-muted);
  display: inline-flex;
  padding: 0.15rem;
  border-radius: 50%;
}

.chip button:hover {
  color: var(--ed-error);
}

.alias-input {
  width: 5.5rem;
  font-size: 0.78rem;
  padding: 0.1rem 0.4rem;
  border-style: dashed;
  border-radius: 999px;
}

.panel-issues li {
  font-size: 0.75rem;
  color: var(--ed-error);
}

.acronym {
  display: grid;
  grid-template-columns: 4.5rem 1fr auto;
  gap: 0.3rem;
  align-items: center;
}

.add-btn,
.text-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ed-accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.35rem;
  border-radius: 6px;
  align-self: flex-start;
}

.add-btn:hover,
.text-btn:hover {
  background: var(--ed-accent-soft);
}

.text-btn:focus-within {
  outline: 2px solid var(--ed-accent);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: 5px;
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
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
