import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { parseStudyset } from '../FlashcardParser/StudySetParser';
import { IFlashcard, IStudySet } from '../FlashcardParser/Types/Types';

interface FileUploadItem {
  file: File;
  url: string;
}

export function useApp() {
  // Reactive data
  const pageToShow = ref<number>(1);
  const studySet = ref<IStudySet | null>(null);
  const pdfCache = reactive<Record<string, string>>({});
  const pdfToShow = ref<string>('');
  const isScrolled = ref<boolean>(false);
  const mousePosition = ref({ x: 0, y: 0 });
  const cardRevealed = ref<boolean>(false);
  const uploadedText = ref<string>('');
  const editorVisible = ref<boolean>(false);
  // Tracks PageRef pages for the currently revealed flashcard
  const currentCardPageRefs = ref<number[]>([]);
  const currentCardResourceAlias = ref<string>('');

  // Refs
  const studySetComponent = ref<any>(null);
  const gestureRecognizer = ref<any>(null);

  // Methods
  function showPage(flashcard: IFlashcard | null) {
    if (!flashcard) {
      console.error('Revealed nothing');
      return;
    }

    let pageRefNum: number | null = null;
    let resourceAlias = studySet.value?.defaultResource || '';
    let pageRefsForCard: number[] = [];
    for (let component of flashcard.lineDescriptor.subParts || []) {
      if (component.name == 'pageref') {
        pageRefNum = component.ref;
        pageRefsForCard = Array.isArray(component.allRefs)
          ? (component.allRefs as number[])
          : (typeof component.ref === 'number' ? [component.ref] : []);
        if (component.resourceAlias) {
          resourceAlias = component.resourceAlias;
        }
        break;
      }
    }

    if (!pageRefNum || !resourceAlias) {
      console.error('Revealed card has no page or resource ' + JSON.stringify(flashcard));
      return;
    }

    console.log(
      `[showPage]\n\t-Page: ${pageRefNum};` +
        `\n\t-Pdf: ${studySet.value?.resources[resourceAlias] || ''}` +
        `\n\t-ResourceAlias: ${resourceAlias}`
    );

    pageToShow.value = pageRefNum;
    pdfToShow.value = studySet.value?.resources[resourceAlias] || '';
    currentCardPageRefs.value = pageRefsForCard || [];
    currentCardResourceAlias.value = resourceAlias;
    cardRevealed.value = true;
  }

  function cardHidden() {
    cardRevealed.value = false;
    currentCardPageRefs.value = [];
    currentCardResourceAlias.value = '';
  }

  function loadStudySet(newStudySet: IStudySet, content: string) {
    studySet.value = newStudySet;
    uploadedText.value = content;
    pdfToShow.value = newStudySet.resources[newStudySet.defaultResource] || '';

    console.info(`[LoadStudySet] Success`);
  }

  function openEditor() {
    editorVisible.value = true;
  }

  function closeEditor() {
    editorVisible.value = false;
  }

  function saveEdited(content: string) {
    uploadedText.value = content;
    const lines = content.split('\n');
    const newSet = parseStudyset(lines);
    if (newSet) {
      studySet.value = newSet;
    }
    editorVisible.value = false;
  }

  function addStudyResource(item: FileUploadItem) {
    if (!item.file?.name || !item.url) {
      console.error('Invalid file upload item:', item);
      return;
    }

    pdfCache[item.file.name] = item.url;
    console.log(`[addStudyResource] Added (${item.file.name}, ${item.url})`);
  }

  function handleScroll() {
    isScrolled.value = window.scrollY > 50;
  }


  function isTypingInInput(): boolean {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const tag = (el.tagName || '').toUpperCase();
    const editable = (el as HTMLElement).isContentEditable;
    return tag === 'INPUT' || tag === 'TEXTAREA' || editable;
  }

  function handleKeydown(event: KeyboardEvent) {
    // Avoid interfering while typing or when PDF not shown
    if (isTypingInInput() || !cardRevealed.value) return;

    if (event.key === 'f') {
      // Next PDF page
      pageToShow.value = pageToShow.value + 1;
    } else if (event.key === 'd') {
      // Previous PDF page (clamp to 1)
      pageToShow.value = Math.max(1, pageToShow.value - 1);
    } else if (event.key === 'c') {
      // Next page within current card's PageRef list
      const refs = currentCardPageRefs.value || [];
      if (!refs.length) return;
      const cur = pageToShow.value;
      const idx = refs.indexOf(cur);
      if (idx !== -1 && idx < refs.length - 1) {
        pageToShow.value = refs[idx + 1];
      } else if (idx === -1) {
        // If current page not in refs, jump to the first greater ref if any
        const next = refs.find((p) => p > cur);
        if (next !== undefined) pageToShow.value = next;
      }
    } else if (event.key === 'x') {
      // Previous page within current card's PageRef list
      const refs = currentCardPageRefs.value || [];
      if (!refs.length) return;
      const cur = pageToShow.value;
      const idx = refs.indexOf(cur);
      if (idx > 0) {
        pageToShow.value = refs[idx - 1];
      } else if (idx === -1) {
        // If current page not in refs, jump to the greatest smaller ref if any
        const prev = [...refs].filter((p) => p < cur).pop();
        if (prev !== undefined) pageToShow.value = prev;
      }
    }
  }
  function handleMouseMove(event: MouseEvent) {
    const banner = event.currentTarget as HTMLElement;
    const rect = banner.getBoundingClientRect();
    mousePosition.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function commandRecognized(command: string) {
    console.log(`[commands] Execute '${command}'`);
    command = command.toLowerCase().trim();

    if (command == 'show') {
      studySetComponent.value.revealCurrent();
    }

    const recallTypes = ['hide', 'forgot', 'bad', 'not bad', 'ok'];
    recallTypes.forEach((t) => {
      if (command == t) {
        studySetComponent.value.hideCurrent(t);
      }
    });

    if (command == 'next page') {
      pageToShow.value = pageToShow.value + 1;
    } else if (command == 'previous page') {
      pageToShow.value = pageToShow.value - 1;
    }

    if (command == 'point') {
      gestureRecognizer.value.enablePointing();
    } else if (command == 'stop point' || command == 'that') {
      gestureRecognizer.value.disablePointing();
      commandRecognized(gestureRecognizer.value.currentPointing);
    }
  }

  function highlightPointing(what: string) {
    console.log(`[gestures] Passing over '${what}'`);
    studySetComponent.value.point(what);
  }

  const isPointing = computed(() => gestureRecognizer.value?.pointing || false);

  const totalCards = computed(() => studySet.value?.flashcards.length || 0);
  // Remaining cards X: cards that have the minimum review count c
  const remainingCards = computed(() => {
    const set = studySet.value;
    if (!set || !set.flashcards || set.flashcards.length === 0) return 0;

    // Compute c = min reviewCount (treat missing as 0)
    const counts = set.flashcards
      .filter((f) => f !== undefined && f !== null)
      .map((f) => (typeof f.reviewCount === 'number' ? f.reviewCount : 0));
    if (counts.length === 0) return 0;
    const c = Math.min(...counts);

    // X = number of cards reviewed exactly c times
    return set.flashcards.filter((f) => (f?.reviewCount ?? 0) === c).length;
  });

  // Progress based on current round: (total - remaining) / total
  const progressPercent = computed(() => {
    if (!totalCards.value) return 0;
    return ((totalCards.value - remainingCards.value) / totalCards.value) * 100;
  });

  onMounted(() => {
    // let vid = document.getElementById("video-bg");
    // vid.playbackRate = 0.3;
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('keydown', handleKeydown);
  });

  return {
    pageToShow,
    studySet,
    pdfCache,
    pdfToShow,
    isScrolled,
    mousePosition,
    cardRevealed,
    uploadedText,
    editorVisible,
    studySetComponent,
    gestureRecognizer,
    showPage,
    cardHidden,
    loadStudySet,
    openEditor,
    closeEditor,
    saveEdited,
    addStudyResource,
    handleMouseMove,
    commandRecognized,
    highlightPointing,
    isPointing,
    totalCards,
    remainingCards,
    progressPercent
  };
}
