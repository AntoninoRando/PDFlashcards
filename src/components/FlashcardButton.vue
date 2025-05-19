<template>
    <div v-if="!revealed" class="container">
        <div v-if="aliases && aliases.length > 0" class="aliases">
            //a
        </div>
        <button @click="reveal" class="flashcard-button"
            :style="`width: ${flashcardSize}; border-radius: ${flashcardsBorders};`">
            {{ frontText }}
        </button>
    </div>
    <div v-else>
        <button class="revealed-button" style="border-radius: 7px 0px 0px 7px;" @click="hide">Hide</button>
        <button class="revealed-button">Forgot</button>
        <button class="revealed-button">Bad</button>
        <button class="revealed-button">Ok</button>
        <button class="revealed-button" style="border-radius: 0px 7px 7px 0px;">Nailed</button>
    </div>
</template>

<script lang="ts">
export default {
    data() {
        return {
            revealed: false
        }
    },
    props: {
        frontText: String,
        aliases: Array<String>,
        pageRef: Number,
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
            this.$emit('reveal', this.pageRef)
        },
        hide() {
            this.revealed = false
        }
    },
}
</script>

<style scoped>
.container {
    display: flex;
    ;
    flex-direction: row;
    gap: 3px
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