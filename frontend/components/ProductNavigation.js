'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { productAreas } from '../content/productAreas';

export default function ProductNavigation({ children }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`public-product-layout ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
      <button className="product-mobile-trigger" type="button" aria-expanded={mobileOpen} onClick={() => setMobileOpen(value => !value)}>
        <span>Product menu</span><span aria-hidden="true">{mobileOpen ? 'Close' : 'Open'}</span>
      </button>
      <aside className="public-product-sidebar" aria-label="Product navigation">
        <div className="public-sidebar-head">
          <span>Product</span>
          <button type="button" onClick={() => setCollapsed(value => !value)} aria-expanded={!collapsed} aria-label={collapsed ? 'Expand product sidebar' : 'Collapse product sidebar'}>
            <span aria-hidden="true">{collapsed ? '→' : '←'}</span>
          </button>
        </div>
        <nav>
          {productAreas.map(area => {
            const href = `/platform/${area.id}`;
            const active = pathname === href;
            return (
              <Link href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} aria-label={collapsed ? area.label : undefined} onClick={() => setMobileOpen(false)} key={area.id}>
                <span className="public-sidebar-number">{area.number}</span>
                <span className="public-sidebar-label">{area.label}</span>
                <span className="public-sidebar-arrow" aria-hidden="true">→</span>
              </Link>
            );
          })}
        </nav>
        <div className="public-sidebar-foot"><span>Need to configure a server?</span><Link href="/dashboard">Open dashboard →</Link></div>
      </aside>
      <div className="public-product-content">{children}</div>
    </div>
  );
}
