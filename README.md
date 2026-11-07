# PDFlashcards

A study web app oriented towards flashcards, but with a twist: _flashcards have no back text!_ Instead, each flashcard references one or more pages of a PDF resource, which is a replacement for a text. In this way, there is no need to paste from the study resources in order to create flashcards.

## Running

The project has two parts:

- the **web app** (Vue + Vite, in [`src`](src)), which does all the study work in the browser;
- the **service** (Python, FastAPI + Socket.IO, in [`service`](service)), used for autosaving the study set and for camera gesture recognition. The web app works without it.

```bash
# Web app in Docker + service on the host (needs Docker and uv)
./start.sh

# Or run them separately:
npm install && npm run dev                                   # http://localhost:5173
cd service && uv run uvicorn app.main:app --port 5001 --reload  # http://localhost:5001/docs
```

The Vite dev server proxies `/api` and `/socket.io` to the service (default `http://localhost:5001`, override with `API_PROXY_TARGET`).

## Development

```bash
npm test          # frontend unit tests (Vitest)
npm run lint      # ESLint
npm run format    # Prettier
cd service && uv run pytest   # service tests
```

## Further Documentation

Look inside the [`doc`](doc) directory:

- [Project Structure](doc/Project%20Structure.md)
- [How to Create Commands](doc/How%20to%20Create%20Commands.md)

## Scheduling Algorithm

The scheduling of [Flashcards](src/Components/Flashcards/Flashcard.vue) is handled by these files:
- [`FlashcardsScheduler.ts`](src/Scheduler/FlashcardsScheduler.ts): implements the scheduling logic;
- [`StudySet.vue`](src/Components/Flashcards/StudySet.vue): manages the UI aspects of the studyset, and uses the scheduler to pick the next card as the user reviews cards;
- [`StudySetParser.ts`](src/FlashcardParser/StudySetParser.ts): converts a .txt studyset representation to its code aspect. In doing so, sets some initial study value for the flashcards, which will be used for scheduling.

This project implements a simplified version of the [FSRS (Free Spaced Repetition Scheduler)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) to determine when cards should be reviewed. By default cards are studied section by section (top-level headers), starting from the section with the most due cards.
