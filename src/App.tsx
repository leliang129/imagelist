import { useCallback, useState } from "react";

import Logo from "./components/Logo";

import ManualInputPanel from "./components/ManualInputPanel";
import ImageTable from "./components/ImageTable";
import { parseFiles, parseTextContent } from "./services/parser";
import type { ImageReference, ParseError } from "./types";

export default function App() {
  const [isParsing, setParsing] = useState(false);
  const [references, setReferences] = useState<ImageReference[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [filesCount, setFilesCount] = useState(0);
  const [textEntryCount, setTextEntryCount] = useState(0);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setParsing(true);

    const result = await parseFiles(files);
    setReferences(result.references);
    setErrors(result.errors);
    setFilesCount(result.fileCount);
    setTextEntryCount(result.textEntryCount);

    setParsing(false);
  }, []);

  const handleTextParse = useCallback(async (payload: { content: string; format: "yaml" | "json" }) => {
    if (!payload.content.trim()) return;

    setParsing(true);
    const result = await parseTextContent(payload.content, payload.format);
    setReferences(result.references);
    setErrors(result.errors);
    setFilesCount(result.fileCount);
    setTextEntryCount(result.textEntryCount);
    setParsing(false);
  }, []);

  const handleReset = useCallback(() => {
    setReferences([]);
    setErrors([]);
    setFilesCount(0);
    setTextEntryCount(0);
  }, []);

  return (
    <div className="app-shell">
      <header>
        <Logo />
        <h1 className="heading-primary">K8s 镜像列举器 · Web 版</h1>
        <p className="subtitle">
          将 Kubernetes YAML / JSON 拖拽进来，或直接粘贴文本，即刻解析容器镜像列表，帮助你秒级掌握部署镜像。
        </p>
      </header>

      <div className="workspace-grid">
        <section className="workspace-panel">
          <ManualInputPanel
            disabled={isParsing}
            onParse={handleTextParse}
            onFilesSelected={handleFiles}
            onReset={handleReset}
            errors={errors}
            fileCount={filesCount}
            textEntryCount={textEntryCount}
          />
        </section>

        <section className="workspace-panel workspace-panel--result">
          <ImageTable references={references} />
        </section>
      </div>
    </div>
  );
}
