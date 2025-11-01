/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporarily disable standalone mode to fix runtime module issues
  // output: 'standalone',

  // Fix workspace root detection warning
  outputFileTracingRoot: require('path').join(__dirname, '../../../'),
}

module.exports = nextConfig