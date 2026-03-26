/** @type {import('next').NextConfig} */
const nextConfig = {
  // reactStrictMode disabled — double-render in dev was causing perceived slowness.
  // Re-enable before production audit if needed.
  reactStrictMode: false,
  swcMinify: true,
  transpilePackages: ['bootstrap', 'react-toastify'],
  compiler: {
    styledComponents: true,
  },
};

module.exports = nextConfig;
