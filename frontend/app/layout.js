import './globals.css';

export const metadata = {
  title: { default: 'ModerationDesk', template: '%s · ModerationDesk' },
  description: 'All-in-one moderation, verification, security and server operations for Discord communities.',
  applicationName: 'ModerationDesk',
  robots: { index: true, follow: true },
  openGraph: { title: 'ModerationDesk', description: 'Run your Discord community without the chaos.', type: 'website' }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        {children}
      </body>
    </html>
  );
}
