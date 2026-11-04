import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Oasis',
    short_name: 'Oasis',
    description: 'A two-player hex-tile strategy game for the family.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF6EC',
    theme_color: '#FBF6EC',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
