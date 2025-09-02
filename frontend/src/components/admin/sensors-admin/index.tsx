"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { SensorEditModal } from '@/components/admin/sensor-edit-modal';
import { buildApiUrl } from '@/utils/apiConfig';
import Cookies from 'js-cookie';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Power, 
  PowerOff, 
  Search, 
  MapPin, 
  Activity,
  LogOut,
  Shield,
  Users
} from 'lucide-react';

interface Sensor {
  id: number;
  code: string;
  sensor_index: string;
  name: string;
  municipio: string;
  institution?: string;
  location?: string;
  active: boolean;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export function SensorsAdminPage() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedSensor, setSelectedSensor] = useState<Sensor | undefined>(undefined);
  
  const { admin, logout } = useAuth();

  useEffect(() => {
    loadSensors();
  }, []);

  const loadSensors = async () => {
    try {
      const token = Cookies.get('admin_token');
      
      const response = await fetch(buildApiUrl('admin/sensors'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setSensors(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erro ao carregar sensores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSensorStatus = async (id: number, active: boolean) => {
    try {
      const token = Cookies.get('admin_token');
      const action = active ? 'deactivate' : 'activate';
      
      const response = await fetch(buildApiUrl(`admin/sensors/${id}/${action}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        loadSensors(); // Recarregar lista
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erro ao alterar status do sensor');
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedSensor(undefined);
    setShowModal(true);
  };

  const openEditModal = (sensor: Sensor) => {
    setModalMode('edit');
    setSelectedSensor(sensor);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedSensor(undefined);
    setError('');
  };

  const handleModalSave = () => {
    loadSensors(); // Recarregar lista após salvar
  };

  const filteredSensors = sensors.filter(sensor =>
    sensor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sensor.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sensor.municipio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeSensors = sensors.filter(s => s.active).length;
  const inactiveSensors = sensors.filter(s => !s.active).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Carregando sensores...</p>
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
                    Administração MPAC
                  </h1>
                  <p className="text-sm text-gray-500">Gestão de Sensores</p>
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Sensores Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{activeSensors}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PowerOff className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Sensores Inativos</p>
                <p className="text-2xl font-bold text-gray-900">{inactiveSensors}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Sensores</p>
                <p className="text-2xl font-bold text-gray-900">{sensors.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar sensores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <Button
                onClick={openCreateModal}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Sensor
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Sensors Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sensor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Município
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instituição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID PurpleAir
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSensors.map((sensor) => (
                  <tr key={sensor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {sensor.code}
                          </div>
                          <div className="text-sm text-gray-500">
                            {sensor.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sensor.municipio}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sensor.institution || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sensor.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sensor.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {sensor.sensor_index}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleSensorStatus(sensor.id, sensor.active)}
                          className={sensor.active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                        >
                          {sensor.active ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(sensor)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {admin?.role === 'super_admin' && (
                          <Button
                            size="sm"
                            variant="outline"
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

          {filteredSensors.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum sensor encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Tente buscar com outros termos.' : 'Comece criando um novo sensor.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição/Criação */}
      <SensorEditModal
        sensor={selectedSensor}
        isOpen={showModal}
        onClose={closeModal}
        onSave={handleModalSave}
        mode={modalMode}
      />
    </div>
  );
}
