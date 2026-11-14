from datetime import timedelta

from flashcard_parser.commands.page_ref import PageRef
from flashcard_parser.studyset_parser import parse_studyset

STUDY_SET = """\
[Title]
Operating Systems

[Resources]
os-book.pdf
\t@ book
slides.pdf

[Cards]
Processes
\t^ 1
What is a process? .. 3-4
\t+ It is a program in execution
\t*** 2025-01-15T10:30:00.000Z, 5, 2.5, false
Scheduling .. book: 10%50, slides: 2
Explain the PCB ... A data structure
\tSKIP 2999-01-01T00:00:00.000Z
"""


def parse(text: str):
    return parse_studyset(text.splitlines())


def test_parses_title_resources_and_cards():
    study_set = parse(STUDY_SET)
    assert study_set is not None
    assert study_set.title == "Operating Systems"
    assert study_set.default_resource == "os-book.pdf"
    assert study_set.resources["book"] == "os-book.pdf"
    # The header line is not a card
    assert [f.text for f in study_set.flashcards] == [
        "What is a process?",
        "Scheduling",
        "Explain the PCB",
    ]
    assert all(f.headers == ["Processes"] for f in study_set.flashcards)


def test_new_cards_have_no_recall_yet():
    study_set = parse(STUDY_SET)
    scheduling = study_set.flashcards[1]
    assert scheduling.reviewed_at is None
    assert scheduling.retrieval_success is None


def test_recall_data_is_applied():
    card = parse(STUDY_SET).flashcards[0]
    assert card.ease == 5
    assert card.interval == 2.5
    assert card.learning_phase is False
    assert card.next_review_at - card.reviewed_at == timedelta(days=2.5)


def test_page_refs_match_the_web_app_format():
    cards = parse(STUDY_SET).flashcards
    page_ref = cards[1].line_descriptor.sub_parts[0]
    assert page_ref["name"] == "pageref"
    assert page_ref["allRefs"] == [["book", 10, 50], ["slides", 2, None]]
    pages = cards[0].line_descriptor.sub_parts[0]
    assert [step[1] for step in pages["allRefs"]] == [3, 4]


def test_page_refs_with_regions():
    page_ref = PageRef("book: 3, 12{10,20.5,60,30}, slides: 7%50").to_json()
    assert page_ref["allRefs"] == [
        ["book", 3, None],
        ["book", 12, None, {"x": 10, "y": 20.5, "w": 60, "h": 30}],
        ["slides", 7, 50],
    ]


def test_textbox_and_skip_commands():
    card = parse(STUDY_SET).flashcards[2]
    names = [sp["name"] for sp in card.line_descriptor.sub_parts]
    assert names == ["textbox", "Skip"]
    assert card.skip_until is not None and card.skip_until.year == 2999
    assert card.next_review_at == card.skip_until


def test_crlf_aliases_and_leading_blank_lines():
    text = "\n" + STUDY_SET.replace("\n", "\r\n")
    study_set = parse_studyset(text.split("\n"))
    assert study_set is not None
    assert study_set.resources["book"] == "os-book.pdf"


def test_to_dict_is_json_serializable():
    import json

    json.dumps(parse(STUDY_SET).to_dict())


def test_lines_tabbed_under_a_comment_are_ignored():
    study_set = parse(
        "[Cards]\n"
        "// Commented card .. 1\n"
        "\tbogus command under the comment\n"
        "Card .. 2\n"
        "\t// Commented detail\n"
        "\t\tbogus command under the comment\n"
        "\t+ Still a detail of the card\n"
    )
    assert study_set is not None
    assert [f.text for f in study_set.flashcards] == ["Card"]
    assert len(study_set.lines_descriptors) == 7
    assert [ld.is_comment for ld in study_set.lines_descriptors] == [
        False, True, True, False, True, True, False,
    ]


def test_invalid_category_fails():
    assert parse("[Unknown]\nsomething") is None
