import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  // 웹훅 등록 검증: NICE가 /webhook/ (끝에 슬래시)로 호출하면 리다이렉트(307/308) 대신 200이 나가도록
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/payment/nicepay/webhook/',
          destination: '/api/payment/nicepay/webhook',
        },
      ],
    }
  },
}

export default nextConfig
