from fastapi import APIRouter

from app.api.endpoints import camera, flashcards, studyset

api_router = APIRouter()


@api_router.get("/ping", summary="Health check", tags=["Health"])
def ping() -> str:
    return "pong!"


api_router.include_router(flashcards.router, prefix="/flashcards", tags=["Flashcards"])
api_router.include_router(studyset.router, prefix="/studyset", tags=["Study set"])
api_router.include_router(camera.router, prefix="/camera", tags=["Camera"])
