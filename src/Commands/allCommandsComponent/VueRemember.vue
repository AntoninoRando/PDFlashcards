<template>
    <p>+ {{ what }}</p>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Props {
    config: any;
}
const props = defineProps<Props>();

const what = ref<string>('');

const configureFromJson = (settings: any) => {
    what.value = settings.what || ''
}

onMounted(() => {
    configureFromJson(props.config)
});

</script>

<style scoped>
</style>