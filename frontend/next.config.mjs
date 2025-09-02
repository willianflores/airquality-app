/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ⚠️ Perigoso: desabilita verificação de tipos durante o build
    // Usar apenas temporariamente para resolver problemas urgentes
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ Perigoso: desabilita verificação de ESLint durante o build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;


