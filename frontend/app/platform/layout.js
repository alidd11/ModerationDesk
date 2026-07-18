import Shell from '../../components/Shell';

export default function PlatformLayout({ children }) {
  return (
    <Shell>
      <section className="product-route-shell">{children}</section>
    </Shell>
  );
}
