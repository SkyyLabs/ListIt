import React, { useEffect, useState } from 'react';
import InlineError from './InlineError';
import { acceptInvitation, fetchInvitation } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function InvitationAcceptPage({ token }) {
  const { authReady, isAuthenticated, login, user } = useAuth();
  const [invitation, setInvitation] = useState(null);
  const [acceptedList, setAcceptedList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchInvitation(token)
      .then(nextInvitation => {
        if (!cancelled) {
          setInvitation(nextInvitation);
          setError('');
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.response?.data || err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      await login();
      return;
    }

    setAccepting(true);
    setError('');
    try {
      const list = await acceptInvitation(token);
      setAcceptedList(list);
    } catch (err) {
      setError(err.response?.data || err.message);
    } finally {
      setAccepting(false);
    }
  };

  const goToApp = () => {
    window.history.pushState({}, '', '/');
    window.location.reload();
  };

  const invitedEmail = invitation?.email;
  const signedInEmail = user?.email?.toLowerCase();
  const emailMismatch = Boolean(
    authReady
    && isAuthenticated
    && invitedEmail
    && signedInEmail !== invitedEmail
  );

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
      <div className="surface w-full max-w-xl rounded-[32px] p-6 sm:p-8">
        <div className="chip mb-4">ListIt invitation</div>
        <h1 className="text-3xl font-semibold text-slate-950">
          {acceptedList ? 'Invitation accepted' : 'Accept collaboration invite'}
        </h1>

        {loading ? (
          <p className="mt-4 text-sm text-slate-600">Loading invitation…</p>
        ) : (
          <>
            <InlineError message={error} className="mt-4" />

            {invitation && !acceptedList && (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-500">List</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">
                  {invitation.list.title}
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  Invited email: <span className="font-semibold">{invitation.email}</span>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Permissions: <span className="font-semibold">{invitation.permissions.join(', ')}</span>
                </div>
              </div>
            )}

            {emailMismatch && (
              <InlineError
                className="mt-4"
                message={`You are signed in as ${user.email}. Sign in as ${invitedEmail} to accept this invitation.`}
              />
            )}

            {acceptedList && (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                You are now a collaborator on <span className="font-semibold">{acceptedList.title}</span>.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              {acceptedList ? (
                <button onClick={goToApp} className="primary-button">
                  Open ListIt
                </button>
              ) : (
                <button
                  onClick={handleAccept}
                  disabled={accepting || !invitation || emailMismatch}
                  className="primary-button"
                >
                  {!isAuthenticated ? 'Sign in to accept' : accepting ? 'Accepting…' : 'Accept Invitation'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
