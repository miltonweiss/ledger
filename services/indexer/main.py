from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))
from langchain_text_splitters import MarkdownHeaderTextSplitter
from pydantic import BaseModel, Field

app = FastAPI(title="Markdown Indexer Service", version="1.0.0")
logger = logging.getLogger("indexer")

HEADER_SPLIT_RULES = [
    ("#", "h1"),
    ("##", "h2"),
    ("###", "h3"),
]
HEADER_PATTERN = re.compile(r"(?m)^\s{0,3}#{1,3}\s+\S+")


class IndexMarkdownRequest(BaseModel):
    document_id: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    markdown: str = Field(..., min_length=1)


class IndexMarkdownResponse(BaseModel):
    status: Literal["success", "partial_success"]
    chunks_indexed: int
    failed_chunks: Optional[int] = None


def _error_message(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text.strip() or "Unknown error"

    if isinstance(payload, dict):
        for key in ("error", "detail", "message"):
            value = payload.get(key)
            if value:
                return str(value)
    return str(payload)


def _safe_json(response: httpx.Response) -> Dict[str, Any]:
    try:
        payload = response.json()
    except ValueError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _has_supported_headers(markdown: str) -> bool:
    return bool(HEADER_PATTERN.search(markdown))


def _chunk_markdown(payload: IndexMarkdownRequest) -> List[Dict[str, Any]]:
    splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=HEADER_SPLIT_RULES,
        strip_headers=False,
    )
    docs = splitter.split_text(payload.markdown)
    indexed_at = _utc_iso_now()
    chunks: List[Dict[str, Any]] = []

    for doc in docs:
        content = (doc.page_content or "").strip()
        if not content:
            continue

        source_metadata = doc.metadata if isinstance(doc.metadata, dict) else {}
        metadata: Dict[str, Any] = {
            "document_id": payload.document_id,
            "category": payload.category,
            "indexed_at": indexed_at,
        }
        for key in ("h1", "h2", "h3"):
            value = source_metadata.get(key)
            if value is None:
                continue
            text_value = str(value).strip()
            if text_value:
                metadata[key] = text_value

        # Validate metadata is JSON serializable before insert.
        json.dumps(metadata)
        chunks.append({"content": content, "metadata": metadata})

    return chunks


class EmbeddingClient:
    def __init__(self, http_client: httpx.AsyncClient, embedding_url: str, retries: int = 1):
        self.http_client = http_client
        self.embedding_url = embedding_url
        self.retries = max(0, retries)

    async def embed_text(self, text: str) -> List[float]:
        max_attempts = self.retries + 1

        for attempt in range(1, max_attempts + 1):
            try:
                response = await self.http_client.post(
                    self.embedding_url,
                    json={"text": text},
                )
                if response.status_code >= 400:
                    raise RuntimeError(
                        f"Embedding API returned {response.status_code}: {_error_message(response)}"
                    )

                payload = _safe_json(response)
                vector = payload.get("embedding")

                # Backward compatibility with a batch endpoint shape.
                if vector is None:
                    embeddings = payload.get("embeddings")
                    if isinstance(embeddings, list) and embeddings:
                        vector = embeddings[0]

                if not isinstance(vector, list) or not vector:
                    raise RuntimeError("Embedding API returned an empty or invalid vector.")

                return [float(item) for item in vector]
            except Exception as exc:  # noqa: BLE001
                if attempt >= max_attempts:
                    raise RuntimeError(f"Failed to embed chunk after {attempt} attempts: {exc}") from exc

        return []


class SupabaseInsertClient:
    def __init__(
        self,
        http_client: httpx.AsyncClient,
        supabase_url: str,
        supabase_key: str,
        table_name: str,
    ):
        base_url = supabase_url.rstrip("/")
        self.http_client = http_client
        self.table_url = f"{base_url}/rest/v1/{table_name}"
        self.base_headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
        }

    async def insert_document_vector(self, payload: Dict[str, Any], chunk_number: int) -> None:
        row = self._build_row(payload, chunk_number)
        headers = {**self.base_headers, "Prefer": "return=minimal"}
        response = await self.http_client.post(self.table_url, json=row, headers=headers)
        if response.is_success:
            return

        raise RuntimeError(
            f"Supabase insert failed: {response.status_code} {_error_message(response)}"
        )

    def _build_row(self, payload: Dict[str, Any], chunk_number: int) -> Dict[str, Any]:
        metadata = payload.get("metadata")
        metadata = metadata if isinstance(metadata, dict) else {}
        primary_title = metadata.get("h1") or payload.get("document_id") or "markdown"

        return {
            "name": primary_title,
            "content": payload.get("content"),
            "embedding": payload.get("embedding"),
            "chunks_number": chunk_number,
        }


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/index-markdown", response_model=IndexMarkdownResponse)
async def index_markdown(payload: IndexMarkdownRequest) -> Dict[str, Any]:
    document_id = payload.document_id.strip()
    category = payload.category.strip()
    markdown = payload.markdown

    if not document_id:
        raise HTTPException(status_code=400, detail="document_id is required.")
    if not category:
        raise HTTPException(status_code=400, detail="category is required.")
    if not markdown or not markdown.strip():
        raise HTTPException(status_code=400, detail="Empty markdown is not allowed.")
    if not _has_supported_headers(markdown):
        raise HTTPException(
            status_code=422,
            detail="No headers found. Add at least one #, ##, or ### heading.",
        )

    normalized_payload = IndexMarkdownRequest(
        document_id=document_id,
        category=category,
        markdown=markdown,
    )
    chunks = _chunk_markdown(normalized_payload)
    if not chunks:
        raise HTTPException(status_code=422, detail="No chunks produced from markdown.")

    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=500,
            detail="Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        )

    embedding_url = os.getenv("EMBEDDING_API_URL", "http://127.0.0.1:3000/api/embed")
    table_name = os.getenv("SUPABASE_DOCUMENT_CHUNKS_TABLE", "document_chunks")
    retries = int(os.getenv("EMBEDDING_RETRIES", "1"))
    timeout_seconds = float(os.getenv("INDEXER_HTTP_TIMEOUT_SECONDS", "30"))
    configured_dim = int(os.getenv("EMBEDDING_VECTOR_SIZE", "0"))
    expected_dim: Optional[int] = configured_dim if configured_dim > 0 else None

    chunks_indexed = 0
    failed_chunks = 0
    last_error: Optional[str] = None

    async with httpx.AsyncClient(timeout=timeout_seconds) as http_client:
        embedding_client = EmbeddingClient(http_client, embedding_url=embedding_url, retries=retries)
        supabase_client = SupabaseInsertClient(
            http_client=http_client,
            supabase_url=supabase_url,
            supabase_key=supabase_key,
            table_name=table_name,
        )

        for index, chunk in enumerate(chunks):
            try:
                embedding = await embedding_client.embed_text(chunk["content"])

                if expected_dim is None:
                    expected_dim = len(embedding)
                if len(embedding) != expected_dim:
                    raise RuntimeError(
                        f"Embedding dimension mismatch for chunk {index}. "
                        f"Expected {expected_dim}, got {len(embedding)}."
                    )

                insert_payload = {
                    "document_id": document_id,
                    "content": chunk["content"],
                    "metadata": chunk["metadata"],
                    "embedding": embedding,
                }
                await supabase_client.insert_document_vector(insert_payload, chunk_number=index)
                chunks_indexed += 1
            except Exception as exc:  # noqa: BLE001
                failed_chunks += 1
                last_error = str(exc)
                logger.exception(
                    "Failed indexing chunk %s for document %s",
                    index,
                    document_id,
                )

    if chunks_indexed == len(chunks):
        return {"status": "success", "chunks_indexed": chunks_indexed}

    if chunks_indexed == 0:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Failed to index markdown.",
                "failed_chunks": failed_chunks,
                "last_error": last_error,
            },
        )

    return {
        "status": "partial_success",
        "chunks_indexed": chunks_indexed,
        "failed_chunks": failed_chunks,
    }
