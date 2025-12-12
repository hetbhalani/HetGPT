from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from query_router.route import route
from api.context_manager import ConversationManager
from api import model, schema, auth
from api.database import engine, get_db

model.Base.metadata.create_all(bind=engine)

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

@app.post('/auth/signup', response_model=schema.UserResponse)
def user_signup(user: schema.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(model.Users).filter(model.Users.email == user.email).first()
    
    if db_user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    hashed_pass = auth.get_pass_hash(user.password)
    
    new_user = model.Users(
        name=user.name,
        email=user.email,
        password= hashed_pass,
        context = ""
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@app.post('/auth/login')
def user_login(user: schema.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(model.Users).filter(model.Users.email == user.email).first()
    
    if not db_user:
        raise HTTPException(status_code=400, detail="Email not found")
    
    if not auth.verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
        
    return {"message": "Login successful", "user_id": db_user.id, "name": db_user.name}
        
@app.get('/users')
def get_all_users(db: Session = Depends(get_db)):
    return db.query(model.Users).all()

@app.get('/users/{user_id}', response_model=schema.UserResponse)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(model.Users).filter(model.Users.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@app.put("/users/{user_id}/context")
def update_context(user_id: int, context_data: schema.ContextUpdate, db: Session = Depends(get_db)):
    db_user = db.query(model.Users).filter(model.Users.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    db_user.context = context_data.context
    db.commit()
    return {"message": "Context updated successfully"}


@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(model.Users).filter(model.Users.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

@app.post('/chat')
def chat(req : schema.Chat):
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
            print("error: ",e)
            raise HTTPException(500, "Something went wrong")