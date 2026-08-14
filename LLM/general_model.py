from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from typing import List, Dict
from langchain_groq import ChatGroq
from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = (os.getenv("GROQ_API_KEY") or "").strip()

if GROQ_API_KEY:
    llm = ChatGroq(
        model='llama-3.1-8b-instant',
        api_key=GROQ_API_KEY,
    )
else:
    llm = ChatGroq(
        model='openai/gpt-oss-20b',
    )


def general_model_call(query: str, history: list = None):
    try:
        # manage the history
        if history:
            messages = list(history)
        else:
            messages = [
                SystemMessage(content="You are a helpful assistant. Answer questions concisely.")
            ]
            messages.append(HumanMessage(content=query))
        
        res = llm.invoke(messages)
        return res.content
    
    except Exception as e:
        print(f"Error: {e}")
        return "I'm here to help! How can I assist you today?"
