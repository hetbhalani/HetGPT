# session_vectordb.py Code Explanation

This file implements the **Session-Based Vector Database** for the Long-Term Memory (LTM) RAG system. It is responsible for creating, managing, and querying isolated vector stores for each user session. This ensures that documents uploaded in one session are not accessible in others and are cleared when the session ends.

## Core Component: `SessionVectorDB` Class

This class encapsulates the state and operations for a single session's document storage.

### 1. Initialization (`__init__`)
```python
def __init__(self, session_id: str):
    self.session_id = session_id
    self.embeddings = HuggingFaceEmbeddings(model='sentence-transformers/all-MiniLM-L6-v2')
    self.vec_db: Optional[FAISS] = None
    self.splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    self._has_documents = False
```
- **`session_id`**: Identifies which session this DB belongs to.
- **`embeddings`**: Initializes the HuggingFace embedding model (`all-MiniLM-L6-v2`) used to convert text chunks into vector representations.
- **`vec_db`**: Holds the instance of the FAISS vector store. Initially `None`.
- **`splitter`**: Configured to split large documents into 500-character chunks with 50-character overlap to preserve context at boundaries.
- **`_has_documents`**: Simple flag to track if data has been added.

### 2. Adding Documents (`add_documents`)
This method handles the full pipeline of processing a raw file.
`def add_documents(self, file_bytes: bytes, file_name: str) -> bool:`

1.  **File Validation**: Logs debug info about the file receiving.
2.  **Temporary Storage**: Writes the incoming `file_bytes` to a temporary file on disk. This is because `PyMuPDFLoader` requires a file path, not bytes.
    ```python
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
    ```
3.  **Loading**: Uses `PyMuPDFLoader` to parse PDF files into text documents.
4.  **Splitting**: Breaks the loaded documents into chunks using `self.splitter`.
5.  **Vectorization & Storage**:
    - If `self.vec_db` is empty, creates a new FAISS index from the chunks.
    - If `self.vec_db` exists, creates a *new* index from the new chunks and **merges** it into the existing one (`self.vec_db.merge_from(new_db)`). This allows multiple files to be uploaded in one session.
6.  **Cleanup**: Deletes the temporary file.

### 3. Querying (`query`)
Retrieves relevant context for a user's question.
`def query(self, query: str, k: int = 4, score_threshold: float = 1.5) -> Optional[List]:`

1.  **Pre-check**: Returns `None` if no docs exist.
2.  **Similarity Search**: Calls `self.vec_db.similarity_search_with_score(query, k=k)`.
    - This finds the `k` (default 4) closest chunks to the query vector.
    - Returns chunks AND a distance score (Lower score = Better match for FAISS L2 distance).
3.  **Filtering**:
    ```python
    relevant_docs = [doc for doc, score in results_with_scores if score < score_threshold]
    ```
    - Filters out results that are too "far" (dissimilar) from the query. The threshold `1.5` is relatively loose to ensure we get context even for vague queries.
4.  **Result**: Returns the list of relevant document chunks or `None` if nothing passed the threshold.

## Helper Functions (Global Interface)

These functions manage the global state of all active sessions.

- **`session_vectordb_cache`**: A dictionary mapping `session_id` strings to `SessionVectorDB` instances. This acts as the in-memory store for all active sessions.

- **`get_session_vectordb(session_id)`**:
    - Lazy-loading factory. If a session doesn't exist in the cache, it creates a new `SessionVectorDB` and stores it.

- **`store_document(session_id, ...)`**:
    - Wrapper that gets the DB for the session and calls `add_documents`.

- **`query_session_docs(session_id, ...)`**:
    - Wrapper that gets the DB and calls `query`. Returns `None` if the session doesn't exist.

- **`clear_session_vectordb(session_id)`**:
    - Critical for memory management. Removes the session from the cache when the user ends the chat or the session expires, freeing up the memory used by the FAISS index.
