import React, { useState } from 'react';
import './UploadForm.css';

export default function UploadForm() {
  const [formData, setFormData] = useState({
    title: '',
    content: '', 
    category: '',
    pdfFile: null,
    thumbnailFile: null,
  });

  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'pdfFile' || name === 'thumbnailFile') {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.content || !formData.category || !formData.pdfFile) {
      setMessage('❌ Please fill in all required fields.');
      return;
    }

    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('content', formData.content);
    payload.append('category', formData.category);
    payload.append('pdf', formData.pdfFile);
    if (formData.thumbnailFile) {
      payload.append('thumbnail', formData.thumbnailFile);
    }

    try {
      const res = await fetch('http://localhost:5000/api/pdf/upload', {
        method: 'POST',
        body: payload,
      });

      const data = await res.json();
      setMessage(data.msg || '✅ Upload successful!');
    } catch (err) {
      console.error(err);
      setMessage('❌ Upload failed.');
    }
  };

  return (
    <div className="form-container">
      <h2>Upload PDF Metadata</h2>
      <form onSubmit={handleSubmit}>
        <label>Title<span className="star">*</span></label>
        <input type="text" name="title" value={formData.title} onChange={handleChange} required />

        <label>Content<span className="star">*</span></label>
        <textarea name="content" value={formData.content} onChange={handleChange} required />

        <label>Category<span className="star">*</span></label>
        <input type="text" name="category" value={formData.category} onChange={handleChange} required />

        <label>PDF File<span className="star">*</span></label>
        <input type="file" name="pdfFile" accept="application/pdf" onChange={handleChange} required />

        <label>Thumbnail (optional)</label>
        <input type="file" name="thumbnailFile" accept="image/*" onChange={handleChange} />

        <button type="submit">Upload</button>
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
}
