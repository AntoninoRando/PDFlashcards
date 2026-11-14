<script setup lang="ts">
import { contentLineOf, HideOption, IFlashcard } from '@/FlashcardParser/Types/Types';
import { PageRef } from '@/Commands/All/PageRef';
import { TextBox } from '@/Commands/All/TextBox';
import RecallOptions from './RecallOptions.vue'
import { isSubpartShown } from './SubpartsVisibility'
import { computed, createApp, ref, onMounted, onBeforeUnmount, watch, type App } from 'vue'


//#region PROPS ----------------------------------------------------------------
const props = defineProps<{
  flashcard: IFlashcard
}>()
//#endregion -------------------------------------------------------------------



//#region EMITS ----------------------------------------------------------------
const emit = defineEmits<{
  reveal: [flashcard: IFlashcard]
  hide: [payload: { flashcard: IFlashcard; recall: HideOption }]
}>()
//#endregion -------------------------------------------------------------------



//#region REACTIVE DATA --------------------------------------------------------
const revealed = ref(false)
const hidingRecallOptions = ref(false)
const recallOptions = ref<InstanceType<typeof RecallOptions> | null>(null)
const subparts = ref<HTMLElement | null>(null)
//#endregion -------------------------------------------------------------------



//#region REVERSE CARDS --------------------------------------------------------
/* A reverse card (`<>`) shows the answer first (the PDF opens with it, or the
   text answer below the card) and asks for the front, shown once revealed. */
const isReverse = computed(() => !!props.flashcard.reverseOf)

const reversePrompt = computed(() => {
  const parts: any[] = contentLineOf(props.flashcard).subParts ?? []
  if (parts.some((p) => p?.name === TextBox.commandName)) return 'What does this describe?'
  const pages = parts.filter((p) => p?.name === PageRef.commandName)
  if (pages.some((p) => (p.allRefs ?? []).some((ref: any[]) => ref?.[3]))) return 'What is highlighted on the page?'
  return 'What is on this page?'
})
//#endregion -------------------------------------------------------------------



//#region METHODS --------------------------------------------------------------
function isRevealed() {
  return revealed.value
}

function reveal() {
  revealed.value = true
  emit('reveal', props.flashcard)
}

function hide(recall: HideOption = HideOption.hide) {
  hidingRecallOptions.value = true
  setTimeout(() => {
    revealed.value = false
    hidingRecallOptions.value = false
    // NOTE: `reviewedAt` is updated by the scheduler, which needs the previous
    // review date to compute the elapsed time.
    pdfBlur(false)
    emit('hide', { flashcard: props.flashcard, recall })
  }, 300)
}

function forgot() {
  recallOptions.value?.chooseRecallOption(HideOption.forgot)
}

function bad() {
  recallOptions.value?.chooseRecallOption(HideOption.bad)
}

function notBad() {
  recallOptions.value?.chooseRecallOption(HideOption.notBad)
}

function ok() {
  recallOptions.value?.chooseRecallOption(HideOption.ok)
}

function point(what: string | null) {
  recallOptions.value?.point(what)
}

/** Vue apps mounted for the subparts, to unmount before re-rendering. */
let mountedSubparts: App[] = [];

function unmountSubparts() {
  mountedSubparts.forEach((app) => app.unmount());
  mountedSubparts = [];
}

function showSubparts() {
  unmountSubparts();
  const subpartsElement = subparts.value
  if (!subpartsElement) return
  subpartsElement.innerHTML = '';

  // A reverse card shows the details of the card it reverses
  const cardLD: any = contentLineOf(props.flashcard) as any;
  // Before the reveal, the answer stays hidden (see SubpartsVisibility.ts)
  const shown = (sub: any) => isSubpartShown(sub?.name, { revealed: revealed.value, reverse: isReverse.value });

  const renderList = (list: any[]) => {
    list.forEach((sub: any) => {
      if (!sub || !sub.vueComponent || !shown(sub)) return;
      const componentContainer = document.createElement('div')
      componentContainer.className = 'subpart-container'
      componentContainer.id = `subpart-${sub.name || Math.random().toString(36)}`
      subpartsElement.appendChild(componentContainer)
      const app = createApp(sub.vueComponent, { config: sub })
      mountedSubparts.push(app);
      app.mount(componentContainer)
    })
  }

  // Group top-level subparts by their sourceIndex to maintain relation with child lines
  const topSubparts: any[] = (cardLD.subParts || []) as any[];
  const inlineOnCard = topSubparts.filter(sp => sp.sourceIndex === cardLD.index);
  const groupedBySource: Record<number, any[]> = {};
  const remainingTop: any[] = [];

  topSubparts.forEach(sp => {
    if (sp.sourceIndex === cardLD.index) return; // inline, handled separately
    if (typeof sp.sourceIndex === 'number') {
      if (!groupedBySource[sp.sourceIndex]) groupedBySource[sp.sourceIndex] = [];
      groupedBySource[sp.sourceIndex].push(sp);
    } else {
      remainingTop.push(sp);
    }
  });

  // 1) Render inline subparts attached directly to the card line
  renderList(inlineOnCard);

  // 2) For each immediate child line of the card, render its related top subparts then its own subparts
  const children: any[] = (cardLD.tabbedUnder || []) as any[];
  children.forEach(childLD => {
    const relatedTop = groupedBySource[childLD.index] || [];
    renderList(relatedTop);
    renderList(childLD.subParts || []);
    delete groupedBySource[childLD.index];
  });

  // 3) Render any remaining top subparts that were not matched to a child (fallback)
  const leftovers: any[] = Object.values(groupedBySource).flat().concat(remainingTop);
  renderList(leftovers);
}
//#endregion -------------------------------------------------------------------



watch(revealed, () => showSubparts())

onMounted(showSubparts)
onBeforeUnmount(unmountSubparts)

function pdfBlur(on: boolean) {
  const sections = document.querySelectorAll('.pdf-section');
  sections.forEach((el) => {
    if (on) (el as HTMLElement).classList.add('blurred');
    else (el as HTMLElement).classList.remove('blurred');
  });
}

defineExpose({ isRevealed, reveal, hide, forgot, bad, notBad, ok, point, showSubparts })
</script>

<template>
  <div class="flashcard">
    <!--The flashcard in it's hide state-->
    <div v-if="!revealed" class="card-container">
      <button v-if="!isReverse" @click="reveal" class="flashcard-button" v-html="flashcard.text"></button>
      <!--A reverse card asks for its front: the answer is in the PDF (or the text below)-->
      <button v-else @click="reveal" class="flashcard-button reverse" :aria-label="`Reverse card: ${reversePrompt}`">
        <span class="reverse-badge" aria-hidden="true">⇄ Reverse</span>
        <span class="reverse-prompt">{{ reversePrompt }}</span>
      </button>
    </div>

    <template v-else>
      <!--The front of a reverse card is its answer-->
      <div v-if="isReverse" class="reverse-answer" :class="{ hiding: hidingRecallOptions }">
        <span class="reverse-badge">Answer</span>
        <span v-html="flashcard.text"></span>
      </div>

      <!--Recall options for the flashcards when it is revealed-->
      <RecallOptions ref="recallOptions" class="buttons-container" :class="{ hiding: hidingRecallOptions }"
        @mouseenter="() => pdfBlur(true)" @mouseleave="() => pdfBlur(false)" @optionSelected="option => hide(option)" />
    </template>

    <!--Here flashcard subparts are added-->
    <div ref="subparts" id="subparts"></div>
  </div>
</template>


<style scoped>
.flashcard {
  width: 100%;
  min-height: 150px;
  display: flex;
  flex-direction: column;
}

.card-container {
  display: flex;
  width: 100%;
  flex-direction: row;
  gap: 3px;
}

.buttons-container {
  width: 100%;
  min-height: 150px;
  transition: all 0.3s ease-in-out;
  transform: scale(1);
  opacity: 1;
  display: flex;
}

.buttons-container.hiding {
  transform: scale(0.95);
  opacity: 0;
}

/* The card: dark glass with an iridescent border and a soft glow */
.flashcard-button {
  position: relative;
  width: 100%;
  min-height: 170px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1.75rem 2rem;

  font-family: var(--font-body);
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text);
  text-align: center;
  white-space: pre-wrap;

  appearance: none;
  background:
    linear-gradient(160deg, rgba(42, 34, 100, 0.92), rgba(18, 14, 48, 0.95)) padding-box,
    var(--grad-nitro) border-box;
  border: 1.5px solid transparent;
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 50px rgba(3, 2, 14, 0.55), 0 0 40px rgba(155, 92, 255, 0.25);
  backdrop-filter: blur(16px);
  cursor: pointer;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: box-shadow 0.25s ease, transform 0.25s ease;
  will-change: box-shadow, transform;
}

/* Glossy sheen sweeping across on hover */
.flashcard-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.1) 50%, transparent 65%);
  transform: translateX(-100%);
  transition: transform 0.7s ease;
  pointer-events: none;
}

.flashcard-button:hover {
  transform: translateY(-4px);
  box-shadow: 0 26px 60px rgba(3, 2, 14, 0.6), 0 0 60px rgba(255, 115, 250, 0.35);
}

.flashcard-button:hover::before {
  transform: translateX(100%);
}

.flashcard-button:active {
  transform: translateY(-1px) scale(0.99);
}

/* REVERSE CARDS */
.flashcard-button.reverse {
  flex-direction: column;
  gap: 0.6rem;
}

.reverse-badge {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pink);
}

.reverse-prompt {
  color: var(--text-muted);
  font-weight: 500;
}

.reverse-answer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
  padding: 1rem 1.5rem;
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.5;
  text-align: center;
  color: var(--text);
  /* Opaque like the card: it sits over the (white) PDF */
  background:
    linear-gradient(160deg, rgba(42, 34, 100, 0.97), rgba(18, 14, 48, 0.98)) padding-box,
    var(--grad-nitro) border-box;
  border: 1.5px solid transparent;
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 50px rgba(3, 2, 14, 0.55);
  transition: opacity 0.3s ease-in-out;
}

.reverse-answer.hiding {
  opacity: 0;
}

#subparts {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.35rem;
  margin-top: 0.75rem;
  color: var(--text-muted);
}

#subparts:empty {
  display: none;
}

/* Block-like subparts (notes, text boxes) take a full row; chips flow inline */
#subparts :deep(.subpart-container:has(.textbox-container, p)) {
  flex-basis: 100%;
}

.aliases {
  height: 100%;
  width: 20%;
  align-content: center;
  text-align: center;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 12px 0px 0px 12px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.pointed {
  border-color: var(--pink) !important;
  border-width: 3px !important;
  transition: all 0.2s ease;
}
</style>
