// components/AdminRoute.tsx
import React from 'react';
import AdminPanel from './AdminPanel';

const AdminRoute: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <AdminPanel />
    </div>
  );
};

export default AdminRoute;