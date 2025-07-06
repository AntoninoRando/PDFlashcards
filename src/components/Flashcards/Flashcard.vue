<template>
    <div class="flashcard">
        <div v-if="!revealed" class="card-container">
            <div v-if="flashcard.alias" class="aliases">
                //a
            </div>
            <button @click="reveal" class="flashcard-button"
                :style="`width: ${flashcardSize}; border-radius: ${flashcardsBorders};`">
                {{ flashcard.frontText }}
            </button>
        </div>
        <div v-else class="buttons-container">
            <button class="revealed-button" style="border-radius: 7px 0px 0px 7px;" @click="hide">Hide</button>
            <button class="revealed-button" @click="forgot">Forgot</button>
            <button class="revealed-button" @click="bad">Bad</button>
            <button class="revealed-button" @click="notBad">Fine</button>
            <button class="revealed-button" style="border-radius: 0px 7px 7px 0px;" @click="ok">Ok</button>
        </div>
    </div>
</template>

<script lang="ts">

export default {
    emits: ['reveal', 'hide'],
    props: ['flashcard'],
    expose: ['reveal'],
    data() {
        return {
            revealed: false
        }
    },
    computed: {
        flashcardSize() {
            if (this.aliases && this.aliases.length > 0) return '90%'
            return '100%'
        },
        flashcardsBorders() {
            if (this.aliases && this.aliases.length > 0) return '0px 3px 3px 0px'
            return '3px'
        }
    },
    methods: {
        reveal() {
            this.revealed = true
            this.$emit('reveal', this.flashcard)
        },
        hide() {
            this.revealed = false
            this.flashcard.reviewedAt = new Date()
            this.$emit('hide', this.flashcard)
        },
        forgot() {
           this.hide(true)
        },
        bad() {
            this.hide(true)
        },
        notBad() {
            this.hide(true)
        },
        ok() {
            this.hide(true)
        }
    },
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap');

.flashcard {
    width: 100%;
    height: 150px;
}

.card-container {
    display: flex;
    height: 100%;
    width: 100%;
    flex-direction: row;
    gap: 3px
}

.buttons-container {
    height: 100%;
    width: 100%;
}

.flashcard-button {
    height: 100%;
    background-image: linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%);
    border-color: rgba(0, 0, 0, 0.7);
    border-width: 1px;
    font-size: 15px;
    font-family: "JetBrains Mono", monospace;
    font-optical-sizing: auto;
    font-weight: 300;
    font-style: normal;
}

.aliases {
    height: 100%;
    width: 20%;
    align-content: center;
    text-align: center;
    background-color: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.3);
    border-width: 1px;
    border-radius: 3px 0px 0px 3px;
}

.revealed-button {
    height: 100%;
    width: 20%;
    background-color: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.3);
    border-width: 1px;
}
</style>