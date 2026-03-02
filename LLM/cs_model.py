import requests
import re
import logging
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from dotenv import load_dotenv

load_dotenv()

# Custom finetuned CS model endpoint
CS_MODEL_URL = "https://pleuropneumonic-unoverpaid-moses.ngrok-free.dev/generate"


def _build_prompt(query: str, history: list = None) -> str:
    parts = []

    system_instruction = (
        "System: You are an expert Computer Science assistant specializing in core CS concepts, "
        "data structures, algorithms, coding problems, LeetCode-style questions, debugging, and "
        "programming. When providing code, YOU MUST provide a clear explanation of how it works. "
        "When answering CS theory questions, give thorough and accurate explanations with examples "
        "where appropriate.\n"
    )

    if history:
        parts.append(system_instruction)
        for msg in history:
            if isinstance(msg, SystemMessage):
                parts.append(f"System: {msg.content}")
            elif isinstance(msg, HumanMessage):
                parts.append(f"User: {msg.content}")
            elif isinstance(msg, AIMessage):
                parts.append(f"Assistant: {msg.content}")
        parts.append(f"User: {query}")
    else:
        parts.append(system_instruction)
        parts.append(f"User: {query}")

    parts.append("Assistant:")
    return "\n".join(parts)


def _strip_thinking(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def cs_model_call(query: str, history: list = None):
    try:
        prompt = _build_prompt(query, history)

        payload = {
            "prompt": prompt,
            "max_new_tokens": 2048,
            "temperature": 0.7,
            "top_p": 0.9
        }

        response = requests.post(CS_MODEL_URL, json=payload, timeout=120)
        response.raise_for_status()

        data = response.json()
        raw_text = data.get("response", "")
        return _strip_thinking(raw_text)

    except Exception as e:
        logging.error(f"CS model error: {e}")
        return "I'm sorry, I couldn't process the request."
