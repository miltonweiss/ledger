# Markdown Indexer Service

FastAPI service for Markdown indexing:

1. Split Markdown by headers (`#`, `##`, `###`)
2. Embed each chunk through an embedding API
3. Insert chunk vectors into Supabase

## Run locally

```bash
cd services/indexer
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Required environment variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Optional environment variables

- `EMBEDDING_API_URL` (default: `http://127.0.0.1:3000/api/embed`)
- `EMBEDDING_VECTOR_SIZE` (if set, every embedding must match this length)
- `EMBEDDING_RETRIES` (default: `1`)
- `INDEXER_HTTP_TIMEOUT_SECONDS` (default: `30`)
- `SUPABASE_INSERT_RPC` (default: `insert_document_vector`)
- `SUPABASE_DOCUMENT_CHUNKS_TABLE` (default: `document_chunks`)
