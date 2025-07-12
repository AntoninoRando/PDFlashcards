<template>
    <button v-if="connected" class="toggle-button" @click="toggle">
        {{ on ? 'Disable Gestures' : 'Activate Gestures' }}
    </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const emit = defineEmits<{
    'command-recognized': [command: string];
    'pointing-changed': [command: string];
}>();

const connected = ref<boolean>(false);
const on = ref(false);
const pointing = ref(false);
const currentPointing = ref<string | null>(null);
const socket = ref<Socket | null>(null);

const pointingTimeout = 10000;

onMounted(() => {
    try {
        socket.value = io('http://localhost:5001');
        socket.value.on('notification', (data) => {
            if (!on.value) return;
            console.log('Received notification:', data);
            
            if (data.isPointing) {
                if (!pointing.value) return;
                currentPointing.value = data.command;
                emit('pointing-changed', currentPointing.value);
            } else {
                emit('command-recognized', data.command as string);
            }
        });
        connected.value = true;
    } catch (error) {
        console.error(error);
        connected.value = false;
    }
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

const enablePointing = () => {
    pointing.value = true;
    setTimeout(() => {
        console.log('Pointing mode expired');
        pointing.value = false;
    }, pointingTimeout);
};
const disablePointing = () => { pointing.value = false; };

defineExpose({
    enablePointing,
    disablePointing,
    currentPointing,
    pointing
});
</script>