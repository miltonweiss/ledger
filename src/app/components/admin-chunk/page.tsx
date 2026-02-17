'use client';

import { useState } from 'react';
import { splitText } from '@/lib/langchain/textSplit';
import { createDocuments } from '@/lib/supabase/documents';
import { createDocumentsChunks } from '@/lib/supabase/doc_chunks';
import CHUNKING_PRESETS from '../../../../typeMedia';
import Header from '@/components/header';

export default function DocumentPipeline() {

  const [file, setFile] = useState<File | null>(null);
  const [typeMedia, setTypeMedia] = useState(Object.keys(CHUNKING_PRESETS)[0]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleProcess() {

    if (!file) return alert("Upload a file first");

    setLoading(true);
    setStatus("Extracting text...");

    try {

      // 1️⃣ Upload & Extract
      const formData = new FormData();
      formData.append("file", file);

      const extractRes = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const extractBody = await extractRes.json().catch(() => ({}));
      if (!extractRes.ok) {
        throw new Error(extractBody.error || `Extract failed: ${extractRes.status}`);
      }
      const { text } = extractBody;

      // 2️⃣ Save Document
      setStatus("Saving document...");

      const savedDoc = await createDocuments({
        name: file.name,
        fileContent: text
      });
      if (!savedDoc?.id) {
        throw new Error("Document save failed (no document id returned). Check Supabase insert/RLS policy.");
      }

      // 3️⃣ Split
      setStatus("Splitting text...");

      const chunks = await splitText(savedDoc.id, typeMedia);
      if (!Array.isArray(chunks) || chunks.length === 0) {
        throw new Error("Split produced no chunks.");
      }

      // 4️⃣ Embed
      setStatus("Generating embeddings...");

      const embedRes = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: chunks })
      });

      const embedBody = await embedRes.json().catch(() => ({}));
      if (!embedRes.ok) {
        throw new Error(embedBody.error || `Embed failed: ${embedRes.status}`);
      }
      const { embeddings } = embedBody;
      if (!Array.isArray(embeddings) || embeddings.length !== chunks.length) {
        throw new Error(
          `Embedding mismatch: expected ${chunks.length} embeddings, got ${Array.isArray(embeddings) ? embeddings.length : 0}.`
        );
      }

      // 5️⃣ Save Chunks
      setStatus("Saving chunks...");

      for (let i = 0; i < embeddings.length; i++) {
        const savedChunk = await createDocumentsChunks({
          name: file.name,
          content: chunks[i].pageContent,
          embedding: embeddings[i],
          number: i,
          document_id: savedDoc.id
        });

        if (!savedChunk?.id) {
          throw new Error(`Failed to save chunk ${i + 1}/${embeddings.length}. Check Supabase table schema or RLS policies.`);
        }
        setStatus(`Saving chunks... ${i + 1}/${embeddings.length}`);
      }

      setStatus("✅ Done. Document fully processed.");

    } catch (err: any) {
      console.error(err);
      setStatus("❌ Error: " + err.message);
    }

    setLoading(false);
  }

  return (
    <>
    <Header
            demph={"Upload your "}
            emph={"Documents"}
      />
    <div className="h-[95vh] w-[90vw] foreground borderDefault p-10">
      
      <div className=" mx-auto   p-8 space-y-6">

        

        <input
          type="file"
          className="file-input file-input-bordered foreforeground borderDefault w-full"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <select
          className="select foreforeground borderDefault select-bordered w-full"
          value={typeMedia}
          onChange={(e) => setTypeMedia(e.target.value)}
        >
          {Object.keys(CHUNKING_PRESETS).map((preset) => (
            <option key={preset}>{preset}</option>
          ))}
        </select>

        <button
          onClick={handleProcess}
          disabled={loading}
          className="btn foreforeground borderDefault w-full"
        >
          {loading ? "Processing..." : "Process Document"}
        </button>

        {status && (
          <div className="alert mt-4">
            {status}
          </div>
        )}

      </div>
    </div>
    </>
  );
}
