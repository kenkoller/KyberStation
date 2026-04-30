/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // CSP is enforced via <meta httpEquiv> in layout.tsx for production builds.
  // headers() is not served with output: 'export' and actively breaks
  // dev mode by blocking Next.js inline scripts, so it is removed.
  transpilePackages: [
    '@kyberstation/engine',
    '@kyberstation/codegen',
    '@kyberstation/presets',
    '@kyberstation/sound',
  ],
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Resolve .js imports to .ts source files in workspace packages
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
