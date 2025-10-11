<script setup lang="ts">
import { HideOption, IFlashcard } from '@/FlashcardParser/Types/Types';
import RecallOptions from './RecallOptions.vue'
import { createApp, ref, onMounted, watch } from 'vue'


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



//#region METHODS --------------------------------------------------------------
function isRevealed() {
  return revealed.value
}

function reveal() {
  revealed.value = true
  emit('reveal', props.flashcard)
}

function hide(recall = 'hide') {
  hidingRecallOptions.value = true
  setTimeout(() => {
    revealed.value = false
    hidingRecallOptions.value = false
    if (recall !== 'skip') {
      props.flashcard.reviewedAt = new Date()
    }
    pdfBlur(false)
    emit('hide', { flashcard: props.flashcard, recall })
  }, 300)
}

function forgot() {
  recallOptions.value?.chooseRecallOption('forgot')
}

function bad() {
  recallOptions.value?.chooseRecallOption('bad')
}

function notBad() {
  recallOptions.value?.chooseRecallOption('not bad')
}

function ok() {
  recallOptions.value?.chooseRecallOption('ok')
}

function point(what: string) {
  recallOptions.value?.point(what)
}

const toUnmount = [];

function showSubparts() {
  toUnmount.forEach((app) => app.unmount());
  const subpartsElement = subparts.value as HTMLElement
  subpartsElement.innerHTML = '';

  const cardLD: any = props.flashcard.lineDescriptor as any;

  const renderList = (list: any[]) => {
    list.forEach((sub: any) => {
      if (!sub || !sub.vueComponent) return;
      const componentContainer = document.createElement('div')
      componentContainer.className = 'subpart-container'
      componentContainer.id = `subpart-${sub.name || Math.random().toString(36)}`
      subpartsElement.appendChild(componentContainer)
      const app = createApp(sub.vueComponent, { config: sub })
      toUnmount.push(app);
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



watch(revealed, async (oldV, newV) => {
  showSubparts();
})

onMounted(showSubparts)

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
      <button @click="reveal" class="flashcard-button" v-html="flashcard.text"></button>
    </div>

    <!--Recall options for the flashcards when it is revealed-->
    <RecallOptions v-else ref="recallOptions" class="buttons-container" :class="{ hiding: hidingRecallOptions }"
      @mouseenter="() => pdfBlur(true)" @mouseleave="() => pdfBlur(false)" @optionSelected="option => hide(option)" />

    <!--Here flashcard subparts are added-->
    <div ref="subparts" id="subparts"></div>
  </div>
</template>


<style scoped>
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap");

.flashcard {
  width: 100%;
  height: 150px;
  display: flex;
  flex-direction: column;
}

.card-container {
  display: flex;
  height: 100%;
  width: 100%;
  flex-direction: row;
  gap: 3px;
}

.buttons-container {
  height: 100%;
  width: 100%;
  transition: all 0.3s ease-in-out;
  transform: scale(1);
  opacity: 1;
  display: flex;
}

.buttons-container.hiding {
  transform: scale(0.95);
  opacity: 0;
}

.flashcard-button {
  width: 500px;
  height: 150px;
  font-size: 15px;
  font-family: "JetBrains Mono", monospace;
  font-optical-sizing: auto;
  font-weight: 300;
  font-style: normal;
  color: #000;

  align-items: center;
  appearance: none;
  background-color: #FCFCFD;
  border-radius: 4px;
  border-width: 0;
  box-shadow: rgba(45, 35, 66, 0.4) 0 2px 4px, rgba(45, 35, 66, 0.3) 0 7px 13px -3px, #D6D6E7 0 -3px 0 inset;
  box-sizing: border-box;
  color: #36395A;
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  line-height: 1.5;
  list-style: none;
  overflow: hidden;
  padding-left: 16px;
  padding-right: 16px;
  position: relative;
  text-align: center;
  text-decoration: none;
  transition: box-shadow .15s, transform .15s;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  white-space: pre-wrap;
  will-change: box-shadow, transform;
}

.aliases {
  height: 100%;
  width: 20%;
  align-content: center;
  text-align: center;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px 0px 0px 12px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.pointed {
  border-color: rgb(180, 0, 0) !important;
  border-width: 3px !important;
  transition: all 0.2s ease;
}
</style>
