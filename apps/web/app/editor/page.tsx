'use client';
import { AppShell } from '@/components/layout/AppShell';
import { useSharedConfig } from '@/hooks/useSharedConfig';

export default function EditorPage() {
  const { shareError } = useSharedConfig();

  return (
    <>
      {shareError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md bg-red-900/80 border border-red-700/50 text-red-300 text-ui-xs font-mono shadow-lg">
          {shareError}
        </div>
      )}
      <AppShell />
    </>
  );
}
