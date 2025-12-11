from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
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

def cs_model_call(query: str, session_history: List[Dict] = None):
    try:
        messages = []
        
        if session_history:
            for msg in session_history[-6:]: 
                if msg['role'] == 'user':
                    messages.append(HumanMessage(content=msg['content']))
                elif msg['role'] in ['assistant', 'ai']:
                    messages.append(AIMessage(content=msg['content']))
        
        messages.append(HumanMessage(content=query))
        
        res = llm.invoke(messages)
        return res.content
    
    except Exception as e:
        print(f"Error: {e}")
        return None
