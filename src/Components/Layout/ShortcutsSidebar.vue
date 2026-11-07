<script setup lang="ts">
defineProps<{
  cardRevealed?: boolean;
}>();
</script>

<template>
  <aside class="shortcuts-sidebar">
    <h4 class="title">Shortcuts</h4>

    <div class="group">
      <div class="group-title">Show / Hide</div>
      <div class="item">
        <kbd>Space</kbd>
        <span>Reveal/Hide current card</span>
      </div>
    </div>

    <div class="group">
      <div class="group-title">Recall Options</div>
      <div class="item"><kbd>Q</kbd><span>Forgot</span></div>
      <div class="item"><kbd>W</kbd><span>Bad</span></div>
      <div class="item"><kbd>E</kbd><span>Not Bad</span></div>
      <div class="item"><kbd>R</kbd><span>Ok</span></div>
    </div>

    <div class="group">
      <div class="group-title">Change Page</div>
      <div class="item">
        <kbd>F</kbd>
        <span>Next page <em>(when card is revealed)</em></span>
      </div>
      <div class="item">
        <kbd>D</kbd>
        <span>Previous page <em>(when card is revealed)</em></span>
      </div>
      <div class="item">
        <kbd>C</kbd>
        <span>Next page within current card's PageRef list</span>
      </div>
      <div class="item">
        <kbd>X</kbd>
        <span>Previous page within current card's PageRef list</span>
      </div>
    </div>

    <div class="group">
      <div class="group-title">Go Back</div>
      <div class="item">
        <span class="no-key">Use the Back button</span>
      </div>
    </div>
  </aside>

</template>

<style scoped>
.shortcuts-sidebar {
  position: relative;
  width: 230px;
  padding: 14px 16px;
  background: linear-gradient(180deg, rgba(34, 28, 84, 0.92), rgba(16, 13, 42, 0.92));
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-left: none;
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
  box-shadow: var(--shadow-lg), 0 0 30px rgba(155, 92, 255, 0.18);
  color: var(--text);
  z-index: 900;
}

/* Glowing tab that peeks out while the panel is tucked away */
.shortcuts-sidebar::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 6px;
  width: 4px;
  height: 48px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: var(--grad-nitro);
  box-shadow: var(--glow-pink);
}

.title {
  margin: 0 0 6px 0;
  font-family: var(--font-display);
  font-weight: 900;
  font-style: italic;
  font-stretch: 125%;
  font-variation-settings: 'wdth' 125;
  text-transform: uppercase;
  font-size: 0.95rem;
  color: #fff;
}

.group {
  margin-top: 12px;
}

.group-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--pink-soft);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
  margin: 5px 0;
}

.item em {
  color: var(--text-dim);
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 28px;
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  color: #fff;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid var(--border-strong);
  border-bottom-width: 2px;
  border-radius: 6px;
}

.no-key {
  font-size: 13px;
  color: var(--text-dim);
}

@media (max-width: 900px) {
  .shortcuts-sidebar {
    display: none;
    /* hide on small screens */
  }
}
</style>
