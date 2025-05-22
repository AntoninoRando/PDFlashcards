<template>
    <div class="flashcard">
        <div v-if="!revealed" class="card-container">
            <div v-if="flashcard.aliases.length > 0" class="aliases">
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
            if (this.aliases && this.aliases.length > 0) return '0px 7px 7px 0px'
            return '7px'
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
.flashcard {
    width: 100%;
    height: 70px;
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
    background-color: rgba(0, 0, 0, 0.1);
    border-color: rgba(0, 0, 0, 0.2);
    border-width: 1px;
}

.aliases {
    height: 100%;
    width: 20%;
    align-content: center;
    text-align: center;
    background-color: rgba(0, 0, 0, 0.1);
    border-color: rgba(0, 0, 0, 0.2);
    border-width: 1px;
    border-radius: 7px 0px 0px 7px;
}

.revealed-button {
    height: 100%;
    width: 20%;
    background-color: rgba(0, 0, 0, 0.1);
    border-color: rgba(0, 0, 0, 0.2);
    border-width: 1px;
}
</style>