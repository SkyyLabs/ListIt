import React, { useEffect, useState } from 'react';
import NavBar from './components/NavBar';
import LandingPage from './components/LandingPage';
import ListView from './components/ListView';
import InvitationAcceptPage from './components/InvitationAcceptPage';
import Footer from './components/Footer';
import InfoPage from './components/InfoPage';
import { useAuth } from './contexts/AuthContext';

function getPageFromPath(pathname) {
  if (pathname === '/discover') return 'discover';
  if (pathname === '/about') return 'about';
  if (pathname === '/help') return 'help';
  if (pathname === '/contact') return 'contact';
  return 'home';
}

function App() {
  const { user, login, logout } = useAuth();
  const inviteMatch = window.location.pathname.match(/^\/invites\/([^/]+)$/);
  const [page, setPage] = useState(() => getPageFromPath(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => {
      setPage(getPageFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = nextPage => {
    const path = nextPage === 'home' ? '/' : `/${nextPage}`;
    window.history.pushState({}, '', path);
    setPage(nextPage);
  };

  const renderContent = () => {
    if (inviteMatch) {
      return <InvitationAcceptPage token={inviteMatch[1]} />;
    }

    if (['about', 'help', 'contact'].includes(page)) {
      return <InfoPage page={page} />;
    }

    if (user) {
      return <ListView user={user} viewMode={page === 'discover' ? 'discover' : 'home'} />;
    }

    return <LandingPage onLogin={login} />;
  };

  return (
    <div className="app-shell flex min-h-full flex-col">
      <NavBar
        currentPage={page}
        user={user}
        onLogin={login}
        onLogout={logout}
        onNavigate={navigate}
      />
      <main className={`flex-1 overflow-auto ${user || inviteMatch ? 'px-4 py-6 sm:px-6 lg:px-8' : ''}`}>
        {renderContent()}
      </main>
      <Footer onNavigate={navigate} />
    </div>
  );
}

export default App;
