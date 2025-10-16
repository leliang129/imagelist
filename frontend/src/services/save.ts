import type { ImageReference } from "../types";

export function downloadCsv(references: ImageReference[]) {
  const header = ["image", "resourceKind", "resourceName", "namespace", "containerType", "sourceFile"];
  const rows = references.map((ref) => [
    escapeCsv(ref.image),
    escapeCsv(ref.resourceKind),
    escapeCsv(ref.resourceName),
    escapeCsv(ref.namespace),
    escapeCsv(ref.containerType),
    escapeCsv(ref.sourceFile)
  ]);
  const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
  triggerDownload(csv, "k8s-image-report.csv", "text/csv");
}

export function downloadJson(references: ImageReference[]) {
  const json = JSON.stringify(references, null, 2);
  triggerDownload(json, "k8s-image-report.json", "application/json");
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\"")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

