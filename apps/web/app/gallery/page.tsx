import { redirect } from 'next/navigation';

export const metadata = { title: 'KyberStation — Gallery' };

export default function GalleryPage() {
  redirect('/editor?tab=gallery');
}
