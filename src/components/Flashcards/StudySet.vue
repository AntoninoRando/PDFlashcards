<script setup lang="ts">

/*
This is the component that handles the flashcards of a StudySet. This component
uses a StudySet object as propr and shows flashcards and their recall options.
This component emits a signal when a flashcard is revealed or hidden. In the 
latter case, also a recall option is associated with the hide action.
*/


import { ref, onMounted, onUnmounted, computed } from 'vue';
import Flashcard from './Flashcard.vue';
import { 
  HideOption, 
  IFlashcard, 
  IStudySet
} from '@/FlashcardParser/Types/Types';
import { updateCardsSchedule } from './StudySetMethods/UpdateCardsSchedule';
import { SortModes } from '@/flashcardsScheduler';



//#region PROPS ----------------------------------------------------------------
interface Props { studySet: IStudySet; }
const props = defineProps<Props>();
//#endregion -------------------------------------------------------------------



//#region EMITS ----------------------------------------------------------------
interface Emits {
  /**
   * Notifies that a flashcard of the StudySet has been revealed.
   */
  reveal: [flashcard: IFlashcard];
  /**
   * Notifies that a flashcard of the StudySet has been hidden, either via the
   * hide option or a recall option.
   */
  hide: [flashcard: IFlashcard];
}
const emit = defineEmits<Emits>();
//#endregion -------------------------------------------------------------------



//#region REACTIVE DATA --------------------------------------------------------
/**
 * The current card that is being showed (or hidden).
 */
const studyCard = ref<IFlashcard>(null);
/**
 * The VUE COMPONENT instance of the current shown flashcard.
 */
const vueShownFlashcard = ref<InstanceType<typeof Flashcard> | null>(null);
//#endregion -------------------------------------------------------------------



//#region COMPUTED DATA --------------------------------------------------------
const headerBreadcrumb = computed(() => {
  return studyCard.value?.headers?.join(' / ') ?? '';
});
const isFlashcardRevealed = computed(() => {
  return vueShownFlashcard.value?.isRevealed() ?? false;
});
//#endregion -------------------------------------------------------------------



//#region METHODS --------------------------------------------------------------
const revealCurrent = () => {
  vueShownFlashcard.value?.reveal();
};

const hideCurrent = (recallType: HideOption) => {
  if (!vueShownFlashcard.value) {
    console.warn('[studySet] Flashcard to HIDE is "null"');
    return;
  }
  if (!isFlashcardRevealed) {
    console.warn('[studySet] Flashcard to HIDE is "already hidden"');
    return;
  }

  console.log(`[studySet] Hiding card with recall: ${recallType}`);
  if (recallType === 'hide') {
    vueShownFlashcard.value.hide();
  } else if (recallType === 'forgot') {
    vueShownFlashcard.value.forgot();
  } else if (recallType === 'bad') {
    vueShownFlashcard.value.bad();
  } else if (recallType === 'not bad') {
    vueShownFlashcard.value.notBad();
  } else if (recallType === 'ok') {
    vueShownFlashcard.value.ok();
  }
};

const reveal = (flashcard: IFlashcard) => {
  console.log(`[studySet] Card revealed: ${flashcard.text}`);
  emit('reveal', flashcard);
};

const updateCards = (flashcardObj: {
  flashcard: IFlashcard,
  recall: HideOption
}) => {
  const { flashcard, recall } = flashcardObj;
  updateCardsSchedule(flashcard, recall, props.studySet);
  
  studyCard.value = props.studySet.scheduler.getFirstCard();
  if (studyCard.value) {
    console.log(`Next card: ${studyCard.value.text}, due: ${studyCard.value.nextReviewAt}`);
  } else {
    console.log(`[studySet] No more cards due for review`);
  }
  emit('hide', flashcard);
};

const shuffleFlashcards = (mode: SortModes) => {
  props.studySet.scheduler.sortMode = mode;
  studyCard.value = props.studySet.scheduler.sort();
};

const undoLastReview = () => {
  const last = props.studySet.history.pop();
  if (!last) return;

  const { index, snapshot } = last;
  const originalFlashcard = props.studySet.flashcards[index];
  if (!originalFlashcard) return;

  originalFlashcard.reviewedAt = snapshot.reviewedAt;
  originalFlashcard.reviewedAt = snapshot.reviewedAt,
  originalFlashcard.nextReviewAt= snapshot.nextReviewAt,
  originalFlashcard.interval= snapshot.interval,
  originalFlashcard.ease= snapshot.ease,
  originalFlashcard.retrievalSuccess= snapshot.retrievalSuccess,
  originalFlashcard.reviewCount= snapshot.reviewCount,
  originalFlashcard.learningPhase= snapshot.learningPhase

  /*
    Note that here the first card of the studyset and the first card of the 
    scheduler may differ.
  */
  props.studySet.scheduler.sort();
  studyCard.value = originalFlashcard;
};

const point = (what: string) => {
  vueShownFlashcard.value?.point(what);
}

const downloadSet = () => {
  // if (!props.studySet || !props.studySet.originalLines) {
  //   alert('No study set to save!');
  //   return;
  // }

  // const lines: string[] = [...props.studySet.originalLines];

  // // Debug: Log all flashcards and their reviewedAt status
  // console.log('All flashcards:');
  // props.studySet.flashcards.forEach((card: any, index: number) => {
  //   console.log(`Card ${index}: "${card.text}" - reviewedAt: ${card.reviewedAt} - interval: ${card.interval} - ease: ${card.ease}`);
  // });

  // // Filter cards that have been reviewed (have reviewedAt set)
  // const reviewedCards = props.studySet.flashcards.filter((card: any) => card.reviewedAt !== null);
  // console.log(`Found ${reviewedCards.length} reviewed cards to save out of ${props.studySet.flashcards.length} total cards`);

  // if (reviewedCards.length === 0) {
  //   alert('No reviewed cards to save! Make sure you have studied some cards first.');
  //   return;
  // }

  // // Sort by line number in descending order to avoid index shifting issues
  // const cardsSorted = [...reviewedCards].sort((a: any, b: any) => b.line - a.line);

  // for (let i = 0; i < cardsSorted.length; i++) {
  //   const card = cardsSorted[i];
  //   console.log(`Saving card: "${card.text}" - reviewedAt: ${card.reviewedAt} - line: ${card.line}`);

  //   // Insert or replace the save command after the card line
  //   const insertIndex = card.line + 1;
  //   const command = `\t*** ${card.reviewedAt.toISOString()}, ${card.ease}, ${card.interval}, ${card.learningPhase}`;

  //   // Remove any existing recall data lines for this card
  //   while (insertIndex < lines.length && lines[insertIndex].trimStart().startsWith('***')) {
  //     lines.splice(insertIndex, 1);
  //   }

  //   lines.splice(insertIndex, 0, command);
  // }

  // const content = lines.join('\n');

  // const blob = new Blob([content], { type: 'text/plain' });
  // const url = window.URL.createObjectURL(blob);
  // const link = document.createElement('a');

  // const filename = `${props.studySet.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_flashcards.txt`;
  // link.href = url;
  // link.download = filename;

  // document.body.appendChild(link);
  // link.click();
  // document.body.removeChild(link);
  // window.URL.revokeObjectURL(url);
};

const hideCardWithKeyboard = (event: KeyboardEvent) => {
  switch (event.key) {
    case ' ':
      revealCurrent();
      break;
    case '0':
      hideCurrent(HideOption.hide);
      break;
    case '1':
      hideCurrent(HideOption.forgot);
      break;
    case '2':
      hideCurrent(HideOption.bad);
      break;
    case '3':
      hideCurrent(HideOption.notBad);
      break;
    case '4':
      hideCurrent(HideOption.ok);
      break;
  }
};
//#endregion -------------------------------------------------------------------



onMounted(() => {
  window.addEventListener('keydown', hideCardWithKeyboard);
  if (props.studySet.flashcards && props.studySet.flashcards.length > 0) {
    props.studySet.scheduler.resetCards();
    props.studySet.scheduler.addFlashcards(...props.studySet.flashcards);

    studyCard.value = props.studySet.scheduler.sort();

    console.log(`[studySet] Initialized with ${props.studySet.flashcards.length} flashcards`);
    console.log(`[studySet] First card: ${studyCard.value?.text || 'None'}`);
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', hideCardWithKeyboard);
});

// Expose methods to parent component
defineExpose({
  revealCurrent,
  hideCurrent,
  point,
  shuffleFlashcards
});
</script>

<template>
  <div class="all-container">
    <div class="header-section" v-if="!isFlashcardRevealed">
      <h3>{{ studySet.title }}</h3>
      <h1>{{ headerBreadcrumb }}</h1>

      <div class="header-buttons">
        <button class="back-btn" @click="undoLastReview" :disabled="studySet.history.length === 0">
          Back
        </button>
        <button class="save-btn" @click="downloadSet">
          Save
        </button>
      </div>

    </div>
    <div class="cards-section">
      <div class="cards-section-row">
        <Flashcard v-if="studyCard !== undefined && studyCard !== null" ref="vueShownFlashcard" 
          class="main-flashcard" :flashcard="studyCard"
          @reveal="reveal" @hide="updateCards" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.all-container {
  display: flex;
  flex-direction: column;
}

.header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.header-buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.back-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.flashcards-container {
  display: flex;
  flex-direction: column;
  width: 500px;
  gap: 10px;
}

.main-flashcard {
  width: 500px;
}

.cards-section {
  display: flex;
  flex-direction: column;
  row-gap: 100px;
}
</style>