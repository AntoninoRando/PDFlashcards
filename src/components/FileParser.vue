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
    </div>
</template>

<script>
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

            this.flashcards = []
            const lines = this.fileContent.split('\n').filter(l => l.trim() !== '')
            const categories = {
                title: '[Title]', 
                resources: '[Resources]',
                cards: '[Cards]'
            }
            const categoriesValues = Object.values(categories)
            
            let category = ''
            let card = {}
            lines.forEach(line => {
                console.log(`[studySet] Reading line '${line}'`)
                const trimmedLine = line.trim()
                const i = categoriesValues.findIndex(x => x == trimmedLine)
                if (i != -1) {
                    category = trimmedLine
                    console.log(`[studySet] Reached section '${line}'`)
                    categoriesValues.splice(i, 1) // Never parse the same category twice
                    return
                }
                
                // Here we are parsing the studyset title
                if (category == categories.title) {
                    console.log(`[studySet] Reading title '${line}'`)
                    this.title = line
                    return
                }
                if (category == categories.resources)  {
                    console.log(`[studySet] Reading resource '${line}'`)
                    this.resources.push(line)
                    return
                }

                // Here we are parsing a card configuration setting
                if (line.startsWith('\t\\')) {
                    var spaceIndex = line.indexOf(' ')
                    var codeName = line.substring(2, spaceIndex)
                    var codeText = line.substring(spaceIndex + 1)
                    console.log(`[studySet] Reading value '${codeText}' of category '${codeName}' for card '${card.frontText}'`)
                    card[codeName] = [codeText, ...(card[codeName] || [])];
                    return
                }
                
                // Here we are adding the card
                const flashcardParts = line.split('..')
                const n = flashcardParts.length
                if (flashcardParts.length <= 1) {
                    console.warn(`Warning: Line does not match expected format: "${line}"`)
                    return
                }
                const configParts = flashcardParts[n - 1].split('|')
                const pageRef = Number(configParts[0])
                if (isNaN(pageRef)) {
                    console.warn(`Warning: Line does not match expected format: "${line}"`)
                    return
                }
                
                const now = new Date()
                const randomHours = Math.floor(Math.random() * 24); // 0-23 hours
                const randomMinutes = Math.floor(Math.random() * 60); // 0-59 minutes
                const frontText = flashcardParts.slice(0, n - 1).join('..')
                card = {
                    frontText: frontText,
                    pageRef: pageRef,
                    /*
                        Random in order to shuffle cards, but before now so that
                        review cards ends up later
                    */
                    reviewedAt: new Date(now.getTime() - (randomHours * 60 * 60 * 1000) - (randomMinutes * 60 * 1000)),
                    ease: 230
                }
                this.flashcards.push(card)
            })
            this.flashcards.forEach((card) => {
                var log = `[studySet] Flashcard:`;
                Object.keys(card).forEach(k => {
                    log += `\n-${k}: ${card[k]}`
                })
                console.log(log)
            });

            this.$emit('setUploaded', {
                title: this.title,
                resources: this.resources,
                flashcards: this.flashcards,
            })
        },
    }
};
</script>