import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  allowedDevOrigins: [
    "web.nexgentech.site",
    "nexgentech.site",
    "*.nexgentech.site",
    "65.2.127.88",
    "65.2.127.88:80",
    "65.2.127.88:8000",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
  async rewrites() {
    const isProd = process.env.NODE_ENV === "production";
    const defaultTarget = isProd
      ? "http://127.0.0.1:8000"
      : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const apiTarget = process.env.INTERNAL_API_URL || defaultTarget;

    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
      {
        source: "/ws",
        destination: `${apiTarget}/ws`,
      },
    ];
  },
  async headers() {
    if (process.env.NODE_ENV !== "production") {
      return [
        {
          source: "/((?!_next).*)",
          headers: [
            {
              key: "Cache-Control",
              value: "no-store, no-cache, must-revalidate, proxy-revalidate",
            },
            {
              key: "Pragma",
              value: "no-cache",
            },
            {
              key: "Expires",
              value: "0",
            },
          ],
        },
      ];
    }
    return [
      {
        source: "/:all*(svg|png|jpg|jpeg|webp|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
