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
  output: {
    // Define explicitamente o diretório raiz do projeto para evitar warning de múltiplos lockfiles
    outputFileTracingRoot: '/home/willianflores/localhost/airquality-app/frontend',
  },
};

export default nextConfig;


