import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Django URLs end in "/"; Next would 308 them away (breaking POSTs), so keep them
  skipTrailingSlashRedirect: true,
  // Same-origin proxy to keyed-backend: its httpOnly auth cookies become first-party
  // here, so there's no CORS or cross-site cookie setup to get wrong
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*/` }];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
