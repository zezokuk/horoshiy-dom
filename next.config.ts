import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Vercel: база и картинки едут в каждую серверную функцию (см. dbUrl в payload.config.ts)
  outputFileTracingIncludes: { '/*': ['./platform.db', './media/**/*'], '/**/*': ['./platform.db', './media/**/*'] },
  // витрина на Vercel: корень сразу ведёт на v4 (локально «/» остаётся v2 для сравнения)
  async redirects() {
    return process.env.VERCEL ? [{ source: '/', destination: '/v4', permanent: false }] : []
  },
  devIndicators: false, // no «N» badge in the corner: the prototype is recorded on video from the dev server too
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
