export const TOUR_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');

  @keyframes tourFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes tourPopIn {
    from { opacity: 0; transform: translateY(8px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes tourGlowPulse {
    0%, 100% { box-shadow: 0 0 0 9999px var(--tour-dim), 0 0 0 2px #4ade80, 0 0 22px 4px rgba(74,222,128,0.45); }
    50%      { box-shadow: 0 0 0 9999px var(--tour-dim), 0 0 0 2px #4ade80, 0 0 34px 8px rgba(74,222,128,0.7); }
  }
  @keyframes tourRingPulse {
    0%   { transform: scale(1);   opacity: 0.9; }
    100% { transform: scale(1.9); opacity: 0; }
  }
  @keyframes tourBounceArrow {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(4px); }
  }
  @keyframes tourFloatIn {
    from { opacity: 0; transform: translateY(18px) scale(0.94); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .tour-root { font-family: 'DM Sans', sans-serif; }

  .tour-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9997;
    background: transparent;
    cursor: default;
    animation: tourFadeIn 0.25s ease forwards;
  }

  .tour-spotlight {
    position: fixed;
    z-index: 9998;
    border-radius: 16px;
    pointer-events: none;
    background: transparent;
    transition: top 0.45s cubic-bezier(0.16,1,0.3,1), left 0.45s cubic-bezier(0.16,1,0.3,1),
                width 0.45s cubic-bezier(0.16,1,0.3,1), height 0.45s cubic-bezier(0.16,1,0.3,1),
                opacity 0.25s ease;
    animation: tourGlowPulse 2.2s ease-in-out infinite;
  }

  .tour-spotlight-center {
    position: fixed;
    inset: 0;
    z-index: 9998;
    background: var(--tour-dim);
    pointer-events: auto;
    animation: tourFadeIn 0.25s ease forwards;
  }

  .tour-card {
    position: fixed;
    z-index: 9999;
    width: min(300px, calc(100vw - 40px));
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    background: var(--bg-surface);
    border: 1px solid var(--glass-10);
    border-radius: 20px;
    padding: 18px 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(74,222,128,0.06);
    animation: tourPopIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards;
    transition: top 0.45s cubic-bezier(0.16,1,0.3,1), left 0.45s cubic-bezier(0.16,1,0.3,1);
  }
  .tour-card::-webkit-scrollbar { display: none; }

  .tour-card-center {
    position: fixed;
    z-index: 9999;
    width: min(360px, calc(100vw - 40px));
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    background: var(--bg-surface);
    border: 1px solid var(--glass-10);
    border-radius: 24px;
    padding: 28px 24px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.45);
    animation: tourFloatIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
    text-align: center;
    transition: top 0.2s ease, left 0.2s ease;
  }
  .tour-card-center::-webkit-scrollbar { display: none; }

  @media (max-width: 480px) {
    .tour-card { width: min(280px, calc(100vw - 32px)); padding: 14px 15px; border-radius: 16px; }
    .tour-card-center { width: min(300px, calc(100vw - 32px)); padding: 20px 16px; border-radius: 18px; }
    .tour-badge { width: 30px; height: 30px; font-size: 15px; border-radius: 10px; }
    .tour-step-label { font-size: 9px; }
    .tour-title { font-size: 13px; }
    .tour-content { font-size: 12px; margin-top: 8px; }
    .tour-progress-track { margin: 12px 0 10px; }
    .tour-welcome-icon { width: 46px; height: 46px; margin-bottom: 10px; }
    .tour-welcome-title { font-size: 20px; }
    .tour-welcome-sub { font-size: 12px; margin-top: 6px; }
    .tour-btn-skip { font-size: 11px; padding: 6px 4px; }
    .tour-btn-back { font-size: 11px; padding: 6px 10px; }
    .tour-btn-next { font-size: 11px; padding: 6px 11px; gap: 4px; }
    .tour-close-x { width: 22px; height: 22px; top: 10px; right: 10px; }
  }

  @media (max-height: 420px) {
    .tour-welcome-icon { width: 38px; height: 38px; margin-bottom: 8px; }
    .tour-welcome-title { font-size: 18px; }
    .tour-welcome-sub { font-size: 11.5px; }
    .tour-progress-track { margin: 8px 0 6px; }
  }

  .tour-arrow {
    position: absolute;
    width: 14px;
    height: 14px;
    background: var(--bg-surface);
    border: 1px solid var(--glass-10);
    transform: rotate(45deg);
  }
  .tour-arrow-top    { top: -8px;  border-right: none; border-bottom: none; }
  .tour-arrow-bottom { bottom: -8px; border-left: none; border-top: none; }
  .tour-arrow-left   { left: -8px;  border-right: none; border-top: none; }
  .tour-arrow-right  { right: -8px; border-left: none; border-bottom: none; }

  .tour-badge {
    width: 40px; height: 40px;
    border-radius: 12px;
    background: rgba(74,222,128,0.12);
    border: 1px solid rgba(74,222,128,0.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }

  .tour-step-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #4ade80;
  }

  .tour-title {
    font-family: 'DM Sans', sans-serif;
    font-weight: 700;
    font-size: 15px;
    color: var(--text-main);
    line-height: 1.3;
  }

  .tour-content {
    font-size: 13px;
    line-height: 1.55;
    color: var(--text-muted);
    margin-top: 10px;
  }

  .tour-progress-track {
    display: flex;
    gap: 5px;
    margin: 16px 0 14px;
  }
  .tour-progress-dot {
    height: 4px;
    flex: 1;
    border-radius: 100px;
    background: var(--glass-10);
    overflow: hidden;
  }
  .tour-progress-dot.done { background: #4ade80; }
  .tour-progress-dot.current {
    background: linear-gradient(90deg, #4ade80, rgba(74,222,128,0.3));
  }

  .tour-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .tour-btn-skip {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 8px 4px;
    transition: color 0.2s ease;
  }
  .tour-btn-skip:hover { color: #ef4444; }

  .tour-btn-group { display: flex; gap: 8px; }

  .tour-btn-back {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-main);
    background: var(--glass-06);
    border: 1px solid var(--glass-10);
    border-radius: 10px;
    padding: 8px 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .tour-btn-back:hover { background: var(--glass-10); }

  .tour-btn-next {
    font-size: 12px;
    font-weight: 700;
    color: #000;
    background: linear-gradient(135deg, #4ade80, #22c55e);
    border: none;
    border-radius: 10px;
    padding: 8px 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .tour-btn-next:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(74,222,128,0.35); }

  .tour-close-x {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: var(--glass-06);
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .tour-close-x:hover { background: rgba(239,68,68,0.12); color: #ef4444; }

  .tour-welcome-icon {
    width: 62px; height: 62px;
    border-radius: 18px;
    margin: 0 auto 16px;
    background: rgba(74,222,128,0.12);
    border: 1px solid rgba(74,222,128,0.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 30px;
    position: relative;
  }
  .tour-welcome-ring {
    position: absolute; inset: -6px;
    border-radius: 20px;
    border: 1.5px solid rgba(74,222,128,0.5);
    animation: tourRingPulse 2.2s ease-out infinite;
  }

  .tour-welcome-title {
    font-family: 'Bebas Neue', cursive;
    font-size: 28px;
    letter-spacing: 0.02em;
    color: var(--text-main);
  }

  .tour-welcome-sub {
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--text-muted);
    margin-top: 10px;
  }

  .tour-welcome-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 22px;
  }

  .tour-welcome-btn-start {
    width: 100%;
    background: linear-gradient(135deg, #4ade80, #22c55e);
    color: #000;
    font-weight: 700;
    font-size: 14px;
    border: none;
    border-radius: 12px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.25s ease;
  }
  .tour-welcome-btn-start:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(74,222,128,0.35); }

  .tour-welcome-btn-later {
    width: 100%;
    background: transparent;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 13px;
    border: 1px solid var(--glass-10);
    border-radius: 12px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .tour-welcome-btn-later:hover { background: var(--glass-06); color: var(--text-main); }

  .tour-target-bounce {
    animation: tourBounceArrow 1.6s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .tour-spotlight, .tour-card, .tour-card-center, .tour-welcome-ring, .tour-target-bounce {
      animation: none !important;
      transition: none !important;
    }
  }
`;
