import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  devIndicators: false,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/tasks',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
