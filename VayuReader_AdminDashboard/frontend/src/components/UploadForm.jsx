import React, { useState } from 'react';
import axios from 'axios';

export default function UploadForm() {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("No file selected");
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('pdf', file);

    try {
      await axios.post('http://localhost:5000/api/pdf/upload', formData, {
        headers: {
          'x-auth-token': 'fake-token-for-now'  // Replace with real token later
        }
      });
      alert('PDF uploaded successfully');
      setTitle('');
      setFile(null);
    } catch (err) {
      alert("Upload failed");
    }
  };

  return (
    <form onSubmit={handleUpload} className="bg-white p-6 rounded shadow">
      <h3 className="text-xl font-semibold mb-4">Upload New PDF</h3>
      <input type="text" placeholder="PDF Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded mb-4" required />
      <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} className="w-full p-2 mb-4" required />
      <button type="submit" className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">Upload</button>
    </form>
  );
}
