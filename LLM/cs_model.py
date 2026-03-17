import requests
import re
import logging
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
import os

load_dotenv()

# Replace with the URL given by Hugging Face Spaces (e.g. https://your-username-your-space-name.hf.space)
HF_SPACE_URL = os.getenv("HF_SPACE_URL", "https://your-huggingface-space-url.hf.space")
HF_API_KEY = os.getenv("HF_API_KEY", "")

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

        headers = {}
        if HF_API_KEY:
            headers["Authorization"] = f"Bearer {HF_API_KEY}"
        
        # Ensure you call the /generate endpoint based on the FastAPI setup
        endpoint = f"{HF_SPACE_URL.rstrip('/')}/generate"
        response = requests.post(endpoint, json=payload, headers=headers, timeout=120)
        response.raise_for_status()

        data = response.json()
        raw_text = data.get("response", "")
        return _strip_thinking(raw_text)

    except Exception as e:
        logging.error(f"CS model error: {e}")
        return "I'm sorry, I couldn't process the request."
