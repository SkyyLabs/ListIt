import React from 'react';

export default function InlineError({ message, className = '' }) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={`rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 ${className}`.trim()}
      role="alert"
    >
      {message}
    </p>
  );
}
