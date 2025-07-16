<script setup lang="ts">
import RecallOptions from './RecallOptions.vue'
import { createApp, ref, computed, onMounted, watch } from 'vue'

const emit = defineEmits<{
  reveal: [flashcard: any]
  hide: [payload: { flashcard: any; recall: string }]
}>()

const props = defineProps<{
  flashcard: any
}>()

const revealed = ref(false)
const hidingRecallOptions = ref(false)

const flashcardSize = computed(() => {
  if (props.flashcard.alias && props.flashcard.alias.length > 0) return '90%'
  return '100%'
})

const flashcardsBorders = computed(() => {
  if (props.flashcard.alias && props.flashcard.alias.length > 0)
    return '0px 3px 3px 0px'
  return '3px'
})

const recallOptions = ref<InstanceType<typeof RecallOptions> | null>(null)
const subparts = ref<HTMLElement | null>(null)

function isRevealed() {
  return revealed.value
}

function reveal() {
  revealed.value = true
  emit('reveal', props.flashcard)
}

function hide(recall = 'hide') {
  hidingRecallOptions.value = true
  setTimeout(() => {
    revealed.value = false
    hidingRecallOptions.value = false
    props.flashcard.reviewedAt = new Date()
    emit('hide', { flashcard: props.flashcard, recall })
  }, 300)
}

function forgot() {
  recallOptions.value?.chooseRecallOption('forgot')
}

function bad() {
  recallOptions.value?.chooseRecallOption('bad')
}

function notBad() {
  recallOptions.value?.chooseRecallOption('not bad')
}

function ok() {
  recallOptions.value?.chooseRecallOption('ok')
}

function point(what: string) {
  recallOptions.value?.point(what)
}

const toUnmount = [];

function showSubparts() {
    toUnmount.forEach((app) => app.unmount());
    const subpartsElement = subparts.value as HTMLElement
    subpartsElement.innerHTML = '';
    console.log(`[Flashcard] Parsing subparts: ${JSON.stringify(props.flashcard)}`)
    props.flashcard.subParts.forEach((sub: any) => {
        if (!sub.vueComponent) return

        console.log(`[Flashcard] Adding Vue component for subpart ${sub.name}`)

        const componentContainer = document.createElement('div')
        componentContainer.className = 'subpart-container'
        componentContainer.id = `subpart-${sub.name || Math.random().toString(36)}`

        subpartsElement.appendChild(componentContainer)

        const app = createApp(sub.vueComponent, { config: sub })
        toUnmount.push(app);
        app.mount(componentContainer)
    })
}

watch(revealed, async (oldV, newV) => {
    showSubparts();
})

onMounted(showSubparts)

defineExpose({ isRevealed, reveal, hide, forgot, bad, notBad, ok, point, showSubparts })
</script>

<template>
    <div class="flashcard">
        <div v-if="!revealed" class="card-container">
            <div v-if="flashcard.alias" class="aliases">//a</div>
            <button @click="reveal" class="flashcard-button"
                :style="`width: ${flashcardSize}; border-radius: ${flashcardsBorders};`">
                {{ flashcard.text }}
            </button>
        </div>
        <RecallOptions v-else ref="recallOptions" class="buttons-container" :class="{ hiding: hidingRecallOptions }"
            @optionSelected="option => hide(option)" />
        <div ref="subparts" id="subparts"></div>
    </div>
</template>


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
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    font-size: 15px;
    font-family: "JetBrains Mono", monospace;
    font-optical-sizing: auto;
    font-weight: 300;
    font-style: normal;
    color: #000;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    border-radius: 12px;
}

.aliases {
    height: 100%;
    width: 20%;
    align-content: center;
    text-align: center;
    background: rgba(255, 255, 255, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 12px 0px 0px 12px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
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
    border-color: rgb(180, 0, 0) !important;
    border-width: 3px !important;
    transition: all 0.2s ease;
}
</style>