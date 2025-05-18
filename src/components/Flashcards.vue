<script setup lang="ts">
import FlashcardButton from './FlashcardButton.vue';
</script>


<template>
    <h2>Flashcards</h2>
    <FlashcardButton v-for="({frontText, pageRef}, index) in flashcards" 
        :key="index"
        :pageRef="pageRef"
        :frontText="frontText"
        @reveal="reveal"
    />
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
.preview-section {
    flex: 1;
    padding: 20px;
    overflow: hidden;
    /* Changed from auto to hidden */
    display: flex;
    flex-direction: column;
}

#pdf-preview {
    width: 100%;
    height: 100%;
    border: 1px solid #ddd;
    background-color: #f9f9f9;
    overflow-y: auto;
    /* Added scroll for this container only */
    overflow-x: hidden;
}

.no-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 500px;
    color: #999;
    text-align: center;
}
</style>