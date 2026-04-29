import React from 'react';

export default function InlineError({ message, className = '' }) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={`rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ${className}`.trim()}
      role="alert"
    >
      {message}
    </p>
  );
}
