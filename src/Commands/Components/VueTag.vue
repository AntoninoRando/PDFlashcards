<template>
    <span class="tag">#{{ tag }}</span>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Props {
    config: any;
}
const props = defineProps<Props>();

const tag = ref<string>('');

const configureFromJson = (settings: any) => {
    tag.value = settings.tag || '';
};

onMounted(() => {
    configureFromJson(props.config);
});
</script>

<style scoped>
.tag {
    display: inline-block;
    padding: 1px 9px;
    margin-right: 4px;
    color: var(--text);
    background-color: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--border);
    border-radius: 999px;
    font-size: 12px;
    font-family: "JetBrains Mono", monospace;
}
</style>
