def count_tabs(line: str) -> int:
    count = 0
    i = 0
    while i < len(line):
        if line[i] == '\t':
            count += 1
            i += 1
        elif line[i] == ' ':
            if i + 3 < len(line) and line[i + 1] == ' ' and line[i + 2] == ' ' and line[i + 3] == ' ':
                count += 1
                i += 4
            else:
                break
        else:
            break
    return count
