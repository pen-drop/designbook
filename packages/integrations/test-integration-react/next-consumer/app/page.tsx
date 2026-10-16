import Page from '../components/page/page';
import SiteHeader from '../components/site-header/site-header';
import SiteNav from '../components/site-nav/site-nav';
import SiteFooter from '../components/site-footer/site-footer';
import CatalogGrid from '../components/catalog-grid/catalog-grid';
import BookCard from '../components/book-card/book-card';
import BookDetail from '../components/book-detail/book-detail';
import ClientCard from './client-card';

export default function Home() {
  return (
    <Page
      header={<SiteHeader storeName="Prosaic" nav={<SiteNav links={[{ label: 'Catalog', url: '/catalog' }]} />} />}
      content={
        <>
          <CatalogGrid>
            <BookCard
              title="The Quiet Harbor"
              author="Mira Lindqvist"
              price="$18.50"
              coverUrl="/cover.png"
              status="in_stock"
              actions={<button type="button">Add to cart</button>}
            />
            <ClientCard />
          </CatalogGrid>
          <BookDetail title="The Quiet Harbor" summary="A lighthouse keeper's last summer." publisher="Harbor Press" />
        </>
      }
      footer={<SiteFooter copyright="© Prosaic Books" />}
    />
  );
}
