import React from "react";

export default function Flame({ size = 19, className = "", style = {} }) {
  // viewBox is 600 x 650, aspect ratio is 650 / 600 ≈ 1.083
  const height = Math.round(size * (650 / 600));

  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
      style={{
        width: size,
        height: height,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
        lineHeight: 1,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 600 650"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          overflow: "visible",
        }}
      >
        <defs>
          {/* Main orange gradient */}
          <linearGradient id="flame-outerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffb000" />
            <stop offset="30%" stopColor="#ff5a00" />
            <stop offset="65%" stopColor="#d83200" />
            <stop offset="100%" stopColor="#8f1d08" />
          </linearGradient>

          {/* Inner flame */}
          <linearGradient id="flame-innerGradient" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#ffb800" />
            <stop offset="45%" stopColor="#ff6a00" />
            <stop offset="100%" stopColor="#ffad00" />
          </linearGradient>

          {/* Bright center */}
          <radialGradient id="flame-glowGradient">
            <stop offset="0%" stopColor="#fff36a" />
            <stop offset="35%" stopColor="#ffcf19" />
            <stop offset="75%" stopColor="#ff6500" />
            <stop offset="100%" stopColor="#d52c00" />
          </radialGradient>

          {/* Glass-like shine */}
          <linearGradient id="flame-shineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="45%" stopColor="white" stopOpacity=".65" />
            <stop offset="55%" stopColor="white" stopOpacity=".15" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <filter id="flame-shadow">
            <feDropShadow
              dx="0"
              dy="12"
              stdDeviation="10"
              floodColor="#8c2600"
              floodOpacity=".35"
            />
          </filter>

          <filter id="flame-blur">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {/* Outer flame */}
        <path
          d="
            M300 620
            C190 620 95 565 92 455
            C90 390 120 320 165 270
            C190 242 205 275 220 292
            C225 230 240 150 295 75
            C315 48 340 28 365 22
            C385 18 395 35 388 58
            C370 125 395 177 430 230
            C450 260 465 285 472 312
            C480 290 500 265 520 275
            C550 290 555 330 548 365
            C575 415 570 485 535 535
            C495 595 405 620 300 620
            Z
          "
          fill="url(#flame-outerGradient)"
          stroke="#9e2709"
          strokeWidth="10"
          filter="url(#flame-shadow)"
        />

        {/* Outer glass highlight */}
        <path
          d="
            M300 604
            C190 604 112 550 108 458
            C105 395 130 335 168 290
            C183 273 194 300 210 320
            C218 328 230 322 232 305
            C235 215 260 125 310 65
            C325 48 345 38 355 42
            C365 47 355 65 350 82
            C330 155 350 220 400 282
          "
          fill="none"
          stroke="rgba(255,255,255,.55)"
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* Main inner flame */}
        <path
          d="
            M300 575
            C235 575 175 540 168 478
            C160 415 195 365 240 320
            C260 300 275 270 280 235
            C315 275 330 320 322 360
            C345 335 370 305 375 270
            C420 330 455 385 448 440
            C440 520 375 575 300 575
            Z
          "
          fill="url(#flame-innerGradient)"
        />

        {/* Bright central flame */}
        <path
          d="
            M300 550
            C260 550 225 525 220 485
            C214 440 240 405 270 370
            C292 345 300 315 295 280
            C330 325 350 370 340 410
            C355 395 375 375 382 350
            C402 400 410 440 395 475
            C380 520 345 550 300 550
            Z
          "
          fill="url(#flame-glowGradient)"
        />

        {/* Left inner shine */}
        <path
          d="
            M245 500
            C220 470 225 430 250 395
            C270 367 282 335 280 305
            C300 345 300 385 285 420
            C270 455 265 480 280 510
          "
          fill="none"
          stroke="#ffd52c"
          strokeWidth="14"
          strokeLinecap="round"
          opacity=".9"
        />

        {/* Right flame highlight */}
        <path
          d="
            M380 470
            C405 430 395 390 375 350
            C410 390 425 430 415 465
          "
          fill="none"
          stroke="#ffb900"
          strokeWidth="10"
          strokeLinecap="round"
          opacity=".8"
        />

        {/* Glass reflections */}
        <path
          d="
            M150 390
            C135 450 150 505 190 535
          "
          fill="none"
          stroke="white"
          strokeWidth="13"
          strokeLinecap="round"
          opacity=".25"
        />

        <path
          d="
            M470 335
            C500 390 505 450 480 500
          "
          fill="none"
          stroke="white"
          strokeWidth="12"
          strokeLinecap="round"
          opacity=".35"
        />

        {/* Small floating flame on left */}
        <path
          d="
            M170 215
            C145 190 165 165 180 145
            C185 170 205 180 190 205
            C185 213 178 217 170 215
            Z
          "
          fill="url(#flame-outerGradient)"
        />

        {/* Small floating flame on right */}
        <path
          d="
            M430 205
            C410 175 425 150 440 125
            C438 155 465 170 455 195
            C450 205 440 210 430 205
            Z
          "
          fill="url(#flame-outerGradient)"
        />

        {/* Bottom glossy reflection */}
        <ellipse
          cx="300"
          cy="585"
          rx="145"
          ry="18"
          fill="white"
          opacity=".12"
          filter="url(#flame-blur)"
        />
      </svg>
    </span>
  );
}

