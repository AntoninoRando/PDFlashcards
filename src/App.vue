<script setup lang="ts">
import StudySet from './components/Flashcards/StudySet.vue'
import PDFPreview from './components/PDFPreview.vue'
import FileParser from './components/FileParser.vue'
import PDFUploader from './components/PDFUploader.vue'
</script>

<template>
    <div class="row">
        <div class="pdf-section column">
            <PDFUploader @file-selected="addToCache" />
            <PDFPreview v-if="studySet.resources.length > 0" ref="PDF"
                :pageToShow="pageToShow" 
                :pdf-url="pdfCache[studySet.resources[0]]" />
        </div>

        <div class="flashcards-section column">
            <FileParser
                @setUploaded="loadStudySet" />
            <hr>
            <StudySet v-if="studySet.flashcards.length > 0"
                @reveal="showPage" 
                :flashcards="studySet.flashcards"
                :title="studySet.title" />
        </div>
    </div>
</template>

<script lang="ts">
export default {
    data() {
        return {
            pageToShow: 1,
            studySet: {
                title: '',
                flashcards: [],
                resources: []
            },
            pdfCache: {}
        }
    },
    methods: {
        showPage(flashcard: any) {
            if (!flashcard) {
                console.error('Revealed nothing')
                return
            }

            if (!flashcard.pageRef) {
                console.error('Revealed card has no page')
                return
            }

            this.pageToShow = flashcard.pageRef
            console.log(`Showing page ${this.pageToShow}`)
        },
        loadStudySet(studySet: any) {
            this.studySet = studySet
            console.info(`Loaded study set: 
                - title: ${studySet.title},
                - resources: ${studySet.resources},
                - flashcards: ${studySet.flashcards.length}`)
        },
        addToCache(item: any) {
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
