MAX_EXCEPTION_LENGTH = 255
_TRUNCATE_KEEP = 200


def collect_exception(exc: Exception | str) -> str:
    """Collect exception information within 255 characters.

    - If the full text fits in 255 chars, return it as-is.
    - Otherwise, return the latest complete lines that fit within 255 chars.
    - If even the last single line exceeds 255, keep the first 200 chars
      and append '[...N characters]' where N is the number of omitted chars.
    """
    text = str(exc)
    if len(text) <= MAX_EXCEPTION_LENGTH:
        return text

    lines = text.splitlines()
    collected = []
    total = 0

    for line in reversed(lines):
        cost = len(line) + (1 if collected else 0)  # +1 for '\n' separator
        if total + cost > MAX_EXCEPTION_LENGTH:
            break
        collected.append(line)
        total += cost

    if collected:
        return "\n".join(reversed(collected))

    # Last line alone exceeds the limit — truncate it with a suffix
    last_line = lines[-1]
    omitted = len(last_line) - _TRUNCATE_KEEP
    return f"{last_line[:_TRUNCATE_KEEP]}[...{omitted} characters]"

