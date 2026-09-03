import React from 'react';

/**
 * Geometric Faceted S Emblem SVG
 * Direct vector implementation of the SpotNPlay brand identity icon
 */
export const SpotNPlayIcon = ({ 
  className = "w-8 h-6", 
  color = "#4ade80",
  glow = false,
  ...props 
}) => {
  return (
    <svg
      viewBox="0 0 223 168"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block transition-transform duration-200 ${glow ? 'drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]' : ''} ${className}`}
      {...props}
    >
      <g fill={color}>
        {/* Top-left angled spine and center fold */}
        <path
          d="M 119 3 L 108 30 L 98 30 L 89 34 L 82 42 L 72 65 L 121 113 L 76 114 L 2 161 L 29 102 L 76 101 L 43 69 L 64 25 L 74 14 L 85 7 L 98 3 L 118 2 Z"
          fillRule="evenodd"
        />
        {/* Top bar center segment */}
        <path
          d="M 147 5 L 136 30 L 114 30 L 122 10 L 127 2 L 146 2 L 148 3 L 147 4 Z"
          fillRule="evenodd"
        />
        {/* Lower diagonal, right wing and bottom hook */}
        <path
          d="M 221 6 L 194 66 L 142 67 L 177 100 L 177 104 L 167 126 L 156 146 L 147 155 L 136 162 L 120 166 L 112 165 L 124 138 L 130 136 L 139 126 L 148 104 L 100 58 L 99 55 L 146 54 L 220 7 Z"
          fillRule="evenodd"
        />
        {/* Top-right sharp tip facet */}
        <path
          d="M 144 30 L 142 29 L 154 3 L 156 2 L 215 3 L 174 30 L 145 30 Z"
          fillRule="evenodd"
        />
        {/* Right middle accent wedge */}
        <path
          d="M 191 72 L 180 96 L 169 86 L 155 71 L 190 71 Z"
          fillRule="evenodd"
        />
        {/* Left middle accent wedge */}
        <path
          d="M 42 76 L 63 97 L 32 97 L 31 96 L 41 76 Z"
          fillRule="evenodd"
        />
        {/* Bottom base horizontal facet */}
        <path
          d="M 117 138 L 115 146 L 105 166 L 7 165 L 49 138 L 116 138 Z"
          fillRule="evenodd"
        />
      </g>
    </svg>
  );
};

// Exact vector path data for the official wordmark letterforms
const WORDMARK_PATHS = {
  spot: "M 25 54 L 15 54 L 15 53 L 12 53 L 12 52 L 9 52 L 7 49 L 6 49 L 6 48 L 5 48 L 5 46 L 4 46 L 4 45 L 3 45 L 3 42 L 7 42 L 7 41 L 13 41 L 14 45 L 16 45 L 17 46 L 19 46 L 19 47 L 26 47 L 26 46 L 29 46 L 29 46 L 31 45 L 31 43 L 31 43 L 31 42 L 31 42 L 30 40 L 28 40 L 28 39 L 26 39 L 26 38 L 18 37 L 18 37 L 12 36 L 12 35 L 9 34 L 9 34 L 6 31 L 6 30 L 5 30 L 4 24 L 5 24 L 5 22 L 6 22 L 6 19 L 7 19 L 8 17 L 10 17 L 11 16 L 15 15 L 15 14 L 30 14 L 30 15 L 31 15 L 31 16 L 37 17 L 37 18 L 38 19 L 38 20 L 40 21 L 40 23 L 41 23 L 41 25 L 31 26 L 31 24 L 30 24 L 28 22 L 25 22 L 25 21 L 18 21 L 18 22 L 17 22 L 17 22 L 14 24 L 15 28 L 17 28 L 17 28 L 18 28 L 18 29 L 21 29 L 21 30 L 26 30 L 26 31 L 30 31 L 30 31 L 32 31 L 32 32 L 37 33 L 37 34 L 40 36 L 41 40 L 42 40 L 42 45 L 41 45 L 41 47 L 39 48 L 39 49 L 38 49 L 37 52 L 33 52 L 33 53 L 31 53 L 31 54 L 25 54 Z M 93 40 L 92 40 L 92 44 L 91 44 L 90 48 L 89 48 L 87 51 L 85 51 L 84 53 L 81 53 L 81 54 L 69 54 L 69 53 L 65 52 L 65 51 L 62 49 L 62 68 L 50 68 L 50 42 L 51 42 L 51 41 L 50 41 L 50 25 L 51 25 L 51 23 L 50 23 L 50 15 L 51 15 L 51 14 L 61 14 L 61 15 L 62 15 L 62 18 L 63 18 L 64 16 L 66 16 L 66 15 L 68 15 L 68 14 L 72 14 L 72 13 L 77 13 L 77 14 L 82 14 L 82 15 L 84 15 L 85 17 L 87 17 L 87 18 L 90 20 L 90 22 L 91 22 L 91 24 L 92 24 L 92 28 L 93 28 L 93 39 Z M 77 44 L 77 43 L 80 41 L 80 38 L 81 38 L 81 30 L 80 30 L 79 25 L 76 24 L 76 23 L 73 23 L 73 22 L 67 23 L 67 24 L 63 27 L 63 30 L 62 30 L 62 37 L 63 37 L 63 40 L 64 40 L 64 42 L 65 42 L 66 44 L 68 44 L 68 45 L 75 45 L 75 44 L 76 44 Z M 133 17 L 133 18 L 136 20 L 136 22 L 138 23 L 138 26 L 139 26 L 139 29 L 140 29 L 140 39 L 139 39 L 139 42 L 138 42 L 138 45 L 136 46 L 136 48 L 135 48 L 134 50 L 132 50 L 131 52 L 126 53 L 126 54 L 111 54 L 111 53 L 108 53 L 107 51 L 105 51 L 105 50 L 100 46 L 100 44 L 99 44 L 99 42 L 98 42 L 98 38 L 97 38 L 97 29 L 98 29 L 98 26 L 99 26 L 99 23 L 101 22 L 101 20 L 102 20 L 103 18 L 105 18 L 106 16 L 110 15 L 110 14 L 122 13 L 122 14 L 127 14 L 127 15 L 129 15 L 129 16 L 132 17 Z M 120 22 L 117 22 L 117 23 L 112 24 L 111 27 L 110 27 L 110 30 L 109 30 L 109 37 L 110 37 L 110 40 L 111 40 L 111 42 L 112 42 L 113 44 L 115 44 L 115 45 L 122 45 L 122 44 L 124 44 L 124 43 L 127 41 L 127 38 L 128 38 L 128 30 L 127 30 L 127 27 L 125 26 L 125 24 L 123 24 L 123 23 L 121 23 L 121 22 Z M 154 53 L 149 49 L 149 46 L 148 46 L 148 23 L 142 23 L 142 14 L 148 14 L 148 4 L 160 4 L 160 14 L 169 14 L 169 23 L 160 23 L 160 43 L 161 43 L 162 45 L 169 45 L 169 54 L 156 54 L 156 53 L 155 53 Z",
  n: "M 175 7 L 175 1 L 178 1 L 178 2 L 189 2 L 189 3 L 190 3 L 190 4 L 191 4 L 191 5 L 192 5 L 192 6 L 193 6 L 193 7 L 194 7 L 194 8 L 195 8 L 195 9 L 196 9 L 196 10 L 197 10 L 197 11 L 198 11 L 198 12 L 199 12 L 199 13 L 200 13 L 200 14 L 206 19 L 206 29 L 205 29 L 205 28 L 203 28 L 202 26 L 200 26 L 199 24 L 197 24 L 195 21 L 193 21 L 192 19 L 190 19 L 188 16 L 186 17 L 186 54 L 175 54 L 175 8 Z M 192 31 L 192 26 L 193 26 L 193 27 L 195 27 L 196 29 L 198 29 L 199 31 L 201 31 L 202 33 L 204 33 L 206 36 L 208 36 L 208 37 L 211 39 L 211 2 L 212 2 L 212 1 L 215 1 L 215 2 L 223 2 L 223 53 L 222 53 L 222 54 L 221 54 L 221 53 L 220 53 L 220 54 L 211 54 L 211 53 L 210 53 L 210 52 L 209 52 L 209 51 L 208 51 L 208 50 L 207 50 L 207 49 L 206 49 L 206 48 L 205 48 L 205 47 L 204 47 L 204 46 L 203 46 L 203 45 L 202 45 L 202 44 L 201 44 L 201 43 L 200 43 L 195 37 L 193 37 L 192 32 Z",
  play: "M 275 40 L 274 40 L 274 44 L 273 44 L 272 48 L 271 48 L 269 51 L 267 51 L 266 53 L 263 53 L 263 54 L 251 54 L 251 53 L 247 52 L 247 51 L 244 49 L 244 68 L 232 68 L 232 42 L 233 42 L 233 41 L 232 41 L 232 25 L 233 25 L 233 23 L 232 23 L 232 15 L 233 15 L 233 14 L 243 14 L 243 15 L 244 15 L 244 18 L 245 18 L 246 16 L 248 16 L 248 15 L 250 15 L 250 14 L 254 14 L 254 13 L 259 13 L 259 14 L 264 14 L 264 15 L 266 15 L 267 17 L 269 17 L 269 18 L 272 20 L 272 22 L 273 22 L 273 24 L 274 24 L 274 28 L 275 28 L 275 39 Z M 259 44 L 259 43 L 262 41 L 262 38 L 263 38 L 263 30 L 262 30 L 261 25 L 258 24 L 258 23 L 255 23 L 255 22 L 249 23 L 249 24 L 245 27 L 245 30 L 244 30 L 244 37 L 245 37 L 245 40 L 246 40 L 246 42 L 247 42 L 248 44 L 250 44 L 250 45 L 257 45 L 257 44 L 258 44 Z M 294 18 L 294 53 L 293 53 L 293 54 L 282 54 L 282 0 L 294 0 L 294 17 Z M 339 47 L 339 52 L 340 52 L 340 54 L 329 54 L 329 53 L 328 53 L 328 49 L 327 49 L 325 52 L 321 53 L 321 54 L 308 54 L 308 53 L 305 53 L 305 52 L 301 49 L 301 47 L 300 47 L 300 38 L 301 38 L 301 36 L 302 36 L 305 32 L 307 32 L 307 31 L 311 31 L 311 30 L 326 30 L 326 29 L 327 29 L 327 26 L 326 26 L 326 24 L 325 24 L 324 22 L 315 22 L 312 26 L 302 26 L 302 25 L 301 25 L 301 24 L 302 24 L 302 21 L 304 20 L 305 17 L 307 17 L 308 15 L 311 15 L 311 14 L 316 14 L 316 13 L 329 14 L 329 15 L 332 15 L 333 17 L 335 17 L 335 19 L 336 19 L 337 22 L 338 22 L 338 45 L 339 45 L 339 46 Z M 322 46 L 322 45 L 324 45 L 324 44 L 326 43 L 326 41 L 327 41 L 327 36 L 319 36 L 319 37 L 314 37 L 314 38 L 312 38 L 311 43 L 312 43 L 314 46 L 321 46 Z M 357 57 L 357 55 L 358 55 L 358 51 L 357 51 L 357 49 L 356 49 L 356 47 L 355 47 L 355 44 L 354 44 L 354 42 L 353 42 L 353 40 L 352 40 L 352 38 L 351 38 L 351 36 L 350 36 L 350 33 L 349 33 L 349 31 L 348 31 L 348 29 L 347 29 L 347 26 L 346 26 L 346 24 L 345 24 L 345 22 L 344 22 L 344 19 L 343 19 L 343 17 L 342 17 L 342 14 L 354 14 L 354 15 L 355 15 L 356 20 L 357 20 L 357 23 L 358 23 L 358 26 L 359 26 L 359 29 L 360 29 L 360 31 L 361 31 L 361 34 L 362 34 L 362 37 L 363 37 L 364 40 L 365 40 L 366 34 L 367 34 L 367 32 L 368 32 L 369 26 L 370 26 L 370 24 L 371 24 L 371 20 L 372 20 L 372 18 L 373 18 L 373 15 L 374 15 L 374 14 L 386 14 L 385 19 L 384 19 L 383 24 L 382 24 L 382 26 L 381 26 L 381 28 L 380 28 L 380 31 L 379 31 L 378 36 L 377 36 L 377 38 L 376 38 L 376 40 L 375 40 L 374 46 L 373 46 L 373 48 L 372 48 L 372 51 L 371 51 L 371 53 L 370 53 L 370 56 L 369 56 L 367 62 L 366 62 L 363 66 L 358 67 L 358 68 L 347 68 L 347 59 L 354 59 L 354 58 L 356 58 L 356 57 Z"
};

/**
 * Pure Vector SpotNPlay Wordmark
 * Renders the exact custom letterforms, counter holes, and sliced athletic 'N'
 */
export const SpotNPlayWordmark = ({
  className = "h-5",
  textColor = "currentColor",
  accentN = true,
  nColor = "#4ade80",
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 386 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none ${className}`}
      {...props}
    >
      {/* "Spot" */}
      <path
        d={WORDMARK_PATHS.spot}
        fill={textColor}
        fillRule="evenodd"
      />
      {/* "N" with the athletic slice cut */}
      <path
        d={WORDMARK_PATHS.n}
        fill={accentN ? nColor : textColor}
        fillRule="evenodd"
      />
      {/* "Play" */}
      <path
        d={WORDMARK_PATHS.play}
        fill={textColor}
        fillRule="evenodd"
      />
    </svg>
  );
};

/**
 * SpotNPlay App Icon (Squircle badge variant)
 */
export const SpotNPlayAppIcon = ({ size = 40, className = "" }) => (
  <div
    style={{ width: size, height: size }}
    className={`relative rounded-2xl bg-[#091124] border border-[#4ade80]/30 flex items-center justify-center shadow-lg shadow-black/40 overflow-hidden flex-shrink-0 ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-[#121c38] to-[#060a17]" />
    <SpotNPlayIcon
      color="#4ade80"
      glow
      className="relative z-10 w-[70%] h-[70%]"
    />
  </div>
);

/**
 * Primary SpotNPlay Brand Logo Component
 * Supports: 'full' | 'icon' | 'wordmark' | 'app-icon'
 */
export default function SpotNPlayLogo({
  variant = 'full',
  size = 'md',
  theme = 'auto', // 'auto' | 'light' | 'dark' | 'mono-white' | 'mono-black'
  className = '',
  iconGlow = true,
  accentN = true,
  animateOnHover = true,
}) {
  // Size configurations
  const sizeMap = {
    sm: { icon: 'h-5 w-auto', wordmark: 'h-4 w-auto', gap: 'gap-2.5' },
    md: { icon: 'h-6 w-auto', wordmark: 'h-5 w-auto', gap: 'gap-3' },
    lg: { icon: 'h-8 w-auto', wordmark: 'h-6 w-auto', gap: 'gap-3.5' },
    xl: { icon: 'h-12 w-auto', wordmark: 'h-9 w-auto', gap: 'gap-5' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Icon color determination
  let iconColor = '#4ade80'; // brand sports green
  let wordmarkColor = 'currentColor';
  let resolvedNColor = '#4ade80';

  if (theme === 'mono-white') {
    iconColor = '#ffffff';
    wordmarkColor = '#ffffff';
    resolvedNColor = '#ffffff';
  } else if (theme === 'mono-black') {
    iconColor = '#000000';
    wordmarkColor = '#000000';
    resolvedNColor = '#000000';
  } else if (theme === 'dark') {
    wordmarkColor = '#ffffff';
  } else if (theme === 'light') {
    wordmarkColor = '#0d1733';
  }

  // Text color CSS class for auto theme
  const textColorClass = theme === 'auto' ? 'text-[#0d1733] dark:text-white' : '';

  if (variant === 'icon') {
    return (
      <SpotNPlayIcon
        color={iconColor}
        glow={iconGlow && iconColor === '#b3f406'}
        className={`${currentSize.icon} ${animateOnHover ? 'group-hover:scale-105 transition-transform duration-200' : ''} ${className}`}
      />
    );
  }

  if (variant === 'app-icon') {
    const pxSize = size === 'sm' ? 32 : size === 'lg' ? 52 : size === 'xl' ? 72 : 42;
    return <SpotNPlayAppIcon size={pxSize} className={className} />;
  }

  if (variant === 'wordmark') {
    return (
      <div className={`inline-flex items-center ${textColorClass} ${className}`}>
        <SpotNPlayWordmark
          className={currentSize.wordmark}
          textColor={wordmarkColor}
          accentN={accentN && theme !== 'mono-white' && theme !== 'mono-black'}
          nColor={resolvedNColor}
        />
      </div>
    );
  }

  // Default: Full Brand Lockup (Vector Icon + Vector Wordmark)
  return (
    <div className={`inline-flex items-center ${currentSize.gap} group flex-shrink-0 select-none ${textColorClass} ${className}`}>
      <div className={`relative flex items-center justify-center ${animateOnHover ? 'group-hover:scale-110 transition-transform duration-200' : ''}`}>
        <SpotNPlayIcon
          color={iconColor}
          glow={iconGlow && iconColor === '#b3f406'}
          className={currentSize.icon}
        />
      </div>

      <div className="flex items-center">
        <SpotNPlayWordmark
          className={`${currentSize.wordmark} transition-transform duration-200`}
          textColor={wordmarkColor}
          accentN={accentN && theme !== 'mono-white' && theme !== 'mono-black'}
          nColor={resolvedNColor}
        />
      </div>
    </div>
  );
}
