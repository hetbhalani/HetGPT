from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from query_router.route import route
from pydantic import BaseModel
from typing import Optional
from api.context_manager import ConversationManager

class Chat(BaseModel):
    query: str
    path: Optional[str] = None
    session_id: str

app = FastAPI()

#CORS to allow backend call
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

conversation_manager = ConversationManager()

@app.post('/chat')
def chat(req : Chat):
    if req.query:
        try:
            session_history = conversation_manager.get_context(req.session_id)
            conversation_manager.add_message(req.session_id, "user", req.query)
            
            res = route(
                query=req.query,
                file_path=req.path if req.path else None,
                session_history=session_history
            )
            
            conversation_manager.add_message(req.session_id, "ai", res)
            return {"response": res}
        
        except Exception as e:
            print("erroe: ",e)
            raise HTTPException(500, "Something went wrong")           
