/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@neondatabase/serverless"],
  images: {
    formats: ["image/webp"],
  },
};

export default nextConfig;
