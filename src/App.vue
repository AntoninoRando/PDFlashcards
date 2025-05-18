<script setup>
import Flashcards from './components/Flashcards.vue'
import PDFPreview from './components/PDFPreview.vue'
</script>

<template>
    <div class="row">
        <PDFPreview ref="PDF" class="column" :pageToShow="this.pageToShow"/>
        <Flashcards class="column"
            @reveal="showPage"
            :flashcards="[{frontText: 'Page 4', pageRef: 4}]"/>
    </div>
</template>

<script>
export default {
    data() {
        return {
            pageToShow: 1
        }
    },
    props: {
        flashcards: Object
    },
    methods: {
        showPage(cardPageRefNumber) {
            this.pageToShow = cardPageRefNumber
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
