const { URL } = require("url");

/** Connection options for BullMQ (ioredis-compatible). */
function getBullConnection() {
  const raw = process.env.REDIS_URL?.trim();
  if (raw) {
    try {
      const u = new URL(raw);
      const port = u.port ? Number(u.port) : 6379;
      const opts = {
        host: u.hostname,
        port,
        maxRetriesPerRequest: null,
      };
      if (u.password) opts.password = decodeURIComponent(u.password);
      if (u.username) opts.username = decodeURIComponent(u.username);
      return opts;
    } catch {
      return {
        host: "127.0.0.1",
        port: 6379,
        maxRetriesPerRequest: null,
      };
    }
  }
  return {
    host: process.env.REDIS_HOST?.trim() || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD?.trim() || undefined,
    maxRetriesPerRequest: null,
  };
}

module.exports = { getBullConnection };
