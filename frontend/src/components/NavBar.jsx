import React from 'react';
import { APP_NAME } from '../config/constants';

export default function NavBar({ user, onLogin, onLogout }) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/70 bg-white/78 px-4 py-3 shadow-[0_12px_40px_-34px_rgba(15,23,42,0.7)] backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-semibold text-white shadow-[0_16px_30px_-20px_rgba(15,23,42,0.9)]">
            Li
          </div>
          <div>
            <div className="text-2xl font-semibold leading-none text-slate-950">{APP_NAME}</div>
            {user && (
              <div className="mt-1 text-xs font-medium text-slate-500">
                {user.displayName || user.email || 'Signed in'}
              </div>
            )}
          </div>
          {!user && (
            <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500 sm:block">
              Shared lists. Personal progress.
            </div>
          )}
        </div>
        {user ? (
          <button
            onClick={onLogout}
            className="secondary-button"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={onLogin}
            className="primary-button"
          >
            Sign in with Google
          </button>
        )}
      </div>
    </header>
  );
}
