
import React from 'react';

export const Header: React.FC = () => (
  <header className="text-center">
    <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 mb-2">
      KASHI MOBILE SHOP
    </h2>
    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
      Ink to Text Converter
    </h1>
    <p className="mt-2 text-lg text-slate-400">
      Upload handwritten notes and instantly convert them to formatted digital text.
    </p>
  </header>
);
