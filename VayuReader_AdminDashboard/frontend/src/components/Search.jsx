import React, { useState } from 'react';
import axios from 'axios';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/pdf/search?query=${query}`);
      setResults(res.data);
    } catch {
      alert("Search failed");
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-xl font-semibold mb-4">Search PDFs</h3>
      <input
        type="text"
        placeholder="Search by title/content"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full p-2 border rounded mb-4"
      />
      <button onClick={handleSearch} className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">Search</button>
      <ul className="mt-4">
        {results.map((pdf) => (
          <li key={pdf._id} className="mt-2">
            <a
              href={`http://localhost:5000/api/pdf/view/${pdf._id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline"
            >
              {pdf.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
