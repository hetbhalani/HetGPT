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
        content = raw.content.strip()

        content = content.replace("```json", "").replace("```", "").strip()

        if content.startswith("{") or content.startswith("["):
            pass
        else:
            start = content.find("[")
            end = content.rfind("]") + 1
            content = content[start:end]

        return json.loads(content)
    
    except Exception as e:
        print(e)
        return None

def route(query: str, hasFile: bool = False):
    res = ""
    context = {}

    if hasFile:
        try:
            return RAG_ans(query)
        except:
            print("Something went wrong")
            return None
            
    data = plan_task(query)
    print(data)
    
    for i in data:
        task = i['task']
        
        if context:
            task += f'\n\nCONTEXT (use if needed): {json.dumps(context)}'
        
        if i['route'] == 'TOOLS':
            # print("call Tools model")
            out = process_query(task)
        elif i['route'] == 'CS':
            response = model.invoke(i['task'])
            out = response.content if hasattr(response, 'content') else str(response)
        else:
            print("Something went wrong")
        # print(type(i))
        
        context[i['task']] = out
        
        res += str(out) + '\n\n'
    return res


query = "which statue is the largest in the world and add 200 kg to the weight of the statue and also tell me what is 2 + 2?"

print(route(query))

# a = [{'task': 'get the name of the president of India', 'route': 'CS'}, {'task': 'get top 5 facts about the president of India', 'route': 'TOOLS'}]

# for i in a:
#     if(i['route'] == 'TOOLS'):
#         print("tools")
#     else:
#         print("cs")
