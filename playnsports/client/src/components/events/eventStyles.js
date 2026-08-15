// eventStyles.js — shared style injection for the Events feature.
// Reuses the same design tokens as the Groups page (g-card, g-input,
// g-btn-primary, g-tab, etc.) and adds a few event-specific extras.
import { GROUP_STYLES } from '../Groupstyles.js';

export const EVENT_STYLES = GROUP_STYLES + `

  /* ── Event-specific extras ── */

  .ev-banner-frame {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
  }
  .ev-banner-bg {
    position: absolute; inset: 0;
    background-size: cover;
    background-position: center;
    filter: blur(22px) brightness(0.5) saturate(1.1);
    transform: scale(1.2);
  }
  .ev-banner-fg {
    position: relative;
    width: 100%; height: 100%;
    object-fit: contain;
  }
  .ev-banner-fallback {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.18);
  }
  .light .ev-banner-frame { background: rgba(0,0,0,0.02); border-color: rgba(0,0,0,0.08); }
  .light .ev-banner-fallback { color: rgba(0,0,0,0.15); }

  .ev-sport-chip {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 600;
    padding: 4px 10px; border-radius: 100px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: #9ca3af;
    text-transform: capitalize;
  }

  .ev-badge-free, .ev-badge-paid, .ev-badge-pending, .ev-badge-approved, .ev-badge-rejected, .ev-badge-cancelled {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700;
    padding: 3px 10px; border-radius: 100px;
  }
  .ev-badge-free {
    background: rgba(74,222,128,0.1);
    border: 1px solid rgba(74,222,128,0.25);
    color: #4ade80;
  }
  .ev-badge-paid {
    background: rgba(251,191,36,0.1);
    border: 1px solid rgba(251,191,36,0.25);
    color: #fbbf24;
  }
  .ev-badge-pending {
    background: rgba(96,165,250,0.1);
    border: 1px solid rgba(96,165,250,0.25);
    color: #60a5fa;
  }
  .ev-badge-approved {
    background: rgba(74,222,128,0.1);
    border: 1px solid rgba(74,222,128,0.25);
    color: #4ade80;
  }
  .ev-badge-rejected, .ev-badge-cancelled {
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.2);
    color: #f87171;
  }

  .ev-participant-row {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.05);
    background: rgba(255,255,255,0.015);
  }

  .ev-empty {
    display: flex; flex-direction: column; align-items: center;
    gap: 10px; padding: 60px 20px; text-align: center;
    color: #6b7280;
  }

  .ev-progress-track { height: 6px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden; }
  .ev-progress-fill { height: 100%; background: linear-gradient(90deg,#4ade80,#22c55e); border-radius: 100px; transition: width 0.5s; }

  /* ── Sub-events ── */

  .sev-card {
    padding: 14px 16px;
    border-radius: 16px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.07);
  }

  .sev-tile {
    display: flex; flex-direction: column;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.02);
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.18s ease, border-color 0.18s ease;
  }
  .sev-tile:hover { transform: translateY(-2px); border-color: rgba(74,222,128,0.3); }
  .sev-tile-banner-frame {
    border-radius: 0;
    border: none;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .sev-tile-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 8px; }

  /* ── Booking wizard ── */

  .sev-step-track { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .sev-step-dot {
    width: 26px; height: 26px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
    border: 1px solid rgba(255,255,255,0.12);
    color: #6b7280;
    background: rgba(255,255,255,0.02);
    flex-shrink: 0;
  }
  .sev-step-dot.active { border-color: #4ade80; color: #4ade80; background: rgba(74,222,128,0.08); }
  .sev-step-dot.done { border-color: #4ade80; color: #0a0a0a; background: #4ade80; }
  .sev-step-line { flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
  .sev-step-line.done { background: #4ade80; }

  .sev-qty-btn {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 700;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
    color: #e5e7eb;
    cursor: pointer;
  }
  .sev-qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .sev-qty-btn:hover:not(:disabled) { border-color: rgba(74,222,128,0.4); color: #4ade80; }

  /* ── Contact admin card ── */
  .ev-contact-admin-card {
    padding: 16px; border-radius: 16px;
    background: rgba(96,165,250,0.03);
    border: 1px solid rgba(96,165,250,0.12);
  }

  /* Light mode */
  .light .sev-card { background: rgba(0,0,0,0.02); border-color: rgba(0,0,0,0.08); }
  .light .sev-tile { background: rgba(0,0,0,0.02); border-color: rgba(0,0,0,0.08); }
  .light .sev-qty-btn { background: rgba(0,0,0,0.03); border-color: rgba(0,0,0,0.1); color: #111827; }
  .light .ev-contact-admin-card { background: rgba(96,165,250,0.04); border-color: rgba(96,165,250,0.18); }
`;

// Shared by EventDetailPage and SubEventDetailPage — hero banner, info
// rows, section titles, and the sticky booking box. Kept in one place so
// the two pages can never visually drift apart.
export const EVENT_DETAIL_STYLES = `
  .ed-hero-frame {
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.07);
  }
  .ed-info-row {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 14px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .ed-info-icon { color: #4ade80; flex-shrink: 0; }
  .ed-info-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }
  .ed-info-value { font-size: 14px; color: #e5e7eb; font-weight: 500; }
  .ed-section-title {
    display: flex; align-items: center; gap: 7px;
    font-size: 11px; color: #4ade80;
    text-transform: uppercase; letter-spacing: 0.12em;
    font-weight: 700; margin-bottom: 10px;
  }
  .ed-pay-box {
    padding: 20px; border-radius: 20px;
    background: rgba(74,222,128,0.04);
    border: 1px solid rgba(74,222,128,0.15);
  }
  .ed-price-big {
    font-family: 'Bebas Neue', cursive;
    font-size: 48px; color: #4ade80; line-height: 1;
  }
  /* Light mode */
  .light .ed-info-row { background: rgba(0,0,0,0.025); border-color: rgba(0,0,0,0.07); }
  .light .ed-info-value { color: #111827; }
  .light .ed-pay-box { background: rgba(74,222,128,0.05); border-color: rgba(74,222,128,0.2); }
`;
