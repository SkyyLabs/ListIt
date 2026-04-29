import React from 'react';
import NavBar from './components/NavBar';
import LandingPage from './components/LandingPage';
import ListView from './components/ListView';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user, login, logout } = useAuth();

  return (
    <div className="flex min-h-full flex-col">
      <NavBar user={user} onLogin={login} onLogout={logout} />
      <main className={`flex-1 overflow-auto ${user ? 'p-6' : ''}`}>
        {user ? <ListView user={user} /> : <LandingPage onLogin={login} />}
      </main>
    </div>
  );
}

export default App;
