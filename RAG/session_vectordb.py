from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from typing import Optional, List
import logging
import os
import tempfile

class SessionVectorDB:    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.embeddings = HuggingFaceEmbeddings(model='sentence-transformers/all-MiniLM-L6-v2')
        self.vec_db: Optional[FAISS] = None
        self.splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        self._has_documents = False
    
    # parse and store document content in the vector db
    def add_documents(self, file_bytes: bytes, file_name: str) -> bool:
        try:
            logging.info(f"Adding document: {file_name}, size: {len(file_bytes)} bytes")
            # save to temp file for PDF Loader
            suffix = os.path.splitext(file_name)[1] or '.pdf'
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            
            # load and split document
            try:
                loader = PyMuPDFLoader(tmp_path)
                docs = loader.load()
                logging.info(f"Loaded {len(docs)} pages")
            except Exception as e:
                logging.error(f"Failed to load PDF: {e}")
                os.unlink(tmp_path)
                return False

            chunks = self.splitter.split_documents(docs)
            logging.info(f"Created {len(chunks)} chunks")
            
            # clean up temp file
            os.unlink(tmp_path)
            
            if not chunks:
                logging.warning("No chunks created because docs were empty or split failed")
                return False
            
            # add to vector DB (create new or merge with existing)
            if self.vec_db is None:
                self.vec_db = FAISS.from_documents(chunks, self.embeddings)
            else:
                new_db = FAISS.from_documents(chunks, self.embeddings)
                self.vec_db.merge_from(new_db)
            
            self._has_documents = True
            logging.info("Document added successfully")
            return True
            
        except Exception as e:
            logging.error(f"Error adding documents for session {self.session_id}: {e}")
            logging.exception("Exception adding docs")
            return False

    # return similer documents (if there are any)
    def query(self, query: str, k: int = 6, score_threshold: float = 2.2) -> Optional[List]:
        if not self.vec_db or not self._has_documents:
            logging.info(f"Session {self.session_id}: No vector DB or no documents")
            return None
        
        try:
            # Use similarity_search_with_score to filter by relevance
            results_with_scores = self.vec_db.similarity_search_with_score(query, k=k)
            
            logging.debug(f"Session {self.session_id} Query: {query}")
            logging.debug(f"Results with scores: {[(doc.page_content[:30], score) for doc, score in results_with_scores]}")
            
            relevant_docs = [doc for doc, score in results_with_scores if score < score_threshold]
            
            logging.info(f"Relevant docs after filtering (threshold={score_threshold}): {len(relevant_docs)}")
                        
            if relevant_docs:
                return relevant_docs
            return None
            
        except Exception as e:
            logging.error(f"Error querying vector DB {self.session_id}: {e}")
            return None
    

    # check if there are any documents
    def has_documents(self) -> bool:
        return self._has_documents


# global cache for session vector db
session_vectordb_cache: dict = {}

# get session vector db
def get_session_vectordb(session_id: str) -> SessionVectorDB:
    if session_id not in session_vectordb_cache:
        session_vectordb_cache[session_id] = SessionVectorDB(session_id)
    return session_vectordb_cache[session_id]

# store document in vector db
def store_document(session_id: str, file_bytes: bytes, file_name: str) -> bool:
    db = get_session_vectordb(session_id)
    return db.add_documents(file_bytes, file_name)

# query vector db
def query_session_docs(session_id: str, query: str) -> Optional[List]:
    if session_id not in session_vectordb_cache:
        return None
    return session_vectordb_cache[session_id].query(query)

# clear vector db
def clear_session_vectordb(session_id: str):
    if session_id in session_vectordb_cache:
        del session_vectordb_cache[session_id]
