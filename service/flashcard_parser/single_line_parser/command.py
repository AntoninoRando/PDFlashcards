from typing import List

from ..symbols import (
    COMMAND_SEPARATOR,
    INLINE_SUBCOMMAND_START_SYMBOL,
    INLINE_SUBCOMMAND_END_SYMBOL,
)
from ..types import LineDescriptor, StudySet
from ..commands.commands_factory import CommandsFactory


def parse_command_line(
    line_descriptor: LineDescriptor,
    study_set: StudySet,
    sub_command: str | None = None,
    in_line: bool = False,
) -> bool:
    trimmed_line = sub_command if sub_command is not None else line_descriptor.trimmed_line

    end_of_command = -1
    start_of_arg = -1
    sub_commands: List[str] = []
    open_count = 0
    open_index = -1
    close_index = -1

    for i, char in enumerate(trimmed_line):
        if char == COMMAND_SEPARATOR and open_count == 0:
            if end_of_command == -1:
                end_of_command = i
            start_of_arg = i + 1
            break
        if char == INLINE_SUBCOMMAND_START_SYMBOL:
            if open_count == 0:
                open_index = i
                if end_of_command == -1:
                    end_of_command = i
            open_count += 1
        elif char == INLINE_SUBCOMMAND_END_SYMBOL:
            open_count -= 1
            if open_count == 0:
                close_index = i
                sub_cmd = trimmed_line[open_index + 1 : close_index]
                print(f"[studySet] Found sub-commands {sub_cmd}")
                sub_commands.append(sub_cmd)

    if start_of_arg == -1:
        cmd_name = trimmed_line.strip()
        cmd_arg = None
        print(f"[studySet] Found command {cmd_name} with no arg")
    else:
        cmd_name = trimmed_line[:end_of_command].strip()
        cmd_arg = trimmed_line[start_of_arg:].strip()
        print(f"[studySet] Found command {cmd_name} with arg {cmd_arg}")

    command = CommandsFactory.make(line_descriptor, study_set, cmd_name, cmd_arg)
    if not command:
        print(f"[studySet] Unrecognized command at line {line_descriptor.index}: '{trimmed_line}'")
        return False

    receiver = line_descriptor if in_line else line_descriptor.parent
    if receiver is None:
        print("[studySet] Command has no parent to attach to")
        return False
    receiver.sub_parts.append({**command.to_json(), "subParts": [], "sourceIndex": line_descriptor.index})

    for sub in sub_commands:
        ld = LineDescriptor(
            index=line_descriptor.index,
            trimmed_line=sub,
            original_line=line_descriptor.original_line,
            tabs=line_descriptor.tabs + 1,
            category=line_descriptor.category,
            tabbed_under=[],
            parent=line_descriptor,
            is_comment=line_descriptor.is_comment,
            sub_parts=[],
        )
        parse_command_line(ld, study_set, sub)
    return True
