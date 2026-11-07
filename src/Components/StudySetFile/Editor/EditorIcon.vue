<script setup lang="ts">
/* Small stroke icons used by the study-set editor. */
defineProps<{ name: string; size?: number }>()
</script>

<script lang="ts">
const PATHS = {
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M19 12l-7 7-7-7',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
  file: 'M14 3H6v18h12V7zM14 3v4h4',
  download: 'M12 4v12M6 10l6 6 6-6M4 20h16',
  check: 'M5 12l5 5L20 7',
  alert: 'M12 3 2 20h20zM12 10v4M12 17v.5',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  section: 'M4 6h16M4 12h10M4 18h6',
  card: 'M3 6h18v12H3zM7 10h6',
  undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  upload: 'M12 16V4M6 10l6-6 6 6M4 20h16',
} as const
</script>

<template>
  <svg class="editor-icon" :width="size ?? 16" :height="size ?? 16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="PATHS[name as keyof typeof PATHS]" />
  </svg>
</template>

<style scoped>
.editor-icon {
  flex-shrink: 0;
  display: block;
}
</style>
