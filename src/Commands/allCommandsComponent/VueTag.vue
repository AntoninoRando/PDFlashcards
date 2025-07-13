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
    padding: 2px 6px;
    margin-right: 4px;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    font-size: 12px;
    font-family: "JetBrains Mono", monospace;
}
</style>
