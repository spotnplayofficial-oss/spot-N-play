import { Helmet } from 'react-helmet-async';

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://spot-n-play.com').replace(/\/$/, '');
const SITE_NAME = 'SpotNPlay';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const TWITTER_HANDLE = '@spotnplayofficial';

export default function SEO({
  title,
  description,
  canonical,
  image,
  type = 'website',
  noindex = false,
  keywords,
  jsonLd,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Find Players, Book Grounds, Never Miss a Game`;
  const desc = description || 'SpotNPlay connects you with nearby players, premium grounds, coaches and tournaments. Book venues, join events, find your squad and play — all in one place.';
  const url = canonical ? `${SITE_URL}${canonical.startsWith('/') ? canonical : `/${canonical}`}` : SITE_URL;
  const ogImage = image || DEFAULT_IMAGE;
  const kw = keywords || 'spotnplay, book sports ground, find players near me, football ground booking, cricket ground, sports booking app, LPU sports, phagwara sports';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="keywords" content={kw} />
      <link rel="canonical" href={url} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : <meta name="robots" content="index, follow, max-image-preview:large" />}
      <meta name="author" content="SpotNPlay" />
      <meta name="theme-color" content="#4ade80" />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}

export { SITE_URL };
