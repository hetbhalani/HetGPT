import requests
import uuid

session_id = str(uuid.uuid4())
print(f"Testing with Session ID: {session_id}")

# 1. Upload File
url = "http://localhost:8000/upload"
files = {'file': ('test.pdf', b'fake pdf content for testing', 'application/pdf')}
data = {'session_id': session_id}

print("\n--- Uploading File ---")
try:
    response = requests.post(url, files=files, data=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Upload failed: {e}")

# 2. Chat Query
chat_url = "http://localhost:8000/chat"
chat_data = {
    "query": "What is in the file?",
    "session_id": session_id,
    "path": None
}

print("\n--- Sending Chat Query ---")
try:
    response = requests.post(chat_url, json=chat_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Chat failed: {e}")
