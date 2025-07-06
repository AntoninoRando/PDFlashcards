<template>
    <button class="toggle-button" @click="toggle">
        {{ on ? 'Disable Gestures' : 'Activate Gestures' }}
    </button>
    <button class="toggle-button" @click="recognized">Recognize</button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { io } from 'socket.io-client'

const emit = defineEmits<{
    'command-recognized': [command: string]
}>();

const on = ref(false);
const socket = ref(null);

onMounted(() => {
    socket.value = io('http://localhost:5001')
    
    socket.value.on('notification', (data) => {
        console.log('Received notification:', data)
        emit('command-recognized', data as string);
    })
});

onUnmounted(() => {
    socket.value?.disconnect();
});

const toggle = () => {
    on.value = !on.value;
};

const recognized = async () => {
    try {
        const path = 'http://localhost:5001/ping';
        const res = await axios.get(path);
        console.log(res.data);
        emit('command-recognized', res.data as string);
    } catch (error) {
        console.error(error);
    }
};
</script>