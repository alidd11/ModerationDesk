import Link from 'next/link';

export default function ProductDirectory() {
  return (
    <section className="product-directory" id="platform">
      <div><span className="section-kicker">PRODUCT GUIDE</span><h2>Explore the platform without crowding the homepage.</h2></div>
      <p>The menu in the top-left opens every ModerationDesk product page. Start with the overview for the complete picture.</p>
      <Link className="button button-large" href="/platform/overview">Explore the platform <span aria-hidden="true">→</span></Link>
    </section>
  );
}
