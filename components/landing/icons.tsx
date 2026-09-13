import React from 'react';

type IconProps = { className?: string };

const base = 'w-7 h-7';

export const BrainIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 4.5a2.5 2.5 0 0 0-2.5 2.5v.2A3 3 0 0 0 4.5 10v1a3 3 0 0 0 1.2 2.4A2.98 2.98 0 0 0 5 15.5 3 3 0 0 0 8 18.5h.5A2.5 2.5 0 0 0 11 21V6.5A2 2 0 0 0 9 4.5Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 4.5a2.5 2.5 0 0 1 2.5 2.5v.2a3 3 0 0 1 2 2.8v1a3 3 0 0 1-1.2 2.4A2.98 2.98 0 0 1 19 15.5a3 3 0 0 1-3 3h-.5A2.5 2.5 0 0 1 13 21V6.5a2 2 0 0 1 2-2Z"
    />
  </svg>
);

export const BoltIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" />
  </svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3.5 5 6v5.5c0 4.4 3 8.2 7 9.5 4-1.3 7-5.1 7-9.5V6l-7-2.5Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.5 11 14.5 15 10" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <circle cx="10.5" cy="10.5" r="6" strokeLinecap="round" strokeLinejoin="round" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-4.8-4.8" />
  </svg>
);

export const ListChecksIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 6 1.5 1.5L8 4.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 6h9.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 13 1.5 1.5L8 11.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 13h9.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 20 1.5 1.5L8 18.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 20h9.5" />
  </svg>
);

export const ChatIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 5h16v11H8l-4 4V5Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h8M8 12.5h5" />
  </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.5 2.3 2.3L15.5 9.5" />
  </svg>
);
