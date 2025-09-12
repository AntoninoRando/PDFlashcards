from ..types import LineDescriptor, StudySet
from .page_ref import PageRef
from .remember import Remember
from .tag import Tag
from .auto_reveal import AutoReveal
from .alias_command import Alias as AliasCommand
from .header import Header
from .recall_data import RecallData
from .recap import Recap
from .example import Example
from .note import Note


class CommandsFactory:
    @staticmethod
    def make(line_descriptor: LineDescriptor, study_set: StudySet, command_name_or_shortcut: str, command_argument: str | None):
        if command_name_or_shortcut.startswith("\\"):
            command_name_or_shortcut = command_name_or_shortcut[1:]
        p = command_name_or_shortcut.find("(")
        if p != -1:
            command_name_or_shortcut = command_name_or_shortcut[:p]
        if command_name_or_shortcut in (PageRef.symbol, "page"):
            return PageRef(command_argument or "0")
        if command_name_or_shortcut in (Remember.symbol, "remember"):
            return Remember(command_argument or "")
        if command_name_or_shortcut in (Tag.symbol, "tag"):
            return Tag(command_argument or "")
        if command_name_or_shortcut in (AutoReveal.symbol, "auto_reveal"):
            return AutoReveal()
        if command_name_or_shortcut in (AliasCommand.symbol, "alias"):
            alias = AliasCommand(command_argument or "", line_descriptor, study_set)
            return alias if alias.is_valid else None
        if command_name_or_shortcut in (Header.symbol, "header"):
            return Header(line_descriptor, study_set, command_argument or 1)
        if command_name_or_shortcut in (RecallData.symbol, "recall_data"):
            return RecallData(line_descriptor, study_set, command_argument or "")
        if command_name_or_shortcut.lower() == "recap":
            return Recap(line_descriptor, command_argument)
        if command_name_or_shortcut.lower() == "example":
            return Example(line_descriptor, command_argument)
        if command_name_or_shortcut.lower() == "note":
            return Note(command_argument or "")
        print(f"[MakeCommand] Unrecognized command {command_name_or_shortcut}")
        return None
