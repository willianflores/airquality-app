"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-red-900">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <ShieldAlert className="w-10 h-10 text-red-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">
          Acesso Negado
        </h1>
        
        <p className="text-red-100 mb-8 leading-relaxed">
          Você não tem permissão para acessar esta área. 
          Entre em contato com o administrador do sistema se precisar de acesso.
        </p>
        
        <div className="space-y-3">
          <Button
            onClick={() => router.back()}
            className="w-full bg-white text-red-600 hover:bg-red-50 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="w-full border-white text-white hover:bg-white hover:text-red-600"
          >
            <Home className="w-4 h-4 mr-2" />
            Ir para Home
          </Button>
        </div>
      </div>
    </div>
  );
}
