from fastapi import FastAPI, HTTPException
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from query_router.route import route
from pydantic import BaseModel
from typing import Optional

class Chat(BaseModel):
    query: str
    path: Optional[str] = None

app = FastAPI()

@app.post('/chat')
def chat(req : Chat):
    if req.query:
        try:
            res = route(req.query, req.path if req.path else None)
            return res
        except Exception as e:
            print("erroe: ",e)
            raise HTTPException(500, "Something went wrong")           
