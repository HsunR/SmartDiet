from langchain_core.language_models.chat_models import BaseChatModel
from langchain_community.chat_models import ChatZhipuAI
from langchain_community.chat_models.tongyi import ChatTongyi

from app.core.config import settings


def get_llm(model_type: str = None) -> BaseChatModel:
    provider = model_type or settings.llm_provider
    if provider == "zhipu":
        return ChatZhipuAI(
            api_key=settings.zhipu_api_key,
            model=settings.zhipu_model,
            temperature=0.7,
        )
    return ChatTongyi(
        api_key=settings.dashscope_api_key,
        model=settings.dashscope_model,
        temperature=0.7,
    )


def get_vision_llm(model_type: str = None) -> BaseChatModel:
    provider = model_type or settings.llm_provider
    if provider == "zhipu":
        return ChatZhipuAI(
            api_key=settings.zhipu_api_key,
            model=settings.zhipu_model,
            temperature=0.3,
        )
    return ChatTongyi(
        api_key=settings.dashscope_api_key,
        model="qwen-vl-plus",
        temperature=0.3,
    )
