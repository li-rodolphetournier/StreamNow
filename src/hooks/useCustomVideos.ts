import { useQuery } from "@tanstack/react-query";
import { graphqlRequest } from "@/lib/api/graphql";
import type { GraphQLVideo } from "@/types/graphql";

interface VideosQueryResponse {
  videos: GraphQLVideo[];
}

const VIDEOS_QUERY = /* GraphQL */ `
  query CustomVideos {
    videos {
      id
      title
      slug
      status
      mediaType
      sourceType
      fileUrl
      fileSize
      durationSeconds
      tmdbId
      createdAt
      posterUrl
      visibility
      owner {
        id
        email
        nickname
      }
      ownerId
    }
  }
`;

interface Options {
  enabled?: boolean;
}

export function useCustomVideos(options: Options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["customVideos"],
    enabled,
    queryFn: async () => {
      const data = await graphqlRequest<VideosQueryResponse>({
        query: VIDEOS_QUERY,
      });
      return data.videos;
    },
  });
}

