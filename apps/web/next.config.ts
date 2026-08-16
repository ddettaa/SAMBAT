import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
      {
        source: "/geoserver/:path*",
        destination: "https://geoportal.banjarmasinkota.go.id/geoserver/:path*",
      },
    ];
  },
};

export default nextConfig;
