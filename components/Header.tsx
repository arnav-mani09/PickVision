import React from 'react';

interface HeaderProps {
  title: string;
  subtitle: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  return (
    <header className="w-full max-w-4xl py-6 text-center">
      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
        {title}
      </h1>
      <p className="mt-2 text-lg text-gray-400">{subtitle}</p>
    </header>
  );
};