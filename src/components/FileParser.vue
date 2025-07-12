<script setup lang="ts">
import { parseStudyset } from '@/FlashcardParser/FlashcardsParser';
</script>

<template>
    <div class="p-6 max-w-3xl mx-auto">
        <h1 class="text-2xl font-bold mb-4">Text File Parser</h1>

        <div class="mb-6">
            <input type="file" id="file-input" accept=".txt" @change="handleFileUpload"
                class="border rounded py-2 px-3 w-full bg-gray-50" />
        </div>
    </div>
</template>

<script lang="ts">
export default {
    emits: ['setUploaded'],
    data() {
        return {
            fileContent: '',
            resources: [],
            title: '',
            flashcards: [],
            error: null
        };
    },
    methods: {
        handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            this.error = null;
            this.fileContent = '';
            this.flashcards = [];
            this.resources = [];
            this.title = '';

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    this.fileContent = e.target.result;
                    this.parseFileContent();
                } catch (err) {
                    this.error = `Error reading file: ${err.message}`;
                }
            };

            reader.onerror = () => {
                this.error = 'Failed to read the file';
            };

            reader.readAsText(file);
        },

        parseFileContent() {
            if (!this.fileContent) {
                this.error = 'File content is empty';
                return;
            }

            const lines = this.fileContent.split('\n').filter(l => l.trim() !== '');
            console.log('Start studyset parsing')
            const studyset = parseStudyset(lines);
            if (studyset == null) {
                console.error('Parse failed')
            } else {
                console.log('Parse succeded')
                this.$emit('setUploaded', studyset);
            }
        },
    }
};
</script>
