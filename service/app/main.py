"""
Entry point of the PDFlashcards service.

Run from the `service/` directory:

    uv run uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload
    # or simply
    uv run python -m app.main
"""

import logging

import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.api.router import api_router
from app.services.socket_manager import socket_manager

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(name)s: %(message)s")

fastapi_app = FastAPI(title="PDFlashcards Service", version="1.0.0")

# The web app reaches the service through the Vite proxy, but CORS stays open
# so that it can also be called directly during development.
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

fastapi_app.include_router(api_router, prefix="/api")

# Wrap FastAPI with Socket.IO so that `/socket.io` is served by the same app
app = socketio.ASGIApp(socket_manager.sio, other_asgi_app=fastapi_app)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=config.HOST, port=config.PORT, reload=True)
