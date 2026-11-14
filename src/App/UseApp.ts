import { ref, reactive, onMounted, onUnmounted, computed } from "vue";
import { parseStudyset } from "@/FlashcardParser/StudySetParser";
import { HideOption, IFlashcard, IStudySet } from "@/FlashcardParser/Types/Types";
import { PageRef, type PageStepRef } from "@/Commands/All/PageRef";
import type { PdfRegion } from "@/Utils/PdfRegion";
import { buildStudySetContent } from "@/Components/Flashcards/StudySetMethods/SaveStudySet";
import { isTypingInInput } from "@/Utils/Dom";

interface FileUploadItem {
  file: File;
  url: string;
}

/** A page of a resource the revealed card points to. */
interface PageStep {
  page: number;
  resourceAlias: string;
  scrollPercent?: number;
  /** Part of the page that answers the card, highlighted in the viewer. */
  region?: PdfRegion;
}

const RECALL_COMMANDS: ReadonlyArray<string> = [
  HideOption.hide,
  HideOption.forgot,
  HideOption.bad,
  HideOption.notBad,
  HideOption.ok,
];

export function useApp() {
  //#region REACTIVE DATA ------------------------------------------------------
  const pageToShow = ref<number>(1);
  const studySet = ref<IStudySet | null>(null);
  /** Uploaded PDFs: file name -> object URL. */
  const pdfCache = reactive<Record<string, string>>({});
  /** File name of the PDF currently shown. */
  const pdfToShow = ref<string>("");
  /** Last page shown for each PDF (file name -> page). */
  const resourcePages = reactive<Record<string, number>>({});
  const isScrolled = ref<boolean>(false);
  const mousePosition = ref({ x: 0, y: 0 });
  const cardRevealed = ref<boolean>(false);
  const uploadedText = ref<string>("");
  const editorVisible = ref<boolean>(false);
  /** Whether the editor creates a new study set or edits the loaded one. */
  const editorMode = ref<"create" | "edit">("edit");
  /** Changes whenever a new study set is loaded, to restart the study view. */
  const studySetKey = ref<number>(0);
  /** Pages (possibly across resources) referenced by the revealed card. */
  const currentCardSteps = ref<PageStep[]>([]);
  const scrollPercentToShow = ref<number | undefined>(undefined);
  const regionToShow = ref<PdfRegion | undefined>(undefined);
  /** Incremented on each reveal to force the PDF viewer to scroll again. */
  const revealTrigger = ref<number>(0);

  // Template refs
  const studySetComponent = ref<any>(null);
  const gestureRecognizer = ref<any>(null);
  //#endregion -----------------------------------------------------------------

  //#region CARDS --------------------------------------------------------------
  function collectPageSteps(flashcard: IFlashcard, defaultAlias: string): PageStep[] {
    const steps: PageStep[] = [];
    for (const component of flashcard.lineDescriptor.subParts ?? []) {
      if (component?.name !== PageRef.commandName) continue;

      const pairs: PageStepRef[] = Array.isArray(component.allRefs) ? component.allRefs : [];

      if (pairs.length) {
        for (const [aliasMaybe, page, scrollPercent, region] of pairs) {
          const resourceAlias = aliasMaybe ?? component.resourceAlias ?? defaultAlias;
          steps.push({ page, resourceAlias, scrollPercent, region });
        }
      } else {
        const page = typeof component.ref === "number" ? component.ref : 0;
        if (page) steps.push({ page, resourceAlias: component.resourceAlias || defaultAlias });
      }
    }
    return steps;
  }

  function showPage(flashcard: IFlashcard | null) {
    if (!flashcard) {
      console.error("[showPage] Revealed nothing");
      return;
    }

    const set = studySet.value;
    if (!set) {
      console.error("[showPage] No study set loaded");
      return;
    }

    const steps = collectPageSteps(flashcard, set.defaultResource ?? "");
    if (!steps.length || !steps[0].resourceAlias) {
      console.error("[showPage] Revealed card has no page or resource: " + flashcard.text);
      return;
    }

    goToStep(steps[0]);
    revealTrigger.value++;
    currentCardSteps.value = steps;
    cardRevealed.value = true;

    console.log(
      `[showPage] '${flashcard.text}' -> ${steps.length} step(s), ` +
      `first: page ${steps[0].page} of '${pdfToShow.value}'`,
    );
  }

  function cardHidden() {
    cardRevealed.value = false;
    currentCardSteps.value = [];
  }
  //#endregion -----------------------------------------------------------------

  //#region STUDY SET ----------------------------------------------------------
  function loadStudySet(newStudySet: IStudySet, content: string) {
    studySet.value = newStudySet;
    uploadedText.value = content;
    pdfToShow.value = newStudySet.resources[newStudySet.defaultResource] || "";
    cardHidden();
    studySetKey.value++;

    console.info(`[LoadStudySet] Success`);
  }

  /** Opens the editor on an empty study set (or the unsaved draft). */
  function openCreator() {
    editorMode.value = "create";
    editorVisible.value = true;
  }

  function openEditor() {
    editorMode.value = "edit";
    // Edit the current state of the study set (including the reviews of this
    // session), not the text originally loaded, so that saving the editor
    // does not discard the progress.
    const set = studySet.value;
    if (set) {
      const result = buildStudySetContent(set);
      uploadedText.value = result.ok ? result.content : set.originalLines.join("\n");
    }
    editorVisible.value = true;
  }

  function closeEditor() {
    editorVisible.value = false;
  }

  function saveEdited(content: string) {
    const newSet = parseStudyset(content.split(/\r?\n/));
    if (!newSet) {
      alert("The edited study set is not valid: fix it before saving (see the console for details).");
      return;
    }
    loadStudySet(newSet, content);
    editorVisible.value = false;
  }

  function addStudyResource(item: FileUploadItem) {
    if (!item.file?.name || !item.url) {
      console.error("[addStudyResource] Invalid file upload item:", item);
      return;
    }

    pdfCache[item.file.name] = item.url;
    console.log(`[addStudyResource] Added (${item.file.name}, ${item.url})`);
  }
  //#endregion -----------------------------------------------------------------

  //#region PDF NAVIGATION -----------------------------------------------------
  /** Shows a page from its top (the scroll and region of a step belong to the step's page). */
  function setPage(page: number) {
    pageToShow.value = Math.max(1, page);
    scrollPercentToShow.value = undefined;
    regionToShow.value = undefined;
    if (pdfToShow.value) resourcePages[pdfToShow.value] = pageToShow.value;
  }

  function goToStep(step: PageStep) {
    const file = studySet.value?.resources[step.resourceAlias] || "";
    if (file) pdfToShow.value = file;
    setPage(step.page);
    scrollPercentToShow.value = step.scrollPercent;
    regionToShow.value = step.region;
  }

  function getCurrentPdfAlias(): string {
    const set = studySet.value;
    if (!set) return "";
    const file = pdfToShow.value;
    return Object.keys(set.resources || {}).find((a) => set.resources[a] === file) || "";
  }

  /** Moves to the next (`direction = 1`) or previous (`-1`) PageRef step. */
  function moveStep(direction: 1 | -1) {
    const steps = currentCardSteps.value;
    if (!steps.length || !studySet.value) return;

    const aliasNow = getCurrentPdfAlias();
    const curPage = pageToShow.value;
    const idx = steps.findIndex((s) => s.page === curPage && s.resourceAlias === aliasNow);

    let target: PageStep | undefined;
    if (idx !== -1) {
      target = steps[idx + direction];
    } else if (direction === 1) {
      // Not on a step: go to the first upcoming one by page number
      target = steps.find((s) => s.page > curPage);
    } else {
      target = [...steps].reverse().find((s) => s.page < curPage);
    }

    if (target) goToStep(target);
  }

  function handleKeydown(event: KeyboardEvent) {
    // Avoid interfering while typing or when PDF not shown
    if (isTypingInInput() || !cardRevealed.value) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    switch (event.key) {
      case "f": setPage(pageToShow.value + 1); break; // Next PDF page
      case "d": setPage(pageToShow.value - 1); break; // Previous PDF page
      case "c": moveStep(1); break;  // Next PageRef element (can cross resources)
      case "x": moveStep(-1); break; // Previous PageRef element
    }
  }
  //#endregion -----------------------------------------------------------------

  //#region VOICE & GESTURE COMMANDS -------------------------------------------
  function commandRecognized(rawCommand: string | null | undefined) {
    const command = (rawCommand ?? "").toLowerCase().trim();
    if (!command) return;
    console.log(`[commands] Execute '${command}'`);

    const studySetVue = studySetComponent.value;
    const gestures = gestureRecognizer.value;

    if (command === "show") {
      studySetVue?.revealCurrent();
    } else if (RECALL_COMMANDS.includes(command)) {
      studySetVue?.hideCurrent(command);
    } else if (command === "next page") {
      setPage(pageToShow.value + 1);
    } else if (command === "previous page") {
      setPage(pageToShow.value - 1);
    } else if (command === "point") {
      gestures?.enablePointing();
    } else if (command === "stop point" || command === "that") {
      if (!gestures) return;
      const pointed = gestures.currentPointing;
      gestures.disablePointing();
      commandRecognized(pointed);
    }
  }

  function highlightPointing(what: string | null) {
    console.log(`[gestures] Passing over '${what}'`);
    studySetComponent.value?.point(what);
  }

  const isPointing = computed(() => gestureRecognizer.value?.pointing || false);
  //#endregion -----------------------------------------------------------------

  //#region PROGRESS -----------------------------------------------------------
  const totalCards = computed(() => studySet.value?.flashcards.length || 0);

  /** Cards not reviewed yet today. */
  const remainingCards = computed(() => {
    const set = studySet.value;
    if (!set || !set.flashcards) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return set.flashcards.filter((f) => {
      if (!f) return false;
      if (!f.reviewedAt) return true;
      return new Date(f.reviewedAt) < today;
    }).length;
  });

  const progressPercent = computed(() => {
    if (!totalCards.value) return 0;
    return ((totalCards.value - remainingCards.value) / totalCards.value) * 100;
  });
  //#endregion -----------------------------------------------------------------

  //#region UI -----------------------------------------------------------------
  function handleScroll() {
    isScrolled.value = window.scrollY > 50;
  }

  function handleMouseMove(event: MouseEvent) {
    const banner = event.currentTarget as HTMLElement;
    const rect = banner.getBoundingClientRect();
    mousePosition.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
  //#endregion -----------------------------------------------------------------

  onMounted(() => {
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("keydown", handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener("scroll", handleScroll);
    window.removeEventListener("keydown", handleKeydown);
  });

  return {
    pageToShow,
    scrollPercentToShow,
    regionToShow,
    studySet,
    pdfCache,
    pdfToShow,
    resourcePages,
    isScrolled,
    mousePosition,
    cardRevealed,
    uploadedText,
    editorVisible,
    editorMode,
    studySetKey,
    studySetComponent,
    gestureRecognizer,
    showPage,
    cardHidden,
    loadStudySet,
    openCreator,
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
    progressPercent,
    revealTrigger,
  };
}
