import React, { useState } from 'react';
import axios from 'axios';

export default function SearchEngine() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post('https://iaf-search-engine.onrender.com/api/pdfs', {
        title,
        content,
        serverUrl,
        pdfUrl
      });

      alert('✅ Uploaded successfully');
      setTitle('');
      setContent('');
      setServerUrl('');
      setPdfUrl('');
    } catch (err) {
      console.error('❌ Upload failed', err);
      alert('❌ Failed to upload');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-xl font-bold mb-6 text-center">Upload PDF Metadata</h2>

        <input
          className="w-full mb-4 p-2 border rounded"
          placeholder="PDF Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />

        <textarea
          className="w-full mb-4 p-2 border rounded"
          placeholder="PDF Content Summary"
          value={content}
          onChange={e => setContent(e.target.value)}
          required
        />

        <input
          className="w-full mb-4 p-2 border rounded"
          placeholder="Server URL"
          value={serverUrl}
          onChange={e => setServerUrl(e.target.value)}
          required
        />

        <input
          className="w-full mb-6 p-2 border rounded"
          placeholder="PDF URL"
          value={pdfUrl}
          onChange={e => setPdfUrl(e.target.value)}
          required
        />

        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Upload</button>
      </form>
    </div>
  );
}
