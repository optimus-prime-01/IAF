import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const cards = [
    { title: 'Upload Pdf', route: '/search' },
    { title: 'Add Dictionary Words', route: '/add-dictionary-words' },
    { title: 'Add Abbreviations', route: '/add-abbreviations' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-sky-800 flex flex-col items-center justify-center p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        {cards.map((card, index) => (
          <div
            key={index}
            onClick={() => navigate(card.route)}
            className="bg-white text-slate-800 rounded-2xl shadow-xl hover:shadow-2xl transition duration-300 ease-in-out p-10 text-center text-2xl font-semibold cursor-pointer hover:bg-blue-100 hover:scale-105"
          >
            {card.title}
          </div>
        ))}
      </div>
    </div>
  );
}
