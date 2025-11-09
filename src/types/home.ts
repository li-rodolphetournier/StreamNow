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

export type HomeMediaAccessLevel = "owner" | "shared";

export interface HomeMediaLibrary {
  generatedAt: string;
  root: HomeMediaNode;
  totalFiles: number;
  totalVideos: number;
  totalDirectories: number;
  totalSize: number;
  access: HomeMediaAccessLevel;
  allowedPaths: string[];
}

