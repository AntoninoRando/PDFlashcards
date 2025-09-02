class PageRef:
    symbol = ".."
    command_name = "pageref"

    def __init__(self, page_ref: str):
        alias = None
        page_string = page_ref
        idx = page_ref.find(":")
        if idx != -1:
            alias = page_ref[:idx].strip()
            page_string = page_ref[idx + 1 :].strip()
        self.pages_string = page_string
        self.resource_alias = alias
        self.all_page_refs = self._parse_page_refs(page_string or "0")
        self.page_ref = self.all_page_refs[0] if self.all_page_refs else 0

    def _parse_page_refs(self, page_ref_string: str):
        result = []
        parts = [p.strip() for p in page_ref_string.split(",")]
        for part in parts:
            if "-" in part:
                start, end = part.split("-")
                try:
                    start_i = int(start.strip())
                    end_i = int(end.strip())
                    for i in range(start_i, end_i + 1):
                        result.append(i)
                except ValueError:
                    pass
            else:
                try:
                    result.append(int(part))
                except ValueError:
                    pass
        return result

    def to_json(self):
        return {
            "name": "PageRef",
            "ref": self.page_ref,
            "allRefs": self.all_page_refs,
            "pagesString": self.pages_string,
            "resourceAlias": self.resource_alias,
        }
