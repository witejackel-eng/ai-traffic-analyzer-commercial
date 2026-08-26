import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do NOT use output: "standalone" on Vercel — it breaks Vercel's build.
  // Standalone is only for Docker / self-hosted. Vercel uses its own build.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Prisma needs to be bundled for serverless (Vercel)
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
