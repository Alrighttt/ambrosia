export const APP_META = {
  appId: 'ab70051a00000000000000000000000000000000000000000000000000000001',
  name: 'Ambrosia',
  description: 'Ambrosia — your scrapbook of the internet. Save videos and posts to your own Sia archive.',
  serviceUrl: 'https://github.com/SiaFoundation/ambrosia',
  logoUrl: undefined,
  callbackUrl: undefined,
};

export const DEFAULT_INDEXER_URL = 'https://sia.storage';

// Self-hosted Cobalt instance the web app talks to by default. Users can
// override by setting `ambrosia.cobaltUrl` in localStorage.
export const DEFAULT_COBALT_URL = 'https://ambrosia-cobalt.fly.dev';

// Page-meta scraping service — exposes a /scrape endpoint the web app
// calls to fetch og:title / og:description / Reddit post data when the
// source platform doesn't allow direct browser fetches via CORS. The
// fly app is named for historical reasons; today it's a generic
// scraper + Facebook media proxy.
export const DEFAULT_META_URL = 'https://ambrosia-youtube-pot.fly.dev';
