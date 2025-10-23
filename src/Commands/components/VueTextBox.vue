<template>
    <div class="textbox-container">
        <div class="textbox">
            {{ text }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ITextBox } from '../All/TextBox';

interface Props {
    config: any;
}
const props = defineProps<Props>();

const text = ref<string>('');

const configureFromJson = (settings: ITextBox) => {
    text.value = settings.text || '';
};

onMounted(() => {
    configureFromJson(props.config);
});
</script>

<style scoped>
.textbox-container {
    margin: 10px 0;
}

.textbox {
    padding: 12px 16px;
    background-color: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    font-family: "JetBrains Mono", monospace;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
}
</style>
