import type {
  HomeLibraryMediaType,
  HomeMediaLibrary,
  HomeMediaTypeDefinition,
} from "@/types/home";

const homeEndpoint = process.env.NEXT_PUBLIC_HOME_SERVER_URL;

export interface HomeHealthResponse {
  status: string;
  uptime: number;
  mediaRoot?: string;
  version?: string;
  timestamp?: string;
}

export const isHomeServerEnabled = Boolean(homeEndpoint);

const assertHomeEndpoint = () => {
  if (!homeEndpoint) {
    throw new Error("NEXT_PUBLIC_HOME_SERVER_URL is not configured.");
  }

  return homeEndpoint;
};

export async function fetchHomeHealth(): Promise<HomeHealthResponse> {
  const endpoint = assertHomeEndpoint();

  const response = await fetch(`${endpoint}/health`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(
      `Home server health check failed with status ${response.status}`
    );
  }

  return (await response.json()) as HomeHealthResponse;
}

export async function fetchHomeMediaLibrary(userId: string): Promise<HomeMediaLibrary> {
  const endpoint = assertHomeEndpoint();

  const response = await fetch(`${endpoint}/api/v1/media`, {
    method: "GET",
    credentials: "include",
    headers: {
      "x-user-id": userId,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Home media library fetch failed with status ${response.status}`
    );
  }

  return (await response.json()) as HomeMediaLibrary;
}

export async function deleteHomeMedia(relativePath: string, userId: string): Promise<void> {
  const endpoint = assertHomeEndpoint();
  const url = new URL(`${endpoint}/api/v1/media`);
  url.searchParams.set("path", relativePath);

  const response = await fetch(url.toString(), {
    method: "DELETE",
    credentials: "include",
    headers: {
      "x-user-id": userId,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Échec de la suppression du média (statut ${response.status})${
        message ? ` : ${message}` : ""
      }`
    );
  }
}

export async function moveHomeMedia(
  sourcePath: string,
  destinationPath: string,
  userId: string
): Promise<void> {
  const endpoint = assertHomeEndpoint();

  const response = await fetch(`${endpoint}/api/v1/media/move`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    credentials: "include",
    body: JSON.stringify({
      sourcePath,
      destinationPath,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Échec du déplacement du média (statut ${response.status})${
        message ? ` : ${message}` : ""
      }`
    );
  }
}

export interface SetHomeMediaTypeInput {
  path: string;
  mediaType: HomeLibraryMediaType | null;
  applyToChildren?: boolean;
}

export async function setHomeMediaType(
  input: SetHomeMediaTypeInput,
  userId: string
): Promise<void> {
  const endpoint = assertHomeEndpoint();

  const response = await fetch(`${endpoint}/api/v1/media/type`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    credentials: "include",
    body: JSON.stringify({
      path: input.path,
      mediaType: input.mediaType,
      applyToChildren: input.applyToChildren,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Échec de la mise à jour du type de média (statut ${response.status})${
        message ? ` : ${message}` : ""
      }`
    );
  }
}

export interface CreateHomeMediaTypeDefinitionInput {
  label: string;
  id?: string;
  icon?: string;
}

interface CreateHomeMediaTypeDefinitionResponse {
  status: "ok";
  definition: HomeMediaTypeDefinition;
  definitions: HomeMediaTypeDefinition[];
}

export async function createHomeMediaTypeDefinition(
  input: CreateHomeMediaTypeDefinitionInput,
  userId: string
): Promise<CreateHomeMediaTypeDefinitionResponse> {
  const endpoint = assertHomeEndpoint();

  const response = await fetch(`${endpoint}/api/v1/media/type-definition`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Échec de la création du type de média (statut ${response.status})${
        message ? ` : ${message}` : ""
      }`
    );
  }

  return (await response.json()) as CreateHomeMediaTypeDefinitionResponse;
}

interface DeleteHomeMediaTypeDefinitionResponse {
  status: "ok";
  definitions: HomeMediaTypeDefinition[];
}

export async function deleteHomeMediaTypeDefinition(
  id: string,
  userId: string
): Promise<DeleteHomeMediaTypeDefinitionResponse> {
  const endpoint = assertHomeEndpoint();

  const response = await fetch(`${endpoint}/api/v1/media/type-definition/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Impossible de supprimer le type de média (statut ${response.status})${
        message ? ` : ${message}` : ""
      }`
    );
  }

  return (await response.json()) as DeleteHomeMediaTypeDefinitionResponse;
}

interface CreateHomeDirectoryResponse {
  status: "ok";
  name: string;
  relativePath: string;
}

export async function createHomeDirectory(
  name: string,
  userId: string,
  parentPath?: string
): Promise<CreateHomeDirectoryResponse> {
  const endpoint = assertHomeEndpoint();

  const response = await fetch(`${endpoint}/api/v1/media/directory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    credentials: "include",
    body: JSON.stringify({
      name,
      parentPath,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Échec de la création du dossier (statut ${response.status})${
        message ? ` : ${message}` : ""
      }`
    );
  }

  return (await response.json()) as CreateHomeDirectoryResponse;
}
