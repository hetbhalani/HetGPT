from typing import Dict, List

class ConversationManager:
    def __init__(self):
        self.sessions: Dict[str, list[Dict]] = {} 
        
    def add_message(self, session_id: str, role: str, content: str):
        if session_id not in self.sessions:
            self.sessions[session_id] = []
            
        self.sessions[session_id].append({
            "role": role,
            "content": content
        })
    
    def get_context(self, session_id: str) -> List[Dict]:
        return self.sessions.get(session_id, [])