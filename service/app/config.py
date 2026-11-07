"""Service-wide settings. Every value can be overridden with an environment variable."""

import os
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
SERVICE_DIR = APP_DIR.parent
REPO_DIR = SERVICE_DIR.parent

HOST = os.getenv("PDFLASHCARDS_HOST", "0.0.0.0")
PORT = int(os.getenv("PDFLASHCARDS_PORT", "5001"))

# MediaPipe model files used by the camera gesture recognition
ML_MODELS_DIR = APP_DIR / "ml_models"
HAND_LANDMARKER_MODEL = ML_MODELS_DIR / "hand_landmarker.task"
GESTURE_RECOGNIZER_MODEL = ML_MODELS_DIR / "gesture_recognizer.task"

# Where the web app autosaves the study set (git-ignored)
AUTOSAVE_PATH = Path(os.getenv("PDFLASHCARDS_AUTOSAVE_PATH", REPO_DIR / "tmp.txt"))

CAMERA_INDEX = int(os.getenv("PDFLASHCARDS_CAMERA_INDEX", "0"))
