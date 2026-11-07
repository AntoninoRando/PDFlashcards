from pydantic import BaseModel
from typing import List, Dict, Any

class ParseStudySetRequest(BaseModel):
    lines: List[str]

class StudySetResponse(BaseModel):
    data: Dict[str, Any]
