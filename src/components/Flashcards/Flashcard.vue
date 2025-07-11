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
        <div v-else class="buttons-container" :class="{ 'hiding': isHiding }">
            <button class="revealed-button" :class="{ 'pressed': pressedButton === 'hide' }"
                style="border-radius: 7px 0px 0px 7px;" @click="() => hide(false)">Hide</button>
            <button class="revealed-button" :class="{ 'pressed': pressedButton === 'forgot' }"
                @click="forgot">Forgot</button>
            <button class="revealed-button" :class="{ 'pressed': pressedButton === 'bad' }" @click="bad">Bad</button>
            <button class="revealed-button" :class="{ 'pressed': pressedButton === 'fine' }"
                @click="notBad">Fine</button>
            <button class="revealed-button" :class="{ 'pressed': pressedButton === 'ok' }"
                style="border-radius: 0px 7px 7px 0px; border-width: 1px 1px 1px 1px;" @click="ok">Ok</button>
        </div>
    </div>
</template>
<script lang="ts">
export default {
    emits: ['reveal', 'hide'],
    props: ['flashcard'],
    expose: ['isRevealed', 'reveal', 'hide', 'forgot', 'bad', 'notBad', 'ok'],
    data() {
        return {
            revealed: false,
            isHiding: false,
            pressedButton: null
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
        isRevealed() {
            return this.revealed
        },
        reveal() {
            this.revealed = true
            this.$emit('reveal', this.flashcard)
        },
        hide(fromAction = false) {
            if (!fromAction) {
                this.pressedButton = 'hide'
            }
            this.isHiding = true
            // Wait for animation to complete before hiding
            setTimeout(() => {
                this.revealed = false
                this.isHiding = false
                this.pressedButton = null
                this.flashcard.reviewedAt = new Date()
                this.$emit('hide', {
                    flashcard: this.flashcard,
                    hiding: !fromAction
                })
            }, 300) // Match the CSS animation duration
        },
        forgot() {
            this.pressedButton = 'forgot'
            this.hide(true)
        },
        bad() {
            this.pressedButton = 'bad'
            this.hide(true)
        },
        notBad() {
            this.pressedButton = 'fine'
            this.hide(true)
        },
        ok() {
            this.pressedButton = 'ok'
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
    transition: all 0.3s ease-in-out;
    transform: scale(1);
    opacity: 1;
}

.buttons-container.hiding {
    transform: scale(0.95);
    opacity: 0;
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
    border-width: 1px 0px 1px 1px;
    transition: all 0.2s ease;
}

.revealed-button:hover {
    background-color: rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
}

.revealed-button.pressed {
    background-color: #4CAF50;
    color: white;
    border-color: #45a049;
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    z-index: 10;
    position: relative;
}
</style>