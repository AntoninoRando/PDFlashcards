<script setup lang="ts">
import FlashcardsScheduler from '@/flashcardsScheduler';
import Flashcard from './Flashcard.vue';
</script>

<template>
    <div class="all-container">
        <div class="header-section">
            <button @click="downloadSet" class="download-btn">
                <h1>{{ title }}</h1> (save)
            </button>
        </div>

        <h2>Do you know...</h2>
        <Flashcard v-if="studyCard !== null" class="main-flashcard" :flashcard="studyCard" @reveal="reveal"
            @hide="updateCards" />

        <div v-if="flashcards.length > 0" class="flashcards-container">
            <h2>All cards</h2>
            <Flashcard v-for="(flashcard, index) in flashcards" :key="index" :flashcard="flashcard" @reveal="reveal"
                @hide="updateCards" />
        </div>
    </div>
</template>

<script lang="ts">
export default {
    emits: ['reveal', 'hide'],
    props: ['title', 'flashcards', 'resources'],
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
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.download-btn {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
}

.download-btn:hover {
    background-color: #0056b3;
}

.download-btn:active {
    background-color: #004085;
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