import "reflect-metadata";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServer } from "@apollo/server";
import type { ExpressContextFunctionArgument } from "@apollo/server/express4";
import type { Request, Response } from "express";
import multer from "multer";
import type { MulterError } from "multer";
import path from "path";
import fs from "fs";
import { isUUID } from "class-validator";
import { env } from "./config/env";
import { initializeDataSource } from "./config/data-source";
import { createSchema } from "./schema/buildSchema";
import type { GraphQLContext } from "./types/context";
import { logger } from "./lib/logger";
import { buildAbilityFor } from "./auth/ability";
import { UserRole } from "./entities/User";
import { verifyAccessToken } from "./lib/token";
import cookieParser from "cookie-parser";

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000000";

const extractUser = (req: Request) => {
  // Check for mock authentication mode
  if (env.enableMockAuth) {
    const mockParam = req.query.mock === "true" || req.query.mock === "1";
    const mockHeader = req.header("x-mock-auth") === "true" || req.header("x-mock-auth") === "1";
    
    if (mockParam || mockHeader) {
      logger.info({ url: req.originalUrl }, "Mock authentication enabled");
      return {
        userId: MOCK_USER_ID,
        userRole: UserRole.ADMIN,
      } as const;
    }
  }

  const serviceToken = req.header("x-service-token");
  const hasServiceAccess =
    typeof serviceToken === "string" && serviceToken === env.serviceToken;

  const rawId = req.header("x-user-id") ?? undefined;
  const rawRole = req.header("x-user-role") ?? undefined;

  const userId =
    hasServiceAccess && rawId && isUUID(rawId) ? rawId : undefined;
  const userRole =
    hasServiceAccess && rawRole
      ? Object.values(UserRole).find(
          (role) => role.toLowerCase() === rawRole.toLowerCase()
        )
      : undefined;

  return {
    userId,
    userRole: userRole ?? UserRole.VIEWER,
  } as const;
};

const bootstrap = async () => {
  await initializeDataSource();

  const schema = await createSchema();

  const server = new ApolloServer<GraphQLContext>({
    schema,
  });

  await server.start();

  const app = express();

  const uploadsDir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const MAX_UPLOAD_SIZE_BYTES = 1024 * 1024 * 1024 * 2; // 2GB

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      cb(null, `${uniqueSuffix}-${sanitized}`);
    },
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: MAX_UPLOAD_SIZE_BYTES,
    },
  });

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      logger.info(
        {
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration: Date.now() - start,
        },
        "http_request"
      );
    });
    next();
  });

  app.use(
    cors({
      origin: process.env.WEB_APP_ORIGIN ?? "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use("/uploads", express.static(uploadsDir));

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req, res }: ExpressContextFunctionArgument) => {
        // Check for mock auth first (before token verification)
        const headerUser = extractUser(req);
        
        // If mock auth is active and detected, use it directly
        if (env.enableMockAuth && headerUser.userId === MOCK_USER_ID) {
          const ability = buildAbilityFor({ userId: headerUser.userId, userRole: headerUser.userRole });
          return {
            req,
            res,
            userId: headerUser.userId,
            userRole: headerUser.userRole,
            ability,
          } satisfies GraphQLContext;
        }

        // Otherwise, proceed with normal token-based authentication
        const authHeader = req.headers["authorization"];
        let tokenUserId: string | undefined;
        let tokenRole: UserRole | undefined;

        if (authHeader?.startsWith("Bearer ")) {
          const token = authHeader.substring("Bearer ".length);
          const payload = verifyAccessToken(token);
          if (payload) {
            tokenUserId = payload.sub;
            tokenRole = payload.role;
          }
        }

        const userId = tokenUserId ?? headerUser.userId;
        const userRole = tokenRole ?? headerUser.userRole;

        const ability = buildAbilityFor({ userId, userRole });

        return {
          req,
          res,
          userId,
          userRole,
          ability,
        } satisfies GraphQLContext;
      },
    })
  );

  app.get("/health", (_: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.post("/upload", (req: Request, res: Response) => {
    upload.single("file")(req, res, (error: unknown) => {
      if (error) {
        if ((error as MulterError).code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            error: "Le fichier est trop volumineux.",
            maxSize: MAX_UPLOAD_SIZE_BYTES,
          });
          return;
        }

        logger.error({ error }, "upload_failed");
        res.status(500).json({
          error: "Échec du téléversement du fichier.",
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "Aucun fichier reçu." });
        return;
      }

      logger.info(
        {
          userId: req.header("x-user-id"),
          fileName: req.file.originalname,
          fileSize: req.file.size,
        },
        "video_uploaded"
      );

      res.json({
        fileUrl: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    });
  });

  app.listen(env.port, () => {
    logger.info({ port: env.port }, "GraphQL API ready");
    logger.info({ endpoint: "/upload" }, "Upload endpoint available");
  });
};

bootstrap().catch((error) => {
  logger.error({ error }, "Failed to bootstrap API");
  process.exit(1);
});

