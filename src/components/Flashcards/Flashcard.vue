<script setup lang="ts">
import RecallOptions from "./RecallOptions.vue";
</script>

<template>
    <div class="flashcard">
        <div v-if="!revealed" class="card-container">
            <div v-if="flashcard.alias" class="aliases">//a</div>
            <button @click="reveal" class="flashcard-button"
                :style="`width: ${flashcardSize}; border-radius: ${flashcardsBorders};`">
                {{ flashcard.text }}
            </button>
            <div ref="subparts" id="subparts"></div>
        </div>
        <RecallOptions v-else ref="recallOptions" class="buttons-container" :class="{ hiding: hidingRecallOptions }"
            @optionSelected="option => hide(option !== 'hide')" />
    </div>
</template>

<script lang="ts">
export default {
    emits: ["reveal", "hide"],
    props: ["flashcard"],
    expose: ["isRevealed", "reveal", "hide", "forgot", "bad", "notBad", "ok", "point"],
    data() {
        return {
            revealed: false,
            hidingRecallOptions: false,
        };
    },
    computed: {
        flashcardSize() {
            if (this.flashcard.alias && this.flashcard.alias.length > 0) return "90%";
            return "100%";
        },
        flashcardsBorders() {
            if (this.flashcard.alias && this.flashcard.alias.length > 0)
                return "0px 3px 3px 0px";
            return "3px";
        },
    },
    methods: {
        isRevealed() {
            return this.revealed;
        },
        reveal() {
            this.revealed = true;
            this.$emit("reveal", this.flashcard);
        },
        hide(fromAction = false) {
            this.hidingRecallOptions = true;
            // Wait for animation to complete before hiding
            setTimeout(() => {
                this.revealed = false;
                this.hidingRecallOptions = false;
                this.flashcard.reviewedAt = new Date();
                this.$emit("hide", {
                    flashcard: this.flashcard,
                    hiding: !fromAction,
                });
            }, 300); // Match the CSS animation duration
        },
        forgot() {
            this.$refs.recallOptions.chooseRecallOption('forgot');
        },
        bad() {
            this.$refs.recallOptions.chooseRecallOption('bad');
        },
        notBad() {
            this.$refs.recallOptions.chooseRecallOption('not bad');
        },
        ok() {
            this.$refs.recallOptions.chooseRecallOption('ok');
        },
        point(what: string) {
            this.$refs.recallOptions.point(what);
        },
    },
    mounted() {
        const subpartsElement = document.getElementById('subparts')
        console.log(`[Flashcard] Parsing subparts: ${JSON.stringify(this.flashcard)}`);
        this.flashcard.subParts.forEach((sub) => {
            if (!sub.vueComponent) return;
            console.log(`Flashcard] Adding Vue component for subpart ${sub.name}`)
            const cmp = sub.vueComponent;
            cmp.configureFromJson(sub);
            subpartsElement.appendChild(cmp);
        });
    },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap");

.flashcard {
    width: 100%;
    height: 150px;
}

.card-container {
    display: flex;
    height: 100%;
    width: 100%;
    flex-direction: row;
    gap: 3px;
}

.buttons-container {
    height: 100%;
    width: 100%;
    transition: all 0.3s ease-in-out;
    transform: scale(1);
    opacity: 1;
    display: flex;
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
    background-color: #4caf50;
    color: white;
    border-color: #45a049;
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    z-index: 10;
    position: relative;
}

.pointed {
    border-color: rgb(255, 0, 0) !important;
    border-width: 3px !important;
    transition: all 0.2s ease;
}
</style>