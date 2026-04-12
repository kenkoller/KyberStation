'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ShareRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Forward the hash fragment to /editor
    const hash = window.location.hash;
    router.replace(`/editor${hash}`);
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center bg-bg-primary text-text-primary font-mono">
      <p className="text-text-muted text-sm">Loading shared configuration...</p>
    </div>
  );
}
