"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SensorsAdminPage } from '@/components/admin/sensors-admin';

export default function AdminSensoresPage() {
  return (
    <ProtectedRoute requireRole={['admin', 'super_admin']}>
      <div className="min-h-screen bg-gray-50">
        <SensorsAdminPage />
      </div>
    </ProtectedRoute>
  );
}
