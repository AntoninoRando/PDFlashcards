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
            resources: [],
            title: '',
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

            const lines = this.fileContent.split('\n').map(l => l.trim()).filter(l => l !== '')
            let category = ''
            this.parsedObjects = []
            const categories = {
                title: '[Title]', 
                resources: '[Resources]',
                cards: '[Cards]'
            }
            const categoriesValues = Object.values(categories)

            lines.forEach(line => {
                if (categoriesValues.includes(line)) {
                    category = line
                    return
                }

                if (category == categories.title) {
                    this.title = line
                    return
                }

                if (category == categories.resources) {
                    this.resources.push(line)
                    return
                }

                const flashcardParts = line.split('..')
                const n = flashcardParts.length
                if (flashcardParts.length <= 1) {
                    console.warn(`Warning: Line does not match expected format: "${line}"`)
                    return
                }
                
                const pageRef = Number(flashcardParts[n - 1])
                if (isNaN(pageRef)) {
                    console.warn(`Warning: Line does not match expected format: "${line}"`)
                    return
                }

                let frontText = flashcardParts.slice(0, n - 1).join('..')
                let aliases = frontText.split('///')
                if (aliases.length > 1) {
                    frontText = aliases[0]
                }
                aliases = aliases.slice(1)

                const card = {
                    frontText: frontText,
                    aliases: aliases,
                    pageRef: pageRef
                }
                this.parsedObjects.push(card)

            })
            this.$emit('flashcardsUploaded', {
                title: this.title,
                resources: this.resources,
                flashcards: this.parsedObjects,
            })
        },
    }
};
</script>