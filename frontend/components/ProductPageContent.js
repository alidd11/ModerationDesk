import Link from 'next/link';
import { productAreas } from '../content/productAreas';

export default function ProductPageContent({ area }) {
  const currentIndex = productAreas.findIndex(item => item.id === area.id);
  const previous = productAreas[(currentIndex - 1 + productAreas.length) % productAreas.length];
  const next = productAreas[(currentIndex + 1) % productAreas.length];

  return (
    <article className="product-detail-page">
      <header className="product-detail-hero">
        <span className="product-page-kicker">{area.number} / {area.kicker}</span>
        <h1>{area.title}</h1>
        <p>{area.description}</p>
        <div className="hero-actions"><a className="button button-large" href="https://discord.com/oauth2/authorize?client_id=1528046559923666944&permissions=1099914374358&scope=bot%20applications.commands" target="_blank" rel="noreferrer">Install on Discord <span aria-hidden="true">→</span></a><Link className="button ghost button-large" href="/dashboard">Open dashboard</Link></div>
      </header>

      <section className="product-capability-section" aria-labelledby="capability-heading">
        <div className="product-detail-section-head"><span>WHAT IT COVERS</span><h2 id="capability-heading">The controls in {area.label.toLowerCase()}.</h2></div>
        <div className="product-detail-grid">
          {area.capabilities.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="product-process-section" aria-labelledby="process-heading">
        <div className="product-detail-section-head"><span>HOW IT WORKS</span><h2 id="process-heading">A straightforward operating flow.</h2></div>
        <ol>{area.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></li>)}</ol>
      </section>

      <aside className="product-outcome"><span>THE RESULT</span><p>{area.outcome}</p></aside>

      <nav className="product-page-pagination" aria-label="Product pages">
        <Link href={`/platform/${previous.id}`}><span>Previous</span><strong>← {previous.label}</strong></Link>
        <Link href={`/platform/${next.id}`}><span>Next</span><strong>{next.label} →</strong></Link>
      </nav>
    </article>
  );
}
