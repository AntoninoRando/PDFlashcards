<script setup lang="ts">
import FlashcardsScheduler from '@/flashcardsScheduler';
import Flashcard from './Flashcard.vue';
</script>


<template>
    <div class="all-container">
        <h1>{{ title }}</h1>

        <h2>Do you know...</h2>
        <Flashcard v-if="studyCard !== null" class="main-flashcard"
            :flashcard="studyCard"
            @reveal="reveal"
            @hide="updateCards"
            />
        
        <div v-if="flashcards.length > 0" class="flashcards-container">
            <h2>All cards</h2>
            <Flashcard v-for="(flashcard, index) in flashcards"
                :key="index"
                :flashcard="flashcard"
                @reveal="reveal"
                @hide="updateCards" />
        </div>
    </div>
</template>

<script lang="ts">
export default {
    emits: ['reveal', 'hide'],
    props: ['title', 'flashcards'],
    data() {
        return {
            scheduler: new FlashcardsScheduler(),
            studyCard: null
        }
    },
    methods: {
        reveal(flashcard: any) {
            this.$emit('reveal', flashcard)
        },
        updateCards(flashcard: any) {
            if (!flashcard) return

            const n = this.flashcards.filter((f: any) => f!== undefined).length
            if (n == 0) {
                console.log("No cards to update")
                return
            }

            console.log(`Update cards; current cards: ${n}`)
            this.scheduler.resetCards()
            this.scheduler.addMoreFlashcards(this.flashcards)
            this.scheduler.sortCards()
            this.studyCard = this.scheduler.flashcards[0]
            this.$emit('hide', flashcard)
        }
    },
    mounted() {
        this.studyCard = this.flashcards[0]
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

.main-flashcard {
    width: 300px;
}
</style>