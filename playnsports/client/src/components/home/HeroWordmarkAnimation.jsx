import { useEffect, useState, useRef } from 'react';
import { SpotNPlayIcon } from '../SpotNPlayLogo';

/**
 * HeroWordmarkAnimation — Athletic Typographic Motion Reveal
 * 
 * Phase 0: Floodlight sweep (volt lime line across viewport)
 * Phase 1: Faceted S emblem spins in like a served ball
 * Phase 2: "spot" letters cascade in from left (players entering pitch)
 * Phase 3: "N" drops from above with diagonal slice clip-path reveal (scoreboard flip)
 * Phase 4: "play" letters cascade in from right (opposing team entry)
 * Phase 5: Whistle shockwave pulse from the N, everything settles
 * Phase 6: Tagline + CTAs fade up
 */
// Exact sliced athletic "N" vector paths directly from the SpotNPlay brand logo
const N_PATH_TOP = "M 175 7 L 175 1 L 178 1 L 178 2 L 189 2 L 189 3 L 190 3 L 190 4 L 191 4 L 191 5 L 192 5 L 192 6 L 193 6 L 193 7 L 194 7 L 194 8 L 195 8 L 195 9 L 196 9 L 196 10 L 197 10 L 197 11 L 198 11 L 198 12 L 199 12 L 199 13 L 200 13 L 200 14 L 206 19 L 206 29 L 205 29 L 205 28 L 203 28 L 202 26 L 200 26 L 199 24 L 197 24 L 195 21 L 193 21 L 192 19 L 190 19 L 188 16 L 186 17 L 186 54 L 175 54 L 175 8 Z";
const N_PATH_BOTTOM = "M 192 31 L 192 26 L 193 26 L 193 27 L 195 27 L 196 29 L 198 29 L 199 31 L 201 31 L 202 33 L 204 33 L 206 36 L 208 36 L 208 37 L 211 39 L 211 2 L 212 2 L 212 1 L 215 1 L 215 2 L 223 2 L 223 53 L 222 53 L 222 54 L 221 54 L 221 53 L 220 53 L 220 54 L 211 54 L 211 53 L 210 53 L 210 52 L 209 52 L 209 51 L 208 51 L 208 50 L 207 50 L 207 49 L 206 49 L 206 48 L 205 48 L 205 47 L 204 47 L 204 46 L 203 46 L 203 45 L 202 45 L 202 44 L 201 44 L 201 43 L 200 43 L 195 37 L 193 37 L 192 32 Z";

export default function HeroWordmarkAnimation({ onComplete }) {
  const [phase, setPhase] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    // Small delay before starting
    const t0 = setTimeout(() => setPhase(0), 150);
    const t1 = setTimeout(() => setPhase(1), 350);
    const t2 = setTimeout(() => setPhase(2), 750);
    const t3 = setTimeout(() => setPhase(3), 1250);
    const t4 = setTimeout(() => setPhase(4), 1700);
    const t5 = setTimeout(() => setPhase(5), 2100);
    const t6 = setTimeout(() => {
      setPhase(6);
      onComplete?.();
    }, 2600);
    return () => [t0, t1, t2, t3, t4, t5, t6].forEach(clearTimeout);
  }, []);

  const spotLetters = ['s', 'p', 'o', 't'];
  const playLetters = ['p', 'l', 'a', 'y'];

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center justify-center select-none">
      {/* ── Embedded animation keyframes ── */}
      <style>{`
        /* Phase 0 — Floodlight sweep line */
        @keyframes floodlight-sweep {
          0%   { transform: scaleX(0); opacity: 1; }
          45%  { transform: scaleX(1); opacity: 1; }
          46%  { transform-origin: right center; }
          90%  { transform: scaleX(0); opacity: 1; }
          100% { transform: scaleX(0); opacity: 0; }
        }
        .anim-floodlight {
          animation: floodlight-sweep 0.7s cubic-bezier(0.65, 0, 0.35, 1) forwards;
          transform-origin: left center;
        }

        /* Phase 1 — Emblem serve spin-in */
        @keyframes emblem-serve {
          0%   { transform: scale(0) rotate(-200deg); opacity: 0; filter: blur(10px); }
          55%  { transform: scale(1.2) rotate(15deg); opacity: 1; filter: blur(0); }
          75%  { transform: scale(0.95) rotate(-5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .anim-emblem {
          animation: emblem-serve 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        /* Phase 2 — Letters run in from LEFT (spot) */
        @keyframes letter-run-left {
          0%   { transform: translateX(-90px) scaleX(1.4) scaleY(0.8); opacity: 0; filter: blur(8px); }
          60%  { transform: translateX(6px) scaleX(1) scaleY(1); opacity: 1; filter: blur(0); }
          80%  { transform: translateX(-2px); opacity: 1; filter: blur(0); }
          100% { transform: translateX(0); opacity: 1; filter: blur(0); }
        }

        /* Phase 3 — Sliced Athletic N: Slices slamming together along diagonal */
        @keyframes n-slice-top {
          0% {
            transform: translate(-38px, -48px) rotate(-14deg);
            opacity: 0;
            filter: blur(8px);
          }
          60% {
            transform: translate(2px, 3px) rotate(1deg);
            opacity: 1;
            filter: blur(0);
          }
          80% {
            transform: translate(-1px, -1px);
            opacity: 1;
          }
          100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
            filter: blur(0);
          }
        }

        @keyframes n-slice-bottom {
          0% {
            transform: translate(38px, 48px) rotate(14deg);
            opacity: 0;
            filter: blur(8px);
          }
          60% {
            transform: translate(-2px, -3px) rotate(-1deg);
            opacity: 1;
            filter: blur(0);
          }
          80% {
            transform: translate(1px, 1px);
            opacity: 1;
          }
          100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
            filter: blur(0);
          }
        }

        .anim-n-slice-top {
          animation: n-slice-top 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          transform-origin: center center;
        }
        .anim-n-slice-bottom {
          animation: n-slice-bottom 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          transform-origin: center center;
        }

        /* Phase 4 — Letters run in from RIGHT (play) */
        @keyframes letter-run-right {
          0%   { transform: translateX(90px) scaleX(1.4) scaleY(0.8); opacity: 0; filter: blur(8px); }
          60%  { transform: translateX(-6px) scaleX(1) scaleY(1); opacity: 1; filter: blur(0); }
          80%  { transform: translateX(2px); opacity: 1; filter: blur(0); }
          100% { transform: translateX(0); opacity: 1; filter: blur(0); }
        }

        /* Whistle shockwave ring — crisp 1px athletic pulse */
        @keyframes whistle-ring {
          0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0.7; border-width: 2px; }
          100% { transform: translate(-50%, -50%) scale(3.5); opacity: 0; border-width: 0.5px; }
        }

        /* Phase 5 — Final settle bounce */
        @keyframes settle-bounce {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.03); }
          60%  { transform: scale(0.99); }
          100% { transform: scale(1); }
        }

        /* Shared letter styles */
        .hero-letter {
          display: inline-block;
          will-change: transform, opacity, filter;
        }
        .hero-letter-spot {
          animation: letter-run-left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .hero-letter-play {
          animation: letter-run-right 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        /* Tagline fade-up */
        @keyframes tagline-up {
          0%   { transform: translateY(16px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .anim-tagline {
          animation: tagline-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Underline grow for the subtitle accent */
        @keyframes underline-grow {
          0%   { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>

      {/* ═══ Phase 0: Floodlight Sweep ═══ */}
      {phase >= 0 && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] z-20 pointer-events-none anim-floodlight"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #16a34a 20%, #4ade80 50%, #16a34a 80%, transparent 100%)' }}
        />
      )}

      {/* ═══ Main wordmark composition ═══ */}
      <div className="relative z-10 flex flex-col items-center"
        style={phase >= 5 ? { animation: 'settle-bounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' } : undefined}
      >
        {/* ── Emblem above the text ── */}
        <div className="relative mb-4 md:mb-6 flex items-center justify-center overflow-visible" style={{ height: '76px' }}>
          {phase >= 1 && (
            <div className={`relative anim-emblem ${phase >= 6 ? 'opacity-100' : ''}`}>
              <SpotNPlayIcon
                className="w-auto h-14 md:h-18 text-emerald-600 dark:text-[#4ade80]"
                color="currentColor"
                glow={false}
              />
            </div>
          )}
        </div>

        {/* ── Wordmark: spot + N + play ── */}
        <div className="flex items-center justify-center overflow-visible"
          style={{ fontSize: 'clamp(3.5rem, 13vw, 9rem)', lineHeight: 0.9, letterSpacing: '0.04em' }}
        >
          {/* "spot" — Phase 2, letters from the left */}
          <span className="font-bebas text-slate-900 dark:text-white relative">
            {spotLetters.map((letter, i) => (
              <span
                key={`s-${i}`}
                className={`hero-letter ${phase >= 2 ? 'hero-letter-spot' : 'opacity-0'} ${phase >= 6 ? '!opacity-100' : ''}`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {letter}
              </span>
            ))}
          </span>

          {/* "N" — Phase 3, EXACT sliced athletic logo vector N */}
          <span className="relative mx-[0.06em] inline-flex items-center justify-center overflow-visible self-center">
            {phase >= 3 ? (
              <div className="relative flex items-center justify-center overflow-visible">
                <svg
                  viewBox="173 0 52 56"
                  className="h-[0.82em] w-auto inline-block overflow-visible select-none text-emerald-600 dark:text-[#4ade80]"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ verticalAlign: 'middle' }}
                >
                  {/* Top-left slice cut from brand logo */}
                  <path
                    d={N_PATH_TOP}
                    className="anim-n-slice-top"
                    style={{ willChange: 'transform, opacity, filter' }}
                  />
                  {/* Bottom-right slice cut from brand logo */}
                  <path
                    d={N_PATH_BOTTOM}
                    className="anim-n-slice-bottom"
                    style={{ willChange: 'transform, opacity, filter' }}
                  />
                </svg>

                {/* Whistle ring pulse — Phase 5 */}
                {phase >= 5 && (
                  <span className="absolute top-1/2 left-1/2 w-8 h-8 rounded-full border border-emerald-500/60 dark:border-[#4ade80]/60 pointer-events-none"
                    style={{ animation: 'whistle-ring 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards', opacity: 0 }}
                  />
                )}
              </div>
            ) : (
              /* Invisible layout placeholder so "spot" and "play" do not jump */
              <svg
                viewBox="173 0 52 56"
                className="h-[0.82em] w-auto invisible inline-block"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ verticalAlign: 'middle' }}
              >
                <path d={N_PATH_TOP} />
                <path d={N_PATH_BOTTOM} />
              </svg>
            )}
          </span>

          {/* "play" — Phase 4, letters from the right */}
          <span className="font-bebas text-slate-900 dark:text-white relative">
            {playLetters.map((letter, i) => (
              <span
                key={`p-${i}`}
                className={`hero-letter ${phase >= 4 ? 'hero-letter-play' : 'opacity-0'} ${phase >= 6 ? '!opacity-100' : ''}`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {letter}
              </span>
            ))}
          </span>
        </div>

        {/* ── Sport emoji particle burst — Phase 5 ── */}
        {phase >= 5 && (
          <div className="absolute inset-0 pointer-events-none overflow-visible z-0">
            {['⚽', '🏏', '🏸', '🎮', '🏀', '🏊'].map((emoji, i) => {
              const angle = (i * 60) * (Math.PI / 180);
              const dist = 120 + Math.random() * 80;
              const tx = Math.cos(angle) * dist;
              const ty = Math.sin(angle) * dist;
              return (
                <span
                  key={i}
                  className="absolute text-2xl md:text-3xl"
                  style={{
                    top: '50%', left: '50%',
                    animation: `particle-burst 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 40}ms forwards`,
                    transform: 'translate(0, 0) scale(1)',
                    ['--tx']: `${tx}px`,
                    ['--ty']: `${ty}px`,
                    animationName: 'none',
                    opacity: 0,
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    animation: `particle-burst 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 40}ms forwards`,
                    animationName: undefined,
                    opacity: 0.9,
                    position: 'absolute',
                    transform: `translate(${tx}px, ${ty}px) scale(0)`,
                    transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s ease',
                    ...(phase >= 5 ? { transform: `translate(${tx}px, ${ty}px) scale(1)`, opacity: 0 } : {}),
                  }}>
                    {emoji}
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {/* ── Accent underline beneath the wordmark ── */}
        {phase >= 5 && (
          <div className="mt-3 h-[2px] w-44 md:w-64 rounded-full overflow-hidden bg-gradient-to-r from-transparent via-emerald-600 dark:via-[#4ade80] to-transparent"
            style={{
              transform: 'scaleX(0)',
              transformOrigin: 'center',
              animation: 'underline-grow 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards',
            }}
          />
        )}

        {/* ── Tagline — Phase 6 ── */}
        {phase >= 6 && (
          <div className="mt-6 md:mt-8 text-center max-w-2xl mx-auto px-4 anim-tagline" style={{ opacity: 0 }}>
            <p className="text-base md:text-xl text-slate-700 dark:text-gray-200 font-medium leading-relaxed">
              Discover nearby players, unlock premium grounds, and turn every day into game day.
            </p>
            <p className="mt-2 text-sm md:text-base text-slate-500 dark:text-gray-400">
              Your sports community — <span className="text-emerald-600 dark:text-green-400 font-semibold">live on the map.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
