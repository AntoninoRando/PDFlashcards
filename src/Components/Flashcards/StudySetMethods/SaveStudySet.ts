import { IFlashcard, IStudySet } from "@/FlashcardParser/Types/Types";
import { countTabs } from "@/FlashcardParser/LineTabCounter";
import { RecallData } from "@/Commands/All/RecallData";

export type BuildStudySetContentResult =
  | { ok: true; content: string }
  | { ok: false; reason: 'missing-original-lines' | 'no-reviewed-cards' };

function ensureSerializableCards(flashcards: IFlashcard[]): IFlashcard[] {
  return flashcards.filter((card: IFlashcard) => card.reviewedAt instanceof Date);
}

export function buildStudySetContent(studySet: IStudySet): BuildStudySetContentResult {
  if (!studySet || !Array.isArray(studySet.originalLines)) {
    return { ok: false, reason: 'missing-original-lines' };
  }

  const lines: string[] = [...studySet.originalLines];
  const reviewedCards = ensureSerializableCards(studySet.flashcards);

  if (reviewedCards.length === 0) {
    return { ok: false, reason: 'no-reviewed-cards' };
  }

  // Process cards bottom-up so that inserting/removing lines never shifts the
  // index of a card that still has to be processed.
  const cardsSorted = [...reviewedCards].sort((a: IFlashcard, b: IFlashcard) =>
    b.lineDescriptor.index - a.lineDescriptor.index
  );

  for (const card of cardsSorted) {
    const cardIndex = card.lineDescriptor.index;
    const cardLine = lines[cardIndex] ?? '';
    const cardTabs = countTabs(cardLine);
    const cardIndent = cardLine.slice(0, cardLine.length - cardLine.trimStart().length);

    // Remove every previous recall-data line that belongs to this card (they
    // are not necessarily the first child line, e.g. after a "+ remember").
    let i = cardIndex + 1;
    while (i < lines.length && lines[i].trim() !== '' && countTabs(lines[i]) > cardTabs) {
      const isOwnRecallData =
        countTabs(lines[i]) === cardTabs + 1 &&
        lines[i].trimStart().startsWith(RecallData.symbol);
      if (isOwnRecallData) {
        lines.splice(i, 1);
      } else {
        i++;
      }
    }

    const reviewedAt = card.reviewedAt as Date;
    const command =
      `${cardIndent}\t${RecallData.symbol} ${reviewedAt.toISOString()}, ` +
      `${card.ease}, ${card.interval}, ${card.learningPhase}`;
    lines.splice(cardIndex + 1, 0, command);
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
