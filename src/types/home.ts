export type HomeMediaNodeKind = "directory" | "file";

export type HomeMediaFileType =
  | "video"
  | "audio"
  | "image"
  | "subtitle"
  | "other";

export interface HomeMediaNode {
  id: string;
  name: string;
  relativePath: string;
  kind: HomeMediaNodeKind;
  extension?: string | null;
  mediaType?: HomeMediaFileType;
  size?: number;
  modifiedAt?: string;
  children?: HomeMediaNode[];
}

export interface HomeMediaLibrary {
  generatedAt: string;
  root: HomeMediaNode;
  totalFiles: number;
  totalVideos: number;
  totalDirectories: number;
  totalSize: number;
}

export interface HomeMediaUploadSummary {
  relativePath: string;
  size: number;
}

export interface HomeMediaUploadError {
  relativePath: string;
  reason: string;
}

export interface HomeMediaUploadResponse {
  status: "ok" | "partial";
  savedFiles: HomeMediaUploadSummary[];
  errors: HomeMediaUploadError[];
}

