<template>
    <button v-if="connected" class="toggle-button" @click="toggle">
        {{ on ? 'Disable Gestures' : 'Activate Gestures' }}
    </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { Socket } from 'socket.io-client';
import { Api } from '@/Services/Api';

const emit = defineEmits<{
    'command-recognized': [command: string];
    'pointing-changed': [command: string | null];
}>();

/** Whether the Socket.IO channel with the service is open. */
const connected = ref<boolean>(false);
/** Whether the camera recognition is enabled. */
const on = ref(false);
/** Whether "pointing" mode (select a recall option by pointing) is active. */
const pointing = ref(false);
const currentPointing = ref<string | null>(null);

let socket: Socket | null = null;
let pointingTimer: ReturnType<typeof setTimeout> | null = null;

const POINTING_TIMEOUT_MS = 10000;

onMounted(() => {
    socket = Api.connectNotifications();
    socket.on('connect', () => { connected.value = true; });
    socket.on('disconnect', () => { connected.value = false; });
    socket.on('notification', (data: { isPointing: boolean; command: string | null }) => {
        if (!on.value) return;

        if (data.isPointing) {
            if (!pointing.value) return;
            currentPointing.value = data.command;
            emit('pointing-changed', currentPointing.value);
        } else if (data.command) {
            emit('command-recognized', data.command);
        }
    });
});

onUnmounted(() => {
    socket?.disconnect();
    if (pointingTimer) clearTimeout(pointingTimer);
});

const toggle = async () => {
    const enable = !on.value;
    try {
        await (enable ? Api.enableCamera() : Api.disableCamera());
        on.value = enable;
    } catch (error) {
        console.error('[gestures] Failed to toggle camera recognition', error);
    }
};

const enablePointing = () => {
    pointing.value = true;
    if (pointingTimer) clearTimeout(pointingTimer);
    pointingTimer = setTimeout(() => {
        console.log('[gestures] Pointing mode expired');
        pointing.value = false;
    }, POINTING_TIMEOUT_MS);
};

const disablePointing = () => {
    pointing.value = false;
    if (pointingTimer) clearTimeout(pointingTimer);
    pointingTimer = null;
};

defineExpose({
    enablePointing,
    disablePointing,
    currentPointing,
    pointing
});
</script>
