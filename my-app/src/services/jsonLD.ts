/**
 * JSON-LD Structured Data Helper
 * Generates structured data for Naana's Kitchen
 */

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: "Naana's Kitchen",
  description: 'Servizi di catering professionale con piatti gourmet. Specializzato in carne, pesce, piatti vegetariani e dessert.',
  url: 'https://naanaskitchen.com',
  logo: 'https://naanaskitchen.com/logo.jpg',
  email: 'info@naanaskitchen.com',
  phone: '+39 06 1234 5678',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Via Roma 1',
    addressLocality: 'Roma',
    addressRegion: 'RM',
    postalCode: '00100',
    addressCountry: 'IT',
  },
  sameAs: [
    'https://www.facebook.com/naanaskitchen',
    'https://www.instagram.com/naanaskitchen',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    telephone: '+39 06 1234 5678',
    email: 'info@naanaskitchen.com',
  },
};

export const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://naanaskitchen.com',
  name: "Naana's Kitchen",
  description: 'Servizi di catering professionale',
  url: 'https://naanaskitchen.com',
  image: 'https://naanaskitchen.com/logo.jpg',
  telephone: '+39 06 1234 5678',
  email: 'info@naanaskitchen.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Via Roma 1',
    addressLocality: 'Roma',
    addressRegion: 'RM',
    postalCode: '00100',
    addressCountry: 'IT',
  },
  serves: {
    '@type': 'City',
    name: 'Roma',
  },
  priceRange: '$$$$',
  serviceType: 'Catering',
};

export const foodServiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'FoodService',
  name: "Naana's Kitchen",
  description: 'Catering professionale con menu personalizzato',
  url: 'https://naanaskitchen.com',
  hasMenu: {
    '@type': 'Menu',
    hasMenuSection: [
      {
        '@type': 'MenuSection',
        name: 'Piatti di Carne',
      },
      {
        '@type': 'MenuSection',
        name: 'Piatti di Pesce',
      },
      {
        '@type': 'MenuSection',
        name: 'Piatti Vegetariani',
      },
      {
        '@type': 'MenuSection',
        name: 'Dessert',
      },
    ],
  },
};

export const breadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});
