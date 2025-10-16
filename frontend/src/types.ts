export interface ImageReference {
  image: string;
  resourceKind: string;
  resourceName: string;
  namespace: string;
  sourceFile: string;
  containerType: "container" | "initContainer";
}

export interface ParseError {
  file: string;
  message: string;
}

export interface ParseResult {
  references: ImageReference[];
  errors: ParseError[];
  fileCount: number;
  textEntryCount: number;
}

export interface ImageStatistics {
  totalReferences: number;
  uniqueImages: number;
  missingTagCount: number;
}
