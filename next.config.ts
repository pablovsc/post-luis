import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite conexiones desde otros dispositivos en la red local (celulares, tablets, otras PCs) en modo dev
  allowedDevOrigins: [
    "192.168.70.12",
    "192.168.*.*",
    "10.*.*.*",
    "localhost",
  ],
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
