/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
      "nodemailer",
      "@supabase/supabase-js",
      "@supabase/ssr",
    ],
  },
};

export default nextConfig;
