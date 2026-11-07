import socketio


class SocketManager:
    """Owns the Socket.IO server used to push notifications to the web app."""

    def __init__(self) -> None:
        self.sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

    async def emit(self, event: str, data: dict) -> None:
        await self.sio.emit(event, data)


socket_manager = SocketManager()
