import { ImageOff } from 'lucide-react';

// Event banners are often poster-style graphics (arbitrary aspect ratio,
// text baked into the image). A plain object-fit: cover crops that text
// unpredictably depending on the container's aspect ratio. This renders a
// blurred, scaled copy of the image as a backdrop and letterboxes the
// actual image on top with object-fit: contain, so the full banner is
// always visible regardless of its native proportions.
const EventBanner = ({ src, alt = '', aspect = '16 / 7', className = '', icon: Icon = ImageOff }) => (
  <div className={`ev-banner-frame ${className}`} style={{ aspectRatio: aspect }}>
    {src ? (
      <>
        <div className="ev-banner-bg" style={{ backgroundImage: `url(${src})` }} />
        <img src={src} alt={alt} className="ev-banner-fg" />
      </>
    ) : (
      <div className="ev-banner-fallback">
        <Icon size={28} strokeWidth={1.5} />
      </div>
    )}
  </div>
);

export default EventBanner;
