"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function SensoresPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionar para a nova localização administrativa
    router.push('/admin/sensores-monitoramento');
  }, [router]);

  return (
    <main className="flex-1 sm:ml-56 min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50" role="main" aria-label="Página de monitoramento de sensores">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-gray-600">Redirecionando para a área administrativa...</p>
          </div>
        </div>
      </div>
    </main>
  );
}
