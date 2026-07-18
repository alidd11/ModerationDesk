import { notFound } from 'next/navigation';
import ProductPageContent from '../../../components/ProductPageContent';
import { getProductArea, productAreas } from '../../../content/productAreas';

export function generateStaticParams() {
  return productAreas.map(area => ({ area: area.id }));
}

export async function generateMetadata({ params }) {
  const { area: areaId } = await params;
  const area = getProductArea(areaId);
  if (!area) return {};
  return { title: area.label, description: area.description };
}

export default async function ProductAreaPage({ params }) {
  const { area: areaId } = await params;
  const area = getProductArea(areaId);
  if (!area) notFound();
  return <ProductPageContent area={area} />;
}
