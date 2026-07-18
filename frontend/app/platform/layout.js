import Shell from '../../components/Shell';
import ProductNavigation from '../../components/ProductNavigation';

export default function PlatformLayout({ children }) {
  return (
    <Shell>
      <section className="product-route-shell">
        <ProductNavigation>{children}</ProductNavigation>
      </section>
    </Shell>
  );
}
