import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Compass } from 'lucide-react';
import { useTour } from '../../context/TourContext';
import { TOUR_STYLES } from './tourStyles';

const VIEWPORT_PADDING = 16;
const getCenterCardWidth = (viewportW) =>
  viewportW <= 480 ? Math.min(300, viewportW - 32) : Math.min(360, viewportW - 40);

const TourWelcomeModal = () => {
  const { showWelcome, dismissWelcome, startTour } = useTour();
  const cardRef = useRef(null);
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = TOUR_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Prevent stray horizontal scroll from pushing this fixed, centered card
  // off-screen on mobile, and make sure it opens centered.
  useEffect(() => {
    if (!showWelcome) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflowX = html.style.overflowX;
    const prevBodyOverflowX = body.style.overflowX;
    html.style.overflowX = 'hidden';
    body.style.overflowX = 'hidden';
    window.scrollTo({ left: 0, top: window.scrollY });
    return () => {
      html.style.overflowX = prevHtmlOverflowX;
      body.style.overflowX = prevBodyOverflowX;
    };
  }, [showWelcome]);

  // Center using real pixel math instead of CSS 50%/transform — on some pages
  // a transformed ancestor gives position:fixed a containing block wider than
  // the visible screen, which throws off percentage-based centering.
  useLayoutEffect(() => {
    if (!showWelcome) return;
    const compute = () => {
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const cardW = getCenterCardWidth(viewportW);
      const cardH = cardRef.current?.offsetHeight || 320;
      setCardPos({
        top: Math.max(VIEWPORT_PADDING, (viewportH - cardH) / 2),
        left: Math.max(VIEWPORT_PADDING, (viewportW - cardW) / 2),
      });
    };
    compute();
    const raf = requestAnimationFrame(compute);
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, [showWelcome]);

  if (!showWelcome) return null;

  return (
    <div className="tour-root" style={{ '--tour-dim': 'rgba(0,0,0,0.6)' }}>
      <div className="tour-spotlight-center" onClick={dismissWelcome} />
      <div
        className="tour-card-center"
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        style={{ top: cardPos.top, left: cardPos.left }}
      >
        <div className="tour-welcome-icon">
          <div className="tour-welcome-ring" />
          <Compass size={28} color="#4ade80" />
        </div>
        <h3 className="tour-welcome-title">You're in! 🎉</h3>
        <p className="tour-welcome-sub">
          Want a quick guided tour of spotNplay? We'll show you how to go live, find players,
          build a group, and join events — takes about a minute.
        </p>
        <div className="tour-welcome-actions">
          <button className="tour-welcome-btn-start" onClick={() => startTour()}>🚀 Start the guide</button>
          <button className="tour-welcome-btn-later" onClick={dismissWelcome}>Maybe later</button>
        </div>
      </div>
    </div>
  );
};

export default TourWelcomeModal;
