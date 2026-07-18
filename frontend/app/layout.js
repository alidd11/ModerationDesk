import './globals.css';

export const metadata = {
  title: { default: 'ModerationDesk', template: '%s · ModerationDesk' },
  description: 'Cases, structured logging, automated enforcement, raid protection and verification for Discord moderation teams.',
  applicationName: 'ModerationDesk',
  robots: { index: true, follow: true },
  openGraph: { title: 'ModerationDesk', description: 'Run Discord moderation from one control room.', type: 'website' }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
