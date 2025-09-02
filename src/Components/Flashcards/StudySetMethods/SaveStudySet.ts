import { IFlashcard, IStudySet } from "@/FlashcardParser/Types/Types";

export function saveStudySet(studySet: IStudySet) {
  if (!studySet || !studySet.originalLines) {
    alert('No study set to save!');
    return;
  }

  const lines: string[] = [...studySet.originalLines];

  // Filter cards that have been reviewed (have reviewedAt set)
  const reviewedCards = studySet.flashcards.filter((card: any) => card.reviewedAt !== null);
  console.log(`Found ${reviewedCards.length} reviewed cards to save out of ${studySet.flashcards.length} total cards`);

  if (reviewedCards.length === 0) {
    alert('No reviewed cards to save! Make sure you have studied some cards first.');
    return;
  }

  // Sort by line number in descending order to avoid index shifting issues
  const cardsSorted = [...reviewedCards].sort((a: IFlashcard, b: IFlashcard) =>
    b.lineDescriptor.index - a.lineDescriptor.index
  );

  for (let i = 0; i < cardsSorted.length; i++) {
    const card = cardsSorted[i] as IFlashcard;
    console.log(`Saving card: "${card.text}" - reviewedAt: ${card.reviewedAt} - line: ${card.lineDescriptor.index}`);

    // Insert or replace the save command after the card line
    const insertIndex = card.lineDescriptor.index + 1;
    const command = `\t*** ${card.reviewedAt.toISOString()}, ${card.ease}, ${card.interval}, ${card.learningPhase}`;

    // Remove any existing recall data lines for this card
    while (insertIndex < lines.length && lines[insertIndex].trimStart().startsWith('***')) {
      lines.splice(insertIndex, 1);
    }

    lines.splice(insertIndex, 0, command);
  }

  const content = lines.join('\n');

  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  const filename = `${studySet.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_flashcards.txt`;
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
