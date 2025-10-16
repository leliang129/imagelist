import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ImageReference } from "../types";
import { copyText } from "../services/clipboard";

const columns = [
  { key: "image", title: "镜像" },
  { key: "resource", title: "资源" },
  { key: "namespace", title: "命名空间" },
  { key: "type", title: "类型" },
  { key: "source", title: "来源文件" }
];

interface ImageTableProps {
  references: ImageReference[];
}

export default function ImageTable({ references }: ImageTableProps) {
  const [query, setQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return references;
    const keyword = query.toLowerCase();
    return references.filter((ref) =>
      [ref.image, ref.resourceKind, ref.resourceName, ref.namespace, ref.sourceFile]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [query, references]);

  useEffect(() => () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  }, []);

  const handleCopy = useCallback(async (image: string, key: string) => {
    const success = await copyText(image);
    if (!success) return;

    setCopiedKey(key);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  return (
    <div className="image-table">
      <div className="image-table__header">
        <div>
          <h3>镜像详情</h3>
          <p>查看解析出的镜像、所属资源与来源文件。</p>
        </div>
        <input
          type="search"
          placeholder="搜索镜像 / 资源 / 命名空间"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{
            padding: "0.6rem 0.9rem",
            borderRadius: "999px",
            border: "1px solid #cbd5f5",
            width: "min(280px, 40vw)"
          }}
        />
      </div>

      <div className="table-wrapper" style={{ marginTop: "1rem" }}>
        {filtered.length ? (
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ref, index) => {
                const rowKey = `${ref.image}-${ref.resourceName}-${ref.namespace}-${ref.sourceFile}-${index}`;
                return (
                  <tr key={rowKey}>
                    <td>
                      <div className="image-cell">
                        <span className="image-cell__text">{ref.image}</span>
                        <button
                          type="button"
                          className="copy-button"
                          onClick={() => handleCopy(ref.image, rowKey)}
                        >
                          {copiedKey === rowKey ? "已复制" : "复制"}
                        </button>
                      </div>
                    </td>
                  <td>
                    <div>{ref.resourceKind}</div>
                    <span className="badge-light">{ref.resourceName}</span>
                  </td>
                  <td>{ref.namespace}</td>
                  <td>{ref.containerType}</td>
                  <td>
                    <a className="source-link" href={createSourceLink(ref.sourceFile)} target="_blank" rel="noreferrer">
                      {ref.sourceFile}
                    </a>
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">暂无数据，试试上传新的 YAML / JSON 文件吧～</div>
        )}
      </div>
    </div>
  );
}

function createSourceLink(fileName: string) {
  return `#/source/${encodeURIComponent(fileName)}`;
}
