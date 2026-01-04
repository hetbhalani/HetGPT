from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
from typing import Optional, List
import logging
import os
from pinecone import ServerlessSpec
import time

embeddings = HuggingFaceEndpointEmbeddings(
     model="sentence-transformers/all-MiniLM-L6-v2",
     task="feature-extraction",
     huggingfacehub_api_token=os.getenv("HF_TOKEN") 
)

# init pinecone
pc = Pinecone() 
INDEX_NAME = "hetgpt-index"
TARGET_DIMENSION = 384

# create index if not exists
try:
    should_create = False #flag
    if INDEX_NAME in pc.list_indexes().names():
        index_info = pc.describe_index(INDEX_NAME)
        if index_info.dimension != TARGET_DIMENSION:
            logging.info(f"Deleting index {INDEX_NAME} (dimension mismatch: {index_info.dimension} != {TARGET_DIMENSION})")
            pc.delete_index(INDEX_NAME)
            time.sleep(5) # wait for deletion
            should_create = True
    else:
        should_create = True

    if should_create:
        logging.info(f"Creating Pinecone index: {INDEX_NAME} (dim={TARGET_DIMENSION})")
        pc.create_index(
            name=INDEX_NAME,
            dimension=TARGET_DIMENSION, 
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )
        # Wait for index to be ready
        while not pc.describe_index(INDEX_NAME).status['ready']:
            time.sleep(1)
        logging.info("Pinecone index created successfully")
    except Exception as e:
        logging.error(f"Error checking/creating Pinecone index: {e}")

class SessionVectorDB:    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
                
    def add_documents(self, file_path: str, file_name: str) -> bool:
        try:
            logging.info(f"Processing document: {file_name}")
            
            # load PDF from path
            loader = PyMuPDFLoader(file_path)
            docs = loader.load()
            
            # split
            chunks = self.splitter.split_documents(docs)
            if not chunks:
                logging.warning("No chunks created from document")
                return False
                
            logging.info(f"Uploading {len(chunks)} chunks to Pinecone (namespace={self.session_id})")
            
            # Upload to Pinecone
            PineconeVectorStore.from_documents(
                documents=chunks,
                embedding=embeddings,
                index_name=INDEX_NAME,
                namespace=self.session_id
            )
            
            logging.info("Document uploaded successfully")
            return True
            
        except Exception as e:
            logging.error(f"Error adding documents for session {self.session_id}: {e}")
            return False

    def query(self, query: str, k: int = 4) -> Optional[List]:
        try:
            vectorstore = PineconeVectorStore(
                index_name=INDEX_NAME,
                embedding=embeddings,
                namespace=self.session_id
            )
            
            # similarity search
            results = vectorstore.similarity_search(query, k=k)
            return results
            
        except Exception as e:
            logging.error(f"Error querying Pinecone {self.session_id}: {e}")
            return None

# store document into pinecone
def store_document(session_id: str, file_path: str, file_name: str) -> bool:
    db = SessionVectorDB(session_id)
    return db.add_documents(file_path, file_name)

# query session documents
def query_session_docs(session_id: str, query: str) -> Optional[List]:
    db = SessionVectorDB(session_id)
    return db.query(query)

# clear namespace in pinecone
def clear_session_vectordb(session_id: str):
    try:
        index = pc.Index(INDEX_NAME)
        index.delete(delete_all=True, namespace=session_id)
        logging.info(f"Cleared pinecone namespace: {session_id}")
    except Exception as e:
        logging.error(f"Error clearing session {session_id}: {e}")
