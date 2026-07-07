import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { TOUR_STEPS } from '../tour/tourSteps';

const TourContext = createContext();

// Signup flow sets this flag right before the first navigation to the
// dashboard so the tour knows a brand-new account was just created.
export const NEW_SIGNUP_FLAG = 'spotnplay_new_signup';
const promptedKey = (userId) => `spotnplay_tour_prompted_${userId}`;

export const TourProvider = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const hasCheckedSignup = useRef(false);

  const steps = TOUR_STEPS;
  const currentStep = active ? steps[stepIndex] : null;

  // ── Detect a fresh signup once, after the user object is available ──
  useEffect(() => {
    if (!user || hasCheckedSignup.current) return;
    hasCheckedSignup.current = true;

    const isNewSignup = localStorage.getItem(NEW_SIGNUP_FLAG) === '1';
    if (isNewSignup) {
      localStorage.removeItem(NEW_SIGNUP_FLAG);
      localStorage.setItem(promptedKey(user._id), '1');
      // The guided tour walks through player-only screens (dashboard, map,
      // groups, events), so only auto-prompt for player accounts.
      if (user.role === 'player') {
        // small delay so the dashboard has time to mount before the modal pops in
        const t = setTimeout(() => setShowWelcome(true), 700);
        return () => clearTimeout(t);
      }
    }
  }, [user]);

  // ── Whenever the active step changes, make sure we're on the right page ──
  useEffect(() => {
    if (!active || !currentStep) return;
    if (currentStep.page && location.pathname !== currentStep.page) {
      navigate(currentStep.page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex]);

  const startTour = useCallback((fromId) => {
    setShowWelcome(false);
    const idx = fromId ? Math.max(0, steps.findIndex(s => s.id === fromId)) : 0;
    setStepIndex(idx);
    setActive(true);
    if (steps[idx]?.page && location.pathname !== steps[idx].page) {
      navigate(steps[idx].page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTour = useCallback(() => {
    setActive(false);
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex((i) => {
      if (i + 1 >= steps.length) {
        setActive(false);
        return i;
      }
      return i + 1;
    });
  }, [steps.length]);

  const prevStep = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const dismissWelcome = useCallback(() => setShowWelcome(false), []);

  return (
    <TourContext.Provider
      value={{
        active,
        stepIndex,
        totalSteps: steps.length,
        currentStep,
        showWelcome,
        startTour,
        stopTour,
        nextStep,
        prevStep,
        dismissWelcome,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => useContext(TourContext);
