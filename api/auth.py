from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'])

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def get_pass_hash(password):
    return pwd_context.hash(password)
