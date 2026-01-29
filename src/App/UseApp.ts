import { ref, reactive, onMounted, onUnmounted, computed } from "vue";
import { parseStudyset } from "../FlashcardParser/StudySetParser";
import { IFlashcard, IStudySet } from "../FlashcardParser/Types/Types";
import { PageRef } from "@/Commands/All/PageRef";

interface FileUploadItem {
  file: File;
  url: string;
}

export function useApp() {
  // Reactive data
  const pageToShow = ref<number>(1);
  const studySet = ref<IStudySet | null>(null);
  const pdfCache = reactive<Record<string, string>>({});
  const pdfToShow = ref<string>("");
  const resourcePages = reactive<Record<string, number>>({});
  const isScrolled = ref<boolean>(false);
  const mousePosition = ref({ x: 0, y: 0 });
  const cardRevealed = ref<boolean>(false);
  const uploadedText = ref<string>("");
  const editorVisible = ref<boolean>(false);
  // Tracks PageRef pages for the currently revealed flashcard
  const currentCardPageRefs = ref<number[]>([]);
  const currentCardResourceAlias = ref<string>("");
  const currentCardSteps = ref<
    Array<{ page: number; resourceAlias: string; scrollPercent?: number }>
  >([]);
  const scrollPercentToShow = ref<number | undefined>(undefined);
  const revealTrigger = ref<number>(0);

  // Refs
  const studySetComponent = ref<any>(null);
  const gestureRecognizer = ref<any>(null);

  // Methods
  function showPage(flashcard: IFlashcard | null) {
    if (!flashcard) {
      console.error("Revealed nothing");
      return;
    }
    console.debug(`Revealed ${flashcard}`);

    const set = studySet.value;
    if (!set) {
      console.error("No study set loaded");
      return;
    }

    const defaultAlias = set.defaultResource ?? "";
    console.debug(`Default resource alias: ${defaultAlias}`);

    const steps: Array<{
      page: number;
      resourceAlias: string;
      scrollPercent?: number;
    }> = [];
    for (const component of flashcard.lineDescriptor.subParts ?? []) {
      if (component?.name !== PageRef.commandName) continue;
      const pairs: Array<[string | null, number, number?]> = Array.isArray(
        component.allRefs,
      )
        ? (component.allRefs as Array<[string | null, number, number?]>)
        : [];
      if (pairs.length) {
        pairs.forEach(([aliasMaybe, page, scrollPercent]) => {
          const alias = (aliasMaybe ??
            component.resourceAlias ??
            defaultAlias) as string;
          steps.push({ page, resourceAlias: alias, scrollPercent });
        });
      } else {
        const alias = (component.resourceAlias || defaultAlias) as string;
        const page = typeof component.ref === "number" ? component.ref : 0;
        if (page) steps.push({ page, resourceAlias: alias });
      }
    }

    if (!steps.length || !steps[0].resourceAlias) {
      console.error(
        "Revealed card has no page or resource " + JSON.stringify(flashcard),
      );
      return;
    }

    console.log("Revealed card with steps:", steps);
    const first = steps[0];
    scrollPercentToShow.value = first.scrollPercent;
    const firstFile = set.resources[first.resourceAlias] ?? "";
    pdfToShow.value = firstFile;
    if (firstFile) {
      resourcePages[firstFile] = first.page;
    }
    pageToShow.value = first.page;
    revealTrigger.value++;
    currentCardPageRefs.value = steps.map((s) => s.page);
    currentCardResourceAlias.value = first.resourceAlias;
    currentCardSteps.value = steps;
    cardRevealed.value = true;

    console.log(
      `[showPage]` +
        `\n\t-Flashcard: ${flashcard.text}` +
        `\n\t-Steps: ${steps.length}` +
        `\n\t-Study-set: ${set.title}` +
        `\n\t-Page: ${first.page};` +
        `\n\t-Pdf: ${set.resources[first.resourceAlias] ?? ""}` +
        `\n\t-ResourceAlias: ${first.resourceAlias}` +
        `\n\t-PageToShow: ${pageToShow.value}` +
        `\n\t-ScrollPercentToShow: ${scrollPercentToShow.value}` +
        `\n\t-CardRevealed: ${cardRevealed.value}` +
        `\n\t-PdfToShow: ${pdfToShow.value}`
    );
  }

  function cardHidden() {
    cardRevealed.value = false;
    currentCardPageRefs.value = [];
    currentCardResourceAlias.value = "";
  }

  function loadStudySet(newStudySet: IStudySet, content: string) {
    studySet.value = newStudySet;
    uploadedText.value = content;
    pdfToShow.value = newStudySet.resources[newStudySet.defaultResource] || "";

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
    const lines = content.split("\n");
    const newSet = parseStudyset(lines);
    if (newSet) {
      studySet.value = newSet;
    }
    editorVisible.value = false;
  }

  function addStudyResource(item: FileUploadItem) {
    if (!item.file?.name || !item.url) {
      console.error("Invalid file upload item:", item);
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
    const tag = (el.tagName || "").toUpperCase();
    const editable = (el as HTMLElement).isContentEditable;
    return tag === "INPUT" || tag === "TEXTAREA" || editable;
  }

  function handleKeydown(event: KeyboardEvent) {
    // Avoid interfering while typing or when PDF not shown
    if (isTypingInInput() || !cardRevealed.value) return;

    if (event.key === "f") {
      // Next PDF page
      pageToShow.value = pageToShow.value + 1;
      if (pdfToShow.value) resourcePages[pdfToShow.value] = pageToShow.value;
    } else if (event.key === "d") {
      // Previous PDF page (clamp to 1)
      pageToShow.value = Math.max(1, pageToShow.value - 1);
      if (pdfToShow.value) resourcePages[pdfToShow.value] = pageToShow.value;
    } else if (event.key === "c") {
      // Next PageRef element (can cross resources)
      const steps = currentCardSteps.value || [];
      if (!steps.length) return;
      const set = studySet.value;
      if (!set) return;
      const aliasNow = getCurrentPdfAlias();
      const curPage = pageToShow.value;
      const idx = steps.findIndex(
        (s) => s.page === curPage && s.resourceAlias === aliasNow,
      );
      if (idx !== -1 && idx < steps.length - 1) {
        const next = steps[idx + 1];
        pageToShow.value = next.page;
        scrollPercentToShow.value = next.scrollPercent;
        const file = set.resources[next.resourceAlias] || "";
        if (file) {
          resourcePages[file] = next.page;
          pdfToShow.value = file;
        }
      } else if (idx === -1) {
        // Fallback: find the first upcoming step by page number
        const j = steps.findIndex((s) => s.page > curPage);
        if (j !== -1) {
          const next = steps[j];
          pageToShow.value = next.page;
          scrollPercentToShow.value = next.scrollPercent;
          const file = set.resources[next.resourceAlias] || "";
          if (file) {
            resourcePages[file] = next.page;
            pdfToShow.value = file;
          }
        }
      }
    } else if (event.key === "x") {
      // Previous PageRef element (can cross resources)
      const steps = currentCardSteps.value || [];
      if (!steps.length) return;
      const set = studySet.value;
      if (!set) return;
      const aliasNow = getCurrentPdfAlias();
      const curPage = pageToShow.value;
      const idx = steps.findIndex(
        (s) => s.page === curPage && s.resourceAlias === aliasNow,
      );
      if (idx > 0) {
        const prev = steps[idx - 1];
        pageToShow.value = prev.page;
        scrollPercentToShow.value = prev.scrollPercent;
        const file = set.resources[prev.resourceAlias] || "";
        if (file) {
          resourcePages[file] = prev.page;
          pdfToShow.value = file;
        }
      } else if (idx === -1) {
        // Fallback: find the last previous step by page number
        const candidates = steps.filter((s) => s.page < curPage);
        const prev = candidates.length
          ? candidates[candidates.length - 1]
          : undefined;
        if (prev) {
          pageToShow.value = prev.page;
          scrollPercentToShow.value = prev.scrollPercent;
          const file = set.resources[prev.resourceAlias] || "";
          if (file) {
            resourcePages[file] = prev.page;
            pdfToShow.value = file;
          }
        }
      }
    }
  }
  function handleMouseMove(event: MouseEvent) {
    const banner = event.currentTarget as HTMLElement;
    const rect = banner.getBoundingClientRect();
    mousePosition.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function commandRecognized(command: string) {
    console.log(`[commands] Execute '${command}'`);
    command = command.toLowerCase().trim();

    if (command == "show") {
      studySetComponent.value.revealCurrent();
    }

    const recallTypes = ["hide", "forgot", "bad", "not bad", "ok"];
    recallTypes.forEach((t) => {
      if (command == t) {
        studySetComponent.value.hideCurrent(t);
      }
    });

    if (command == "next page") {
      pageToShow.value = pageToShow.value + 1;
      if (pdfToShow.value) resourcePages[pdfToShow.value] = pageToShow.value;
    } else if (command == "previous page") {
      pageToShow.value = Math.max(1, pageToShow.value - 1);
      if (pdfToShow.value) resourcePages[pdfToShow.value] = pageToShow.value;
    }

    if (command == "point") {
      gestureRecognizer.value.enablePointing();
    } else if (command == "stop point" || command == "that") {
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
    // const set = studySet.value;
    // if (!set || !set.flashcards || set.flashcards.length === 0) return 0;

    // // Compute c = min reviewCount (treat missing as 0)
    // const counts = set.flashcards
    //   .filter((f) => f !== undefined && f !== null)
    //   .map((f) => (typeof f.reviewCount === 'number' ? f.reviewCount : 0));
    // if (counts.length === 0) return 0;
    // const c = Math.min(...counts);

    // // X = number of cards reviewed exactly c times
    // return set.flashcards.filter((f) => (f?.reviewCount ?? 0) === c).length;

    const set = studySet.value;
    if (!set || !set.flashcards) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return set.flashcards.filter((f) => {
      if (!f) return false;
      // If never reviewed, treat as remaining
      if (!f.reviewedAt) return true;
      // Check if reviewed before today
      return new Date(f.reviewedAt) < today;
    }).length;
  });

  // Progress based on current round: (total - remaining) / total
  const progressPercent = computed(() => {
    if (!totalCards.value) return 0;
    return ((totalCards.value - remainingCards.value) / totalCards.value) * 100;
  });

  function getCurrentPdfAlias(): string {
    const set = studySet.value;
    if (!set) return "";
    const file = pdfToShow.value;
    const aliases = Object.keys(set.resources || {});
    return aliases.find((a) => set.resources[a] === file) || "";
  }

  onMounted(() => {
    // let vid = document.getElementById("video-bg");
    // vid.playbackRate = 0.3;
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
    studySet,
    pdfCache,
    pdfToShow,
    resourcePages,
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
    progressPercent,
    revealTrigger,
  };
}
