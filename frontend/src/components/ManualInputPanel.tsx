import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useMemo,
  useRef,
  useState
} from "react";

import type { ParseError } from "../types";

interface ManualInputPanelProps {
  disabled?: boolean;
  onParse: (payload: { content: string; format: "yaml" | "json" }) => Promise<void> | void;
  onFilesSelected: (files: File[]) => Promise<void> | void;
  onReset: () => void;
  errors: ParseError[];
  fileCount: number;
  textEntryCount: number;
}

export default function ManualInputPanel({
  disabled,
  onParse,
  onFilesSelected,
  onReset,
  errors,
  fileCount,
  textEntryCount
}: ManualInputPanelProps) {
  const [content, setContent] = useState("");
  const [format, setFormat] = useState<"yaml" | "json">("yaml");
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const placeholder = useMemo(
    () =>
      format === "yaml"
        ? `例如：
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample
spec:
  template:
    spec:
      containers:
        - name: app
          image: example.com/project/service:1.0.0`
        : `例如：
[
  {
    "apiVersion": "v1",
    "kind": "Pod",
    "metadata": { "name": "demo" },
    "spec": {
      "containers": [
        { "name": "main", "image": "nginx:1.25" }
      ]
    }
  }
]`,
    [format]
  );

  const handleFileSelection = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || !fileList.length) return;
      const files = Array.from(fileList).filter((file) => isSupported(file.name));
      if (!files.length) return;
      await onFilesSelected(files);
    },
    [onFilesSelected]
  );

  const handleFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      await handleFileSelection(event.target.files);
      event.target.value = "";
    },
    [handleFileSelection]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (disabled) return;

      const trimmed = content.trim();
      if (!trimmed) {
        setLocalError("请输入需要解析的 YAML / JSON 内容。");
        return;
      }

      setLocalError(null);
      await onParse({ content: trimmed, format });
    },
    [content, disabled, format, onParse]
  );

  const handleOpenFile = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleDragEnter = useCallback((event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setDragActive(true);
  }, [disabled]);

  const handleDragOver = useCallback((event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setDragActive(true);
  }, [disabled]);

  const handleDragLeave = useCallback((event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) return;
      setDragActive(false);
      await handleFileSelection(event.dataTransfer.files);
    },
    [disabled, handleFileSelection]
  );

  const handleClear = useCallback(() => {
    setContent("");
    setLocalError(null);
    onReset();
  }, [onReset]);

  return (
    <form
      onSubmit={handleSubmit}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`manual-panel${dragActive ? " manual-panel--drag" : ""}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml,.json"
        multiple
        hidden
        onChange={handleFileInputChange}
      />

      <header className="manual-panel__header">
        <div>
          <h2 className="panel-title">资源内容</h2>
          <p className="panel-subtitle">粘贴或拖拽 K8s YAML / JSON 到输入框即可解析，支持多文档 `---` 分隔。</p>
        </div>
        <div className="panel-actions">
          <label className="panel-select">
            <span>格式</span>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as "yaml" | "json")}
              disabled={disabled}
            >
              <option value="yaml">YAML</option>
              <option value="json">JSON</option>
            </select>
          </label>
          <button type="button" className="ghost-button" onClick={handleOpenFile} disabled={disabled}>
            打开文件
          </button>
          <button type="button" className="ghost-button" onClick={handleClear} disabled={disabled}>
            清空
          </button>
        </div>
      </header>

      <section className="manual-panel__body">
        <div className="manual-panel__meta">源数据：文件 {fileCount} · 文本 {textEntryCount}</div>

        <div className="manual-panel__textarea-wrapper">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={placeholder}
            rows={16}
            disabled={disabled}
            className="manual-panel__textarea"
          />
        </div>

        {localError && <div className="error-box" style={{ marginTop: "0.75rem" }}>{localError}</div>}

        {errors.length > 0 && (
          <div className="error-box" style={{ marginTop: "0.75rem" }}>
            <strong>有 {errors.length} 个条目解析失败：</strong>
            <ul className="error-list">
              {errors.map((error) => (
                <li key={`${error.file}-${error.message}`}>{error.file}: {error.message}</li>
              ))}
            </ul>
          </div>
        )}

        <footer className="manual-panel__footer">
          <span className="muted">数据仅在本地浏览器解析，不会上传服务器。</span>
          <button className="primary-button" type="submit" disabled={disabled}>
            解析文本
          </button>
        </footer>
      </section>
    </form>
  );
}

function isSupported(name: string) {
  return [".yaml", ".yml", ".json"].some((ext) => name.toLowerCase().endsWith(ext));
}
