import { useQuery } from "@tanstack/react-query";
import { graphqlRequest } from "@/lib/api/graphql";
import type { GraphQLVideo } from "@/types/graphql";

interface VideoQueryResponse {
  video: GraphQLVideo | null;
}

const VIDEO_QUERY = /* GraphQL */ `
  query DashboardVideo($id: ID!) {
    video(id: $id) {
      id
      tmdbId
      title
      slug
      status
      mediaType
      sourceType
      fileUrl
      fileSize
      durationSeconds
      tagline
      overview
      posterUrl
      trailerUrl
      releaseDate
      createdAt
      visibility
      owner {
        id
        email
        nickname
      }
      ownerId
      shares {
        id
        recipient {
          id
          email
          nickname
        }
      }
    }
  }
`;

interface Options {
  enabled?: boolean;
}

export function useCustomVideo(id: string, options: Options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["customVideo", id],
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const data = await graphqlRequest<VideoQueryResponse>({
        query: VIDEO_QUERY,
        variables: { id },
      });
      return data.video;
    },
  });
}
