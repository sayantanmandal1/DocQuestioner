/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Output configuration
  output: 'standalone',
};

export default nextConfig;
