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
    for (let component of flashcard.lineDescriptor.subParts || []) {
      if (component.name == 'pageref') {
        pageRefNum = component.ref;
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
    cardRevealed.value = true;
  }

  function cardHidden() {
    cardRevealed.value = false;
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

  function addToCache(item: FileUploadItem) {
    if (!item.file?.name || !item.url) {
      console.error('Invalid file upload item:', item);
      return;
    }

    pdfCache[item.file.name] = item.url;
    console.log(`[pdfCache] Added (${item.file.name}, ${item.url})`);
  }

  function handleScroll() {
    isScrolled.value = window.scrollY > 50;
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
  const studiedCards = computed(() => studySet.value?.studiedCards || 0);
  const progressPercent = computed(() => {
    if (!totalCards.value) return 0;
    return (studiedCards.value / totalCards.value) * 100;
  });

  onMounted(() => {
    // let vid = document.getElementById("video-bg");
    // vid.playbackRate = 0.3;
    window.addEventListener('scroll', handleScroll);
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
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
    addToCache,
    handleMouseMove,
    commandRecognized,
    highlightPointing,
    isPointing,
    totalCards,
    studiedCards,
    progressPercent
  };
}
