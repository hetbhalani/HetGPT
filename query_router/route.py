from langchain_core.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_ollama import ChatOllama
from langchain.messages import SystemMessage, HumanMessage, AIMessage
from dotenv import load_dotenv
import json
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from Tools.tool_routing import tool_call
from RAG.rag_final import RAG_ans
from LLM.cs_model import cs_model_call
from LLM.general_model import general_model_call
from RAG.long_term_RAG import LtmRag
from typing import List, Dict

load_dotenv()

llm = HuggingFaceEndpoint(
    repo_id='meta-llama/Llama-3.1-8B-Instruct',
    task='conversational'
)

model = ChatHuggingFace(llm=llm)

# GENERAL_MODEL = os.getenv("GENERAL_MODEL")

# model = ChatOllama(
#     model="qwen2.5:7b-instruct",
#     base_url=GENERAL_MODEL,
#     temperature=0,
# )

planner_prompt = PromptTemplate(
        input_variables=["query"],
        template="""
            You are a Task Planner for a multi-model AI system.
            Your job is to break the user query into one or more independent subtasks and assign a route to each.

            ### OUTPUT REQUIREMENTS:
            - Output MUST be ONLY a valid JSON array. No explanation, no notes, no natural language.
            - Each element MUST contain exactly two keys: "task" and "route".
            - Tasks must be short imperative commands.
            - If there are NO explicit tasks in the query, return [].

            ### ABSOLUTE RULES (MUST FOLLOW):
            - NEVER infer or invent additional tasks that are not explicitly and clearly asked by the user.
            - NEVER add instructional or general-explanation tasks unless directly requested.
            - NEVER assume the user wants code, explanation, or strategy unless they explicitly ask.
            - If a single clear question exists, produce only ONE task.
            - Do NOT add tasks like "Explain", "Describe", "Improve", "Fix" unless those words appear in the query.
            - Do NOT split the Task if NOT needed, only split when there are multiple questions in the query
            
            ### ROUTE DEFINITIONS:
            - "CS" → programming, code, debugging, algorithm design, or Computer Science conceptual explanations.
            - "TOOLS" → real-world lookup, facts, information about something, search, factual information, news, weather, prices, names, current data, or calculations based on real-world values.
            - "GENERAL" → Greetings, small talk, general knowledge that doesn't need external tools, or when the query is unclear/ambiguous.
            - If unsure, choose "GENERAL".

            ### SPLITTING RULES:
            - Split only when the query clearly contains multiple separate instructions ("and", "also", "then").
            - Do NOT split based on assumptions.

            ### JSON EXAMPLE:
            [
                {{
                    "task": "Find the current weather in Junagadh",
                    "route": "TOOLS"
                }},
                {{
                    "task": "Write Python code to add two numbers",
                    "route": "CS"
                }}
            ]
            User Query: "{query}"
            Respond ONLY with the JSON array.

        """
)

sessions: Dict[str, List] = {}

def get_session(session_id: str):
    if session_id not in sessions:
        sessions[session_id] = [
            SystemMessage(content="You are a helpful assistant. Answer questions shortly.")
        ]
    return sessions[session_id]

def trim_memory(msg: List):
    system = msg[:1]
    rest = msg[-10:] # last 5 pairs
    return system + rest

def plan_task(query: str):
    raw = model.invoke(planner_prompt.format(query=query))
    print(raw)
    print("=================================================================")
    try:
        content = raw.content.strip()
        return json.loads(content)
    
    except Exception as e:
        print(e)
        return []


ltm_cache: Dict[str, LtmRag] = {}

def clear_ltm_cache(session_id: str):
    if session_id in ltm_cache:
        del ltm_cache[session_id]

def route(query: str, session_id: str, file_path: str = None, ltm: str = None):
    global sessions
    res = ""
    
    messages = get_session(session_id)
    
    ltm_facts = ""
    if ltm:
        try:
            if session_id not in ltm_cache:
                print(f"Initializing LTM Rag for session: {session_id}")
                ltm_cache[session_id] = LtmRag(ltm)
            
            rag = ltm_cache[session_id]
            ltm_results = rag.LTM_RAG(query)
            if ltm_results:
                ltm_facts = "\n".join([doc.page_content for doc in ltm_results])
        except Exception as e:
            print(f"LTM RAG error: {e}")

    current_query = query
    if ltm_facts:
        current_query = f"Relevant facts from long-term memory:\n{ltm_facts}\n\nUser query: {query}"

    messages.append(HumanMessage(content=current_query))
    messages = trim_memory(messages)
    sessions[session_id] = messages
    
    # RAG (when file upload)
    if file_path:
        try:
            res = RAG_ans(query, file_path)
            messages.append(AIMessage(content=res))
            sessions[session_id] = trim_memory(messages)
            return res
        
        except Exception as e:
            print(f"RAG error: {e}")
            return None

    data = plan_task(query)
    
    # Fallback
    if not data:
        print("Plan is empty, defaulting to GENERAL")
        data = [{"task": current_query, "route": "GENERAL"}]
        
    print(data)
    
    for i in data:
        task = i['task']
        out = None 
        
        if i['route'] == 'TOOLS':
            out = tool_call(task, messages)
            
        elif i['route'] == 'CS':
            out = cs_model_call(task, messages)

        elif i['route'] == 'GENERAL':
            out = general_model_call(task, messages)
            
        else:
            print("Unknown route, defaulting to GENERAL")
            out = general_model_call(task, messages)
        
        if out is None or out == "":
            out = "I'm sorry, I couldn't answer that question."
        
        res += str(out) + '\n\n'
    
    messages.append(AIMessage(content=res))
    sessions[session_id] = trim_memory(messages)
    
    return res


# query = "write me a code to add two numbers?"

# print(route(query))

# a = [{'task': 'get the name of the president of India', 'route': 'CS'}, {'task': 'get top 5 facts about the president of India', 'route': 'TOOLS'}]

# for i in a:
#     if(i['route'] == 'TOOLS'):
#         print("tools")
#     else:
#         print("cs")
