import './globals.css';

export const metadata = {
  title: { default: 'ModerationDesk', template: '%s · ModerationDesk' },
  description: 'Enterprise-grade moderation, verification, security and server operations for Discord communities.'
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
