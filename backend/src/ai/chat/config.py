from typing import TypedDict

from langchain_core.runnables import RunnableConfig
from pydantic import BaseModel, Field

GEMINI_2_0_FLASH = "gemini-2.0-flash"
GEMINI_2_5_FLASH_PREVIEW = "gemini-2.5-flash-preview-04-17"
GEMINI_2_5_PRO_PREVIEW = "gemini-2.5-pro-preview-03-25"

# Note: This default prompt isn't strictly used by the simple product summary agent,
# but is kept for potential future expansion or more complex agents within this package.
DEFAULT_SYSTEM_PROMPT = """
You are a helpful assistant generating product summaries.

Current time: {system_time}
"""


class Configuration(BaseModel):
    """Configuration specific to the Product Summary agent."""

    model: str = Field(
        default=GEMINI_2_0_FLASH,
        description="The model to use for the agent.",
    )
    system_prompt: str = Field(
        default=DEFAULT_SYSTEM_PROMPT,
        description="The system prompt to use for the agent.",
    )

    @classmethod
    def from_runnable_config(cls, config: RunnableConfig) -> "Configuration":
        """Load configuration from RunnableConfig."""
        configurable = config.get("configurable", {})
        # Ensure model is passed or default is used
        if 'model' not in configurable:
             configurable['model'] = cls.__fields__['model'].default
        return cls(**configurable)