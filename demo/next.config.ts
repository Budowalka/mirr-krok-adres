import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Paczka wydaje źródło TypeScript — Next je transpiluje.
  transpilePackages: ['mirr-krok-adres'],
};

export default nextConfig;
