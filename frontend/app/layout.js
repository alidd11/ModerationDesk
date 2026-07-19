import './globals.css';
import Script from 'next/script';

export const metadata = {
  title: { default: 'ModerationDesk', template: '%s · ModerationDesk' },
  description: 'Cases, structured logging, automated enforcement, raid protection and verification for Discord moderation teams.',
  applicationName: 'ModerationDesk',
  robots: { index: true, follow: true },
  openGraph: { title: 'ModerationDesk', description: 'Run Discord moderation from one control room.', type: 'website' }
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1014' }
  ]
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Script id="device-colour-scheme" strategy="beforeInteractive">
        {`document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';`}
      </Script>
      <body>
        {children}
      </body>
    </html>
  );
}
