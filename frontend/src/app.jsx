import React from 'react';
import NavBar from './components/NavBar';
import ListView from './components/ListView';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user, login, logout } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <NavBar user={user} onLogin={login} onLogout={logout} />
      <main className="flex-1 overflow-auto p-6">
        <ListView user={user} />
      </main>
    </div>
  );
}

export default App;
