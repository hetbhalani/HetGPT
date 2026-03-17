from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from api import model

DAILY_PROMPT_LIMIT = 5

def get_or_create_device_limit(db: Session, device_id: str) -> model.DeviceRateLimit:
    device_limit = db.query(model.DeviceRateLimit).filter(
        model.DeviceRateLimit.device_id == device_id
    ).first()
    
    if not device_limit:
        device_limit = model.DeviceRateLimit(
            device_id=device_id,
            prompts_used=0,
            last_reset=datetime.utcnow()
        )
        db.add(device_limit)
        db.commit()
        db.refresh(device_limit)
    
    return device_limit

def should_reset(device_limit: model.DeviceRateLimit) -> bool:
    now = datetime.utcnow()
    last_reset = device_limit.last_reset
    
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return last_reset < today_start

def check_rate_limit(db: Session, device_id: str) -> tuple[int, bool, str]:
    device_limit = get_or_create_device_limit(db, device_id)
    
    if should_reset(device_limit):
        device_limit.prompts_used = 0
        device_limit.last_reset = datetime.utcnow()
        db.commit()
    
    remaining = max(0, DAILY_PROMPT_LIMIT - device_limit.prompts_used)
    is_limited = remaining <= 0
    
    now = datetime.utcnow()
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    resets_at = tomorrow.isoformat() + "Z"
    
    return remaining, is_limited, resets_at

def decrement_rate_limit(db: Session, device_id: str) -> int:
    device_limit = get_or_create_device_limit(db, device_id)
    
    if should_reset(device_limit):
        device_limit.prompts_used = 0
        device_limit.last_reset = datetime.utcnow()

    if device_limit.prompts_used >= DAILY_PROMPT_LIMIT:
        return 0
    
    device_limit.prompts_used += 1
    db.commit()
    
    remaining = max(0, DAILY_PROMPT_LIMIT - device_limit.prompts_used)
    return remaining

