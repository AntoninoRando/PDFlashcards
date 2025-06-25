<script setup lang="ts">
import { parseContent } from '@/FlashcardParser/FlashcardsParser';
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
            const studyset = parseContent(lines);
            if (studyset == null) {
                console.log('Parse failed')
            } else {
                console.log('Parse succeded')
            }
            console.log(JSON.stringify(studyset))

            this.flashcards = [];
            this.resources = [];
            this.title = '';
            
            const categories = {
                title: '[Title]', 
                resources: '[Resources]',
                cards: '[Cards]'
            };
            
            let category = '';
            let currentCard = null;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();
                
                // Check if this is a section header
                if (Object.values(categories).includes(trimmedLine)) {
                    category = trimmedLine;
                    currentCard = null; // Reset current card when entering new section
                    continue;
                }
                
                // Parse based on current category
                if (category === categories.title) {
                    this.title = line;
                    continue;
                }
                
                if (category === categories.resources) {
                    this.resources.push(line);
                    continue;
                }

                if (category === categories.cards) {
                    // Handle card configuration settings (indented with tab and backslash)
                    if (line.startsWith('\t\\')) {
                        if (!currentCard) {
                            continue;
                        }
                        
                        const configLine = line.substring(2); // Remove '\t\'
                        const spaceIndex = configLine.indexOf(' ');
                        
                        if (spaceIndex === -1) {
                            continue;
                        }
                        
                        const codeName = configLine.substring(0, spaceIndex);
                        const codeText = configLine.substring(spaceIndex + 1);
                        
                        // Initialize array if it doesn't exist, then add to beginning
                        if (!currentCard[codeName]) {
                            currentCard[codeName] = [];
                        }
                        currentCard[codeName].unshift(codeText);
                        continue;
                    }
                    
                    // Parse flashcard line
                    const flashcardParts = line.split('..');
                    if (flashcardParts.length <= 1) {
                        continue;
                    }
                    
                    const lastPart = flashcardParts[flashcardParts.length - 1];
                    const configParts = lastPart.split('|');
                    const pageRef = Number(configParts[0]);
                    
                    if (isNaN(pageRef)) {
                        continue;
                    }
                    
                    const now = new Date();
                    const randomHours = Math.floor(Math.random() * 24); // 0-23 hours
                    const randomMinutes = Math.floor(Math.random() * 60); // 0-59 minutes
                    const frontText = flashcardParts.slice(0, -1).join('..');
                    
                    currentCard = {
                        frontText: frontText,
                        pageRef: pageRef,
                        reviewedAt: new Date(now.getTime() - (randomHours * 60 * 60 * 1000) - (randomMinutes * 60 * 1000)),
                        ease: 230
                    };
                    
                    this.flashcards.push(currentCard);
                }
            }

            // Log all flashcards
            this.flashcards.forEach((card) => {
                let log = `[studySet] Flashcard:`;
                Object.keys(card).forEach(k => {
                    log += `\n-${k}: ${Array.isArray(card[k]) ? card[k].join(', ') : card[k]}`;
                });
                console.log(log);
            });

            // Validate that we have the required data
            if (this.flashcards.length === 0) {
                this.error = 'No valid flashcards found. Make sure your file has a [Cards] section with properly formatted cards.';
                return;
            }

            this.$emit('setUploaded', {
                title: this.title,
                resources: this.resources,
                flashcards: this.flashcards,
            });
        },
    }
};
</script>