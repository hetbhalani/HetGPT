from fastapi import FastAPI, HTTPException, Depends, Response, Request, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import sys
import os
import shutil
import tempfile
import logging

# basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from query_router.route import route

from api import model, schema, auth, rate_limit
from api.database import engine, get_db, SessionLocal
from RAG.long_term_RAG import LtmRag
from LLM.summary_model import summary_model_call
from query_router.route import get_session, sessions, clear_ltm_cache, init_ltm
from RAG.session_vectordb import store_document

model.Base.metadata.create_all(bind=engine)

app = FastAPI()

#CORS to allow backend call
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Authorization", "Content-Type"],
)

@app.get('/health')
def health():
    return {"status": "ok"}

#cookie setting
COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7

# retrive the JWT token from cookie
def get_current_user_cookie(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE_NAME)
    
    # Fallback to auth header
    if not token:
        auth_header = request.headers.get("authorization")  # headers are lowercase in starlette
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        return None
    
    payload = auth.verify_token(token)
    
    if not payload:
        return None
    
    user_id = payload.get('id') or payload.get('user_id')  # Support both keys
    if not user_id:
        return None
    
    user = db.query(model.Users).filter(model.Users.id == user_id).first()
    return user

#raise error if user does not exist
def get_user_with_error(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_cookie(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not Authenticated")
    return user    

# SignUp
@app.post('/auth/signup', response_model=schema.UserResponse)
def user_signup(user: schema.UserCreate, response: Response, db: Session = Depends(get_db)):
    db_user = db.query(model.Users).filter(model.Users.email == user.email).first()
    
    if db_user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    hashed_pass = auth.get_pass_hash(user.password) # hash the password
    
    new_user = model.Users(
        name=user.name,
        email=user.email,
        password= hashed_pass,
        context = ""
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = auth.create_access_token(data = {"id": new_user.id, "email": new_user.email})
    
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="none"
    )
    
    return {
        "message": "Signup successful",
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "access_token": access_token
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
        data={"id": db_user.id, "email": db_user.email}
    )
    
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="none"
    )
    
    return {"message": "Login successful", "id": db_user.id, "name": db_user.name, "access_token": access_token}

# Check if user is already authenticated
@app.get('/auth/me')
def get_me(request: Request, current_user = Depends(get_user_with_error)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email
    }

# logout
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

# Check rate limit endpoint
@app.post('/rate-limit/check', response_model=schema.RateLimitResponse)
def check_rate_limit_endpoint(req: schema.RateLimitCheck, db: Session = Depends(get_db)):
    remaining, is_limited, resets_at = rate_limit.check_rate_limit(db, req.device_id)
    return {
        "remaining_prompts": remaining,
        "is_rate_limited": is_limited,
        "resets_at": resets_at
    }

# chat with LLM
@app.post('/chat')
def chat(req : schema.Chat, request: Request, db: Session = Depends(get_db)):
    if req.query:
        try:
            remaining_after = None
            # Check rate limit if device_id is provided
            if req.device_id:
                remaining, is_limited, resets_at = rate_limit.check_rate_limit(db, req.device_id)
                if is_limited:
                    raise HTTPException(
                        status_code=429, 
                        detail={
                            "message": "Daily prompt limit reached. Try again tomorrow!",
                            "remaining_prompts": 0,
                            "resets_at": resets_at
                        }
                    )
            
            # retrive long term memory of auth user
            user = get_current_user_cookie(request, db)
            ltm_context = user.context if user else ""
            
            res = route(
                query=req.query,
                session_id=req.session_id,
                ltm=ltm_context
            )
            
            # Decrement rate limit after successful response
            if req.device_id:
                remaining_after = rate_limit.decrement_rate_limit(db, req.device_id)
            
            return {
                "response": res,
                "remaining_prompts": remaining_after
            }
        
        except HTTPException:
            raise
        except Exception as e:
            logging.exception(f"Chat error: {e}")
            raise HTTPException(500, "Something went wrong")

# init chat session (pre-load LTM)
@app.post('/chat/init')
def init_chat(req: schema.Chat, request: Request, db: Session = Depends(get_db)):
    try:
        user = get_current_user_cookie(request, db)
        if user:
            ltm_context = user.context
            if ltm_context:
                init_ltm(req.session_id, ltm_context)
                return {"message": "LTM init done"}
        return {"message": "No LTM to init"}
    except Exception as e:
        logging.error(f"Init error: {e}")
        return {"message": "Init failed", "error": str(e)}

# upload file to vector DB (without query)
@app.post('/upload')
async def upload_file(file: UploadFile = File(...), session_id: str = Form(...), request: Request = None, db: Session = Depends(get_db)):
    temp_file_path = None
    try:
        # Create temp file
        suffix = os.path.splitext(file.filename)[1] or '.pdf'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            temp_file_path = tmp.name
        
        logging.info(f"File saved to temp path: {temp_file_path}")
        
        # store in vector DB (Pinecone) - Pass Path
        success, msg = store_document(session_id, temp_file_path, file.filename)
        
        if success:
            # mark session as having documents
            session = get_session(session_id)
            sessions[session_id]['after_docs'] = True
            return {
                "message": "File processed and stored in Pinecone successfully",
                "file_name": file.filename,
                "session_id": session_id
            }
        else:
            raise HTTPException(400, detail=msg)
    
    except Exception as e:
        logging.error(f"Upload error: {e}")
        logging.exception("Exception occurred during file upload")
        raise HTTPException(500, f"Upload failed: {str(e)}")
        
    finally:
        #clean up temp file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                logging.error(f"Failed to delete temp file: {e}")

# after the session end
def process_session_end(session_id: str, user_id: int):
    # background process (FastAPI)
    db = SessionLocal()
    try:
        user = db.query(model.Users).filter(model.Users.id == user_id).first()
        if not user:
            return

        session = get_session(session_id)
        history = session.get('messages', [])
        if not history or len(history) <= 1:
            return

        logging.info(f"start summary: {session_id}")
        new_memories = summary_model_call(history) # call the summary model to generate LTM
        
        if new_memories:
            if user.context:
                user.context += "\n" + new_memories
            else:
                user.context = new_memories
            db.commit()
            logging.info(f"summary complete: {session_id}")
            
    except Exception as e:
        logging.error(f"Error in summary: {e}")
    finally:
        db.close()
        
    # Clear session from memory and LTM cache
    if session_id in sessions:
        try:
            del sessions[session_id]
        except:
            pass
    clear_ltm_cache(session_id)

# session end route
@app.post('/chat/end-session')
async def end_session(req: schema.Chat, background_tasks: BackgroundTasks, request: Request, db: Session = Depends(get_db)):
    user = get_user_with_error(request, db)
    
    # Check if there is anything to summarize
    session = get_session(req.session_id)
    history = session.get('messages', [])
    if not history or len(history) <= 1:
        return {"message": "No session history to summarize"}

    # Add to background tasks
    background_tasks.add_task(process_session_end, req.session_id, user.id)
    
    return {
        "message": "Session end initiated in background"
    }