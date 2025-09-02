"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  User, 
  Mail, 
  Eye, 
  EyeOff,
  LogOut 
} from 'lucide-react';

interface Admin {
  id: number;
  username: string;
  email: string;
  role: string;
  active: boolean;
  last_login?: string;
  created_at: string;
}

export default function AdminUsuariosPage() {
  return (
    <ProtectedRoute requireRole={['super_admin']}>
      <AdminUsersPage />
    </ProtectedRoute>
  );
}

function AdminUsersPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { admin, logout } = useAuth();

  // Simulação - em produção viria da API
  useEffect(() => {
    // Simular carregamento
    setTimeout(() => {
      setAdmins([
        {
          id: 1,
          username: 'admin.mpac',
          email: 'admin@mpac.ac.gov.br',
          role: 'super_admin',
          active: true,
          last_login: '2024-08-30T18:30:00Z',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          username: 'operador.mpac',
          email: 'operador@mpac.ac.gov.br',
          role: 'admin',
          active: true,
          last_login: '2024-08-29T15:20:00Z',
          created_at: '2024-01-15T00:00:00Z'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Gestão de Usuários
                  </h1>
                  <p className="text-sm text-gray-500">Administradores do Sistema</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{admin?.username}</p>
                <p className="text-xs text-gray-500 capitalize">{admin?.role?.replace('_', ' ')}</p>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Coming Soon Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <Shield className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-blue-900">
                Gestão de Usuários via Interface Web
              </h3>
              <p className="text-blue-700 mt-1">
                Esta funcionalidade está em desenvolvimento. Atualmente, novos usuários são criados via:
              </p>
              <ul className="text-blue-700 mt-2 ml-4 space-y-1">
                <li>• <strong>Variáveis de ambiente</strong> (método atual)</li>
                <li>• <strong>Scripts do backend</strong> para gerar credenciais</li>
                <li>• <strong>Interface web</strong> (em breve!)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Current Users Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Usuários Atuais
              </h2>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário (Em breve)
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((adminUser) => (
                  <tr key={adminUser.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {adminUser.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {adminUser.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {adminUser.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        adminUser.role === 'super_admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        adminUser.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {adminUser.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {adminUser.last_login 
                        ? new Date(adminUser.last_login).toLocaleString('pt-BR')
                        : 'Nunca'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {adminUser.id !== admin?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* How to Create Users */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Como Criar Novos Usuários (Método Atual)
          </h3>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">1. Execute o script gerador:</h4>
              <code className="bg-gray-800 text-green-400 px-3 py-2 rounded text-sm block">
                cd backend && node scripts/addNewAdmin.js
              </code>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">2. Adicione as variáveis ao .env:</h4>
              <code className="bg-gray-800 text-green-400 px-3 py-2 rounded text-sm block">
                ADMIN_USERNAME_3="novo.admin"<br/>
                ADMIN_EMAIL_3="admin@mpac.ac.gov.br"<br/>
                ADMIN_PASSWORD_HASH_3="$2b$10$..."
              </code>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">3. Atualize o AdminSecure.js</h4>
              <p className="text-sm text-gray-600">
                Adicione o novo usuário na lista de administradores
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">4. Reinicie o backend</h4>
              <code className="bg-gray-800 text-green-400 px-3 py-2 rounded text-sm block">
                npm run dev
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}