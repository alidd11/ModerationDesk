import Shell from '../../components/Shell';

export const metadata = { title: 'Terms' };

export default function TermsPage() {
  return <Shell compact><article className="legal"><span className="section-kicker">LEGAL</span><h1>Terms of service</h1><p className="legal-date">Last updated 18 July 2026</p><h2>Using the service</h2><p>You must follow Discord’s Terms of Service, Developer Terms and Community Guidelines when using ModerationDesk. You are responsible for the configuration and moderation actions performed in servers you manage.</p><h2>Migration and verification</h2><p>ModerationDesk does not silently transfer members between Discord servers. Each member must join or authorise individually before identity checks or mapped-role restoration can occur.</p><h2>Availability</h2><p>We work to keep the service reliable, but availability is not guaranteed. Features may change as Discord’s platform and safety requirements evolve.</p><h2>Acceptable use</h2><p>You may not use ModerationDesk to evade platform safeguards, collect credentials, operate self-bots, harass users or facilitate unlawful activity.</p></article></Shell>;
}
