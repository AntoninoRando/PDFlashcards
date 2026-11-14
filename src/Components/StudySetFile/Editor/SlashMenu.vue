<script setup lang="ts">
/*
  The list shown by the "/" menu (see SlashCommands.ts). Positioned by the
  parent next to the field being typed in; the field keeps the focus, so
  clicks do not blur it (mousedown is prevented).
*/
import { nextTick, ref, watch } from 'vue'
import type { SlashCommand } from './SlashCommands'

const props = defineProps<{
  items: SlashCommand[]
  activeIndex: number
  /** Position in the viewport: under the field, or above it near the bottom of the window. */
  position: { left: number; top?: number; bottom?: number }
  query: string
}>()

const emit = defineEmits<{
  pick: [index: number]
  hover: [index: number]
}>()

const list = ref<HTMLElement | null>(null)

// Keep the active item visible while moving with the arrows
watch(
  () => props.activeIndex,
  async (index) => {
    await nextTick()
    list.value?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  },
)
</script>

<template>
  <div class="slash-menu" role="listbox" aria-label="Commands" :style="{
    left: `${position.left}px`,
    top: position.top !== undefined ? `${position.top}px` : undefined,
    bottom: position.bottom !== undefined ? `${position.bottom}px` : undefined,
  }" @mousedown.prevent>
    <p class="slash-title">{{ query ? `Commands matching “${query}”` : 'Commands' }}</p>
    <ul ref="list">
      <li v-for="(item, i) in items" :id="`slash-item-${item.id}`" :key="item.id" :data-index="i" role="option"
        :aria-selected="i === activeIndex" :class="{ active: i === activeIndex }" @mousemove="emit('hover', i)"
        @click="emit('pick', i)">
        <span class="slash-text">
          <span class="slash-label">{{ item.label }}</span>
          <span class="slash-hint">{{ item.hint }}</span>
        </span>
        <code v-if="item.shortcut" class="slash-shortcut">{{ item.shortcut }}</code>
      </li>
    </ul>
    <p class="slash-footer"><kbd>↑↓</kbd> choose · <kbd>Enter</kbd> run · <kbd>Esc</kbd> close</p>
  </div>
</template>

<style scoped>
.slash-menu {
  position: fixed;
  z-index: 50;
  width: 300px;
  max-height: min(340px, 60vh);
  display: flex;
  flex-direction: column;
  background: var(--ed-surface, #18153f);
  border: 1px solid var(--ed-border-strong, rgba(255, 255, 255, 0.2));
  border-radius: 10px;
  box-shadow: 0 18px 44px rgba(3, 2, 14, 0.7), 0 0 30px rgba(155, 92, 255, 0.18);
  overflow: hidden;
  font-size: 0.88rem;
}

.slash-title {
  margin: 0;
  padding: 0.5rem 0.75rem 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ed-muted, #a39dc8);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0 0.3rem 0.3rem;
  overflow-y: auto;
}

li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.5rem;
  border-radius: 7px;
  cursor: pointer;
  color: var(--ed-text, #f3f0ff);
}

li.active {
  background: var(--ed-accent-soft, rgba(255, 115, 250, 0.13));
}

.slash-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.slash-label {
  font-weight: 600;
}

li.active .slash-label {
  color: var(--ed-accent, #ff8bf7);
}

.slash-hint {
  font-size: 0.76rem;
  color: var(--ed-muted, #a39dc8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slash-shortcut {
  flex-shrink: 0;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.75rem;
  color: var(--ed-muted, #a39dc8);
  padding: 0.05rem 0.35rem;
  border: 1px solid var(--ed-border, rgba(255, 255, 255, 0.09));
  border-radius: 5px;
}

.slash-footer {
  margin: 0;
  padding: 0.35rem 0.75rem;
  border-top: 1px solid var(--ed-border, rgba(255, 255, 255, 0.09));
  font-size: 0.72rem;
  color: var(--ed-muted, #a39dc8);
}

.slash-footer kbd {
  font-family: inherit;
  font-size: 0.68rem;
  padding: 0 0.3rem;
  border: 1px solid var(--ed-border, rgba(255, 255, 255, 0.09));
  border-radius: 4px;
  background: var(--ed-input, rgba(255, 255, 255, 0.045));
}
</style>
