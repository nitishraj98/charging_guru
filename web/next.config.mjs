/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
  experimental: {
    // Pre-compile all routes when the dev server starts so first-visit
    // latency is eliminated. Without this, Next.js compiles each page
    // lazily on first request (causing the 2-5s freeze you see in dev).
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
};

export default nextConfig;
