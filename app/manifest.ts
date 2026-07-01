import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dira POS',
    short_name: 'Dira',
    description: 'QR table ordering and point of sale for Kenyan cafés',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0c0c0c',
    theme_color: '#16a34a',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'POS',
        url: '/pos',
        description: 'Open the point of sale',
      },
      {
        name: 'Kitchen',
        url: '/kitchen',
        description: 'Open the kitchen display',
      },
    ],
  }
}
