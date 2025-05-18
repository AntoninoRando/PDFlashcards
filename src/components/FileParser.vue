<template>
    <div class="p-6 max-w-3xl mx-auto">
        <h1 class="text-2xl font-bold mb-4">Text File Parser</h1>

        <div class="mb-6">
            <label class="block text-gray-700 mb-2" for="file-input">
                Select a text file (with "A .. B" format on each line)
            </label>
            <input type="file" id="file-input" accept=".txt" @change="handleFileUpload"
                class="border rounded py-2 px-3 w-full bg-gray-50" />
        </div>

        <div v-if="error" class="mt-4 p-4 bg-red-100 text-red-700 rounded">
            {{ error }}
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            fileContent: '',
            parsedObjects: [],
            error: null
        };
    },
    methods: {
        handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            this.error = null;
            this.fileContent = '';
            this.parsedObjects = [];

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
            if (!this.fileContent) return;

            const lines = this.fileContent.split('\n').filter(line => line.trim() !== '');

            this.parsedObjects = lines.map(line => {
                // Use regex to split on the ".." pattern with optional spaces
                const matches = line.match(/^(.*?)\s*\.\.\s*(.*)$/);

                if (matches && matches.length === 3) {
                    return {
                        frontText: matches[1].trim(),
                        pageRef: matches[2].trim()
                    };
                } else {
                    // If the line doesn't match the expected format, return a warning object
                    console.warn(`Warning: Line does not match expected format: "${line}"`);
                    return {}
                }

            });
            this.$emit('flashcardsUploaded', this.parsedObjects)
        },
    }
};
</script>