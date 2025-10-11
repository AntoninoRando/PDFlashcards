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
import { saveStudySet } from './StudySetMethods/SaveStudySet';
import { autosaveStudySet } from './StudySetMethods/AutoSaveStudySet';
import { SortModes } from '@/FlashcardsScheduler';
import { playRecallSound } from './StudySetMethods/PlayRecallSound';
import { burstConfetti } from './StudySetMethods/BurstConfetti';



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
const animationContainer = ref<HTMLDivElement | null>(null);
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
    return;
  }

  playRecallSound();
  if (animationContainer.value) {
    burstConfetti(animationContainer.value);
  }

  if (recallType === 'forgot') {
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

  if (recall !== HideOption.hide) {
    void autosaveStudySet(props.studySet);
  }

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
    originalFlashcard.nextReviewAt = snapshot.nextReviewAt,
    originalFlashcard.interval = snapshot.interval,
    originalFlashcard.ease = snapshot.ease,
    originalFlashcard.retrievalSuccess = snapshot.retrievalSuccess,
    originalFlashcard.reviewCount = snapshot.reviewCount,
    originalFlashcard.learningPhase = snapshot.learningPhase

  props.studySet.scheduler.restoreSessionRecall(originalFlashcard, snapshot.retrievalSuccess);
  /*
    Note that here the first card of the studyset and the first card of the 
    scheduler may differ.
  */
  props.studySet.scheduler.sort();
  studyCard.value = props.studySet.scheduler.getFirstCard() ?? originalFlashcard;
};

const point = (what: string) => {
  vueShownFlashcard.value?.point(what);
}

const downloadSet = () => {
  if (!props.studySet) return;
  saveStudySet(props.studySet);
};

const hideCardWithKeyboard = (event: KeyboardEvent) => {
  switch (event.key) {
    case ' ':
      if (isFlashcardRevealed.value) {
        hideCurrent(HideOption.hide);
      } else {
        revealCurrent();
      }
      break;
    case 'q':
      hideCurrent(HideOption.forgot);
      break;
    case 'w':
      hideCurrent(HideOption.bad);
      break;
    case 'e':
      hideCurrent(HideOption.notBad);
      break;
    case 'r':
      hideCurrent(HideOption.ok);
      break;
  }
};
//#endregion -------------------------------------------------------------------



onMounted(() => {
  window.addEventListener('keydown', hideCardWithKeyboard);
  props.studySet.scheduler.startSession();
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
  <div class="all-container" ref="animationContainer">
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
        <Flashcard v-if="studyCard !== undefined && studyCard !== null" ref="vueShownFlashcard" class="main-flashcard"
          :flashcard="studyCard" @reveal="reveal" @hide="updateCards" />
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


@keyframes confetti-burst {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) translate(0, 0) rotate(0deg) scale(1);
  }

  80% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) rotate(var(--rz)) scale(0.9);
  }
}
</style>
