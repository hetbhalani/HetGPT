from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    name: str
    password: str

class UserLogin(UserBase):
    password: str
    
class ContextUpdate(BaseModel):
    context: str
    
class UserResponse(UserBase):
    id: int
    name: str
    context: Optional[str] = None
    
    class Config:
        from_attributes = True
        
class Chat(BaseModel):
    query: str
    path: Optional[str] = None
    session_id: str