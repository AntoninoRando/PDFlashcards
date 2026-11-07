from fastapi import APIRouter, HTTPException

from app.models.flashcards import ParseStudySetRequest, StudySetResponse
from flashcard_parser.studyset_parser import parse_studyset

router = APIRouter()


@router.post("/parse", response_model=StudySetResponse, summary="Parse Flashcard Text")
def parse_flashcards(request: ParseStudySetRequest) -> StudySetResponse:
    """Parses the lines of a study-set file into its structured representation."""
    study_set = parse_studyset(request.lines)
    if study_set is None:
        raise HTTPException(status_code=400, detail="Failed to parse study set")
    return StudySetResponse(data=study_set.to_dict())
