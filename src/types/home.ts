export type HomeMediaNodeKind = "directory" | "file";

export type HomeLibraryMediaType = string;

export type HomeMediaFileType =
  | "video"
  | "audio"
  | "image"
  | "subtitle"
  | "other";

export interface HomeMediaTypeDefinition {
  id: HomeLibraryMediaType;
  label: string;
  icon?: string;
}

export interface HomeMediaNode {
  id: string;
  name: string;
  relativePath: string;
  kind: HomeMediaNodeKind;
  extension?: string | null;
  mediaType?: HomeMediaFileType;
  customMediaType?: HomeLibraryMediaType | null;
  inheritedMediaType?: HomeLibraryMediaType | null;
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
  availableMediaTypes: HomeMediaTypeDefinition[];
  personalRootPath: string;
  manageableRoots: string[];
}

