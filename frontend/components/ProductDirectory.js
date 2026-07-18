import Link from 'next/link';
import ProductNavigation from './ProductNavigation';

export default function ProductDirectory() {
  return (
    <section className="product-directory" id="platform">
      <header className="product-directory-heading">
        <div><span className="section-kicker">EXPLORE MODERATIONDESK</span><h2>Open the part of the platform you need.</h2></div>
        <p>Use the product sidebar to move into a dedicated page for each area. The homepage stays focused; the detail lives where it belongs.</p>
      </header>
      <ProductNavigation>
        <article className="product-directory-intro">
          <span className="product-page-kicker">PRODUCT GUIDE</span>
          <h3>Six connected areas.<br />Six clear pages.</h3>
          <p>Start with the overview, or choose a specific area from the sidebar. Every item has its own address, so you can bookmark it, share it and return to it directly.</p>
          <div className="directory-points">
            <span>Moderation records</span><span>Layered protection</span><span>Member access</span><span>Server operations</span>
          </div>
          <Link className="button button-large" href="/platform/overview">Start with overview <span aria-hidden="true">→</span></Link>
        </article>
      </ProductNavigation>
    </section>
  );
}
