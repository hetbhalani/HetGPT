from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from langchain_community.vectorstores import FAISS
import os

class LtmRag:
    def __init__(self, ltm: str):
        self.ltm = ltm.strip() if ltm else ""
        self.embeddings = HuggingFaceEndpointEmbeddings(
             model="sentence-transformers/all-MiniLM-L6-v2",
             task="feature-extraction",
             huggingfacehub_api_token=os.getenv("HF_TOKEN") 
        )
        self.vec_db = None
        
        if self.ltm:
            facts = [line.strip() for line in self.ltm.split("\n") if line.strip()]
            if facts:
                self.vec_db = FAISS.from_texts(facts, self.embeddings)
        
    def LTM_RAG(self, query : str):
        if not self.vec_db:
            return []
        retriever = self.vec_db.as_retriever(search_type="similarity", search_kwargs={"k": 2}) 
        res = retriever.invoke(query)
        return res