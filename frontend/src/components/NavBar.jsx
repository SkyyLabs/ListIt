import React from 'react';
import { APP_NAME } from '../config/constants';

export default function NavBar({ user, onLogin, onLogout }) {
  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-200/70 bg-white/80 px-6 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div>
          <div className="text-2xl font-semibold text-slate-900">{APP_NAME}</div>
          {!user && (
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Shared lists. Personal progress.
            </div>
          )}
        </div>
      <div>
        {user ? (
          <button
            onClick={onLogout}
            className="rounded-full bg-red-500 px-4 py-2 text-white transition hover:bg-red-600"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={onLogin}
            className="rounded-full bg-slate-900 px-5 py-2 text-white transition hover:bg-slate-700"
          >
            Sign in with Google
          </button>
        )}
      </div>
      </div>
    </header>
  );
}
