import React, { useEffect, useState } from 'react';
import NavBar from './components/NavBar';
import LandingPage from './components/LandingPage';
import ListView from './components/ListView';
import InvitationAcceptPage from './components/InvitationAcceptPage';
import Footer from './components/Footer';
import InfoPage from './components/InfoPage';
import { useAuth } from './contexts/AuthContext';

function getPageFromPath(pathname) {
  if (pathname === '/') return 'landing';
  if (pathname === '/home') return 'home';
  if (pathname === '/discover') return 'discover';
  if (pathname === '/about') return 'about';
  if (pathname === '/help') return 'help';
  if (pathname === '/contact') return 'contact';
  return 'landing';
}

function App() {
  const { user, login, logout } = useAuth();
  const inviteMatch = window.location.pathname.match(/^\/invites\/([^/]+)$/);
  const [page, setPage] = useState(() => getPageFromPath(window.location.pathname));
  const [allowLandingForSignedIn, setAllowLandingForSignedIn] = useState(false);
  const mainOverflowClass = page === 'help' ? 'overflow-visible' : 'overflow-auto';

  useEffect(() => {
    const handlePopState = () => {
      setPage(getPageFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (user && page === 'landing' && !inviteMatch && !allowLandingForSignedIn) {
      window.history.replaceState({}, '', '/home');
      setPage('home');
    }
  }, [allowLandingForSignedIn, inviteMatch, page, user]);

  const navigate = (nextPage, options = {}) => {
    const path = nextPage === 'landing' ? '/' : `/${nextPage}`;
    window.history.pushState({}, '', path);
    setAllowLandingForSignedIn(Boolean(options.allowSignedInLanding && nextPage === 'landing'));
    setPage(nextPage);
  };

  const handleLogout = async () => {
    await logout();
    navigate('discover');
  };

  const renderContent = () => {
    if (inviteMatch) {
      return <InvitationAcceptPage token={inviteMatch[1]} />;
    }

    if (['about', 'help', 'contact'].includes(page)) {
      return <InfoPage page={page} />;
    }

    if (page === 'discover') {
      return <ListView user={user} viewMode="discover" />;
    }

    if (user && page === 'home') {
      return <ListView user={user} viewMode="home" />;
    }

    return <LandingPage onDiscover={() => navigate('discover')} onLogin={login} />;
  };

  return (
    <div className="app-shell flex min-h-full flex-col">
      <NavBar
        currentPage={page}
        user={user}
        onLogin={login}
        onLogout={handleLogout}
        onNavigate={navigate}
        onNavigateLanding={() => navigate('landing', { allowSignedInLanding: true })}
      />
      <main className={`flex-1 ${mainOverflowClass} ${user || inviteMatch ? 'px-4 py-6 sm:px-6 lg:px-8' : ''}`}>
        {renderContent()}
      </main>
      <Footer onNavigate={navigate} />
    </div>
  );
}

export default App;
