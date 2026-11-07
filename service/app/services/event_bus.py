import asyncio

class EventBus:
    def __init__(self):
        self.queue = asyncio.Queue()

    async def put(self, event_type: str, data: dict):
        await self.queue.put((event_type, data))

    async def get(self):
        return await self.queue.get()

event_bus = EventBus()
