import React from 'react';

/**
 * 3D Icons Collection
 * Sized proportionally with CSS transforms to fit into standard 44x44px icon containers
 * with realistic lighting, shadows, and depth.
 */

export const Calendar3DIcon = ({ className = '' }) => (
  <div className={`relative w-11 h-11 flex items-center justify-center select-none pointer-events-none ${className}`}>
    <div style={{ transform: 'scale(0.26)', transformOrigin: 'center center' }}>
      <div className="s3d-cal-root">
        {/* Purple back layer */}
        <div className="s3d-cal-back" />

        {/* Top purple strip */}
        <div className="s3d-cal-top" />

        {/* Main orange calendar */}
        <div className="s3d-cal-body">
          {/* Dark top panel */}
          <div className="s3d-cal-header">
            <div className="s3d-ring-hole s3d-left-hole" />
            <div className="s3d-ring-hole s3d-right-hole" />
          </div>

          {/* Number */}
          <div className="s3d-cal-number">31</div>
        </div>

        {/* Rings */}
        <div className="s3d-cal-ring s3d-ring-left" />
        <div className="s3d-cal-ring s3d-ring-right" />
      </div>
    </div>

    <style>{`
      .s3d-cal-root {
        position: relative;
        width: 145px;
        height: 145px;
        transform: rotate(6deg);
      }
      .s3d-cal-back {
        position: absolute;
        width: 128px;
        height: 135px;
        right: -7px;
        top: 9px;
        border-radius: 18px;
        background: linear-gradient(135deg, #b934ff, #7b20b8 55%, #431268);
        transform: skewY(-2deg);
        box-shadow: 5px 7px 0 #54166e, 10px 12px 18px rgba(0,0,0,.35);
      }
      .s3d-cal-top {
        position: absolute;
        width: 132px;
        height: 30px;
        top: 7px;
        left: 7px;
        border-radius: 15px 15px 7px 7px;
        background: linear-gradient(180deg, #f17cff, #a72fe3);
        transform: rotate(1deg);
        z-index: 2;
      }
      .s3d-cal-body {
        position: absolute;
        left: 0;
        top: 15px;
        width: 135px;
        height: 128px;
        border-radius: 17px;
        background: linear-gradient(135deg, #ffb071 0%, #ff8a35 50%, #ff6c13 100%);
        border: 2px solid #f36c18;
        overflow: hidden;
        box-shadow: inset 0 2px 3px rgba(255,255,255,.45), inset 0 -5px 8px rgba(190,55,0,.25), 4px 8px 12px rgba(0,0,0,.28);
        z-index: 3;
      }
      .s3d-cal-header {
        position: absolute;
        width: 100%;
        height: 53px;
        left: 0;
        top: 0;
        background: linear-gradient(180deg, #65676b, #36383b);
        border-radius: 15px 15px 4px 4px;
        box-shadow: inset 0 2px 2px rgba(255,255,255,.15), inset 0 -4px 5px rgba(0,0,0,.35);
        border-bottom: 2px solid #25272a;
      }
      .s3d-ring-hole {
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #101010;
        box-shadow: inset 0 3px 4px rgba(0,0,0,.8), 0 1px 1px rgba(255,255,255,.15);
      }
      .s3d-left-hole { left: 24px; top: 20px; }
      .s3d-right-hole { right: 25px; top: 20px; }
      .s3d-cal-number {
        position: absolute;
        left: 50%;
        top: 52px;
        transform: translateX(-50%);
        font-family: Arial, Helvetica, sans-serif;
        font-size: 70px;
        line-height: 1;
        font-weight: 900;
        color: #343638;
        letter-spacing: -7px;
        text-shadow: 2px 3px 0 #777, 4px 5px 5px rgba(0,0,0,.28);
      }
      .s3d-cal-ring {
        position: absolute;
        width: 22px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(90deg, #5a3d28, #e5c08c, #786048, #e5c18d, #4c3426);
        border: 3px solid #59432f;
        box-shadow: inset 2px 0 3px rgba(255,255,255,.55), 3px 4px 4px rgba(0,0,0,.3);
        z-index: 6;
      }
      .s3d-ring-left { left: 27px; top: -20px; transform: rotate(4deg); }
      .s3d-ring-right { right: 25px; top: -20px; transform: rotate(4deg); }
    `}</style>
  </div>
);

export const Success3DIcon = ({ className = '' }) => (
  <div className={`relative w-11 h-11 flex items-center justify-center select-none pointer-events-none ${className}`}>
    <div style={{ transform: 'scale(0.48)', transformOrigin: 'center center' }}>
      <div className="s3d-check-badge">
        <svg viewBox="0 0 100 100" className="w-[74px] h-[74px] overflow-visible">
          <defs>
            <filter id="s3d-check-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#22c55e" floodOpacity="0.4" />
            </filter>
            <linearGradient id="s3d-check-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d9f99d" />
              <stop offset="50%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>
          <path
            d="
              M50 5
              C56 5 60 10 65 10
              C70 10 75 7 79 11
              C83 15 81 21 86 25
              C90 29 96 30 96 36
              C96 42 92 46 94 51
              C96 56 99 60 96 65
              C93 70 87 71 85 76
              C83 81 85 87 80 90
              C75 93 70 89 65 91
              C60 93 56 98 50 97
              C44 97 40 92 35 91
              C30 89 25 93 20 90
              C15 87 17 81 15 76
              C13 71 7 70 4 65
              C1 60 4 56 6 51
              C8 46 4 42 4 36
              C4 30 10 29 14 25
              C19 21 17 15 21 11
              C25 7 30 10 35 10
              C40 10 44 5 50 5Z
            "
            fill="url(#s3d-check-grad)"
            filter="url(#s3d-check-shadow)"
          />
          <path
            d="M29 51 L43 64 L72 34"
            fill="none"
            stroke="#065f46"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>

    <style>{`
      .s3d-check-badge {
        width: 74px;
        height: 74px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 6px 12px rgba(34,197,94,.35));
      }
    `}</style>
  </div>
);

export const Wallet3DIcon = ({ className = '' }) => (
  <div className={`relative w-11 h-11 flex items-center justify-center select-none pointer-events-none ${className}`}>
    <div style={{ transform: 'scale(0.24)', transformOrigin: 'center center' }}>
      <div className="s3d-wallet-root">
        {/* Currency cards */}
        <div className="s3d-curr s3d-euro">
          <span>Euro</span>
          <strong>€50,000</strong>
        </div>
        <div className="s3d-curr s3d-dollar">
          <span>Dollar</span>
          <strong>$50,000</strong>
        </div>
        <div className="s3d-curr s3d-naira">
          <span>Naira</span>
          <strong>₦50,000</strong>
        </div>

        {/* Wallet body */}
        <div className="s3d-wallet-body">
          <div className="s3d-wallet-stitch s3d-stitch-1" />
          <div className="s3d-wallet-stitch s3d-stitch-2" />
          <div className="s3d-wallet-stitch s3d-stitch-3" />
        </div>
      </div>
    </div>

    <style>{`
      .s3d-wallet-root {
        position: relative;
        width: 190px;
        height: 150px;
      }
      .s3d-curr {
        position: absolute;
        left: 15px;
        width: 170px;
        height: 55px;
        border-radius: 17px 17px 8px 8px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 10px 13px;
        box-sizing: border-box;
        font-family: Arial, sans-serif;
        color: white;
        z-index: 1;
        box-shadow: inset 0 1px 1px rgba(255,255,255,.25), 0 2px 5px rgba(0,0,0,.2);
      }
      .s3d-curr span { font-size: 12px; font-weight: 400; }
      .s3d-curr strong { font-size: 12px; font-weight: 600; }
      .s3d-euro { top: 4px; background: linear-gradient(135deg, #f43f5e, #be123c); }
      .s3d-dollar { top: 34px; background: linear-gradient(135deg, #10b981, #047857); }
      .s3d-naira { top: 64px; background: linear-gradient(135deg, #f97316, #c2410c); }
      .s3d-wallet-body {
        position: absolute;
        left: 0;
        bottom: 0;
        width: 190px;
        height: 93px;
        background: linear-gradient(135deg, #27272a, #18181b 45%, #09090b);
        border-radius: 18px 18px 25px 25px;
        z-index: 5;
        box-shadow: inset 0 1px 2px rgba(255,255,255,.15), inset 0 -5px 10px rgba(0,0,0,.75), 0 8px 16px rgba(0,0,0,.45);
        overflow: hidden;
      }
      .s3d-wallet-body::before {
        content: "";
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(45deg, rgba(255,255,255,.02) 0px, rgba(255,255,255,.02) 1px, transparent 1px, transparent 4px);
      }
      .s3d-wallet-stitch {
        position: absolute;
        width: 105px;
        height: 1px;
        background: repeating-linear-gradient(90deg, rgba(160,160,160,.7) 0px, rgba(160,160,160,.7) 4px, transparent 4px, transparent 8px);
        opacity: .6;
      }
      .s3d-stitch-1 { left: -5px; top: 35px; transform: rotate(30deg); }
      .s3d-stitch-2 { right: -5px; top: 35px; transform: rotate(-30deg); }
      .s3d-stitch-3 { left: 40px; bottom: 5px; transform: rotate(0deg); }
    `}</style>
  </div>
);

export const Money3DIcon = ({ className = '' }) => (
  <div className={`relative w-11 h-11 flex items-center justify-center select-none pointer-events-none ${className}`}>
    <div style={{ transform: 'scale(0.25)', transformOrigin: 'center center' }}>
      <div className="s3d-money-root">
        {/* Back bill */}
        <div className="s3d-money-bill s3d-money-back">
          <div className="s3d-money-circle">₹</div>
        </div>

        {/* Front bill */}
        <div className="s3d-money-bill s3d-money-front">
          <div className="s3d-money-corner s3d-mc-tl" />
          <div className="s3d-money-corner s3d-mc-tr" />
          <div className="s3d-money-corner s3d-mc-bl" />
          <div className="s3d-money-corner s3d-mc-br" />
          <div className="s3d-money-circle">₹</div>
        </div>
      </div>
    </div>

    <style>{`
      .s3d-money-root {
        position: relative;
        width: 170px;
        height: 120px;
        transform: rotate(-8deg);
        filter: drop-shadow(0 0 14px rgba(74,222,128,.5));
      }
      .s3d-money-bill {
        position: absolute;
        width: 150px;
        height: 85px;
        border-radius: 10px;
        background: linear-gradient(135deg, #bbf7d0, #4ade80 45%, #15803d);
        border: 3px solid #86efac;
        box-shadow: inset 0 0 15px rgba(255,255,255,.35), 0 0 20px rgba(34,197,94,.4);
      }
      .s3d-money-back {
        left: 22px;
        top: 20px;
        transform: rotate(13deg) translateY(8px);
        opacity: .8;
      }
      .s3d-money-front {
        left: 4px;
        top: 3px;
        transform: rotate(-3deg);
        z-index: 2;
      }
      .s3d-money-circle {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 58px;
        height: 58px;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: Arial, sans-serif;
        font-size: 42px;
        font-weight: 700;
        color: #ecfdf5;
        background: radial-gradient(circle, #22c55e, #14532d);
        box-shadow: inset 0 0 10px rgba(255,255,255,.35), 0 0 12px rgba(34,197,94,.35);
      }
      .s3d-money-corner {
        position: absolute;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: rgba(220,255,170,.75);
      }
      .s3d-mc-tl { top: -15px; left: -15px; }
      .s3d-mc-tr { top: -15px; right: -15px; }
      .s3d-mc-bl { bottom: -15px; left: -15px; }
      .s3d-mc-br { bottom: -15px; right: -15px; }
    `}</style>
  </div>
);

/**
 * Helper to resolve icon type (3D component, string name, or fallback)
 */
export const render3DIcon = (icon) => {
  if (React.isValidElement(icon)) return icon;

  const key = String(icon || '').toLowerCase();
  if (key.includes('calendar') || key.includes('📅') || key.includes('ground') || key.includes('🏟️') || key.includes('slot')) {
    return <Calendar3DIcon />;
  }
  if (key.includes('check') || key.includes('trophy') || key.includes('completed') || key.includes('🏆') || key.includes('✅')) {
    return <Success3DIcon />;
  }
  if (key.includes('wallet') || key.includes('card') || key.includes('pending') || key.includes('💳')) {
    return <Wallet3DIcon />;
  }
  if (key.includes('money') || key.includes('cash') || key.includes('spent') || key.includes('revenue') || key.includes('💰')) {
    return <Money3DIcon />;
  }

  // Fallback default
  return <Calendar3DIcon />;
};
