import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { env } from "./env";
import { User, Video, Friendship, VideoShare, Favorite } from "../entities";

const entities = [User, Video, Friendship, VideoShare, Favorite];

const dataSourceOptions: DataSourceOptions =
  env.nodeEnv === "test"
    ? {
        type: "sqlite",
        database: ":memory:",
        synchronize: true,
        logging: false,
        entities,
      }
    : {
        type: "postgres",
        url: env.databaseUrl,
        synchronize: false,
        logging: env.isDev,
        entities,
        migrations: ["src/migrations/*.ts"],
        subscribers: [],
      };

export const AppDataSource = new DataSource(dataSourceOptions);

export const initializeDataSource = async (): Promise<DataSource> => {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }
  return AppDataSource.initialize();
};

