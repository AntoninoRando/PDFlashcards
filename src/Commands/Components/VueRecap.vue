<template>
  <div class="recap">
    <span class="label">Recap</span>
    <span class="text" v-if="text">{{ text }}</span>
  </div>
  
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Props {
  config: any;
}
const props = defineProps<Props>();

const text = ref<string>('');

const configureFromJson = (settings: any) => {
  text.value = settings.text || '';
}

onMounted(() => {
  configureFromJson(props.config);
});
</script>

<style scoped>
.recap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 6px;
  margin-top: 4px;
}

.label {
  display: inline-block;
  padding: 1px 8px;
  color: var(--pink-soft);
  background-color: rgba(255, 115, 250, 0.14);
  border: 1px solid rgba(255, 115, 250, 0.3);
  border-radius: 999px;
  font-size: 11px;
  font-family: "JetBrains Mono", monospace;
}

.text {
  font-size: 13px;
}
</style>

