from pydantic import BaseModel


class AutosaveRequest(BaseModel):
    content: str


class StatusResponse(BaseModel):
    status: str
