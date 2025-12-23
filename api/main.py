from fastapi import FastAPI, HTTPException, Depends, Response, Request
from fastapi.middleware.cors import CORSMiddleware
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

#cookie setting
COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7

def get_current_user_cookie(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE_NAME)
    
    if not token:
        return None
    
    payload = auth.verify_token(token)
    
    if not payload:
        return None
    
    user_id = payload.get('user_id')
    if not user_id:
        return None
    
    user = db.query(model.Users).filter(model.Users.id == user_id).first()
    return user

def get_user_with_error(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_cookie(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not Authenticated")
    return user    

# SignUp
@app.post('/auth/signup')
def user_signup(user: schema.UserCreate, response: Response, db: Session = Depends(get_db)):
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
    
    access_token = auth.create_access_token(data = {"user_id": new_user.id, "email": new_user.email})
    
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    return {
        "message": "Signup successful",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email
        }
    }

# LogIn
@app.post('/auth/login')
def user_login(user: schema.UserLogin, response: Response, db: Session = Depends(get_db)):
    db_user = db.query(model.Users).filter(model.Users.email == user.email).first()
    
    if not db_user:
        raise HTTPException(status_code=400, detail="Email not found")
    
    if not auth.verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
        
    access_token = auth.create_access_token(
        data={"user_id": db_user.id, "email": db_user.email}
    )
    
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    return {
        "message": "Login successful",
        "user": {
            "id": db_user.id,
            "name": db_user.name,
            "email": db_user.email
        }
    }
        
@app.get('/auth/me')
def get_me(current_user = Depends(get_user_with_error)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email
    }

@app.post('/auth/logout')
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME)
    return {"message": "Logged out successfully"}

# Get all users
@app.get('/users')
def get_all_users(db: Session = Depends(get_db)):
    return db.query(model.Users).all()

# Get user by id
@app.get('/users/{user_id}', response_model=schema.UserResponse)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(model.Users).filter(model.Users.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# Update the context
@app.put("/users/{user_id}/context")
def update_context(user_id: int, context_data: schema.ContextUpdate, db: Session = Depends(get_db)):
    db_user = db.query(model.Users).filter(model.Users.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    db_user.context = context_data.context
    db.commit()
    return {"message": "Context updated successfully"}

#Delete user
@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(model.Users).filter(model.Users.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

# chat with LLM
@app.post('/chat')
def chat(req: schema.Chat, request: Request, db: Session = Depends(get_db)):
    # Check authentication
    current_user = get_current_user_cookie(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required. Please login to continue.")
    
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