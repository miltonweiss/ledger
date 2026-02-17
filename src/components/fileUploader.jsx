'use client';

export default function FileUploader(props) {
  async function handleFileChange(e) {
    const nextFile = e.target.files?.[0];
    if (!nextFile) return;

    props.setFunc(nextFile);
    props.setFileContent("");
    props.setUploadError("");
    props.setIsExtracting(true);

    const fileName = (nextFile.name || "").toLowerCase();
    const fileType = (nextFile.type || "").toLowerCase();
    const isTxt = fileName.endsWith(".txt") || fileType === "text/plain";
    const isPdf = fileName.endsWith(".pdf") || fileType === "application/pdf";

    if (!isTxt && !isPdf) {
      props.setUploadError("Unsupported file type. Please upload a .txt or .pdf file.");
      props.setIsExtracting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", nextFile);

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Failed to extract file (${response.status})`);
      }

      props.setFileContent(payload.text || "");
    } catch (error) {
      console.error("Error extracting file:", error);
      props.setUploadError(error.message || "Failed to extract file content.");
      props.setFileContent("");
    } finally {
      props.setIsExtracting(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm text-secondary">Upload TXT or PDF</span>
        <input
          type="file"
          onChange={handleFileChange}
          accept=".txt,.pdf,text/plain,application/pdf"
          className="file-input file-input-bordered w-full foreground text-primary borderDefault"
        />
      </label>

      <div className="rounded-xl borderDefault p-4 foreforeground">
        <p className="text-sm text-secondary">File name: {props.getVar?.name || "-"}</p>
        <p className="text-sm text-secondary">File type: {props.getVar?.type || "-"}</p>
      </div>

      {props.isExtracting && (
        <div className="rounded-xl borderDefault p-3 foreforeground text-sm text-secondary">
          Extracting text...
        </div>
      )}

      {props.uploadError && (
        <div className="rounded-xl borderDefault p-3 text-sm" style={{ color: "var(--red-accent)" }}>
          {props.uploadError}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm text-secondary">File content preview</p>
        <pre
          className="rounded-xl borderDefault p-4 text-sm text-primary foreforeground"
          style={{
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            maxHeight: "320px",
            overflow: "auto",
          }}
        >
          {props.fileContent || "No file selected"}
        </pre>
      </div>
    </div>
  );
}
