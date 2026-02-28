import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent MIME type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Enable XSS filter in older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Control referrer information
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  // Bật gzip/brotli compression cho tất cả responses
  compress: true,
  // Tối ưu hình ảnh: chuyển sang WebP/AVIF, lazy load, responsive srcset
  images: {
    formats: ['image/avif', 'image/webp'],
    // Các breakpoint thiết bị phổ biến (mobile-first)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache ảnh đã optimize 30 ngày trên CDN
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Cho phép tối ưu ảnh từ các domain ngoài (Cloudinary, uploadthing, v.v.)
    remotePatterns: [
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: '**.utfs.io' },
      { protocol: 'https', hostname: '**.ufs.sh' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig;
