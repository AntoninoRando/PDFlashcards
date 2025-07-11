<template>
    <button class="toggle-button" @click="toggle">
        {{ on ? 'Disable Gestures' : 'Activate Gestures' }}
    </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const emit = defineEmits<{
    'command-recognized': [command: string];
}>();

const on = ref(false);
const pointing = ref(false);
const currentPointing = ref<string | null>(null);
const socket = ref<Socket | null>(null);

onMounted(() => {
    socket.value = io('http://localhost:5001');
    socket.value.on('notification', (data) => {
        if (!on.value) return;
        console.log('Received notification:', data);

        if (data.isPointing) {
            if (!pointing.value) return;
            currentPointing.value = data.command;
        } else {
            emit('command-recognized', data.command as string);
        }
    });
});

onUnmounted(() => {
    socket.value?.disconnect();
});
const toggle = async () => {
    on.value = !on.value;
    if (on.value) {
        const path = 'http://localhost:5001/enable-camera';
        await axios.post(path);
    } else {
        const path = 'http://localhost:5001/disable-camera';
        await axios.post(path);
    }
};

const enablePointing = () => { pointing.value = true; };
const disablePointing = () => { pointing.value = false; };

defineExpose({
    enablePointing,
    disablePointing,
    currentPointing
});
</script>