/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Webpack config for Prisma support
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure Prisma client is properly bundled
      config.externals = config.externals || [];
      config.externals.push('@prisma/client');
    }
    return config;
  },
}

module.exports = nextConfig
