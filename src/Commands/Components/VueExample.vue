<template>
  <div class="example">
    <span class="label">Example</span>
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
.example {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 6px;
  margin-top: 4px;
}

.label {
  display: inline-block;
  padding: 2px 6px;
  background-color: rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  font-size: 11px;
  font-family: "JetBrains Mono", monospace;
}

.text {
  font-size: 13px;
}
</style>

