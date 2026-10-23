// When hosted under a subpath (e.g. GitHub Pages), set NEXT_PUBLIC_BASE_PATH
// at build time, e.g. "/my-first-project/pilgrimage". Empty for local dev.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: base,
};

export default nextConfig;
