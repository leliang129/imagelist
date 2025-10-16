import { loadAll } from "js-yaml";

import type { ImageReference, ParseError, ParseResult } from "../types";

interface DocumentContext {
  resourceKind: string;
  resourceName: string;
  namespace: string;
}

interface ParseSource {
  name: string;
  text: string;
  ext: string;
}

const DEFAULT_CONTEXT: DocumentContext = {
  resourceKind: "Unknown",
  resourceName: "unknown",
  namespace: "default"
};

export async function parseFiles(files: File[]): Promise<ParseResult> {
  const sources: ParseSource[] = [];

  for (const file of files) {
    const text = await file.text();
    sources.push({ name: file.name, text, ext: getExtension(file.name) });
  }

  return parseSources(sources, files.length, 0);
}

export async function parseTextContent(content: string, format: "yaml" | "json"): Promise<ParseResult> {
  const name = format === "json" ? "manual-input.json" : "manual-input.yaml";
  return parseSources([
    {
      name,
      text: content,
      ext: format === "json" ? ".json" : ".yaml"
    }
  ], 0, 1);
}

function parseSources(sources: ParseSource[], fileCount = 0, textEntries = 0): ParseResult {
  const references: ImageReference[] = [];
  const errors: ParseError[] = [];

  for (const source of sources) {
    try {
      const docs = parseDocuments(source.text, source.ext);

      for (const doc of docs) {
        if (!doc || typeof doc !== "object") continue;

        const context = createContextFromDoc(doc, source.name);
        references.push(...extractImages(doc, source.name, context));
      }
    } catch (error) {
      errors.push({
        file: source.name,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return { references, errors, fileCount, textEntryCount: textEntries };
}

function parseDocuments(text: string, ext: string): unknown[] {
  if (ext === ".json") {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  const docs: unknown[] = [];
  loadAll(text, (doc) => docs.push(doc));
  return docs;
}

function getExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function createContextFromDoc(doc: any, fileName: string): DocumentContext {
  const metadata = doc?.metadata ?? {};
  return {
    resourceKind: typeof doc?.kind === "string" ? doc.kind : inferKindFromFile(fileName),
    resourceName: typeof metadata?.name === "string" ? metadata.name : "unknown",
    namespace: typeof metadata?.namespace === "string" ? metadata.namespace : "default"
  };
}

function inferKindFromFile(fileName: string): string {
  const base = fileName.split("/").pop() ?? fileName;
  const hint = base.split("-")[0] ?? "Resource";
  return capitalize(hint);
}

function capitalize(value: string): string {
  if (!value) return "Resource";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function extractImages(doc: any, fileName: string, context: DocumentContext): ImageReference[] {
  const references: ImageReference[] = [];
  const specs = collectSpecCandidates(doc);

  for (const spec of specs) {
    if (!spec || typeof spec !== "object") continue;

    const containers: any[] = Array.isArray(spec.containers) ? spec.containers : [];
    const initContainers: any[] = Array.isArray(spec.initContainers) ? spec.initContainers : [];

    for (const container of containers) {
      const image = stringField(container?.image);
      if (!image) continue;
      references.push(createReference(image, fileName, context, "container", container?.name));
    }

    for (const container of initContainers) {
      const image = stringField(container?.image);
      if (!image) continue;
      references.push(createReference(image, fileName, context, "initContainer", container?.name));
    }
  }

  return references;
}

function collectSpecCandidates(doc: any): any[] {
  const specs: any[] = [];

  if (doc?.spec?.template?.spec) {
    specs.push(doc.spec.template.spec);
  }

  if (doc?.spec?.jobTemplate?.spec?.template?.spec) {
    specs.push(doc.spec.jobTemplate.spec.template.spec);
  }

  if (doc?.spec) {
    specs.push(doc.spec);
  }

  if (doc?.template?.spec) {
    specs.push(doc.template.spec);
  }

  if (doc?.spec?.taskTemplate?.spec) {
    specs.push(doc.spec.taskTemplate.spec);
  }

  return specs;
}

function createReference(
  image: string,
  fileName: string,
  context: DocumentContext,
  containerType: "container" | "initContainer",
  containerName: string | undefined
): ImageReference {
  return {
    image,
    resourceKind: context.resourceKind,
    resourceName:
      containerName && containerName !== context.resourceName
        ? `${context.resourceName} / ${containerName}`
        : context.resourceName,
    namespace: context.namespace ?? DEFAULT_CONTEXT.namespace,
    sourceFile: fileName,
    containerType
  };
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function computeStatistics(references: ImageReference[]) {
  const unique = new Set<string>();
  let missingTagCount = 0;

  for (const ref of references) {
    unique.add(ref.image);
    if (!ref.image.includes(":")) missingTagCount += 1;
  }

  return {
    totalReferences: references.length,
    uniqueImages: unique.size,
    missingTagCount
  };
}
