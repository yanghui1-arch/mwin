from pydantic import BaseModel


class MwinConfig(BaseModel):
    """Central config object for mwin."""

    project_name: str | None = None
    apikey: str | None = None
    url: str | None = None
    use_local: bool = False
