from typing import Optional

from ..types import LineDescriptor, StudySet
from .alias_command import Alias
from .auto_reveal import AutoReveal
from .example import Example
from .header import Header
from .note import Note
from .page_ref import PageRef
from .recall_data import RecallData
from .recap import Recap
from .remember import Remember
from .reverse import Reverse
from .skip import Skip
from .tag import Tag
from .text_box import TextBox


class CommandsFactory:
    """Port of `src/Commands/CommandsFactory.ts`: keep the two in sync."""

    @staticmethod
    def make(
        line_descriptor: LineDescriptor,
        study_set: StudySet,
        command_name_or_shortcut: str,
        command_argument: Optional[str],
    ):
        name = command_name_or_shortcut
        if name.startswith("\\"):
            name = name[1:]
        p = name.find("(")
        if p != -1:
            name = name[:p]

        if name in (PageRef.symbol, "page"):
            return PageRef(command_argument)
        if name in (TextBox.symbol, "textbox"):
            return TextBox(command_argument)
        if name in (Remember.symbol, "remember"):
            return Remember(command_argument or "")
        if name in (Tag.symbol, "tag"):
            return Tag(command_argument or "")
        if name in (AutoReveal.symbol, "auto_reveal"):
            return AutoReveal()
        if name in (Alias.symbol, "alias"):
            alias = Alias(command_argument or "", line_descriptor, study_set)
            return alias if alias.is_valid else None
        if name in (Header.symbol, "header"):
            return Header(line_descriptor, study_set, command_argument or 1)
        if name in (RecallData.symbol, "recall_data"):
            return RecallData(line_descriptor, study_set, command_argument or "")
        if name in (Skip.symbol, "Skip", "skip"):
            return Skip(line_descriptor, study_set, command_argument)
        if name in (Reverse.symbol, "reverse"):
            if command_argument:
                return None
            reverse = Reverse(line_descriptor, study_set)
            return reverse if reverse.is_valid else None

        lowered = name.lower()
        if lowered == "recap":
            return Recap(line_descriptor, command_argument)
        if lowered == "example":
            return Example(line_descriptor, command_argument)
        if lowered == "note":
            return Note(command_argument or "")

        print(f"[MakeCommand] Unrecognized command {name}")
        return None
