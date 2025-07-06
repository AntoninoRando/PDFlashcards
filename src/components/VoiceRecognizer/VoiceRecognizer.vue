<template>
    <button class="toggle-button" @click="toggle">
        {{ on ? 'Disable Voice' : 'Activate Voice' }}
    </button>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const emit = defineEmits<{
    'command-recognized': [command: string]
}>();

const on = ref(false);
let recognition: SpeechRecognition | null = null;

onMounted(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.error('Speech recognition not supported in this browser');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
        // Only get the latest result, not all previous ones
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript;

        console.log(transcript);

        // Emit only the latest recognized command
        emit('command-recognized', transcript);
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        // Reset the toggle state on error
        on.value = false;
    };

    recognition.onend = () => {
        // Handle when recognition ends unexpectedly
        if (on.value) {
            // If we expect it to be running, restart it
            try {
                recognition?.start();
            } catch (error) {
                console.error('Failed to restart recognition:', error);
                on.value = false;
            }
        }
    };
});

const toggle = () => {
    if (!recognition) {
        console.error('Speech recognition not initialized');
        return;
    }

    on.value = !on.value;
};

watch(on, (newValue) => {
    if (!recognition) return;

    try {
        if (newValue) {
            recognition.start();
        } else {
            recognition.stop();
        }
    } catch (error) {
        console.error('Error toggling speech recognition:', error);
        on.value = false;
    }
});
</script>