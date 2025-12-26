from typing import List
from sqlalchemy.orm import Session
from langchain_core.messages import (HumanMessage, SystemMessage, AIMessage, BaseMessage)
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool
from api import model
from api.database import engine, get_db
from fastapi import Depends
import os
from dotenv import load_dotenv

model.Base.metadata.create_all(bind=engine)

load_dotenv()

# Global connection pool for PostgresSaver (keeps connections alive)
_checkpoint_pool = None

def get_checkpoint_pool():
    global _checkpoint_pool
    if _checkpoint_pool is None:
        db_uri = os.getenv("DATABASE_URL")
        _checkpoint_pool = ConnectionPool(conninfo=db_uri)
    return _checkpoint_pool

class MemoryManager:
    def __init__(self, user_id: int, thread_id: str, db: Session = Depends(get_db)):
        self.db = db
        self.user_id = user_id
        self.thread_id = thread_id

        self.init_llm()
        self.init_checkpoint()

        self.ltm_context = self.load_ltm()        

    def init_llm(self):
        
        model = HuggingFaceEndpoint(
            repo_id='moonshotai/Kimi-K2-Thinking',
            task='text-generation'
        )

        self.llm = ChatHuggingFace(llm=model)

    def init_checkpoint(self):
        # Use connection pool to keep connections alive
        pool = get_checkpoint_pool()
        self.checkpointer = PostgresSaver(pool)
        self.checkpointer.setup()

    def load_ltm(self):
        user = self.db.query(model.Users).filter(model.Users.id == self.user_id).first()
        
        return user.context if user and user.context else ""

    def get_stm_messages(self):
        config = {"configurable": {"thread_id": self.thread_id, "checkpoint_ns": ""}}
        

        try:
            checkpoint = self.checkpointer.get(config)
            
            if checkpoint and "channel_values" in checkpoint:
                return checkpoint["channel_values"].get("messages", [])
        except Exception:
            pass

        return []

    def save_message(self, messages: List[BaseMessage]):
        config = {"configurable": {"thread_id": self.thread_id, "checkpoint_ns": ""}}
        

        checkpoint = {
            "v": 1,
            "id": self.thread_id,
            "channel_values": {"messages": messages},
            "channel_versions": {},
            "versions_seen": {}
        }

        self.checkpointer.put(config, checkpoint, {}, {})

    def add_exchange(self,  user_message: str, ai_response: str):
        messages = self.get_stm_messages()
        messages.append(HumanMessage(content=user_message))
        messages.append(AIMessage(content=ai_response))
        self.save_message(messages)

    def stm_ltm_for_llm(self, max_messages: int = 10) -> List[BaseMessage]:
        messages = []

        if self.ltm_context:
            messages.append(SystemMessage(
                content=f"=== USER'S LONG-TERM MEMORY ===\n{self.ltm_context}"
            ))

        stm_messages = self.get_stm_messages()
        
        if stm_messages:
            messages.extend(stm_messages[-max_messages:])

        return messages

    def end_session(self):
        messages = self.get_stm_messages()

        if len(messages) < 2:
            return ""

        convert_text = '\n'.join([f"{'USER' if isinstance(m, HumanMessage) else 'AI'}: {m.content}" for m in messages])

        summery_prompt = f"""Summarize this conversation in 1-2 sentences.
                        Focus on: user preferences, key topics, important facts.
                        CONVERSATION:
                        {convert_text}
                        SUMMARY:"""

        response = self.llm.invoke([HumanMessage(content=summery_prompt)])

        summery = response.content.strip()

        self.update_ltm(summery)
         
        return summery
        
    def update_ltm(self, new_summery: str):
        user = self.db.query(model.Users).filter(model.Users.id == self.user_id).first()

        if user:
            before = user.context or ""
            summaries = [s.strip()for s in before.split("\n") if s.strip()]

            summaries.append(new_summery)

            user.context = "\n".join(summaries[-5:])

            self.db.commit()
