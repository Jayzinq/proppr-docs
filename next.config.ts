import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the file-tracing root to this project so the standalone build always
  // emits a flat `.next/standalone/server.js` instead of nesting it under the
  // inferred monorepo path (which broke the systemd ExecStart / asset copies).
  outputFileTracingRoot: path.resolve(process.cwd()),
  serverExternalPackages: ["mongodb"],
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      // Marketing pages (non-hyphenated URLs serve marketing content)
      {
        source: "/playerbot",
        destination: "/playerbot-marketing",
      },
      {
        source: "/teambot",
        destination: "/teambot-marketing",
      },
      {
        source: "/arbbot",
        destination: "/arbbot-marketing",
      },
      {
        source: "/api/auth/:path*",
        destination: "http://127.0.0.1:8000/api/auth/:path*",
      },
      // Billing (checkout/portal) lives in the FastAPI backend too. NOTE:
      // /api/internal/* is deliberately NOT proxied - the webhook forward reaches
      // it over the private network on :8000; it must not be publicly routable.
      {
        source: "/api/billing/:path*",
        destination: "http://127.0.0.1:8000/api/billing/:path*",
      },
    ];
  },
  async redirects() {
    return [
      // Optional: redirect old hyphenated docs URLs to non-hyphenated if needed
      // Currently docs remain at hyphenated URLs
    ];
  },
};

export default nextConfig;
