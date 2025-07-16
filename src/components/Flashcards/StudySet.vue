<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import FlashcardsScheduler from '@/flashcardsScheduler';
import Flashcard from './Flashcard.vue';

// Define props
interface Props {
  flashcards: any[];
  resources: string[];
  studySet: any;
}

const props = defineProps<Props>();

// Define emits
const emit = defineEmits<{
  reveal: [flashcard: any];
  hide: [flashcard: any];
}>();

// Reactive data
const scheduler = ref(new FlashcardsScheduler());
const studyCard = ref<any>(null);
const currentFlashcardObject = ref<InstanceType<typeof Flashcard> | null>(null);

const headerBreadcrumb = computed(() => {
  return studyCard.value?.headers?.join(' / ') ?? '';
});

const showingFlashcard = computed(() => {
  return currentFlashcardObject.value?.isRevealed() ?? false;
});

// Methods
const revealCurrent = () => {
  currentFlashcardObject.value?.reveal();
};

const hideCurrent = (recallType: string) => {
  if (!currentFlashcardObject.value?.isRevealed()) {
    return;
  }

  if (recallType === 'hide') {
    currentFlashcardObject.value.hide();
  } else if (recallType === 'forgot') {
    currentFlashcardObject.value.forgot();
  } else if (recallType === 'bad') {
    currentFlashcardObject.value.bad();
  } else if (recallType === 'not bad') {
    currentFlashcardObject.value.notBad();
  } else if (recallType === 'ok') {
    currentFlashcardObject.value.ok();
  }
};

const reveal = (flashcard: any) => {
  emit('reveal', flashcard);
};

const updateCards = (flashcardObj: any) => {
  console.log(`update after card: ${JSON.stringify(flashcardObj)}`);
  const { flashcard, recall } = flashcardObj;

  if (!flashcard || recall === 'hide') return;

  const grades: Record<string, number> = {
    'forgot': 0,
    'bad': 1,
    'not bad': 2,
    'ok': 3,
  };

  const retrievalSuccess = grades[recall] ?? 0;

  // Find the original flashcard in props.flashcards to update it directly
  const originalFlashcard = props.flashcards.find((card: any) =>
    card.text === flashcard.text && card.line === flashcard.line
  );

  if (!originalFlashcard) {
    console.error("Could not find original flashcard to update");
    return;
  }

  // Use the scheduler's updateFlashcardAfterReview method on the original flashcard
  scheduler.value.updateFlashcardAfterReview(originalFlashcard, retrievalSuccess);

  // Update learning phase status
  originalFlashcard.learningPhase = originalFlashcard.interval < 1;

  console.log(`Card updated: reviewedAt=${originalFlashcard.reviewedAt}, nextReviewAt=${originalFlashcard.nextReviewAt}, interval=${originalFlashcard.interval}, ease=${originalFlashcard.ease}`);

  const n = props.flashcards.filter((f: any) => f !== undefined).length;
  if (n === 0) {
    console.log("No cards to update");
    return;
  }

  if (props.studySet) {
    props.studySet.studiedCards = (props.studySet.studiedCards || 0) + 1;
  }

  console.log(`Update cards; current cards: ${n}`);

  // Reset and repopulate scheduler with updated flashcards
  scheduler.value.resetCards();
  scheduler.value.addMoreFlashcards(props.flashcards);

  // Get next due card using scheduler's scheduling method
  const dueCards = scheduler.value.scheduleFlashcards();
  studyCard.value = dueCards.length > 0 ? dueCards[0] : null;

  if (studyCard.value) {
    console.log(`Next card: ${studyCard.value.text}, due: ${studyCard.value.nextReviewAt}`);
  } else {
    console.log("No more cards due for review");
  }

  emit('hide', originalFlashcard);
};

const downloadSet = () => {
  if (!props.studySet || !props.studySet.originalLines) {
    alert('No study set to save!');
    return;
  }

  const lines: string[] = [...props.studySet.originalLines];

  // Debug: Log all flashcards and their reviewedAt status
  console.log('All flashcards:');
  props.flashcards.forEach((card: any, index: number) => {
    console.log(`Card ${index}: "${card.text}" - reviewedAt: ${card.reviewedAt} - interval: ${card.interval} - ease: ${card.ease}`);
  });

  // Filter cards that have been reviewed (have reviewedAt set)
  const reviewedCards = props.flashcards.filter((card: any) => card.reviewedAt !== null);
  console.log(`Found ${reviewedCards.length} reviewed cards to save out of ${props.flashcards.length} total cards`);

  if (reviewedCards.length === 0) {
    alert('No reviewed cards to save! Make sure you have studied some cards first.');
    return;
  }

  // Sort by line number in descending order to avoid index shifting issues
  const cardsSorted = [...reviewedCards].sort((a: any, b: any) => b.line - a.line);

  for (let i = 0; i < cardsSorted.length; i++) {
    const card = cardsSorted[i];
    console.log(`Saving card: "${card.text}" - reviewedAt: ${card.reviewedAt} - line: ${card.line}`);

    // Insert the save command after the card line
    const insertIndex = card.line + 1;
    const command = `\t*** ${card.reviewedAt.toISOString()}, ${card.ease}, ${card.interval}, ${card.learningPhase}`;
    lines.splice(insertIndex, 0, command);
  }

  const content = lines.join('\n');

  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  const filename = `${props.studySet.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_flashcards.txt`;
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const point = (what: string) => {
  currentFlashcardObject.value?.point(what);
}

const handleKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case '0':
      hideCurrent('hide');
      break;
    case '1':
      hideCurrent('forgot');
      break;
    case '2':
      hideCurrent('bad');
      break;
    case '3':
      hideCurrent('not bad');
      break;
    case '4':
      hideCurrent('ok');
      break;
  }
};

// Initialize scheduler on mount
onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  if (props.flashcards && props.flashcards.length > 0) {
    scheduler.value.resetCards();
    scheduler.value.addMoreFlashcards(props.flashcards);

    // Get the first due card
    const dueCards = scheduler.value.scheduleFlashcards();
    studyCard.value = dueCards.length > 0 ? dueCards[0] : null;

    console.log(`Initialized with ${props.flashcards.length} flashcards`);
    console.log(`First card: ${studyCard.value?.text || 'None'}`);
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

// Expose methods to parent component
defineExpose({
  revealCurrent,
  hideCurrent,
  point
});
</script>

<template>
  <div class="all-container">
    <div class="header-section" v-if="!showingFlashcard">
      <h3>{{ studySet.title }}</h3>
      <h1>{{ headerBreadcrumb }}</h1>
      <button @click="downloadSet" class="save-btn">
        Save
      </button>
    </div>
    <div class="cards-section">
      <div class="cards-section-row">
        <Flashcard ref="currentFlashcardObject" v-if="studyCard !== null" class="main-flashcard" :flashcard="studyCard"
          @reveal="reveal" @hide="updateCards" />
      </div>
      <!-- <div class="cards-section-row">
                <h2>All cards</h2>
                <div v-if="flashcards.length > 0" class="flashcards-container"
                    style="overflow-y: scroll; height:400px;">
                    <Flashcard v-for="(flashcard, index) in flashcards" :key="index" :flashcard="flashcard"
                        @reveal="reveal" @hide="updateCards" />
                </div>
            </div> -->
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