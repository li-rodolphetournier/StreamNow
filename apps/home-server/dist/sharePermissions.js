"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateShareCache = exports.getSharesForRecipient = void 0;
const path_1 = __importDefault(require("path"));
const env_1 = require("./env");
const GRAPHQL_QUERY = /* GraphQL */ `
  query HomeServerShares {
    localMediaShares {
      path
      isDirectory
      recipient {
        id
      }
    }
  }
`;
const normalizeSharePath = (input) => {
    if (!input) {
        return "";
    }
    const normalized = path_1.default.normalize(input).replace(/\\/g, "/");
    if (normalized === "." || normalized === "./") {
        return "";
    }
    return normalized.startsWith("./") ? normalized.slice(2) : normalized;
};
let cache = null;
const parseShares = (rawShares) => {
    const permissions = [];
    for (const share of rawShares) {
        if (!share?.recipient?.id) {
            continue;
        }
        permissions.push({
            path: normalizeSharePath(share.path ?? ""),
            isDirectory: Boolean(share.isDirectory),
            recipientId: share.recipient.id,
        });
    }
    return permissions;
};
const fetchShares = async () => {
    if (cache && cache.expiresAt > Date.now()) {
        return cache.data;
    }
    const response = await fetch(env_1.env.HOME_SERVER_GRAPHQL_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-user-id": env_1.env.HOME_SERVER_OWNER_ID,
            "x-user-role": env_1.env.HOME_SERVER_OWNER_ROLE,
            "x-service-token": env_1.env.HOME_SERVER_SERVICE_TOKEN,
        },
        body: JSON.stringify({
            query: GRAPHQL_QUERY,
        }),
    });
    if (!response.ok) {
        throw new Error(`GraphQL request failed with status ${response.status}`);
    }
    const payload = (await response.json());
    if (payload.errors && payload.errors.length > 0) {
        throw new Error(payload.errors.map((error) => error.message ?? "Unknown error").join(", "));
    }
    const shares = parseShares(payload.data?.localMediaShares ?? []);
    cache = {
        data: shares,
        expiresAt: Date.now() + env_1.env.HOME_SERVER_SHARE_CACHE_TTL * 1000,
    };
    return shares;
};
const getSharesForRecipient = async (recipientId) => {
    if (!recipientId) {
        return [];
    }
    const shares = await fetchShares();
    return shares.filter((share) => share.recipientId === recipientId);
};
exports.getSharesForRecipient = getSharesForRecipient;
const invalidateShareCache = () => {
    cache = null;
};
exports.invalidateShareCache = invalidateShareCache;
