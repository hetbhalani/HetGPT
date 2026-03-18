import re
import logging
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

llm = ChatGroq(model='llama-3.3-70b-versatile', temperature=0.3)

SYSTEM_PROMPT = (
    "You are a computer science assistant. "
    "Help with coding, CS fundamentals, algorithms, data structures, and LeetCode-style problems. "
    "Give correct, concise answers with clear steps."
)


def _build_messages(query: str, history: list = None):
    messages = [SystemMessage(content=SYSTEM_PROMPT)]

    if history:
        for msg in history:
            if isinstance(msg, (HumanMessage, AIMessage, SystemMessage)):
                messages.append(msg)

    if not messages or not isinstance(messages[-1], HumanMessage) or messages[-1].content != query:
        messages.append(HumanMessage(content=query))

    return messages


def _strip_thinking(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def cs_model_call(query: str, history: list = None):
    try:
        messages = _build_messages(query, history)
        res = llm.invoke(messages)
        return _strip_thinking(res.content)

    except Exception as e:
        logging.error(f"CS model error: {e}")
        return "I'm sorry, I couldn't process the request."
