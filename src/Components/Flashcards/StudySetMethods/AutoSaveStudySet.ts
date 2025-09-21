import { IStudySet } from '@/FlashcardParser/Types/Types';
import { buildStudySetContent } from './SaveStudySet';

const AUTOSAVE_ENDPOINT = 'http://localhost:5001/autosave';

export async function autosaveStudySet(studySet: IStudySet | null | undefined) {
  if (!studySet) return;

  const result = buildStudySetContent(studySet);
  if (!result.ok) {
    // Skip autosave when input is invalid or no reviewed cards yet
    return;
  }

  try {
    const response = await fetch(AUTOSAVE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: result.content })
    });

    if (!response.ok) {
      console.error(`[autosave] Failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('[autosave] Failed to persist study set', error);
  }
}
