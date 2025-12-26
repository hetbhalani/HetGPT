from langchain_core.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_ollama import ChatOllama
from dotenv import load_dotenv
import json
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from Tools.tool_routing import tool_call
from RAG.rag_final import RAG_ans
from LLM.cs_model import cs_model_call
from LLM.general_model import general_model_call
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
            - ALWAYS return at least ONE task. NEVER return an empty array [].

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
            - "GENERAL" → greetings (hi, hello, hey), casual conversation, small talk, unclear requests, philosophical questions, creative writing, opinions, advice, jokes, or anything that doesn't clearly fit CS or TOOLS.
            - If unsure or confused about what the user wants, choose "GENERAL".

            ### SPLITTING RULES:
            - Split only when the query clearly contains multiple separate instructions ("and", "also", "then").
            - Do NOT split based on assumptions.

            ### JSON EXAMPLES:
            For "hello":
            [
                {{
                    "task": "Respond to greeting",
                    "route": "GENERAL"
                }}
            ]
            
            For "what's the weather in Mumbai":
            [
                {{
                    "task": "Find the current weather in Mumbai",
                    "route": "TOOLS"
                }}
            ]
            
            For "write Python code to add two numbers":
            [
                {{
                    "task": "Write Python code to add two numbers",
                    "route": "CS"
                }}
            ]
            
            User Query: "{query}"
            Respond ONLY with the JSON array.

        """
)

def plan_task(query: str):
    raw = model.invoke(planner_prompt.format(query=query))
    print(raw)
    print("=================================================================")
    try:
        content = raw.content.strip()
        return json.loads(content)
    
    except Exception as e:
        print(e)
        return None

def route(query: str, file_path: str = None, session_history: List = None):
    res = ""
    context = {}

    # RAG (when file upload)
    if file_path:
        try:
            return RAG_ans(query, file_path)
        except Exception as e:
            print(f"Something went wrong: {e}")
            return None
            
            
    # if session_history:
    #     print(f"+++++++++++++++++++++++++++++++++++++{session_history}++++++++++++++++++++++++++++++++++++++++")
    #     recent_history = session_history[-10:]
    #     history_str = '\n'.join([
    #         f"{msg['role'].upper()}: {msg['content']}" 
    #         for msg in recent_history
    #     ])
    #     query_w_context = f"CONVERSATION HISTORY:\n{history_str}\n\nCURRENT QUERY: {query}"
    # else:
    #     query_w_context = query
        
    # data = plan_task(query_w_context)
    # print(data)

    data = plan_task(query)
    
    print(f"[DEBUG] Planned tasks: {data}")
    print(f"[DEBUG] Data type: {type(data)}, Length: {len(data) if data else 0}")
    
    # Handle empty or None data - fallback to GENERAL
    if data is None or len(data) == 0:
        print("[DEBUG] No tasks planned, falling back to GENERAL model")
        out = general_model_call(query, session_history)
        print(f"[DEBUG] GENERAL model response: {out}")
        print(f"[DEBUG] Messages after GENERAL response: {session_history}")
        return str(out) if out else "I'm here to help! How can I assist you today?"
    

    for i in data:
        task = i['task']
        
        if context:
            task += f'\n\nCONTEXT (use if needed): {json.dumps(context)}'
        
        if i['route'] == 'TOOLS':
            print(f"[DEBUG] Routing to TOOLS: {task}")
            out = tool_call(task, session_history)
            
        elif i['route'] == 'CS':
            print(f"[DEBUG] Routing to CS: {task}")
            out = cs_model_call(task, session_history)
            
        elif i['route'] == 'GENERAL':
            print(f"[DEBUG] Routing to GENERAL: {task}")
            out = general_model_call(task, session_history)
            
        else:
            print(f"[DEBUG] Unknown route '{i['route']}', falling back to GENERAL")
            out = general_model_call(task, session_history)
        
        context[i['task']] = out
        res += str(out) + '\n\n'
        
        # Print messages list after every response
        print(f"\n[DEBUG] Messages after response:")
        print(f"  Task: {task}")
        print(f"  Route: {i['route']}")
        print(f"  Session History: {session_history}")
        print("="*60)
    
    return res



# query = "write me a code to add two numbers?"

# print(route(query))

# a = [{'task': 'get the name of the president of India', 'route': 'CS'}, {'task': 'get top 5 facts about the president of India', 'route': 'TOOLS'}]

# for i in a:
#     if(i['route'] == 'TOOLS'):
#         print("tools")
#     else:
#         print("cs")
