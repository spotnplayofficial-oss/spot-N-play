import { useEffect } from 'react';
import { Compass } from 'lucide-react';
import { useTour } from '../../context/TourContext';
import { TOUR_STYLES } from './tourStyles';

const TourWelcomeModal = () => {
  const { showWelcome, dismissWelcome, startTour } = useTour();

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = TOUR_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  if (!showWelcome) return null;

  return (
    <div className="tour-root" style={{ '--tour-dim': 'rgba(0,0,0,0.6)' }}>
      <div className="tour-spotlight-center" onClick={dismissWelcome} />
      <div className="tour-card-center" role="dialog" aria-modal="true">
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
