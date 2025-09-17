
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, id, className = '', ...props }) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>}
      <input
        id={inputId}
        className={`block w-full bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm p-2 ${className}`}
        {...props}
      />
    </div>
  );
};