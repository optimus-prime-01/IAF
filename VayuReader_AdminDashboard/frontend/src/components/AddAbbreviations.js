import React, { useState } from 'react';
import axios from 'axios';

export default function AddAbbreviations() {
  const [abbreviation, setAbbreviation] = useState('');
  const [meaning, setMeaning] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!abbreviation.trim() || !meaning.trim()) {
      setMessage('Please fill in both fields.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/abbreviation/add', {
        abbreviation,
        meaning,
      });

      if (response.status === 201) {
        setMessage('✅ Abbreviation added successfully!');
        setAbbreviation('');
        setMeaning('');
      } else {
        setMessage('Something went wrong.');
      }
    } catch (error) {
      console.error('Error submitting abbreviation:', error);
      setMessage('❌ Error adding abbreviation.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Add Abbreviation</h2>

        {message && (
          <div className="mb-4 text-center text-sm font-medium text-blue-800 bg-blue-100 px-4 py-2 rounded">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Abbreviation</label>
            <input
              type="text"
              value={abbreviation}
              onChange={(e) => setAbbreviation(e.target.value)}
              placeholder="e.g., AI"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Meaning</label>
            <textarea
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder="e.g., Artificial Intelligence"
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
