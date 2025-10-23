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
  width: 230px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  color: #111827;
  z-index: 900;
}

.title {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.group {
  margin-top: 10px;
}

.group-title {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #1f2937;
  margin: 4px 0;
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: 2px 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.2;
  border: 1px solid #d1d5db;
  border-bottom-width: 2px;
  border-radius: 6px;
  background: #f9fafb;
  color: #111827;
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.08);
}

.no-key {
  font-size: 13px;
  color: #6b7280;
}

@media (max-width: 900px) {
  .shortcuts-sidebar {
    display: none; /* hide on small screens */
  }
}
</style>

