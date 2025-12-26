from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, BaseMessage, AIMessage, SystemMessage
from typing import List, Dict
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from dotenv import load_dotenv

load_dotenv()

model = HuggingFaceEndpoint(
    repo_id='moonshotai/Kimi-K2-Thinking',
    task='text-generation'
)

llm = ChatHuggingFace(llm=model)

# llm = ChatOllama(
#     model="qwen2.5:7b-instruct",
#     base_url="https://marvel-prince-sister-deviation.trycloudflare.com/",
#     temperature=0,
# )

def general_model_call(query: str, session_history: List[BaseMessage] = None):
    try:
        messages = [
            SystemMessage(content="You are HetGPT, a friendly and helpful AI assistant. Respond naturally to greetings, casual conversation, questions, and any general queries. Be warm, conversational, and helpful.")
        ]
        
        if session_history:
            messages.extend(session_history[-6:])
        
        messages.append(HumanMessage(content=query))
        
        print(f"[DEBUG] General model messages: {messages}")
        
        res = llm.invoke(messages)
        return res.content
    
    except Exception as e:
        print(f"Error in general_model: {e}")
        return "Hello! I'm HetGPT. How can I help you today?"

