<script setup lang="ts">
import { ref } from 'vue';

const isOpen = ref(false);
const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};
</script>

<template>
  <div class="menu-container">
    <button class="main-button" @click="toggleMenu">⚙️</button>
    <div v-if="isOpen" class="options">
      <button class="option" @click="$emit('order-original'); toggleMenu()">Orig</button>
      <button class="option option-random" @click="$emit('order-random'); toggleMenu()">Rand</button>
    </div>
  </div>
</template>

<style scoped>
.menu-container {
  position: fixed;
  bottom: 20px;
  left: 20px;
}
.main-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background-color: #4b5563;
  color: #fff;
  cursor: pointer;
  font-size: 24px;
}
.options {
  position: absolute;
  bottom: 0;
  left: 0;
}
.option {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background-color: #6b7280;
  color: #fff;
  cursor: pointer;
}
.option:first-of-type {
  transform: translate(-60px, 0);
}
.option-random {
  transform: translate(0, -60px);
}
</style>
