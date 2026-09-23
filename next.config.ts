import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: let the dev server serve its HMR/dev resources when the app is
  // opened via 127.0.0.1 (used by E2E tests and to dodge stale localhost cookies)
  allowedDevOrigins: ["127.0.0.1"],

  // /Users/manuchehr is itself a git repo with a lockfile — pin the project root
  // so Turbopack doesn't infer the home directory as the workspace root
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
