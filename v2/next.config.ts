import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root: several lockfiles exist above this app, and without
  // this Next infers the wrong root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
