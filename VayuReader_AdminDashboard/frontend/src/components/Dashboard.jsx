import React from 'react';
import UploadForm from './UploadForm';
import Search from './Search';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">📄 Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <UploadForm />
        <Search />
      </div>
    </div>
  );
}

