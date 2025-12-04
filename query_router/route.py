from langchain_core.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from dotenv import load_dotenv
import json
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from Tools.tool_routing import process_query
from RAG.rag_final import RAG_ans

load_dotenv()

llm = HuggingFaceEndpoint(
    repo_id='meta-llama/Llama-3.1-8B-Instruct',
    task='conversational'
)

model = ChatHuggingFace(llm=llm)

planner_prompt = PromptTemplate(
    input_variables=["query"],
    template="""
You are a Task Planner for a multi-model system.
Your job is to break the user query into one or more subtasks and mark each with the correct route.

Output a JSON array. 
Each item must contain:
- "task": the specific subtask
- "route": one of ["CS", "TOOLS"]

DEFINITIONS (use these exactly):
- "CS": programming, code, algorithm design, software-engineering questions, debugging, or conceptual Computer Science explanations.
- "TOOLS": any real-world factual data, current or changable info, news, web/search, weather, Wikipedia facts,
calculation with context(e.g. what is the height of the eiffel tower and add it with 400), world facts (who, when, where), or anything like that.

IMPORTANT RULES:
1. If unsure between CS and TOOLS, choose "TOOLS".
2. Split query into subtasks.

query: "{query}"
Respond ONLY in valid JSON.
"""
)

def plan_task(query: str):
    raw = model.invoke(planner_prompt.format(query=query))
    print(raw)
    print("=================================================================")
    try:
        return json.loads(raw.content)
    except:
        return "kuchh to gadbad hai"

def route(query: str, hasFile: bool = False):
    res = ""
    data = plan_task(query)
    print(data)
    
    if hasFile:
        try:
            return RAG_ans(query)
        except:
            print("Something went wrong")
            return None
            
    for i in data:
        if i['route'] == 'TOOLS':
            # print("call Tools model")
            res += process_query(i['task'])
        elif i['route'] == 'CS':
            response = model.invoke(i['task'])
            res += response.content if hasattr(response, 'content') else str(response)
        else:
            print("Something went wrong")
        # print(type(i))
    return res


query = "what is this document about and also tell me what are the best thing about this guy, also tell me what is 2+2"

print(route(query, hasFile=True))

# a = [{'task': 'get the name of the president of India', 'route': 'CS'}, {'task': 'get top 5 facts about the president of India', 'route': 'TOOLS'}]

# for i in a:
#     if(i['route'] == 'TOOLS'):
#         print("tools")
#     else:
#         print("cs")
