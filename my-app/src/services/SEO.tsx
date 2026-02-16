import { Helmet } from 'react-helmet-async';
import { organizationSchema } from './jsonLD';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  keywords?: string;
  locale?: string;
  schema?: Record<string, any>;
}

export const SEO: React.FC<SEOProps> = ({
  title = "Naana's Kitchen - Catering Professionale",
  description = "Scopri i nostri servizi di catering professionale. Piatti gourmet per ogni occasione, dalla carne al pesce, vegetariano a dessert raffinati.",
  image = 'https://naanaskitchen.com/logo.jpg',
  url = 'https://naanaskitchen.com',
  type = 'website',
  author = "Naana's Kitchen",
  keywords = 'catering, catering roma, catering milano, servizio catering, pranzo aziendale, evento privato, food service',
  locale = 'it_IT',
  schema = organizationSchema,
}) => {
  // Ensure title is properly formatted
  const fullTitle = title.includes("Naana's Kitchen") ? title : `${title} | Naana's Kitchen`;

  return (
    <Helmet>
      <html lang="it" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content={locale} />
      <meta property="og:site_name" content="Naana's Kitchen" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Additional SEO */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta charSet="utf-8" />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={url} />
      
      {/* Favicon and manifest */}
      <link rel="icon" type="image/svg+xml" href="/vite.svg" />
      
      {/* Preconnect to external resources */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />

      {/* JSON-LD Structured Data */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
