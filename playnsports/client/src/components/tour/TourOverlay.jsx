import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { useTour } from '../../context/TourContext';
import { TOUR_STYLES } from './tourStyles';

const CARD_MARGIN = 14; // gap between spotlight and tooltip card
const VIEWPORT_PADDING = 16;

// Mirrors the .tour-card width rules in tourStyles.js so the JS positioning
// math always matches what's actually rendered on screen.
const getCardWidth = (viewportW) =>
  viewportW <= 480 ? Math.min(280, viewportW - 32) : Math.min(300, viewportW - 40);

// Mirrors the .tour-card-center width rules in tourStyles.js.
const getCenterCardWidth = (viewportW) =>
  viewportW <= 480 ? Math.min(300, viewportW - 32) : Math.min(360, viewportW - 40);

const TourOverlay = () => {
  const { active, currentStep, stepIndex, totalSteps, nextStep, prevStep, stopTour } = useTour();

  const [rect, setRect] = useState(null);
  const [placement, setPlacement] = useState('bottom');
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const [searching, setSearching] = useState(false);

  const elRef = useRef(null);
  const cardRef = useRef(null);
  const pollRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const isCenter = active && currentStep && !currentStep.target;

  // ── Inject styles once ──
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = TOUR_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // ── Prevent the page from being horizontally scrolled while the tour is
  //     active — on mobile a stray horizontal scroll position (e.g. left over
  //     from a horizontally-scrollable filter row) can drag fixed-position
  //     elements off-screen in some mobile browsers, which is what was
  //     pushing the welcome/finish cards out of view ──
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflowX = html.style.overflowX;
    const prevBodyOverflowX = body.style.overflowX;
    html.style.overflowX = 'hidden';
    body.style.overflowX = 'hidden';
    return () => {
      html.style.overflowX = prevHtmlOverflowX;
      body.style.overflowX = prevBodyOverflowX;
    };
  }, [active]);

  // ── The center steps (welcome/finish) have no target to scroll to, so make
  //     sure any leftover horizontal scroll is reset before they show ──
  useEffect(() => {
    if (active && isCenter) {
      window.scrollTo({ left: 0, top: window.scrollY });
    }
  }, [active, isCenter]);

  // ── Track theme so the dim color reads correctly in light/dark ──
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const measure = useCallback(() => {
    if (!elRef.current) return;
    const r = elRef.current.getBoundingClientRect();
    setRect({
      top: r.top - 8,
      left: r.left - 8,
      width: r.width + 16,
      height: r.height + 16,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      rawTop: r.top,
      rawLeft: r.left,
      rawRight: r.right,
      rawBottom: r.bottom,
    });
  }, []);

  // ── Find the target element for the current step (with a fallback + polling) ──
  useEffect(() => {
    clearInterval(pollRef.current);
    clearTimeout(searchTimeoutRef.current);
    elRef.current = null;
    setRect(null);

    if (!active || !currentStep) return;
    if (!currentStep.target) return; // center step, nothing to find

    setSearching(true);
    let attempts = 0;
    const maxAttempts = 40; // ~4s at 100ms

    pollRef.current = setInterval(() => {
      attempts += 1;
      const el = document.querySelector(currentStep.target) || (currentStep.fallback && document.querySelector(currentStep.fallback));
      if (el) {
        clearInterval(pollRef.current);
        elRef.current = el;
        setSearching(false);
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        searchTimeoutRef.current = setTimeout(measure, 380);
      } else if (attempts >= maxAttempts) {
        clearInterval(pollRef.current);
        setSearching(false);
        setRect(null); // will render as a centered card with no spotlight
      }
    }, 100);

    return () => {
      clearInterval(pollRef.current);
      clearTimeout(searchTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, currentStep?.id]);

  // ── Keep the spotlight glued to the element on resize/scroll ──
  useEffect(() => {
    if (!active || !elRef.current) return;
    const onUpdate = () => measure();
    window.addEventListener('resize', onUpdate);
    window.addEventListener('scroll', onUpdate, true);
    const ro = new ResizeObserver(onUpdate);
    ro.observe(elRef.current);
    return () => {
      window.removeEventListener('resize', onUpdate);
      window.removeEventListener('scroll', onUpdate, true);
      ro.disconnect();
    };
  }, [active, rect !== null, measure]);

  // ── Re-run positioning on resize/orientation change (covers rotating a phone,
  //     the mobile keyboard opening/closing, or no-target-found fallback cards) ──
  const [repositionTick, forceReposition] = useState(0);
  useEffect(() => {
    if (!active) return;
    const onResize = () => forceReposition((n) => n + 1);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [active]);

  // ── Compute tooltip position + placement, flipping if it would overflow ──
  useEffect(() => {
    if (!active || isCenter) return;
    if (!rect) {
      // No element found — float the card in the lower-center of the viewport
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const cardW = getCardWidth(viewportW);
      const cardH = cardRef.current?.offsetHeight || 190;
      setCardPos({
        top: Math.max(VIEWPORT_PADDING, viewportH - cardH - VIEWPORT_PADDING * 2),
        left: Math.min(Math.max(viewportW / 2 - cardW / 2, VIEWPORT_PADDING), viewportW - cardW - VIEWPORT_PADDING),
      });
      setPlacement('none');
      return;
    }

    // card width mirrors the CSS `width: min(340px, calc(100vw - 32px))` so the
    // math below always matches what's actually rendered on any screen size
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const isNarrow = viewportW < 640;
    const cardW = getCardWidth(viewportW);
    const cardH = Math.min(cardRef.current?.offsetHeight || 190, viewportH - VIEWPORT_PADDING * 2);
    const spaceBelow = viewportH - rect.rawBottom;
    const spaceAbove = rect.rawTop;
    const spaceRight = viewportW - rect.rawRight;
    const spaceLeft = rect.rawLeft;

    let placeDir = currentStep.placement || 'bottom';
    // on narrow/mobile screens there's rarely room beside the target, so
    // side placements collapse to bottom (falling back to top if needed)
    if (isNarrow && (placeDir === 'left' || placeDir === 'right')) placeDir = 'bottom';
    // flip if not enough room
    if (placeDir === 'bottom' && spaceBelow < cardH + CARD_MARGIN && spaceAbove > spaceBelow) placeDir = 'top';
    if (placeDir === 'top' && spaceAbove < cardH + CARD_MARGIN && spaceBelow > spaceAbove) placeDir = 'bottom';
    if (placeDir === 'left' && spaceLeft < cardW + CARD_MARGIN && spaceRight > spaceLeft) placeDir = 'right';
    if (placeDir === 'right' && spaceRight < cardW + CARD_MARGIN && spaceLeft > spaceRight) placeDir = 'left';

    let top, left;
    if (placeDir === 'bottom') {
      top = rect.rawBottom + CARD_MARGIN;
      left = rect.cx - cardW / 2;
    } else if (placeDir === 'top') {
      top = rect.rawTop - cardH - CARD_MARGIN;
      left = rect.cx - cardW / 2;
    } else if (placeDir === 'left') {
      top = rect.cy - cardH / 2;
      left = rect.rawLeft - cardW - CARD_MARGIN;
    } else { // right
      top = rect.cy - cardH / 2;
      left = rect.rawRight + CARD_MARGIN;
    }

    // clamp inside viewport
    left = Math.min(Math.max(left, VIEWPORT_PADDING), viewportW - cardW - VIEWPORT_PADDING);
    top = Math.min(Math.max(top, VIEWPORT_PADDING), viewportH - cardH - VIEWPORT_PADDING);

    setPlacement(placeDir);
    setCardPos({ top, left });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rect, active, currentStep, isCenter, repositionTick]);

  // ── Center the welcome/finish cards using real pixel math instead of CSS
  //     50%/transform centering. On some pages a transformed ancestor gives
  //     position:fixed a containing block that's wider than the visible
  //     screen, which throws off percentage-based centering but NOT plain
  //     pixel top/left values — the same reason the arrow-pointing cards
  //     above were never affected. This keeps both approaches consistent. ──
  useLayoutEffect(() => {
    if (!active || !isCenter) return;
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
    // re-measure a frame later in case content/fonts shift the card's height
    const raf = requestAnimationFrame(compute);
    return () => cancelAnimationFrame(raf);
  }, [active, isCenter, currentStep?.id, repositionTick]);

  // ── Keyboard controls ──
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') stopTour();
      else if (!typing && e.key === 'ArrowRight') nextStep();
      else if (!typing && e.key === 'ArrowLeft') prevStep();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, nextStep, prevStep, stopTour]);

  if (!active || !currentStep) return null;

  const dim = isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.48)';
  const isLast = stepIndex === totalSteps - 1;

  return (
    <div className="tour-root" style={{ '--tour-dim': dim }}>
      <div className="tour-backdrop" onClick={(e) => e.stopPropagation()} />

      {isCenter ? (
        <div className="tour-spotlight-center" />
      ) : rect ? (
        <div
          className="tour-spotlight"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      ) : null}

      {isCenter ? (
        <div className="tour-card-center" ref={cardRef} style={{ top: cardPos.top, left: cardPos.left }}>
          <button className="tour-close-x" onClick={stopTour} aria-label="Close guide"><X size={14} /></button>
          <div className="tour-welcome-icon">
            <div className="tour-welcome-ring" />
            {currentStep.icon || <Sparkles size={26} />}
          </div>
          <h3 className="tour-welcome-title">{currentStep.title}</h3>
          <p className="tour-welcome-sub">{currentStep.content}</p>
          <TourProgress stepIndex={stepIndex} totalSteps={totalSteps} />
          <div className="tour-actions" style={{ marginTop: 6 }}>
            {stepIndex > 0 ? (
              <button className="tour-btn-back" onClick={prevStep}><ChevronLeft size={13} /></button>
            ) : <span />}
            <button className="tour-btn-skip" onClick={stopTour}>Skip guide</button>
            <button className="tour-btn-next" onClick={isLast ? stopTour : nextStep}>
              {isLast ? 'Finish' : 'Next'} {!isLast && <ChevronRight size={13} />}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="tour-card"
          ref={cardRef}
          style={{ top: cardPos.top, left: cardPos.left }}
        >
          {placement !== 'none' && (
            <span className={`tour-arrow tour-arrow-${placement === 'top' ? 'bottom' : placement === 'bottom' ? 'top' : placement === 'left' ? 'right' : 'left'}`}
              style={
                placement === 'top' || placement === 'bottom'
                  ? { left: '50%', marginLeft: -7 }
                  : { top: '50%', marginTop: -7 }
              }
            />
          )}
          <button className="tour-close-x" onClick={stopTour} aria-label="Close guide"><X size={13} /></button>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingRight: 20 }}>
            <div className="tour-badge">{currentStep.icon || '✨'}</div>
            <div style={{ minWidth: 0 }}>
              <p className="tour-step-label">Step {stepIndex} of {totalSteps - 1}{searching ? ' · locating…' : ''}</p>
              <h4 className="tour-title">{currentStep.title}</h4>
            </div>
          </div>

          <p className="tour-content">{currentStep.content}</p>

          <TourProgress stepIndex={stepIndex} totalSteps={totalSteps} />

          <div className="tour-actions">
            {stepIndex > 0 ? (
              <button className="tour-btn-back" onClick={prevStep}><ChevronLeft size={13} /></button>
            ) : <span />}
            <button className="tour-btn-skip" onClick={stopTour}>Skip guide</button>
            <div className="tour-btn-group">
              <button className="tour-btn-next" onClick={isLast ? stopTour : nextStep}>
                {isLast ? 'Finish' : 'Next'} {!isLast && <ChevronRight size={13} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TourProgress = ({ stepIndex, totalSteps }) => (
  <div className="tour-progress-track">
    {Array.from({ length: totalSteps }).map((_, i) => (
      <div key={i} className={`tour-progress-dot ${i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''}`} />
    ))}
  </div>
);

export default TourOverlay;
