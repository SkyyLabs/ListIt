import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import InlineError from './InlineError';

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState('');

  async function handleLogin() {
    try {
      setError('');
      await login();
    } catch {
      setError('Login failed. Please try again.');
    }
  }

  return (
    <div className="text-center mt-20">
      <InlineError message={error} className="mx-auto mb-4 max-w-sm text-left" />
      <button
        onClick={handleLogin}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        Sign in with Google
      </button>
    </div>
  );
}
