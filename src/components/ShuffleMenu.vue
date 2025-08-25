<script setup lang="ts">
import { ref } from 'vue';

const isOpen = ref(false);
const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};
</script>

<template>
  <div class="menu-container">
    <button class="main-button" @click="toggleMenu" :class="{ 'open': isOpen }">
      ⚙️
    </button>
    <transition name="wheel">
      <div v-if="isOpen" class="options-wheel">
        <button 
          class="option option-1" 
          @click="$emit('order-original'); toggleMenu()"
          title="Original Order"
        >
          Orig
        </button>
        <button 
          class="option option-2" 
          @click="$emit('order-random'); toggleMenu()"
          title="Random Order"
        >
          Rand
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.menu-container {
  position: fixed;
  bottom: 20px;
  left: 20px;
}

.main-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #4b5563, #374151);
  color: #fff;
  cursor: pointer;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  position: relative;
  z-index: 10;
}

.main-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.main-button.open {
  transform: rotate(180deg);
  background: linear-gradient(135deg, #6366f1, #4f46e5);
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
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
  transform-origin: center;
}

.option:hover {
  transform: scale(1.1);
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
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

/* Transition for the entire wheel */
.wheel-enter-active, .wheel-leave-active {
  transition: opacity 0.3s ease;
}

.wheel-enter-from, .wheel-leave-to {
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
}</style>