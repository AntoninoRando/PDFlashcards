<script setup>
import Flashcards from './components/Flashcards.vue'
import PDFPreview from './components/PDFPreview.vue'
import FileParser from './components/FileParser.vue'
import PDFUploader from './components/PDFUploader.vue'
</script>

<template>
    <div class="row">
        <div class="pdf-section">
            <PDFUploader @file-selected="addToCache" />
            <PDFPreview v-if="flashcardItem && flashcardItem.resources" ref="PDF" class="column"
                :pageToShow="pageToShow" :pdf-url="pdfCache[flashcardItem.resources[0]]" />
        </div>
        <div class="flashcards-section">
            <FileParser @flashcardsUploaded="readFlashcards" />
            <Flashcards class="column" @reveal="showPage" :flashcards="flashcardItem.flashcards"
                :title="flashcardItem.title" />
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            pageToShow: 1,
            flashcardItem: {},
            pdfCache: {}
        }
    },
    methods: {
        showPage(cardPageRefNumber) {
            this.pageToShow = cardPageRefNumber
        },
        readFlashcards(item) {
            this.flashcardItem = item
        },
        addToCache(item) {
            this.pdfCache[item.file.name] = item.url
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
