<template>
  <div>
    <button class="revealed-button" :class="{ pressed: pressedButton === 'hide', pointed: pointedButton === 'hide' }"
      style="border-radius: 7px 0px 0px 7px" @click="() => chooseRecallOption('hide')">
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
      style="border-radius: 0px 7px 7px 0px; border-width: 1px 1px 1px 1px" @click="() => chooseRecallOption('ok')">
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

.revealed-button {
  height: 100%;
  width: 20%;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  opacity: 1;
  border-color: rgb(255, 255, 255);
  border-width: 1px 0px 1px 1px;
  transition: all 0.2s ease;
}

.revealed-button:hover {
  border-color: rgb(180, 0, 0) !important;
  border-width: 3px !important;
  transition: all 0.2s ease;
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
