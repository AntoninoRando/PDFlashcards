<script setup>
import Flashcards from './components/Flashcards.vue'
import PDFPreview from './components/PDFPreview.vue'
import FileParser from './components/FileParser.vue'
</script>

<template>
    <div class="row">
        <PDFPreview ref="PDF" class="column" :pageToShow="pageToShow" />
        <div class="flashcards-section">
            <FileParser @flashcardsUploaded="readFlashcards"/>
            <Flashcards class="column" @reveal="showPage" :flashcards="flashcards" />
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            pageToShow: 1,
            flashcards: []
        }
    },
    methods: {
        showPage(cardPageRefNumber) {
            this.pageToShow = cardPageRefNumber
        },
        readFlashcards(fcs) {
            this.flashcards = fcs
        }
    }
}
</script>

<style scoped>
.row {
    display: flex;
}

.column {
    flex: 50%;
    width: 50vw;
}
</style>
