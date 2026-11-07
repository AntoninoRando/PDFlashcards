import { IStudySet } from '@/FlashcardParser/Types/Types';
import { Api } from '@/Services/Api';
import { buildStudySetContent } from './SaveStudySet';

/**
 * Sends the current state of the study set to the service, which stores it on
 * disk. This is best effort: failures are only logged (the service may simply
 * not be running).
 */
export async function autosaveStudySet(studySet: IStudySet | null | undefined) {
  if (!studySet) return;

  const result = buildStudySetContent(studySet);
  if (!result.ok) {
    // Skip autosave when input is invalid or no reviewed cards yet
    return;
  }

  try {
    await Api.autosaveStudySet(result.content);
  } catch (error) {
    console.error('[autosave] Failed to persist study set', error);
  }
}
