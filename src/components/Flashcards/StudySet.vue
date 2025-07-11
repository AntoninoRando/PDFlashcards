<template>
    <div class="all-container">
        <div class="header-section">
            <h1>{{ title }}</h1>
            <button @click="downloadSet" class="save-btn">
                Save
            </button>
            <button @click="downloadSet" class="change-btn">
                Change
            </button>
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
import { ref, onMounted } from 'vue';
import FlashcardsScheduler from '@/flashcardsScheduler';
import Flashcard from './Flashcard.vue';

// Define props
interface Props {
    title: string;
    flashcards: any[];
    resources: string[];
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
    const { flashcard, hiding } = flashcardObj;

    if (!flashcard || hiding) return;

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
    let content = `[Title]\n${props.title}\n\n`;

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

    const filename = `${props.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_flashcards.txt`;
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