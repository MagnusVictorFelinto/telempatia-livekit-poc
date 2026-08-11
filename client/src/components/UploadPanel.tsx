import { ChangeEvent, useEffect, useState, useCallback } from "react";
import { listUploads, resolveDownloadUrl, uploadFile } from "../lib/api";
import type { UploadedFile } from "../lib/types";

interface Props {
  roomId: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPanel({ roomId }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listUploads(roomId);
      setFiles(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao listar arquivos");
    }
  }, [roomId]);

  useEffect(() => {
    refresh();
    // Faz polling simples a cada 5s para refletir uploads feitos pelo
    // outro participante (a PoC não usa Data Channel para isso).
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await uploadFile(roomId, file);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="upload-panel">
      <label className="btn-primary" style={{ display: "inline-block", textAlign: "center" }}>
        {uploading ? "Enviando..." : "Enviar arquivo"}
        <input type="file" onChange={handleFileChange} disabled={uploading} hidden />
      </label>

      {error && <p className="error-text">{error}</p>}

      <ul className="upload-list">
        {files.map((f) => (
          <li key={f.id}>
            <span>
              {f.originalName}
              <br />
              <small style={{ color: "var(--color-muted)" }}>{formatSize(f.size)}</small>
            </span>
            <a href={resolveDownloadUrl(f.downloadUrl)} target="_blank" rel="noreferrer" download>
              Baixar
            </a>
          </li>
        ))}
        {files.length === 0 && (
          <li style={{ color: "var(--color-muted)", border: "none" }}>
            Nenhum arquivo enviado nesta sala ainda.
          </li>
        )}
      </ul>
    </div>
  );
}
