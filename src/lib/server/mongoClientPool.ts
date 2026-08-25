import { MongoClient } from "mongodb";

/**
 * Shared, self-healing MongoClient cache.
 *
 * Every API route used to cache its own MongoClient on globalThis forever. That works until the
 * topology dies - an idle low-traffic route's connection gets dropped, and from then on EVERY
 * request to that route fails with "Topology is closed" until the whole app is restarted. That is
 * exactly what silently killed /api/bets/source-message (the "Original message" box vanished from
 * every edit page while the data sat intact in Mongo).
 *
 * Clients are still cached per key, but their liveness is verified with a cheap ping - at most
 * once per PING_INTERVAL_MS per key, so a hot route pays ~nothing - and a dead client is discarded
 * and rebuilt instead of being handed out forever.
 */

const PING_INTERVAL_MS = 15_000;

type PoolEntry = { client: MongoClient; lastCheck: number; connecting?: Promise<MongoClient> };

const globalPool = globalThis as typeof globalThis & {
    __propprMongoPool?: Map<string, PoolEntry>;
};

function pool(): Map<string, PoolEntry> {
    if (!globalPool.__propprMongoPool) globalPool.__propprMongoPool = new Map();
    return globalPool.__propprMongoPool;
}

async function isLive(client: MongoClient): Promise<boolean> {
    try {
        await client.db("admin").command({ ping: 1 });
        return true;
    } catch {
        return false;
    }
}

/**
 * Get a live MongoClient for `key`, creating or replacing it as needed.
 * `key` namespaces the connection per caller (matching the old per-route globals).
 */
export async function getPooledMongoClient(key: string, uri: string): Promise<MongoClient> {
    const entry = pool().get(key);
    const now = Date.now();

    if (entry) {
        // Recently verified - hand it straight back (the common path).
        if (now - entry.lastCheck < PING_INTERVAL_MS) return entry.client;
        if (await isLive(entry.client)) {
            entry.lastCheck = now;
            return entry.client;
        }
        // Dead topology: bin it. close() usually throws on an already-closed client - ignore.
        try {
            await entry.client.close(true);
        } catch {
            /* already gone */
        }
        pool().delete(key);
    }

    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
        // Connection hygiene, matching the Python side (config/credentials.py).
        // Measured 2026-08-05: this app held ~22-30 connections to a Mongo host that
        // was swapping, and every one of them was UNATTRIBUTABLE in db.currentOp()
        // because the Node driver sends no appName. The pool is keyed per caller, so
        // the key goes into the name — currentOp then shows exactly which route is
        // holding sockets. maxPoolSize also matters: the Node driver defaults to 100
        // PER CLIENT, and there is one client per key.
        appName: `proppr-docs:${key}`,
        maxPoolSize: 10,
        maxIdleTimeMS: 60_000,
    });
    await client.connect();
    pool().set(key, { client, lastCheck: Date.now() });
    return client;
}
