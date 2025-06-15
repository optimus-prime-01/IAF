import React, { useState } from 'react';
import axios from 'axios';

export default function AddDictionaryWords() {
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/dictionary', {
        word,
        meaning
      });
      setMessage(res.data.msg);
      setWord('');
      setMeaning('');
    } catch (err) {
      setMessage('Failed to submit');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200 px-4">

      <form onSubmit={handleSubmit} className="bg-white shadow-xl p-8 rounded-xl w-full max-w-md space-y-6">
        <h2 className="text-2xl font-bold text-center">Add Dictionary Word</h2>

        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Word"
          className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-yellow-300"
          required
        />
        <textarea
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          placeholder="Meaning"
          className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring focus:ring-yellow-300"
          rows={4}
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200"
        >
          Submit
        </button>

        {message && <p className="text-center text-green-600 font-medium">{message}</p>}
      </form>
    </div>
  );
}
