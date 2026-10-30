/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mastra runs server-side only (API routes); keep it external so Next does
  // not try to bundle its Node runtime into the route chunks.
  serverExternalPackages: ['@mastra/core'],
};
export default nextConfig;
