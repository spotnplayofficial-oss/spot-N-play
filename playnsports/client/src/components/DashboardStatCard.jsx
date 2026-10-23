import React, { useId } from 'react';
import { render3DIcon } from './ThreeDIcons';

const THEMES = {
  green: {
    stops: [
      { offset: '0%', color: '#15803d' },
      { offset: '35%', color: '#22c55e' },
      { offset: '70%', color: '#4ade80' },
      { offset: '100%', color: '#86efac' },
    ],
    strokeSubtle: '#86efac',
    pointPulse: '#22c55e',
    pointMid: '#4ade80',
    pointCore: '#ffffff',
    glowColor: 'rgba(74, 222, 128, 0.28)',
    gridColor: 'rgba(74, 222, 128, 0.12)',
    hoverBorder: 'hover:border-emerald-500/40',
    topHighlight: 'rgba(74, 222, 128, 0.75)',
    cardBg: 'from-emerald-500/[0.05] via-transparent to-transparent',
  },
  blue: {
    stops: [
      { offset: '0%', color: '#1d4ed8' },
      { offset: '35%', color: '#3b82f6' },
      { offset: '70%', color: '#60a5fa' },
      { offset: '100%', color: '#93c5fd' },
    ],
    strokeSubtle: '#93c5fd',
    pointPulse: '#3b82f6',
    pointMid: '#60a5fa',
    pointCore: '#ffffff',
    glowColor: 'rgba(96, 165, 250, 0.28)',
    gridColor: 'rgba(96, 165, 250, 0.12)',
    hoverBorder: 'hover:border-blue-500/40',
    topHighlight: 'rgba(96, 165, 250, 0.75)',
    cardBg: 'from-blue-500/[0.05] via-transparent to-transparent',
  },
  orange: {
    stops: [
      { offset: '0%', color: '#c2410c' },
      { offset: '35%', color: '#f97316' },
      { offset: '70%', color: '#fb923c' },
      { offset: '100%', color: '#fed7aa' },
    ],
    strokeSubtle: '#fed7aa',
    pointPulse: '#f97316',
    pointMid: '#fb923c',
    pointCore: '#ffffff',
    glowColor: 'rgba(251, 146, 60, 0.28)',
    gridColor: 'rgba(251, 146, 60, 0.12)',
    hoverBorder: 'hover:border-orange-500/40',
    topHighlight: 'rgba(251, 146, 60, 0.75)',
    cardBg: 'from-orange-500/[0.05] via-transparent to-transparent',
  },
  purple: {
    stops: [
      { offset: '0%', color: '#6d28d9' },
      { offset: '35%', color: '#8b5cf6' },
      { offset: '70%', color: '#a78bfa' },
      { offset: '100%', color: '#ddd6fe' },
    ],
    strokeSubtle: '#ddd6fe',
    pointPulse: '#8b5cf6',
    pointMid: '#a78bfa',
    pointCore: '#ffffff',
    glowColor: 'rgba(167, 139, 250, 0.28)',
    gridColor: 'rgba(167, 139, 250, 0.12)',
    hoverBorder: 'hover:border-purple-500/40',
    topHighlight: 'rgba(167, 139, 250, 0.75)',
    cardBg: 'from-purple-500/[0.05] via-transparent to-transparent',
  },
};

/**
 * Extracts a clean numeric count from numbers or formatted strings like "₹4,200", "0", "12".
 */
const parseNumericValue = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
};

/**
 * Generates dynamic SVG curve path based on value:
 * - If value is 0: straight horizontal flat line
 * - If value is 1: gentle initial rise
 * - If value is 2-9: steady upward wave
 * - If value is 10-99: active energetic wave
 * - If value is >= 100: high surge wave
 */
const getDynamicChartConfig = (val) => {
  const num = parseNumericValue(val);

  if (num === 0) {
    return {
      d: 'M 0 52 L 300 52',
      point: { cx: 250, cy: 52 },
      isFlat: true,
    };
  }

  if (num === 1) {
    return {
      d: 'M 0 52 C 70 52, 140 48, 200 42 C 240 38, 270 36, 300 34',
      point: { cx: 250, cy: 37 },
      isFlat: false,
    };
  }

  if (num < 10) {
    return {
      d: 'M 0 52 C 50 48, 90 42, 140 34 C 185 26, 220 22, 260 17 C 280 15, 290 13, 300 11',
      point: { cx: 260, cy: 17 },
      isFlat: false,
    };
  }

  if (num < 100) {
    return {
      d: 'M 0 50 C 45 42, 80 48, 125 30 C 165 14, 200 32, 240 16 C 265 8, 285 10, 300 6',
      point: { cx: 240, cy: 16 },
      isFlat: false,
    };
  }

  // Large values (e.g. ₹500, ₹4200, 100+ bookings) - high surge wave
  return {
    d: 'M 0 50 C 40 32, 75 44, 115 22 C 155 6, 190 26, 235 10 C 265 2, 285 6, 300 4',
    point: { cx: 265, cy: 5 },
    isFlat: false,
  };
};

const DashboardStatCard = ({
  icon = 'calendar',
  label = 'Metric',
  value = '0',
  subtitle = 'Updated now',
  color = 'green',
  onClick = null,
  className = '',
}) => {
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const theme = THEMES[color] || THEMES.green;
  const chart = getDynamicChartConfig(value);

  const gradId = `sline-${color}-${safeId}`;
  const lineGlowId = `sglow-${color}-${safeId}`;
  const pointGlowId = `spoint-${color}-${safeId}`;

  return (
    <div
      onClick={onClick}
      className={`relative group rounded-3xl p-5 overflow-hidden transition-all duration-300 border border-black/8 dark:border-white/8 hover:-translate-y-1 hover:shadow-2xl bg-white/70 dark:bg-[#0c0f14]/85 backdrop-blur-xl ${theme.hoverBorder} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), 0 12px 30px -10px rgba(0,0,0,0.25)',
      }}
    >
      {/* Top ambient highlight line on hover */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${theme.topHighlight}, transparent)`,
        }}
      />

      {/* Atmospheric subtle background tint completely filling the card */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${theme.cardBg} pointer-events-none`}
      />

      {/* Top Header: 3D Icon floating on left, NO borders around it, NO arrows on top right */}
      <div className="relative z-10 flex items-center justify-between mb-1">
        <div className="group-hover:scale-105 transition-transform duration-300">
          {render3DIcon(icon)}
        </div>
      </div>

      {/* Small Glowing Micro-Graph completely filling under the 3D Icon - NO inner borders */}
      <div className="relative -mx-5 w-[calc(100%+2.5rem)] h-14 my-1 overflow-hidden pointer-events-none select-none">
        {/* Subtle coordinate grid behind chart extending edge-to-edge */}
        <div
          className="absolute inset-0 opacity-20 dark:opacity-30"
          style={{
            backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 100%)',
          }}
        />

        {/* Ambient radial blur glow behind curve */}
        <div
          className="absolute -left-1/4 -right-1/4 -bottom-1/2 h-full rounded-full"
          style={{
            background: `radial-gradient(ellipse, ${theme.glowColor}, transparent 65%)`,
            filter: 'blur(16px)',
            opacity: chart.isFlat ? 0.35 : 0.85,
          }}
        />

        <svg
          viewBox="0 0 300 70"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full overflow-visible"
        >
          <defs>
            {/* Neon line gradient */}
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              {theme.stops.map((s, idx) => (
                <stop key={idx} offset={s.offset} stopColor={s.color} />
              ))}
            </linearGradient>

            {/* Line glow filter */}
            <filter id={lineGlowId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={chart.isFlat ? '2' : '3.5'} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glowing point filter */}
            <filter id={pointGlowId} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Glowing background path (straight if 0, upward curve if >= 1) */}
          <path
            d={chart.d}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={chart.isFlat ? 2.5 : 3.5}
            strokeLinecap="round"
            filter={`url(#${lineGlowId})`}
            opacity={chart.isFlat ? 0.6 : 1}
          />

          {/* Crisp foreground highlight line */}
          <path
            d={chart.d}
            fill="none"
            stroke={theme.strokeSubtle}
            strokeWidth={chart.isFlat ? 1 : 1.2}
            strokeLinecap="round"
            opacity={chart.isFlat ? 0.5 : 0.9}
          />

          {/* Glowing pulse data point */}
          <circle
            cx={chart.point.cx}
            cy={chart.point.cy}
            r={chart.isFlat ? 6 : 9}
            fill={theme.pointPulse}
            opacity={chart.isFlat ? 0.2 : 0.4}
            filter={`url(#${pointGlowId})`}
          />
          <circle
            cx={chart.point.cx}
            cy={chart.point.cy}
            r={chart.isFlat ? 3 : 4.5}
            fill={theme.pointMid}
            opacity={chart.isFlat ? 0.7 : 0.95}
          />
          <circle
            cx={chart.point.cx}
            cy={chart.point.cy}
            r={chart.isFlat ? 1.5 : 2}
            fill={theme.pointCore}
          />
        </svg>
      </div>

      {/* Bottom Statistics: Label, Value, Subtitle - Completely clean, NO inner borders */}
      <div className="relative z-10 pt-1">
        <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5 truncate">
          {label}
        </div>

        <div className="font-bebas text-3xl sm:text-4xl tracking-tight text-gray-900 dark:text-white leading-none">
          {value}
        </div>

        {subtitle && (
          <div className="text-[11px] text-gray-500 dark:text-gray-500 mt-1 truncate">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardStatCard;
