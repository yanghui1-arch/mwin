
def clean_exception(exception: str):
    """Clean exception information
    Reserve the last 2000 characters.
    TODO: Reserve key exception information and ensure its length doesn't exceed 2048 characters.
    """
    if len(exception) > 2048:
        return exception[-2000:]
    return exception