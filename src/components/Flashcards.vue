<script setup lang="ts">
import FlashcardButton from './FlashcardButton.vue';
</script>


<template>
    <div class="all-container">
        <h2>Flashcards</h2>
        <div class="flashcards-container">
            <FlashcardButton v-for="({ frontText, aliases, pageRef }, index) in flashcards" :key="index"
                :pageRef="pageRef" :frontText="frontText" :aliases="aliases" @reveal="reveal" class="flashcard" />
        </div>
    </div>
</template>

<script lang="ts">
export default {
    name: 'PdfUploader',
    props: {
        flashcards: Object
    },
    methods: {
        reveal(cardPageRefNumber: Number) {
            this.$emit('reveal', cardPageRefNumber)
        }
    }
}
</script>

<style scoped>
.all-container {
    display: flex;
    flex-direction: column;
}

.flashcards-container {
    display: flex;
    flex-direction: column;
    width: 300px;
    gap: 10px;
}

.flashcard {
    width: 100%;
    height: 70px;
}
</style>