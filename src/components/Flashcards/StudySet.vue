<script setup lang="ts">
import FlashcardsScheduler from '@/flashcardsScheduler';
import Flashcard from './Flashcard.vue';
</script>

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
                <h2>Remember</h2>
                <Flashcard ref="currentFlashcardObject" v-if="studyCard !== null" class="main-flashcard"
                    :flashcard="studyCard" @reveal="reveal" @hide="updateCards" />
            </div>
            <div class="cards-section-row">
                <h2>All cards</h2>
                <div v-if="flashcards.length > 0" class="flashcards-container"
                    style="overflow-y: scroll; height:400px;">
                    <Flashcard v-for="(flashcard, index) in flashcards" :key="index" :flashcard="flashcard"
                        @reveal="reveal" @hide="updateCards" />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    emits: ['reveal', 'hide'],
    props: ['title', 'flashcards', 'resources'],
    expose: ['revealCurrent', 'hideCurrent'],
    data() {
        return {
            scheduler: new FlashcardsScheduler(),
            studyCard: null
        }
    },
    methods: {
        revealCurrent() {
            this.$refs.currentFlashcardObject.reveal()
            //this.reveal(this.studyCard)
        },
        hideCurrent(recallType: string) {
            if (!this.$refs.currentFlashcardObject.isRevealed()) {
                return;
            }
            
            if (recallType == 'hide') {
                this.$refs.currentFlashcardObject.hide()
            } else if (recallType == 'forgot') {
                this.$refs.currentFlashcardObject.forgot()
            } else if (recallType == 'bad') {
                this.$refs.currentFlashcardObject.bad()
            } else if (recallType == 'not bad') {
                this.$refs.currentFlashcardObject.notBad()
            } else if (recallType == 'ok') {
                this.$refs.currentFlashcardObject.ok()
            } 
        },
        reveal(flashcard: any) {
            this.$emit('reveal', flashcard)
        },
        updateCards(flashcard: any) {
            if (!flashcard) return

            const n = this.flashcards.filter((f: any) => f !== undefined).length
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
        },
        downloadSet() {
            if (!this.flashcards || this.flashcards.length === 0) {
                alert('No flashcards to download!');
                return;
            }

            // Format flashcards data as text
            let content = `[Title]\n${this.title}\n\n`;

            content += `[Resources]\n`;
            this.resources.forEach((resource: string) => {
                content += `${resource}\n`
            });
            content += '\n';

            content += `[Cards]\n`;
            this.flashcards.forEach((card: any, index: number) => {
                content += `${card.frontText} .. ${card.pageRef}\n\t\\reviewedAt ${card.reviewedAt}\n`;
                if (card.alias) {
                    card.alias.forEach((alias: string) => {
                        content += `\t\\alias ${alias}\n`
                    })
                }
                if (card.tag) {
                    card.tag.forEach((tag: string) => {
                        content += `\t\\tag ${tag}\n`
                    })
                }
            });

            // Create and download the file
            const blob = new Blob([content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');

            const filename = `${this.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_flashcards.txt`;
            link.href = url;
            link.download = filename;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }
    },
    created() {
        // Initialize scheduler with flashcards first
        if (this.flashcards && this.flashcards.length > 0) {
            this.scheduler.addMoreFlashcards(this.flashcards)
            this.scheduler.sortCards()
            // Now select the study card from the sorted scheduler results
            this.studyCard = this.scheduler.flashcards[0]
        }
    }
}
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