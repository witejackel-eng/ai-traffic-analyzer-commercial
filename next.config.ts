import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["@prisma/client"],
  // Allow large file uploads via Route Handlers.
  // Next.js App Router defaults to ~4MB body size for API routes.
  // This raises it to 2GB so real traffic videos (including 4K) can upload.
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
  // Allow large request bodies for API routes
  async headers() {
    return [
      {
        source: "/api/upload",
        headers: [
          { key: "Content-Length", value: "2147483648" },
        ],
      },
    ];
  },
};

export default nextConfig;
