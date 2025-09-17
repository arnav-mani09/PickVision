
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-gray-900 shadow-xl rounded-lg overflow-hidden border border-gray-800 ${className}`}>
      {children}
    </div>
  );
};