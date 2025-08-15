<template>
    <span class="tag">->{{ pages }}</span>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IPageRef } from '../All/PageRef';

interface Props {
    config: any;
}
const props = defineProps<Props>();

const pages = ref<string>('');

const configureFromJson = (settings: IPageRef) => {
    pages.value = settings.resourceAlias
        ? `${settings.resourceAlias}:${settings.pagesString || ''}`
        : (settings.pagesString || '');
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
