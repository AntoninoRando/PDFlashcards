import { IFlashcard, IStudySet } from "@/FlashcardParser/Types/Types";

export type BuildStudySetContentResult =
  | { ok: true; content: string }
  | { ok: false; reason: 'missing-original-lines' | 'no-reviewed-cards' };

function ensureSerializableCards(flashcards: IFlashcard[]): IFlashcard[] {
  return flashcards.filter((card: IFlashcard) => card.reviewedAt !== null);
}

export function buildStudySetContent(studySet: IStudySet): BuildStudySetContentResult {
  if (!studySet || !Array.isArray(studySet.originalLines)) {
    return { ok: false, reason: 'missing-original-lines' };
  }

  const lines: string[] = [...studySet.originalLines];
  const reviewedCards = ensureSerializableCards(studySet.flashcards);
  console.log(`Found ${reviewedCards.length} reviewed cards to save out of ${studySet.flashcards.length} total cards`);

  if (reviewedCards.length === 0) {
    return { ok: false, reason: 'no-reviewed-cards' };
  }

  const cardsSorted = [...reviewedCards].sort((a: IFlashcard, b: IFlashcard) =>
    b.lineDescriptor.index - a.lineDescriptor.index
  );

  for (let i = 0; i < cardsSorted.length; i++) {
    const card = cardsSorted[i] as IFlashcard;
    console.log(`Saving card: "${card.text}" - reviewedAt: ${card.reviewedAt} - line: ${card.lineDescriptor.index}`);

    const insertIndex = card.lineDescriptor.index + 1;
    const command = `\t*** ${card.reviewedAt.toISOString()}, ${card.ease}, ${card.interval}, ${card.learningPhase}`;

    while (insertIndex < lines.length && lines[insertIndex].trimStart().startsWith('***')) {
      lines.splice(insertIndex, 1);
    }

    lines.splice(insertIndex, 0, command);
  }

  const content = lines.join('\n');
  return { ok: true, content };
}

export function saveStudySet(studySet: IStudySet) {
  const result = buildStudySetContent(studySet);

  if (!result.ok) {
    if (result.reason === 'missing-original-lines') {
      alert('No study set to save!');
    } else if (result.reason === 'no-reviewed-cards') {
      alert('No reviewed cards to save! Make sure you have studied some cards first.');
    }
    return;
  }

  const blob = new Blob([result.content], { type: 'text/plain' });
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
