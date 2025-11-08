import { ApolloServer } from "@apollo/server";
import type { Request, Response } from "express";
import { AppDataSource, initializeDataSource } from "../../config/data-source";
import { createSchema } from "../../schema/buildSchema";
import type { GraphQLContext } from "../../types/context";
import { User, UserRole } from "../../entities/User";
import { buildAbilityFor } from "../../auth/ability";
import { verifyAccessToken } from "../../lib/token";
import { OAuthProvider } from "../../types/oauth";
import { oauthService } from "../../services/oauth.service";

const mockStore = new Map<string, string>();

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET ?? "test-refresh-secret";
process.env.ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL ?? "15m";
process.env.REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL ?? "30d";

const mockRedis = {
  set: jest.fn(async (key: string, value: string, _options?: { EX?: number }) => {
    mockStore.set(key, value);
  }),
  exists: jest.fn(async (key: string) => (mockStore.has(key) ? 1 : 0)),
  del: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
  scanIterator: jest.fn(async function* ({ MATCH }: { MATCH: string }) {
    const regex = new RegExp(`^${MATCH.replace("*", ".*")}$`);
    for (const key of mockStore.keys()) {
      if (regex.test(key)) {
        yield key;
      }
    }
  } as any),
};

jest.mock("../../lib/redis", () => ({
  getRedisClient: async () => mockRedis,
}));

jest.mock("../../services/oauth.service", () => ({
  oauthService: {
    authenticate: jest.fn(),
  },
}));

interface TestContextOptions {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  userId?: string;
  userRole?: UserRole;
}

const createTestContext = (options: TestContextOptions = {}): GraphQLContext => {
  const req = {
    cookies: options.cookies ?? {},
    headers: options.headers ?? {},
  } as Request;

  const cookieJar: Record<string, string> = { ...options.cookies };

  const res = {
    cookie: jest.fn((name: string, value: string) => {
      cookieJar[name] = value;
    }),
    clearCookie: jest.fn((name: string) => {
      delete cookieJar[name];
    }),
  } as unknown as Response;

  const ability = buildAbilityFor({
    userId: options.userId,
    userRole: options.userRole,
  });

  return {
    req,
    res,
    userId: options.userId,
    userRole: options.userRole,
    ability,
  } as GraphQLContext;
};

type GraphQLSingleResult<T> = {
  data: T;
  errors?: undefined;
};

type OperationResponse = Awaited<
  ReturnType<ApolloServer<GraphQLContext>["executeOperation"]>
>;

const unwrap = <T>(response: OperationResponse): T => {
  if (response.body.kind !== "single" || !response.body.singleResult) {
    throw new Error("Expected single GraphQL result");
  }
  const { data, errors } = response.body.singleResult as GraphQLSingleResult<T>;
  if (errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
  }
  return data;
};

describe("AuthResolver", () => {
  let server: ApolloServer<GraphQLContext>;
  let latestCookies: Record<string, string> = {};

  beforeAll(async () => {
    AppDataSource.setOptions({
      type: "sqlite",
      database: ":memory:",
      synchronize: true,
      logging: false,
    });

    await initializeDataSource();
    const schema = await createSchema();

    server = new ApolloServer<GraphQLContext>({
      schema,
    });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  beforeEach(() => {
    mockStore.clear();
    latestCookies = {};
  });

  it("signs up a new user", async () => {
    const context = createTestContext();

    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation SignUp($input: SignUpInput!) {
            signUp(input: $input) {
              accessToken
              refreshToken
              user {
                id
                email
              }
            }
          }
        `,
        variables: {
          input: {
            email: "new-user@example.com",
            password: "Password!234",
            nickname: "Nouveau",
          },
        },
      },
      {
        contextValue: {
          ...context,
          res: {
            ...context.res,
            cookie: jest.fn((name: string, value: string) => {
              latestCookies[name] = value;
            }),
          } as unknown as Response,
        },
      }
    );

    const data = unwrap<{ signUp: { accessToken: string; refreshToken: string; user: { email: string } } }>(
      response
    );

    expect(data.signUp.user.email).toBe("new-user@example.com");

    const accessPayload = verifyAccessToken(data.signUp.accessToken ?? "");
    expect(accessPayload?.sub).toBeDefined();
    expect(latestCookies.refreshToken).toBeDefined();
  });

  it("signs in an existing user", async () => {
    const context = createTestContext();
    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation SignIn($input: SignInInput!) {
            signIn(input: $input) {
              accessToken
              refreshToken
              user {
                email
              }
            }
          }
        `,
        variables: {
          input: {
            email: "new-user@example.com",
            password: "Password!234",
          },
        },
      },
      {
        contextValue: {
          ...context,
          res: {
            ...context.res,
            cookie: jest.fn((name: string, value: string) => {
              latestCookies[name] = value;
            }),
          } as unknown as Response,
        },
      }
    );

    const data = unwrap<{ signIn: { user: { email: string }; refreshToken: string } }>(
      response
    );
    expect(data.signIn.user.email).toBe("new-user@example.com");
    expect(latestCookies.refreshToken).toBeDefined();
  });

  it("signs in with Google OAuth", async () => {
    (oauthService.authenticate as jest.Mock).mockResolvedValueOnce({
      provider: OAuthProvider.GOOGLE,
      providerId: "google-123",
      email: "oauth@example.com",
      name: "OAuth User",
      avatarUrl: "https://placehold.co/128x128",
      emailVerified: true,
    });

    const context = createTestContext();
    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation OAuthSignIn($input: OAuthSignInInput!) {
            oauthSignIn(input: $input) {
              accessToken
              user {
                email
                role
              }
            }
          }
        `,
        variables: {
          input: {
            provider: "GOOGLE",
            code: "code-123",
          },
        },
      },
      {
        contextValue: {
          ...context,
          res: {
            ...context.res,
            cookie: jest.fn((name: string, value: string) => {
              latestCookies[name] = value;
            }),
          } as unknown as Response,
        },
      }
    );

    const data = unwrap<{
      oauthSignIn: { accessToken: string; user: { email: string; role: string } };
    }>(response);

    expect(data.oauthSignIn.user.email).toBe("oauth@example.com");
    expect(data.oauthSignIn.user.role).toBe("VIEWER");
    expect(latestCookies.refreshToken).toBeDefined();
  });

  it("refreshes tokens when cookie is valid", async () => {
    // Sign in to have refresh token stored
    const signInContext = createTestContext();
    const signInRes = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation SignIn($input: SignInInput!) {
            signIn(input: $input) {
              refreshToken
            }
          }
        `,
        variables: {
          input: {
            email: "new-user@example.com",
            password: "Password!234",
          },
        },
      },
      {
        contextValue: {
          ...signInContext,
          res: {
            ...signInContext.res,
            cookie: jest.fn((name: string, value: string) => {
              latestCookies[name] = value;
            }),
          } as unknown as Response,
        },
      }
    );

    const refreshToken = latestCookies.refreshToken;
    expect(refreshToken).toBeDefined();

    const refreshContext = createTestContext({
      cookies: { refreshToken },
    });

    const refreshResponse = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation Refresh {
            refreshToken {
              accessToken
              refreshToken
            }
          }
        `,
      },
      {
        contextValue: {
          ...refreshContext,
          res: {
            ...refreshContext.res,
            cookie: jest.fn((name: string, value: string) => {
              latestCookies[name] = value;
            }),
          } as unknown as Response,
        },
      }
    );

    const data = unwrap<{ refreshToken: { accessToken: string; refreshToken: string } }>(
      refreshResponse
    );
    expect(data.refreshToken.accessToken).toBeDefined();
  });

  it("clears session on signOut", async () => {
    const context = createTestContext({
      cookies: { refreshToken: latestCookies.refreshToken ?? "" },
    });

    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation SignOut {
            signOut
          }
        `,
      },
      {
        contextValue: {
          ...context,
          res: {
            ...context.res,
            clearCookie: jest.fn((name: string) => {
              delete latestCookies[name];
            }),
          } as unknown as Response,
        },
      }
    );

    const data = unwrap<{ signOut: boolean }>(response);
    expect(data.signOut).toBe(true);
  });

  it("returns current user for me query", async () => {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneByOrFail({ email: "new-user@example.com" });

    const context = createTestContext({
      userId: user.id,
      userRole: user.role,
    });

    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          query Me {
            me {
              id
              email
            }
          }
        `,
      },
      { contextValue: context }
    );

    const data = unwrap<{ me: { email: string } | null }>(response);
    expect(data.me?.email).toBe("new-user@example.com");
  });
});
