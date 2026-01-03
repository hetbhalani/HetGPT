# RAG Document Flow Fix - Changes Explanation

This document outlines the changes made to the codebase to resolve the issue where uploaded documents were not being processed correctly by the RAG system, particularly when starting a chat from the home page.

## 1. Frontend Changes (`frontend/app/components/ChatInterface.tsx`)

The primary issue was that when a user attached a file on the Home screen and properly redirected to the Chat screen, the `File` object was being lost during the navigation. The URL query parameters only carried the text message (`?q=...`), but not the file data.

**Key Changes:**

*   **Pre-Redirect Upload:**
    *   Modified `handleSendMessage` to detect if the user is on a non-chat route (Home page).
    *   If a file is present, the file is now **uploaded immediately** to the backend `/upload` endpoint *before* navigating.
    *   The `sessionId` and resulting `file_path` are captured from the upload response.

*   **URL Parameter Handling:**
    *   Updated the navigation line to include `sessionId` and `filePath` in the URL:
        ```typescript
        router.push(`/chat?q=...&sessionId=...&filePath=...`)
        ```
    *   Updated the initialization `useEffect` to read these new parameters. It now restores the session context using the passed `sessionId` and triggers the message sending with the `filePath` that was already uploaded.

*   **Session Continuity:**
    *   Updated the `sessionId` state initialization to look for a `sessionId` in the URL search parameters first. This ensures that the session ID used during the pre-upload on the Home page matches the session ID initialized on the Chat page.

*   **`sendMessage` Update:**
    *   Updated the function signature to accept an optional `preUploadedPath`.
    *   Added logic to skip the upload step if a `preUploadedPath` is provided, preventing double uploads while ensuring the backend receives the correct file reference.

## 2. Backend Changes

Debug logging was added to trace the flow of data and confirm where failures were occurring.

### API Endpoint (`api/main.py`)
*   Added detailed `[DEBUG]` print statements to the `/upload` endpoint.
*   These logs help confirm:
    *   When an upload request is received.
    *   The size and name of the file.
    *   The success or failure of the `store_document` call.
    *   The state of the `after_docs` flag for the session.

### Session Vector DB (`RAG/session_vectordb.py`)
*   Added try/catch blocks and debug logs to the `add_documents` method.
*   These logs provide visibility into:
    *   Temporary file creation.
    *   PDF loading status (via `PyMuPDFLoader`).
    *   Document splitting (chunk generation).
    *   Vector database insertion/merging.

## Summary of Flow

**Before Fix:**
1. User attaches file on Home -> Click Send.
2. App redirects to `/chat?q=Hello`.
3. File object is lost.
4. Chat page loads, sends "Hello" to backend.
5. Backend sees no file, routes to standard Chat (CS) model.

**After Fix:**
1. User attaches file on Home -> Click Send.
2. App calls `/upload` -> Backend stores file, sets `after_docs=True`, returns `path`.
3. App redirects to `/chat?q=Hello&filePath=...&sessionId=...`.
4. Chat page loads, initializes with correct Session ID.
5. Chat page sends "Hello" + `path` to backend.
6. Backend sees `path` (and `after_docs` is already True), routes query to RAG system.
