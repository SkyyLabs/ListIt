import React from 'react';
import { APP_NAME } from '../config/constants';

export default function Footer({ onNavigate }) {
  return (
    <footer className="mt-auto border-t border-white/70 bg-white/70 px-4 py-8 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-slate-950">{APP_NAME}</div>
          <div className="mt-1 text-sm text-slate-500">
            Shared lists. Personal progress.
          </div>
        </div>
        <nav className="flex flex-wrap gap-2">
          {[
            ['about', 'About'],
            ['help', 'Help'],
            ['contact', 'Contact']
          ].map(([page, label]) => (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className="secondary-button"
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </footer>
  );
}
