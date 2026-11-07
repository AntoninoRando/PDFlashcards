<template>
  <div class="all-buttons">
    <button class="revealed-button tone-hide" :class="{ pressed: pressedButton === 'hide', pointed: pointedButton === 'hide' }"
      @click="() => chooseRecallOption('hide')">
      <span class="emoji">🙈</span>
      Hide
      <span class="key">Space</span>
    </button>
    <button class="revealed-button tone-forgot" :class="{
      pressed: pressedButton === 'forgot',
      pointed: pointedButton === 'forgot',
    }" @click="() => chooseRecallOption('forgot')">
      <span class="emoji">👎🏽</span>
      Forgot
      <span class="key">Q</span>
    </button>
    <button class="revealed-button tone-bad" :class="{ pressed: pressedButton === 'bad', pointed: pointedButton === 'bad' }"
      @click="() => chooseRecallOption('bad')">
      <span class="emoji">😶</span>
      Bad
      <span class="key">W</span>
    </button>
    <button class="revealed-button tone-fine" :class="{ pressed: pressedButton === 'not bad', pointed: pointedButton === 'not bad' }"
      @click="() => chooseRecallOption('not bad')">
      <span class="emoji">🙂</span>
      Fine
      <span class="key">E</span>
    </button>
    <button class="revealed-button tone-ok" :class="{ pressed: pressedButton === 'ok', pointed: pointedButton === 'ok' }"
      @click="() => chooseRecallOption('ok')">
      <span class="emoji">👍🏼</span>
      Ok
      <span class="key">R</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { HideOption } from "@/FlashcardParser/Types/Types";
import { ref } from "vue";

const emit = defineEmits<{
  optionSelected: [option: HideOption];
}>();

const pressedButton = ref<string | null>(null);
const pointedButton = ref<string | null>(null);

const chooseRecallOption = (option: HideOption | `${HideOption}`) => {
  pressedButton.value = option;
  emit("optionSelected", option as HideOption);
};

/** Highlights the option the user is pointing at (gesture recognition). */
const point = (what: string | null) => {
  pointedButton.value = what;
};

// Expose methods to parent component
defineExpose({
  point,
  chooseRecallOption
});
</script>

<style scoped>
.all-buttons {
  display: flex;
  flex-direction: row;
  justify-content: center;
  column-gap: 14px;
  position: relative;
}

/* Each option is a glass tile tinted by its own --tone colour */
.revealed-button {
  --tone: 170, 164, 204;
  height: 104px;
  width: 104px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0 0.5rem;

  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.1;
  color: var(--text);
  white-space: nowrap;

  appearance: none;
  background: linear-gradient(180deg, rgba(var(--tone), 0.16), rgba(20, 16, 50, 0.85));
  border: 1px solid rgba(var(--tone), 0.35);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 30px rgba(3, 2, 14, 0.5);
  backdrop-filter: blur(14px);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.revealed-button .emoji {
  font-size: 1.6rem;
  line-height: 1;
}

.revealed-button .key {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--text-dim);
}

.revealed-button.tone-hide {
  --tone: 170, 164, 204;
}

.revealed-button.tone-forgot {
  --tone: 255, 92, 124;
}

.revealed-button.tone-bad {
  --tone: 255, 176, 92;
}

.revealed-button.tone-fine {
  --tone: 94, 225, 255;
}

.revealed-button.tone-ok {
  --tone: 75, 227, 167;
}

.revealed-button:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--tone), 0.85);
  box-shadow: 0 16px 34px rgba(3, 2, 14, 0.55), 0 0 26px rgba(var(--tone), 0.4);
}

.revealed-button.pressed {
  color: #0d0b24;
  background: rgb(var(--tone));
  border-color: rgb(var(--tone));
  transform: scale(1.06);
  box-shadow: 0 0 34px rgba(var(--tone), 0.7);
  z-index: 10;
  position: relative;
}

.revealed-button.pressed .key {
  color: rgba(13, 11, 36, 0.6);
}

.pointed {
  border-color: rgb(var(--tone)) !important;
  border-width: 2px !important;
  box-shadow: 0 0 26px rgba(var(--tone), 0.6);
}

@media (max-width: 620px) {
  .all-buttons {
    column-gap: 8px;
  }

  .revealed-button {
    width: 64px;
    height: 80px;
    font-size: 0.75rem;
  }
}
</style>
