from langchain_core.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_ollama import ChatOllama
from langchain.messages import SystemMessage, HumanMessage, AIMessage
from dotenv import load_dotenv
import logging
import json
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from Tools.tool_routing import tool_call

from LLM.cs_model import cs_model_call
from LLM.general_model import general_model_call
from RAG.long_term_RAG import LtmRag
from RAG.session_vectordb import store_document, query_session_docs, clear_session_vectordb
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
            You are a Query Router for a multi-model AI system.
            Your job is to classify the user query into EXACTLY ONE route.

            ### OUTPUT REQUIREMENTS:
            - Output MUST be a valid JSON array containing EXACTLY ONE object.
            - The object MUST contain keys: "task" and "route".
            - "task" should be the original query or a refined version of it.
            
            ### ROUTE DEFINITIONS:
            - "CS" → programming, code, debugging, algorithm design, or Computer Science conceptual explanations.
            - "TOOLS" → real-world lookup, facts, information about something, search, factual information, news, weather, prices, names, current data, or calculations based on real-world values.
            - "GENERAL" → Greetings, small talk, general knowledge that doesn't need external tools, or when the query is unclear/ambiguous.
            - If unsure, choose "GENERAL".

            ### JSON EXAMPLE:
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

# init session
sessions: Dict[str, List[Dict[str, List]]] = {}


# get session by id
def get_session(session_id: str):
    if session_id not in sessions:
        sessions[session_id] = {'after_docs': False}
        sessions[session_id]['messages'] = [
            SystemMessage(content="You are a helpful assistant. Answer questions shortly.")
        ]
    return sessions[session_id]

# keep only last 10 messages in the history
def trim_memory(msg: List):
    system = msg[:1]
    rest = msg[-10:] # last 5 pairs
    return system + rest

# get the instruction (where to route the query)
def plan_task(query: str):
    raw = model.invoke(planner_prompt.format(query=query))
    logging.debug(f"Planner raw output: {raw}")
    try:
        content = raw.content.strip()
        return json.loads(content)
    
    except Exception as e:
        logging.error(f"Planner error: {e}")
        return []

# long term store
ltm_cache: Dict[str, LtmRag] = {}

# clear the ltm for the current session id (after session ends)
def clear_ltm_cache(session_id: str):
    if session_id in ltm_cache:
        del ltm_cache[session_id]
    #also clear session vector db
    clear_session_vectordb(session_id)

# Initialize LTM for a session explicitly
def init_ltm(session_id: str, ltm: str):
    if session_id not in ltm_cache:
        logging.info(f"Initializing LTM Rag for session: {session_id}")
        ltm_cache[session_id] = LtmRag(ltm)

# route the query to corresponding LLM
def route(query: str, session_id: str, ltm: str = None):
    global sessions
    res = ""
    
    # get the chat history
    messages = (get_session(session_id))['messages']
    
    ltm_facts = ""
    if ltm:
        try:
            init_ltm(session_id, ltm)
            
            # Init the LTM RAG db
            rag = ltm_cache[session_id]
            ltm_results = rag.LTM_RAG(query) # retrive relevent records from LTM
            if ltm_results:
                ltm_facts = "\n".join([doc.page_content for doc in ltm_results])
        except Exception as e:
            logging.error(f"LTM RAG error: {e}")

    current_query = query
    if ltm_facts:
        current_query = f"Relevant facts from long-term memory:\n{ltm_facts}\n\nUser query: {query}"

    messages.append(HumanMessage(content=current_query))
    messages = trim_memory(messages)
    sessions[session_id]['messages'] = messages
    
    session = get_session(session_id)
    
    if session.get('after_docs', False): #default to False

        docs = query_session_docs(session_id, query)
        if docs:
            logging.info(f"found {len(docs)} docs")

            context = "\n\n".join([doc.page_content for doc in docs])
            rag_query = f"Use the following document context to answer the question. If the context doesn't contain relevant information, response with EXACTLY 'NO_CONTEXT'.\n\nContext:\n{context}\n\nQuestion: {query}"
            
            rag_messages = list(messages)
            if rag_messages and isinstance(rag_messages[-1], HumanMessage):
                rag_messages[-1] = HumanMessage(content=rag_query)
            else:
                rag_messages.append(HumanMessage(content=rag_query))
                
            rag_response = general_model_call(rag_query, rag_messages)
            
            if rag_response and "NO_CONTEXT" not in rag_response:
                messages.append(AIMessage(content=rag_response))
                sessions[session_id]['messages'] = trim_memory(messages)
                return rag_response
            
            logging.info("RAG found documents but they were not relevant (NO_CONTEXT returned). Falling back to planner.")

        # if no similar documents then normal routing
        logging.info("No similar documents found")

    data = plan_task(query)
    
    # fallback for Planner
    if not data:
        logging.warning("Plan is empty, defaulting to GENERAL")
        data = [{"task": current_query, "route": "GENERAL"}]
        
    logging.info(f"Routed tasks: {data}")
    
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
            logging.warning("Unknown route, defaulting to GENERAL")
            out = general_model_call(task, messages)
        
        if out is None or out == "":
            out = "I'm sorry, I couldn't answer that question."
        
        res += str(out) + '\n\n'
    
    messages.append(AIMessage(content=res))
    sessions[session_id]['messages'] = trim_memory(messages)
    
    return res