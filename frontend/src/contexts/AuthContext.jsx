import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { isAdminFromClaims } from '../utils/authClaims';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState({});
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = auth.onAuthStateChanged(async nextUser => {
      if (cancelled) {
        return;
      }

      setUser(nextUser);

      if (!nextUser) {
        setClaims({});
        setAuthReady(true);
        return;
      }

      try {
        const tokenResult = await nextUser.getIdTokenResult();
        if (!cancelled) {
          setClaims(tokenResult.claims || {});
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setClaims({});
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const isAdmin = isAdminFromClaims(claims);

  const value = {
    user,
    claims,
    authReady,
    isAuthenticated: Boolean(user),
    isAdmin,
    login: () => signInWithPopup(auth, googleProvider),
    logout: () => signOut(auth)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
