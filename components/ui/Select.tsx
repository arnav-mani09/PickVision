
import React from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({ label, id, options, className = '', ...props }) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="w-full">
      {label && <label htmlFor={selectId} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>}
      <select
        id={selectId}
        className={`block w-full bg-gray-800 border-gray-700 text-gray-100 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm p-2 h-[42px] ${className}`}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value} className="bg-gray-800 text-gray-100">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};