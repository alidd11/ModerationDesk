import './globals.css';

export const metadata = {
  title: { default: 'ModerationDesk', template: '%s · ModerationDesk' },
  description: 'Cases, automated enforcement, security and verification for Discord moderation teams.',
  applicationName: 'ModerationDesk',
  robots: { index: true, follow: true },
  openGraph: { title: 'ModerationDesk', description: 'Moderation without the bot pile.', type: 'website' }
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
