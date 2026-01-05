from fastapi.testclient import TestClient
from api.main import app
import uuid

client = TestClient(app)

def test_auth_flow():
    print("Starting Auth Flow Test...")
    
    # 1. Signup
    email = f"test_{uuid.uuid4()}@example.com"
    password = "password123"
    name = "Test User"
    
    print(f"1. Testing Signup with {email}...")
    signup_res = client.post("/auth/signup", json={
        "email": email,
        "password": password,
        "name": name
    })
    
    if signup_res.status_code != 200:
        print(f"FAILED: Signup failed: {signup_res.text}")
        return
        
    signup_data = signup_res.json()
    if "access_token" not in signup_data:
        print("FAILED: No access_token in signup response")
        print(signup_data)
        return
    
    print("SUCCESS: Signup returned access_token")
    token = signup_data["access_token"]
    
    # 2. Test Auth Header
    print("2. Testing auth/me with Bearer token...")
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/auth/me", headers=headers)
    
    if me_res.status_code != 200:
        print(f"FAILED: auth/me failed with token: {me_res.text}")
        return
        
    me_data = me_res.json()
    if me_data["email"] != email:
        print(f"FAILED: Email mismatch. Expected {email}, got {me_data['email']}")
        return
        
    print("SUCCESS: auth/me verified user via Token")
    
    # 3. Login
    print("3. Testing Login...")
    login_res = client.post("/auth/login", json={
        "email": email,
        "password": password
    })
    
    if login_res.status_code != 200:
        print(f"FAILED: Login failed: {login_res.text}")
        return
        
    login_data = login_res.json()
    if "access_token" not in login_data:
        print("FAILED: No access_token in login response")
        return
        
    print("SUCCESS: Login returned access_token")
    print("\nALL CHECKS PASSED: Bearer Token Authentication is working correctly.")

if __name__ == "__main__":
    try:
        test_auth_flow()
    except Exception as e:
        print(f"Test failed with exception: {e}")
