from pydantic import BaseModel


class VoiceContext(BaseModel):
    """
    Voice-related context shared with future recovery workflows.
    """

    language: str = "en-IN"

    transcript: str | None = None

    sentiment: str | None = None

    metadata: dict[str, object] = {}