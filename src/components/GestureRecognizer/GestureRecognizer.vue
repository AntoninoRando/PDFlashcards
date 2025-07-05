<template>
    <button class="toggle-button" @click="toggle">
        {{ on ? 'Disable Gestures' : 'Activate Gestures' }}
    </button>
    <button class="toggle-button" @click="recognized">Recognize</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';

const emit = defineEmits<{
    'command-recognized': [command: string]
}>();

const on = ref(false);

const toggle = () => {
    on.value = !on.value;
};

const recognized = async () => {
    try {
        const path = 'http://localhost:5001/ping';
        const res = await axios.get(path);
        console.log(res.data);
        emit('command-recognized', 'Ok');
    } catch (error) {
        console.error(error);
    }
};
</script>