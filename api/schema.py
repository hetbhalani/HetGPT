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
    device_id: Optional[str] = None  # Device ID for rate limiting
    
class TokenData(BaseModel):
    id: Optional[int] = None
    email: Optional[str] = None

class AuthResponse(BaseModel):
    message: str
    user: UserResponse

# Rate limit schemas
class RateLimitCheck(BaseModel):
    device_id: str

class RateLimitResponse(BaseModel):
    remaining_prompts: int
    is_rate_limited: bool
    resets_at: Optional[str] = None
