import os
os.environ["DASHSCOPE_API_KEY"] = "test-key"

from app.core.config import settings
settings.dashscope_api_key = "test-key"

from app.services.ai import get_llm, get_vision_llm


def test_get_llm_returns_chat_model():
    llm = get_llm("dashscope")
    assert llm is not None


def test_get_vision_llm_returns_chat_model():
    llm = get_vision_llm("dashscope")
    assert llm is not None
