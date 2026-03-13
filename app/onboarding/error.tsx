'use client';
import { useSession } from 'next-auth/react';

export default function OnboardingError({ error, reset }: { error: Error; reset: () => void }) {
  const { data: session } = useSession();

  if (session?.user?.id) {
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: 'orchestrator_unhandled_error',
        message: error.message,
      }),
    }).catch(() => {});
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07080e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-inter)',
      color: '#eef0ff',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-syne)', marginBottom: '0.75rem' }}>
          Something went wrong
        </h2>
        <p style={{ color: '#737aaa', marginBottom: '1.5rem' }}>
          Your progress is saved. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            background: 'linear-gradient(148deg, #6c5ce7, #00cec9)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            padding: '0.75rem 1.5rem',
            cursor: 'pointer',
            fontFamily: 'var(--font-inter)',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
