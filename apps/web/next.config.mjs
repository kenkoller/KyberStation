/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@bladeforge/engine',
    '@bladeforge/codegen',
    '@bladeforge/presets',
    '@bladeforge/sound',
    '@bladeforge/boards',
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
