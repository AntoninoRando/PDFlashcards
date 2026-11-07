# Project Structure

```
.
├── src/                    Web app (Vue 3 + TypeScript)
├── tests/                  Web app unit tests (Vitest)
├── service/                Python service (FastAPI + Socket.IO)
├── doc/                    Documentation
├── start.sh                Starts the web app (Docker) and the service (host)
└── startWebapp.sh          Starts only the web app (Docker)
```

Folder and file names under `src` use **PascalCase**. Keep imports in the exact same case as the files: Windows does not care, but the Docker (Linux) build does.

# Web App: `src` Directory

- `Main.js`: entry point, mounts the app.
- `App/`: the main component (`App.vue`) plus `UseApp.ts`, which holds its state and logic (PDF navigation, voice/gesture commands, progress).
- `Assets/`: CSS files and images.
- `Commands/` (**IMPORTANT**): the commands of the Domain Specific Language (DSL) used to write study sets.
    - `All/`: a file for each command, implementing the logic of that command;
    - `Components/`: a Vue component for each command that has to be displayed on the card;
    - `CommandsFactory.ts`: creates the command object from its string representation.
    See [How to Create Commands](How%20to%20Create%20Commands.md).
- `Components/`: Vue components.
    - `Flashcards/`: the study set, the flashcard and its recall options. `StudySetMethods/` contains the logic used by `StudySet.vue` (schedule update, save/autosave, effects).
    - `Resources/`: PDF upload and preview.
    - `StudySetFile/`: upload of the study-set `.txt` file and the in-app editor.
    - `Recognizers/`: voice (browser Web Speech API) and gesture (service) recognition.
    - `Layout/`: shortcuts sidebar and shuffle menu.
- `FlashcardParser/`: parses a study-set file into an `IStudySet` (`StudySetParser.ts` is the entry point, `Types/Types.ts` holds the data types).
- `Scheduler/`: the spaced-repetition scheduler.
- `Services/Api.ts`: every call to the Python service.
- `Utils/`: small shared helpers.

# Service: `service` Directory

Run every command from `service/` (it is a [uv](https://docs.astral.sh/uv/) project).

- `app/main.py`: the ASGI app (FastAPI wrapped by Socket.IO). Endpoints are under `/api` (interactive docs at `/docs`):
    - `GET  /api/ping`
    - `POST /api/flashcards/parse`: parses study-set lines (same output as the web app parser);
    - `POST /api/studyset/autosave`: writes the study set to `tmp.txt` at the repository root;
    - `POST /api/camera/enable`, `POST /api/camera/disable`, `GET /api/camera/status`: gesture recognition, whose results are pushed as `notification` Socket.IO events.
- `app/config.py`: settings (port, paths, camera index), overridable with environment variables.
- `app/api/`: routers and endpoints; `app/models/`: request/response models.
- `app/services/`: camera loop (`camera_service.py`), gesture helpers (`hand_gestures.py`), Socket.IO server.
- `app/ml_models/`: MediaPipe model files.
- `flashcard_parser/`: Python port of `src/FlashcardParser` and `src/Commands`. Keep the two in sync when changing the DSL.
- `tests/`: pytest tests.
