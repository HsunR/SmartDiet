import json
from typing import TypedDict, Optional
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END

from app.services.ai import get_vision_llm
from app.schemas.food import FoodItem, MealOverview


class FoodRecognitionState(TypedDict):
    image_url: str
    user_id: str
    user_profile: Optional[dict]
    raw_response: Optional[str]
    foods: list[FoodItem]
    meal_overview: Optional[MealOverview]
    dietary_advice: str
    error: Optional[str]


FOOD_RECOGNITION_PROMPT = """### 角色
AI 营养师。分析图像，结合用户信息 ({user_profile}) 输出 JSON。
必须严格遵循下方 JSON 结构，无 Markdown 标记。

### JSON 结构示例
{{
   "success": true,
   "summary": {{
     "score": 65,
     "tags": {{"good": ["高蛋白"], "warn": ["高钠"]}},
     "tagReasons": {{"高蛋白": "鸡肉富含优质蛋白质", "高钠": "酱油和腌制调料含盐量高"}}
   }},
   "items": [
     {{
       "id": "food_001",
       "name": "宫保鸡丁",
       "category": "种类",
       "score": 75,
       "weight": {{"val": 135, "conf": 0.85}},
       "tags": {{"good": ["高蛋白"], "warn": ["高钠"]}},
       "tagReasons": {{"高蛋白": "鸡肉富含优质蛋白质", "高钠": "酱油和腌制调料含盐量高"}},
       "advice": "简短建议"
     }}
   ]
}}
错误返回：{{"success": false, "message": "原因"}}"""


async def recognize_food(state: FoodRecognitionState) -> FoodRecognitionState:
    llm = get_vision_llm()
    prompt = FOOD_RECOGNITION_PROMPT.replace("{user_profile}", json.dumps(state.get("user_profile", {}), ensure_ascii=False))
    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=[{"type": "image_url", "image_url": {"url": state["image_url"]}}]),
    ]
    try:
        response = await llm.ainvoke(messages)
        content = response.content.strip()
        result = json.loads(content)
        if not result.get("success"):
            return {**state, "error": result.get("message", "识别失败")}

        foods = []
        for item in result.get("items", []):
            foods.append(FoodItem(
                name=item.get("name", "未知食物"),
                category=item.get("category", ""),
                score=item.get("score", 60),
                weight=item.get("weight", {}).get("val", 100),
                confidence=item.get("weight", {}).get("conf", 0.8),
                tags={"positive": item.get("tags", {}).get("good", []), "warning": item.get("tags", {}).get("warn", [])},
                tag_reasons=item.get("tagReasons", {}),
                advice=item.get("advice", ""),
            ))

        summary = result.get("summary", {})
        overview = MealOverview(
            overall_health_score=summary.get("score", 60),
            health_tags={"positive": summary.get("tags", {}).get("good", []), "warning": summary.get("tags", {}).get("warn", [])},
            tag_reasons=summary.get("tagReasons", {}),
            summary=f"识别到: {', '.join(f.name for f in foods)}" if foods else "识别成功",
        )

        advices = [f.advice for f in foods if f.advice]
        dietary_advice = "; ".join(advices)

        return {**state, "foods": foods, "meal_overview": overview, "dietary_advice": dietary_advice}
    except Exception as e:
        return {**state, "error": str(e)}


def build_food_recognition_graph() -> StateGraph:
    builder = StateGraph(FoodRecognitionState)
    builder.add_node("recognize_food", recognize_food)
    builder.add_edge(START, "recognize_food")
    builder.add_edge("recognize_food", END)
    return builder.compile()
