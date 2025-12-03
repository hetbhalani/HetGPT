from langchain_core.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from dotenv import load_dotenv
import json

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
Your job is to break the user query into one or more tasks.

Output a JSON array. 
Each item must contain:
- "task": the specific subtask
- "route": one of ["CS", "TOOLS", "RAG"]

Rules:
- Use "CS" for programming/code/CS concepts.
- Use "TOOLS" for real-time actions (weather, search, wikipedia, news).
- Use "RAG" for questions about the provided PDF/document.
- Use "TOOLS" if not sure.
- Split tasks if needed.

User query: "{query}"
Respond ONLY in valid JSON.
"""
)

def plan_task(query: str):
    raw = model.invoke(planner_prompt.format(query=query))
    
    try:
        return json.loads(raw.content)
    except:
        return "kuchh to gadbad hai"
    
# query = "tell me the name of the president of india and also tell me top 5 facs about him"

# print(plan_task(query))

