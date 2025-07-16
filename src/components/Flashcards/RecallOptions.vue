<template>
  <div class="all-buttons">
    <button class="revealed-button" :class="{ pressed: pressedButton === 'hide', pointed: pointedButton === 'hide' }"
      @click="() => chooseRecallOption('hide')">
      Hide
    </button>
    <button class="revealed-button" :class="{
      pressed: pressedButton === 'forgot',
      pointed: pointedButton === 'forgot',
    }" @click="() => chooseRecallOption('forgot')">
      👎🏽 Forgot
    </button>
    <button class="revealed-button" :class="{ pressed: pressedButton === 'bad', pointed: pointedButton === 'bad' }"
      @click="() => chooseRecallOption('bad')">
      😶 Bad
    </button>
    <button class="revealed-button" :class="{ pressed: pressedButton === 'fine', pointed: pointedButton === 'fine' }"
      @click="() => chooseRecallOption('not bad')">
      🙂 Fine
    </button>
    <button class="revealed-button" :class="{ pressed: pressedButton === 'ok', pointed: pointedButton === 'ok' }"
      @click="() => chooseRecallOption('ok')">
      👍🏼 Ok
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

// Define emits
const emit = defineEmits<{
  optionSelected: [option: string];
}>();

// Reactive data
const pressedButton = ref<string>(null);
const pointedButton = ref<string>(null);

enum RecallOptionLabel { 'hide', 'forgot', 'bad', 'not bad', 'ok' }

const chooseRecallOption = (option: RecallOptionLabel) => {
  pressedButton.value = option;
  emit("optionSelected", option);
};

const point = (what: string) => {
  if (what == "not bad") what = "fine";
  pointedButton.value.point(what);
};

// Expose methods to parent component
defineExpose({
  point,
  chooseRecallOption
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap");

.all-buttons {
  display: flex;
  flex-direction: row;
  column-gap: 20px;
}

.revealed-button {
  height: 100px;
  width: 100px;
  transition: all 0.2s ease;


  align-items: center;
  appearance: none;
  background-color: #FCFCFD;
  border-radius: 4px;
  border-width: 0;
  box-shadow: rgba(45, 35, 66, 0.4) 0 2px 4px, rgba(45, 35, 66, 0.3) 0 7px 13px -3px, #D6D6E7 0 -3px 0 inset;
  box-sizing: border-box;
  color: #36395A;
  cursor: pointer;
  display: inline-flex;
  font-family: "JetBrains Mono", monospace;
  justify-content: center;
  line-height: 1;
  list-style: none;
  overflow: hidden;
  padding-left: 16px;
  padding-right: 16px;
  position: relative;
  text-align: left;
  text-decoration: none;
  transition: box-shadow .15s, transform .15s;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  white-space: nowrap;
  will-change: box-shadow, transform;
  font-size: 13px;
}

.revealed-button:hover {
  border-color: rgb(180, 0, 0) !important;
  border-width: 3px !important;
  transition: all 0.2s ease;
}

.revealed-button.pressed {
  background-color: rgb(180, 0, 0);
  color: white;
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
