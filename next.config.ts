import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',      // Static HTML export for Cloudflare Pages
  trailingSlash: true,   // Required for Cloudflare Pages routing
  images: {
    unoptimized: true,   // Static export doesn't support Next.js image optimization
  },
};

export default nextConfig;
