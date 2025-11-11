import { promises as fs } from "fs";
import path from "path";
import { env } from "./env";

const OVERRIDES_FILENAME = ".media-types.json";
const DEFINITIONS_FILENAME = ".media-type-definitions.json";

export type HomeLibraryMediaType = string;

export interface MediaTypeDefinition {
  id: HomeLibraryMediaType;
  label: string;
  icon?: string;
}

type MetadataRecord = Record<string, HomeLibraryMediaType>;

interface DefinitionsFileShape {
  types: Array<MediaTypeDefinition>;
}

interface SetMediaTypeOptions {
  applyToChildren?: boolean;
}

const DEFAULT_DEFINITIONS: MediaTypeDefinition[] = [
  { id: "movie", label: "Film", icon: "noto:clapper-board" },
  { id: "tv", label: "Série", icon: "noto:television" },
];
const DEFAULT_DEFINITION_IDS = new Set(DEFAULT_DEFINITIONS.map((definition) => definition.id));

let overridesCache: MetadataRecord | null = null;
let definitionsCache: MediaTypeDefinition[] | null = null;

const getRootDirectory = (): string => path.resolve(env.HOME_SERVER_MEDIA_ROOT);

const getOverridesFilePath = (): string => path.join(getRootDirectory(), OVERRIDES_FILENAME);

const getDefinitionsFilePath = (): string => path.join(getRootDirectory(), DEFINITIONS_FILENAME);

const ensureDirectory = async (filePath: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const normalizeRelativePath = (raw: string): string => {
  const trimmed = raw.trim();

  if (!trimmed || trimmed === "." || trimmed === "./") {
    return "";
  }

  const replaced = trimmed.replace(/\\/g, "/");
  const withoutPrefix = replaced.startsWith("./") ? replaced.slice(2) : replaced;
  const withoutLeadingSlash = withoutPrefix.replace(/^\/+/, "");
  const normalized = withoutLeadingSlash.replace(/\/+/g, "/");

  if (normalized.split("/").some((segment) => segment === ".." || segment === "")) {
    throw new Error("Chemin invalide");
  }

  return normalized;
};

const slugify = (input: string): string => {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
};

const loadDefinitions = async (): Promise<MediaTypeDefinition[]> => {
  if (definitionsCache) {
    return definitionsCache;
  }

  const filePath = getDefinitionsFilePath();
  let definitions: MediaTypeDefinition[] = [];

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as DefinitionsFileShape;
    if (Array.isArray(parsed.types)) {
      definitions = parsed.types
        .filter(
          (entry): entry is MediaTypeDefinition =>
            typeof entry?.id === "string" && typeof entry?.label === "string"
        )
        .map((entry) => ({
          id: entry.id,
          label: entry.label,
          icon: entry.icon,
        }));
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      throw error;
    }
  }

  // Ensure defaults are present
  const existingIds = new Set(definitions.map((definition) => definition.id));
  let definitionsChanged = false;
  for (const fallback of DEFAULT_DEFINITIONS) {
    if (!existingIds.has(fallback.id)) {
      definitions.push(fallback);
      definitionsChanged = true;
    }
  }

  if (definitionsChanged) {
    await persistDefinitions(definitions);
  } else {
    definitionsCache = definitions;
  }

  return definitionsCache ?? definitions;
};

const persistDefinitions = async (definitions: MediaTypeDefinition[]): Promise<void> => {
  const filePath = getDefinitionsFilePath();
  await ensureDirectory(filePath);
  const payload: DefinitionsFileShape = { types: definitions };
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
  definitionsCache = definitions;
};

const removeTypeFromOverrides = async (typeId: HomeLibraryMediaType): Promise<void> => {
  const metadata = await loadOverrides();
  let updated = false;

  for (const key of Object.keys(metadata)) {
    if (metadata[key] === typeId) {
      delete metadata[key];
      updated = true;
    }
  }

  if (updated) {
    await persistOverrides(metadata);
  }
};

const loadOverrides = async (): Promise<MetadataRecord> => {
  if (overridesCache) {
    return overridesCache;
  }

  const filePath = getOverridesFilePath();
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as MetadataRecord;
    overridesCache = parsed ?? {};
    return overridesCache;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      overridesCache = {};
      return overridesCache;
    }
    throw error;
  }
};

const persistOverrides = async (metadata: MetadataRecord): Promise<void> => {
  const filePath = getOverridesFilePath();
  await ensureDirectory(filePath);
  await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), "utf-8");
  overridesCache = metadata;
};

const removeDescendants = (metadata: MetadataRecord, prefix: string) => {
  const normalizedPrefix = prefix.length > 0 ? `${prefix}/` : "";
  for (const key of Object.keys(metadata)) {
    if (key === prefix) {
      continue;
    }
    if (normalizedPrefix === "") {
      delete metadata[key];
    } else if (key.startsWith(normalizedPrefix)) {
      delete metadata[key];
    }
  }
};

export const getMediaTypeDefinitions = async (): Promise<MediaTypeDefinition[]> => {
  const definitions = await loadDefinitions();
  return definitions.map((definition) => ({ ...definition }));
};

export const getValidMediaTypes = async (): Promise<HomeLibraryMediaType[]> => {
  const definitions = await loadDefinitions();
  return definitions.map((definition) => definition.id);
};

export const addMediaTypeDefinition = async (definition: {
  id?: string;
  label: string;
  icon?: string;
}): Promise<MediaTypeDefinition> => {
  const label = definition.label?.trim();
  if (!label) {
    throw new Error("Le libellé du type de média est requis.");
  }

  const id = (definition.id?.trim() || slugify(label));
  if (!id) {
    throw new Error("Identifiant de type de média invalide.");
  }

  const definitions = await loadDefinitions();
  const duplicate = definitions.find(
    (entry) => entry.id.toLowerCase() === id.toLowerCase() || entry.label === label
  );

  if (duplicate) {
    throw new Error("Ce type de média existe déjà.");
  }

  const newDefinition: MediaTypeDefinition = {
    id,
    label,
    icon: definition.icon,
  };

  const nextDefinitions = [...definitions, newDefinition];
  await persistDefinitions(nextDefinitions);
  return newDefinition;
};

export const removeMediaTypeDefinition = async (
  typeId: HomeLibraryMediaType
): Promise<MediaTypeDefinition[]> => {
  if (DEFAULT_DEFINITION_IDS.has(typeId)) {
    throw new Error("Impossible de supprimer un type système.");
  }

  const definitions = await loadDefinitions();
  const nextDefinitions = definitions.filter((definition) => definition.id !== typeId);

  if (nextDefinitions.length === definitions.length) {
    throw new Error("Type de média introuvable.");
  }

  await persistDefinitions(nextDefinitions);
  await removeTypeFromOverrides(typeId);

  return nextDefinitions;
};

export const readMediaTypeOverrides = async (): Promise<MetadataRecord> => {
  const overrides = await loadOverrides();
  return { ...overrides };
};

export const clearMediaTypeOverrides = async () => {
  const filePath = getOverridesFilePath();
  await ensureDirectory(filePath);
  await fs.writeFile(filePath, JSON.stringify({}, null, 2), "utf-8");
  overridesCache = {};
};

export const setMediaTypeForPath = async (
  rawPath: string,
  mediaType: HomeLibraryMediaType | null,
  options: SetMediaTypeOptions = {}
) => {
  const metadata = await loadOverrides();
  const normalized = normalizeRelativePath(rawPath);
  const applyToChildren = options.applyToChildren ?? false;

  if (mediaType !== null) {
    const validMediaTypes = await getValidMediaTypes();
    if (!validMediaTypes.includes(mediaType)) {
      throw new Error("Type de média invalide");
    }
  }

  if (mediaType === null) {
    delete metadata[normalized];
    if (applyToChildren) {
      removeDescendants(metadata, normalized);
    }
    await persistOverrides(metadata);
    return;
  }

  metadata[normalized] = mediaType;

  if (applyToChildren) {
    removeDescendants(metadata, normalized);
  }

  await persistOverrides(metadata);
};


