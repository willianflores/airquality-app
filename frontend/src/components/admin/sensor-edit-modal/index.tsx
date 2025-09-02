"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { buildApiUrl } from '@/utils/apiConfig';
import Cookies from 'js-cookie';
import { 
  X, 
  Save, 
  MapPin, 
  Building, 
  Mail, 
  User, 
  Hash, 
  Navigation 
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

interface SensorEditModalProps {
  sensor?: Sensor;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  mode: 'create' | 'edit';
}

export function SensorEditModal({ sensor, isOpen, onClose, onSave, mode }: SensorEditModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    sensor_index: '',
    name: '',
    municipio: '',
    institution: '',
    location: '',
    active: true,
    latitude: '',
    longitude: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Resetar form quando modal abre/fecha ou sensor muda
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && sensor) {
        setFormData({
          code: sensor.code || '',
          sensor_index: sensor.sensor_index || '',
          name: sensor.name || '',
          municipio: sensor.municipio || '',
          institution: sensor.institution || '',
          location: sensor.location || '',
          active: sensor.active,
          latitude: sensor.latitude?.toString() || '',
          longitude: sensor.longitude?.toString() || ''
        });
      } else {
        // Modo criar - limpar form
        setFormData({
          code: '',
          sensor_index: '',
          name: '',
          municipio: '',
          institution: '',
          location: '',
          active: true,
          latitude: '',
          longitude: ''
        });
      }
      setError('');
    }
  }, [isOpen, sensor, mode]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.code.trim()) {
      setError('Código do sensor é obrigatório');
      return false;
    }
    if (!formData.sensor_index.trim()) {
      setError('ID PurpleAir é obrigatório');
      return false;
    }
    if (!formData.name.trim()) {
      setError('Nome do sensor é obrigatório');
      return false;
    }
    if (!formData.municipio.trim()) {
      setError('Município é obrigatório');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const token = Cookies.get('admin_token');
      
      const requestData = {
        code: formData.code.trim().toUpperCase(),
        sensor_index: formData.sensor_index.trim(),
        name: formData.name.trim(),
        municipio: formData.municipio.trim(),
        institution: formData.institution.trim() || null,
        location: formData.location.trim() || null,
        active: formData.active,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null
      };

      const url = mode === 'create' 
        ? buildApiUrl('admin/sensors')
        : buildApiUrl(`admin/sensors/${sensor?.id}`);
      
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (data.success) {
        onSave(); // Callback para atualizar lista
        onClose(); // Fechar modal
      } else {
        setError(data.error || 'Erro ao salvar sensor');
      }
    } catch (err) {
      setError('Erro de conexão ao salvar sensor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Criar Novo Sensor' : 'Editar Sensor'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Código */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Hash className="w-4 h-4 inline mr-1" />
                Código do Sensor*
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                placeholder="Ex: RBR1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={10}
              />
            </div>

            {/* ID PurpleAir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Navigation className="w-4 h-4 inline mr-1" />
                ID PurpleAir*
              </label>
              <input
                type="text"
                value={formData.sensor_index}
                onChange={(e) => handleInputChange('sensor_index', e.target.value)}
                placeholder="Ex: 25549"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Nome do Sensor*
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: MPAC_RBR_01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Município */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Município*
              </label>
              <input
                type="text"
                value={formData.municipio}
                onChange={(e) => handleInputChange('municipio', e.target.value)}
                placeholder="Ex: Rio Branco"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Instituição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building className="w-4 h-4 inline mr-1" />
                Instituição
              </label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => handleInputChange('institution', e.target.value)}
                placeholder="Ex: MPAC, UFAC"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Localização */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Localização
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Ex: promotoria, prefeitura, escola"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Coordenadas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => handleInputChange('latitude', e.target.value)}
                placeholder="Ex: -9.9749"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => handleInputChange('longitude', e.target.value)}
                placeholder="Ex: -67.8243"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Sensor ativo
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full border-2 border-white border-t-transparent h-4 w-4 mr-2"></div>
                Salvando...
              </div>
            ) : (
              <div className="flex items-center">
                <Save className="w-4 h-4 mr-2" />
                {mode === 'create' ? 'Criar Sensor' : 'Salvar Alterações'}
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
