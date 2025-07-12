<template>
    <p>{{ what }}</p>
</template>

<script setup lang="ts">

// Define props
interface Props {
    what: string;
}
const props = defineProps<Props>();

// Define emits
// const emit = defineEmits<{
//     reveal: [flashcard: any];
//     hide: [flashcard: any];
// }>();

// // Reactive data
// const scheduler = ref(new FlashcardsScheduler());
// const studyCard = ref<any>(null);
// const currentFlashcardObject = ref<InstanceType<typeof Flashcard> | null>(null);

// // Methods
// const revealCurrent = () => {
//     currentFlashcardObject.value?.reveal();
// };

// const hideCurrent = (recallType: string) => {
//     if (!currentFlashcardObject.value?.isRevealed()) {
//         return;
//     }

//     if (recallType === 'hide') {
//         currentFlashcardObject.value.hide();
//     } else if (recallType === 'forgot') {
//         currentFlashcardObject.value.forgot();
//     } else if (recallType === 'bad') {
//         currentFlashcardObject.value.bad();
//     } else if (recallType === 'not bad') {
//         currentFlashcardObject.value.notBad();
//     } else if (recallType === 'ok') {
//         currentFlashcardObject.value.ok();
//     }
// };

// const reveal = (flashcard: any) => {
//     emit('reveal', flashcard);
// };

// const updateCards = (flashcardObj: any) => {
//     console.log(JSON.stringify(flashcardObj));
//     const { flashcard, hiding } = flashcardObj;

//     if (!flashcard || hiding) return;

//     const n = props.flashcards.filter((f: any) => f !== undefined).length;
//     if (n === 0) {
//         console.log("No cards to update");
//         return;
//     }

//     console.log(`Update cards; current cards: ${n}`);
//     scheduler.value.resetCards();
//     scheduler.value.addMoreFlashcards(props.flashcards);
//     scheduler.value.sortCards();
//     studyCard.value = scheduler.value.flashcards[0];
//     emit('hide', flashcard);
// };

// const downloadSet = () => {
//     if (!props.flashcards || props.flashcards.length === 0) {
//         alert('No flashcards to download!');
//         return;
//     }

//     // Format flashcards data as text
//     let content = `[Title]\n${props.title}\n\n`;

//     content += `[Resources]\n`;
//     props.resources.forEach((resource: string) => {
//         content += `${resource}\n`;
//     });
//     content += '\n';

//     content += `[Cards]\n`;
//     props.flashcards.forEach((card: any, index: number) => {
//         content += `${card.frontText} .. ${card.pageRef}\n\t\\reviewedAt ${card.reviewedAt}\n`;
//         if (card.alias) {
//             card.alias.forEach((alias: string) => {
//                 content += `\t\\alias ${alias}\n`;
//             });
//         }
//         if (card.tag) {
//             card.tag.forEach((tag: string) => {
//                 content += `\t\\tag ${tag}\n`;
//             });
//         }
//     });

//     // Create and download the file
//     const blob = new Blob([content], { type: 'text/plain' });
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement('a');

//     const filename = `${props.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_flashcards.txt`;
//     link.href = url;
//     link.download = filename;

//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     window.URL.revokeObjectURL(url);
// };

// const point = (what: string) => {
//     currentFlashcardObject.value.point(what);
// }

// // Initialize scheduler on mount
// onMounted(() => {
//     if (props.flashcards && props.flashcards.length > 0) {
//         scheduler.value.addMoreFlashcards(props.flashcards);
//         scheduler.value.sortCards();
//         studyCard.value = scheduler.value.flashcards[0];
//     }
// });

// // Expose methods to parent component
// defineExpose({
//     revealCurrent,
//     hideCurrent,
//     point
// });
</script>

<style scoped>

</style>