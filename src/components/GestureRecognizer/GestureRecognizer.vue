<template>
    <button class="toggle-button" @click="toggle">
        {{ on ? 'Disable Gestures' : 'Activate Gestures' }}
    </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client'

const emit = defineEmits<{
    'command-recognized': [command: string]
}>();

const on = ref(false);
const socket = ref(null);

onMounted(() => {
    socket.value = io('http://localhost:5001')
    
    socket.value.on('notification', (data) => {
        if (!on.value) return;
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
</script>