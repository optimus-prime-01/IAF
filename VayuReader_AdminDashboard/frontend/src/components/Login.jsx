import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [name, setName] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') {
      localStorage.setItem('admin', JSON.stringify({ name, officerId }));
      navigate('/dashboard');
    } else {
      alert("Invalid password");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
        <input className="w-full mb-4 p-2 border rounded" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
        <input className="w-full mb-4 p-2 border rounded" placeholder="Officer ID" value={officerId} onChange={e => setOfficerId(e.target.value)} required />
        <input type="password" className="w-full mb-6 p-2 border rounded" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Login</button>
      </form>
    </div>
  );
}
