import React from 'react';
import NavBar from './components/NavBar';
import LandingPage from './components/LandingPage';
import ListView from './components/ListView';
import InvitationAcceptPage from './components/InvitationAcceptPage';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user, login, logout } = useAuth();
  const inviteMatch = window.location.pathname.match(/^\/invites\/([^/]+)$/);

  return (
    <div className="app-shell flex min-h-full flex-col">
      <NavBar user={user} onLogin={login} onLogout={logout} />
      <main className={`flex-1 overflow-auto ${user || inviteMatch ? 'px-4 py-6 sm:px-6 lg:px-8' : ''}`}>
        {inviteMatch
          ? <InvitationAcceptPage token={inviteMatch[1]} />
          : user ? <ListView user={user} /> : <LandingPage onLogin={login} />}
      </main>
    </div>
  );
}

export default App;
