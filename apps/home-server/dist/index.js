"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./env");
const server_1 = require("./server");
async function bootstrap() {
    const app = await (0, server_1.createServer)();
    try {
        await app.listen({
            port: env_1.env.HOME_SERVER_PORT,
            host: env_1.env.HOME_SERVER_HOST,
        });
        app.log.info(`StreamNow Home server running at http://${env_1.env.HOME_SERVER_HOST}:${env_1.env.HOME_SERVER_PORT}`);
    }
    catch (error) {
        app.log.error({ err: error }, "Failed to start StreamNow Home server");
        process.exitCode = 1;
    }
}
void bootstrap();
