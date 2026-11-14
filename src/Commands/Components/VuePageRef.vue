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
    // A region's coordinates mean nothing to the reader: just mark that there is one
    const pagesString = (settings.pagesString || '').replace(/\s*\{[^}]*\}/g, ' (region)');
    pages.value = settings.resourceAlias
        ? `${settings.resourceAlias}:${pagesString}`
        : pagesString;
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
    background-color: rgba(88, 101, 242, 0.18);
    border: 1px solid rgba(88, 101, 242, 0.45);
    border-radius: 999px;
    font-size: 12px;
    font-family: "JetBrains Mono", monospace;
}
</style>
