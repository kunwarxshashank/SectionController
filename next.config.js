/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],
}

module.exports = nextConfig
