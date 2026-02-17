import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const name = (file.name || "").toLowerCase();
    const type = (file.type || "").toLowerCase();
    const isPdf = name.endsWith(".pdf") || type === "application/pdf";
    const isTxt = name.endsWith(".txt") || type === "text/plain";

    if (!isPdf && !isTxt) {
      return NextResponse.json(
        { error: "Unsupported file type. Only TXT and PDF allowed." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let text = "";

    if (isTxt) {
      text = buffer.toString("utf-8");
    }

    if (isPdf) {
      try {
        const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
        const result = await pdfParse(buffer);
        text = result.text || "";
      } catch (err: any) {
        console.error("PDF parse error:", err);
        return NextResponse.json(
          { error: err?.message || "Failed to extract text from PDF" },
          { status: 422 }
        );
      }
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "File contains no readable text" }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Extract error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to extract file content" },
      { status: 500 }
    );
  }
}
