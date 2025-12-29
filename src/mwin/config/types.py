from pydantic import BaseModel


class MwinConfig(BaseModel):
    """Central config object for mwin.

    Provide defaults so first-run without a config file works
    and interactive configure flow can prefill values.
    """

    project_name: str | None = None
    apikey: str | None = None
    url: str = "http://www.petmate.fun"
    use_local: bool = False
