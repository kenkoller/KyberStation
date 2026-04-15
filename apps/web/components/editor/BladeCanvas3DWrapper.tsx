'use client';
import dynamic from 'next/dynamic';

/**
 * Dynamic import wrapper for BladeCanvas3D.
 * Three.js / @react-three/fiber cannot render on the server,
 * so we must disable SSR for this component.
 */
const BladeCanvas3D = dynamic(
  () => import('@/components/editor/BladeCanvas3D').then((mod) => mod.BladeCanvas3DInner),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-bg-deep text-text-muted text-ui-xs">
        Loading 3D view...
      </div>
    ),
  },
);

export { BladeCanvas3D };
