import { MarkdownTextSplitter } from "@langchain/textsplitters";

export async function markdown_chunk(
  markdown_text: string,
  chunk_size = 500,
  chunk_overlap = 100
) {
  const splitter = new MarkdownTextSplitter({
    chunkSize: chunk_size,
    chunkOverlap: chunk_overlap,
  });

  return await splitter.createDocuments([markdown_text]);
}