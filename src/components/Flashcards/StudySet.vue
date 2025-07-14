<template>
    <div class="all-container">
        <div class="header-section" v-if="!showingFlashcard">
            <h3>{{ studySet.title }}</h3>
            <h1>{{ headerBreadcrumb }}</h1>
            <!-- <button @click="downloadSet" class="save-btn">
                Save
            </button>
            <button  class="change-btn">
                Change
            </button> -->
        </div>
        <div class="cards-section">
            <div class="cards-section-row">
                <Flashcard ref="currentFlashcardObject" v-if="studyCard !== null" class="main-flashcard"
                    :flashcard="studyCard" @reveal="reveal" @hide="updateCards" />
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

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
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
    console.log(JSON.stringify(flashcardObj));
    const { flashcard, recall } = flashcardObj;

    if (!flashcard || recall === 'hide') return;

    const grades: Record<string, number> = {
        'forgot': 0,
        'bad': 1,
        'not bad': 2,
        'ok': 3,
    };

    const res = FlashcardsScheduler.nextInterval(grades[recall] ?? 0, flashcard.interval, flashcard.ease);
    flashcard.interval = res.interval;
    flashcard.ease = res.ease;
    flashcard.learningPhase = false;
    flashcard.reviewedAt = new Date(Date.now() + flashcard.interval * 24 * 60 * 60 * 1000);

    const n = props.flashcards.filter((f: any) => f !== undefined).length;
    if (n === 0) {
        console.log("No cards to update");
        return;
    }

    console.log(`Update cards; current cards: ${n}`);
    scheduler.value.resetCards();
    scheduler.value.addMoreFlashcards(props.flashcards);
    scheduler.value.sortCards();
    studyCard.value = scheduler.value.flashcards[0];
    emit('hide', flashcard);
};

const downloadSet = () => {
    if (!props.flashcards || props.flashcards.length === 0) {
        alert('No flashcards to download!');
        return;
    }

    // Format flashcards data as text
    let content = `[Title]\n${props.studySet.title}\n\n`;

    content += `[Resources]\n`;
    props.resources.forEach((resource: string) => {
        content += `${resource}\n`;
    });
    content += '\n';

    content += `[Cards]\n`;
    props.flashcards.forEach((card: any, index: number) => {
        content += `${card.frontText} .. ${card.pageRef}\n\t\\reviewedAt ${card.reviewedAt}\n`;
        if (card.alias) {
            card.alias.forEach((alias: string) => {
                content += `\t\\alias ${alias}\n`;
            });
        }
        if (card.tag) {
            card.tag.forEach((tag: string) => {
                content += `\t\\tag ${tag}\n`;
            });
        }
    });

    // Create and download the file
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
    currentFlashcardObject.value.point(what);
}

// Initialize scheduler on mount
onMounted(() => {
    if (props.flashcards && props.flashcards.length > 0) {
        scheduler.value.addMoreFlashcards(props.flashcards);
        scheduler.value.sortCards();
        studyCard.value = scheduler.value.flashcards[0];
    }
});

// Expose methods to parent component
defineExpose({
    revealCurrent,
    hideCurrent,
    point
});
</script>

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