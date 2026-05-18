PROJECT: Markdown Indexing Engine (Header-Based, Metadata-Aware)

GOAL:
Upload Markdown → Header-based Chunking → Embed each Chunk → Upload to Supabase


==============================
ARCHITECTURE OVERVIEW
==============================

Next.js
   ↓
POST Markdown File
   ↓
FastAPI (Python Service)
   ↓
LangChain Header-Based Chunking
   ↓
Iterate Chunks
   ↓
Call Internal Embedding API
   ↓
Upload to Supabase (existing functions)


==============================
PHASE 1 — FASTAPI SERVICE SETUP
==============================

Create service: /services/indexer

Main file: main.py

Single endpoint:

POST /index-markdown

Request Body:
{
    "document_id": "doc_123",
    "category": "sales",
    "markdown": "raw markdown string"
}

Response:
{
    "status": "success",
    "chunks_indexed": 24
}


==============================
PHASE 2 — MARKDOWN CHUNKING (LANGCHAIN)
==============================

Use:
MarkdownHeaderTextSplitter

Headers to split on:

[
    ("#", "h1"),
    ("##", "h2"),
    ("###", "h3"),
]

This ensures:
- Header hierarchy preserved
- Metadata automatically attached per chunk

Output per chunk must look like:

{
    "content": "...",
    "metadata": {
        "document_id": "...",
        "category": "...",
        "h1": "...",
        "h2": "...",
        "h3": "..."
    }
}

IMPORTANT:
Override metadata to inject:
- document_id
- category
- optional timestamp


==============================
PHASE 3 — CHUNK ITERATION
==============================

For each chunk:

1. Extract content
2. Call Embedding API
3. Receive vector
4. Send to Supabase insert function

Pseudo-flow:

for chunk in chunks:
    embedding = call_embedding_api(chunk.content)

    supabase_insert({
        document_id,
        content,
        metadata,
        embedding
    })


==============================
PHASE 4 — EMBEDDING API CONTRACT
==============================

Assume existing API:

POST /embed

Body:
{
    "text": "chunk content"
}

Response:
{
    "embedding": [0.123, 0.5123, ...]
}

FastAPI must:
- Await response
- Validate vector length
- Handle failures (retry optional)


==============================
PHASE 5 — SUPABASE INSERT CONTRACT
==============================

Assume existing Supabase function:

insert_document_vector(data)

Required payload format:

{
    "document_id": "...",
    "content": "...",
    "metadata": {...},
    "embedding": [...]
}

IMPORTANT:
metadata must be JSON serializable
embedding must match pgvector dimension


==============================
PHASE 6 — ERROR HANDLING
==============================

Must Handle:

- Empty Markdown
- No headers found
- Embedding API failure
- Supabase failure

If failure mid-iteration:
Return partial success:

{
    "status": "partial_success",
    "chunks_indexed": 18,
    "failed_chunks": 2
}


==============================
PHASE 7 — NEXT.JS SIDE
==============================

1. File Upload
2. Read file as text
3. Send markdown string to FastAPI
4. Display response count


==============================
NON-NEGOTIABLE DESIGN RULES
==============================

- Do NOT chunk by token count
- Do NOT embed entire document at once
- Each chunk must be independent
- Metadata must include document_id
- Category must be enforced (future chatbot filtering)

