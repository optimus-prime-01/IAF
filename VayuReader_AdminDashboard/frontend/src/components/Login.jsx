import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

 
export default function Login() {
  const [officerId, setOfficerId] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        officerId,
        password
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('officerId', res.data.officerId);

      navigate('/dashboard');
    } catch (err) {
      alert('Invalid credentials ❌');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
        <input className="w-full mb-4 p-2 border rounded" placeholder="Officer ID" value={officerId} onChange={e => setOfficerId(e.target.value)} required />
        <input type="password" className="w-full mb-6 p-2 border rounded" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Login</button>
      </form>
    </div>
  );
}
