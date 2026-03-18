from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Users(Base):
    __tablename__='users'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    context = Column(String)

class DeviceRateLimit(Base):
    __tablename__ = 'device_rate_limits'
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, index=True, nullable=False)
    prompts_used = Column(Integer, default=0)
    last_reset = Column(DateTime, default=datetime.utcnow)

    