'use client';

import { useState } from 'react';
import { splitText } from '@/lib/langchain/textSplit';
import { createDocuments } from '@/lib/supabase/documents';
import { createDocumentsChunks } from '@/lib/supabase/doc_chunks';
import CHUNKING_PRESETS from '../../../../typeMedia';

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

      // 3️⃣ Split
      setStatus("Splitting text...");

      const chunks = await splitText(savedDoc.id, typeMedia);

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

      // 5️⃣ Save Chunks
      setStatus("Saving chunks...");

      for (let i = 0; i < embeddings.length; i++) {

        await createDocumentsChunks({
          name: savedDoc.id,
          content: chunks[i].pageContent,
          embedding: embeddings[i],
          number: i,
          document_id: savedDoc.id
        });

      }

      setStatus("✅ Done. Document fully processed.");

    } catch (err: any) {
      console.error(err);
      setStatus("❌ Error: " + err.message);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-base-200 p-10">
      <div className="max-w-2xl mx-auto bg-base-100 shadow-xl rounded-xl p-8 space-y-6">

        <h1 className="text-2xl font-bold">Document Pipeline</h1>

        <input
          type="file"
          className="file-input file-input-bordered w-full"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <select
          className="select select-bordered w-full"
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
          className="btn btn-primary w-full"
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
  );
}
