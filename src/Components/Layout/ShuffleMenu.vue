<script setup lang="ts">
import { ref } from 'vue';

defineEmits<{
  'order-original': [];
  'order-random': [];
  'order-default': [];
}>();

const isOpen = ref(false);
const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};
</script>
<template>
  <div class="menu-container">
    <button class="main-button" title="Card order" @click="toggleMenu" :class="{ 'open': isOpen }">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>
    </button>
    <transition name="wheel">
      <div v-if="isOpen" class="options-wheel">
        <button class="option option-1" @click="$emit('order-original'); toggleMenu()" title="Original Order">
          Order
        </button>
        <button class="option option-2" @click="$emit('order-random'); toggleMenu()" title="Random Order">
          Rand
        </button>
        <button class="option option-3" @click="$emit('order-default'); toggleMenu()" title="Default Order (by section and learning priority)">
          Default
        </button>
      </div>
    </transition>
  </div>
</template>
<style scoped>
.menu-container {
  position: fixed;
  bottom: 50px;
  left: 100px;
}

.main-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #3a2f8a, #15123a 75%);
  border: 1px solid rgba(255, 160, 250, 0.35);
  color: #fff;
  cursor: pointer;
  font-size: 24px;
  box-shadow: 0 8px 24px rgba(3, 2, 14, 0.6), 0 0 24px rgba(155, 92, 255, 0.45);
  transition: all 0.3s ease;
  position: relative;
  z-index: 10;
  display: grid;
  place-items: center;
}

.main-button:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 24px rgba(3, 2, 14, 0.6), 0 0 34px rgba(255, 115, 250, 0.6);
}

.main-button.open {
  transform: rotate(180deg);
  background: var(--grad-nitro);
}

.options-wheel {
  position: absolute;
  bottom: 30px;
  left: 30px;
  width: 0;
  height: 0;
}

.option {
  position: absolute;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  background: rgba(30, 24, 72, 0.9);
  backdrop-filter: blur(10px);
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 6px 16px rgba(3, 2, 14, 0.5);
  transform-origin: center;
}

.option:hover {
  transform: scale(1.1);
  background: var(--grad-nitro);
  box-shadow: var(--glow-pink);
}

/* Position options in a circular pattern */
.option-1 {
  bottom: -24px;
  left: -80px;
  animation: slideIn1 0.3s ease-out;
}

.option-2 {
  bottom: 40px;
  left: -24px;
  animation: slideIn2 0.4s ease-out;
}

.option-3 {
  bottom: -24px;
  right: -80px;
  animation: slideIn3 0.4s ease-out;
}

/* Animations for wheel opening */
@keyframes slideIn1 {
  from {
    bottom: -24px;
    left: -24px;
    opacity: 0;
    transform: scale(0);
  }

  to {
    bottom: -24px;
    left: -80px;
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slideIn2 {
  from {
    bottom: -24px;
    left: -24px;
    opacity: 0;
    transform: scale(0);
  }

  to {
    bottom: 40px;
    left: -24px;
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slideIn3 {
  from {
    bottom: -24px;
    left: -24px;
    opacity: 0;
    transform: scale(0);
  }

  to {
    bottom: -24px;
    right: -80px;
    opacity: 1;
    transform: scale(1);
  }
}

/* Transition for the entire wheel */
.wheel-enter-active,
.wheel-leave-active {
  transition: opacity 0.3s ease;
}

.wheel-enter-from,
.wheel-leave-to {
  opacity: 0;
}

/* Add ripple effect on click */
.option:active {
  transform: scale(0.95);
}

.main-button:active {
  transform: scale(0.95) rotate(180deg);
}

/* Additional visual enhancements */
.option::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.option:hover::before {
  opacity: 1;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .main-button {
    width: 56px;
    height: 56px;
    font-size: 20px;
  }

  .option {
    width: 44px;
    height: 44px;
    font-size: 11px;
  }

  .option-1 {
    left: -72px;
  }

  .option-3 {
    right: -72px;
  }
}
</style>