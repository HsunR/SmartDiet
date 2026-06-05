import re
import warnings
from pydantic import BaseModel, ConfigDict

# Suppress Pydantic v2 alias generator warnings
warnings.filterwarnings("ignore", message=".*alias.*Field.*", category=UserWarning)
warnings.filterwarnings("ignore", message=".*validation_alias.*Field.*", category=UserWarning)
warnings.filterwarnings("ignore", message=".*serialization_alias.*Field.*", category=UserWarning)


def to_camel(snake_str: str) -> str:
    parts = snake_str.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
