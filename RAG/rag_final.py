from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings, HuggingFaceEndpoint, ChatHuggingFace
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
from langchain_community.vectorstores import FAISS
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
import streamlit as st
import os
from .vector_db import get_vector_db

load_dotenv()

history = [] 

# st.title("RAG Test")

# file = st.file_uploader("Enter a pdf")

llm = HuggingFaceEndpoint(
    repo_id='meta-llama/Llama-3.1-8B-Instruct',
    task='text-generation'
)

prompt = PromptTemplate(
    template="""
        You are a helpful assistant for a hybrid RAG + Chat system.

        You must decide:
        1. When to use RAG context.
        2. When to answer using general knowledge.

        RULES:
        - If the CONTEXT block is empty OR irrelevant to the QUESTION:
            - Ignore it and answer using your own knowledge.
        - If the CONTEXT contains relevant information:
            - Use it to answer accurately.
        - Chat history is for conversational flow ONLY, not factual accuracy.
        - Do NOT mention the context, rules, or your reasoning.
        - Do NOT say things like "context is empty" or "based on context".
        - Just answer naturally.
        - If unsure about a factual question, say "I don't know for sure.""

        ---CHAT HISTORY---
        {chat_history}
        ------------------

        ---CONTEXT---
        {context}
        ------------------

        ---QUESTION---
        {query}
    """,
    input_variables=['query', 'context', 'chat_history']
)


model = ChatHuggingFace(llm=llm)

parser = StrOutputParser()

# if not file:
#     st.stop()
pdf_path = os.path.join(os.path.dirname(__file__), 'Het_Bhalani_Resume.pdf')
with open(pdf_path, 'rb') as fp:
    file = fp.read()

db = get_vector_db(file)
retriver = db.as_retriever(search_type="similarity", search_kwargs={"k": 4})

def get_chat_history():
    last_messages = history[-8:] #context window of 4 pairs
    chat_history = ""
    for msg in last_messages:
        role = "Human" if isinstance(msg, HumanMessage) else "AI"
        chat_history += f"{role}: {msg.content}\n"
    return chat_history

def RAG_ans(query: str):
    chat_history = get_chat_history()
            
    docs = retriver.invoke(query)
    context = "\n\n".join([doc.page_content for doc in docs])
    
    chain = prompt | model | parser
        
    answer = chain.invoke({
        'query': query,
        'context': context,
        'chat_history': chat_history
    })
    
    history.append(HumanMessage(content=query))
    history.append(AIMessage(content=answer))
    
    return answer


# query = st.chat_input("ask something...")

# if query:
#     res = RAG_ans(query)
#     st.write(res)
    
# query = input("Human: ")
# res = RAG_ans(query)
# print("AI: ", res)