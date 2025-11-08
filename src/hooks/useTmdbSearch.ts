import { useQuery } from "@tanstack/react-query";
import { graphqlRequest } from "@/lib/api/graphql";
import type {
  GraphQLTmdbSearchResult,
  GraphQLVideoMediaType,
} from "@/types/graphql";

interface SearchResponse {
  searchTmdbVideos: GraphQLTmdbSearchResult[];
}

const SEARCH_TMDB_QUERY = /* GraphQL */ `
  query SearchTmdbVideos($query: String!, $mediaType: VideoMediaType) {
    searchTmdbVideos(query: $query, mediaType: $mediaType) {
      id
      title
      overview
      releaseDate
      posterUrl
      mediaType
    }
  }
`;

export function useTmdbSearch(query: string, mediaType?: GraphQLVideoMediaType) {
  return useQuery({
    queryKey: ["tmdbSearch", query, mediaType ?? null],
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const data = await graphqlRequest<SearchResponse>({
        query: SEARCH_TMDB_QUERY,
        variables: { query, mediaType },
      });
      return data.searchTmdbVideos;
    },
    staleTime: 1000 * 60 * 5,
  });
}
