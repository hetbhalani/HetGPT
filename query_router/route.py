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
            - "TOOLS" → real-world lookup, search, factual information, news, weather, prices, names, current data, or calculations based on real-world values.
            - If unsure, choose "TOOLS".

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

def route(query: str, path: str = None):
    res = ""
    context = {}

    if path:
        try:
            return RAG_ans(query, path)
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


# query = "what is the name of the guy in this document?"

# print(route(query))

# a = [{'task': 'get the name of the president of India', 'route': 'CS'}, {'task': 'get top 5 facts about the president of India', 'route': 'TOOLS'}]

# for i in a:
#     if(i['route'] == 'TOOLS'):
#         print("tools")
#     else:
#         print("cs")
