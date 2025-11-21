from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import streamlit as st

@st.cache_resource
def get_vector_db(file_bytes):
    with open("temp.pdf", "wb") as f:
        f.write(file_bytes)

    loader = PyMuPDFLoader("temp.pdf")
    docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(docs)

    embeddings = HuggingFaceEmbeddings(model='all-MiniLM-L6-v2')
    return FAISS.from_documents(chunks, embeddings)