<template>
    <p>+ {{ what }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const what = ref<string>('');

const configureFromJson = (settings: any) => {
    what.value = settings.what || ''
}

defineExpose({
    configureFromJson
});
</script>

<style scoped>
</style>