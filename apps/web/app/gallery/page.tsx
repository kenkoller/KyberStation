'use client';

import { Suspense } from 'react';
import { GalleryPage } from '@/components/gallery/GalleryPage';

export default function GalleryRoute() {
  return (
    <Suspense fallback={null}>
      <GalleryPage />
    </Suspense>
  );
}
