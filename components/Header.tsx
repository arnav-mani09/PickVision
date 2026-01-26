import React from 'react';
import type { User } from '../types';
import { Button } from './ui/Button';


interface HeaderProps {
  title: string;
  subtitle:string;
  user?: User | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, user, onLogout }) => {
  return (
    <header className="w-full max-w-4xl py-6 text-center">
      {onLogout && (
        <div className="flex justify-end items-center mb-4 px-2">
          <Button onClick={onLogout} variant="secondary" size="sm">Sign Out</Button>
        </div>
      )}
      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600">
        {title}
      </h1>
      <p className="mt-2 text-lg text-gray-400">{subtitle}</p>
    </header>
  );
};
