import { graphqlRequest } from "@/lib/api/graphql";
import type { GraphQLVideo } from "@/types/graphql";

interface SearchLibraryVideosResponse {
  searchLibraryVideos: GraphQLVideo[];
}

const SEARCH_LIBRARY_VIDEOS = /* GraphQL */ `
  query SearchLibraryVideos($query: String!) {
    searchLibraryVideos(query: $query) {
      id
      title
      slug
      status
      mediaType
      sourceType
      posterUrl
      overview
      releaseDate
      visibility
      createdAt
      owner {
        id
        email
        nickname
      }
    }
  }
`;

export async function searchLibraryVideos(
  query: string
): Promise<GraphQLVideo[]> {
  const data = await graphqlRequest<SearchLibraryVideosResponse>({
    query: SEARCH_LIBRARY_VIDEOS,
    variables: { query },
  });
  return data.searchLibraryVideos;
}


