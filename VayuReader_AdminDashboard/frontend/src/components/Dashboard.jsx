import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const cards = [
    { title: 'Search Engine', route: '/search' },
    { title: 'Add Dictionary Words', route: '/add-dictionary-words' },
    { title: 'Upload User Guide', route: '/upload-user-guide' },
    { title: 'Add Abbreviations', route: '/add-abbreviations' },
  ];

  return (
    <div className="p-10 grid grid-cols-2 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white p-8 rounded-xl shadow-md text-center text-lg font-bold cursor-pointer hover:bg-blue-100"
          onClick={() => navigate(card.route)}
        >
          {card.title}
        </div>
      ))}
    </div>
  );
}
