import React from "react";

export default function LoadingSpinner({
  text = "Loading...",
  minHeight = "140px",
  size = "40px",
  style = {}
}) {
  const numericSize = parseInt(size, 10) || 40;

  return (
    <div
      className="global-loading-spinner-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        gridColumn: "1 / -1",
        minHeight: minHeight,
        padding: "20px 16px",
        margin: "0 auto",
        gap: "14px",
        color: "var(--site-text-soft, #64748b)",
        boxSizing: "border-box",
        textAlign: "center",
        ...style
      }}
    >
      <div
        className="global-spinner-container"
        style={{
          position: "relative",
          width: `${numericSize}px`,
          height: `${numericSize}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {/* Ambient Radial Background Glow */}
        <div
          style={{
            position: "absolute",
            inset: "-6px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(2, 132, 199, 0.15) 0%, rgba(2, 132, 199, 0) 70%)",
            animation: "spinnerGlowPulse 2s ease-in-out infinite"
          }}
        />

        {/* Dual-Tone Gradient SVG Ring */}
        <svg
          width={numericSize}
          height={numericSize}
          viewBox="0 0 40 40"
          style={{
            transform: "rotate(-90deg)",
            animation: "globalSpin 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite"
          }}
        >
          <defs>
            <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="1" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Track Ring */}
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="rgba(226, 232, 240, 0.5)"
            strokeWidth="3.5"
          />

          {/* Animated Arc */}
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="url(#spinnerGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="65 35"
          />
        </svg>

        {/* Pulsing Core Dot */}
        <div
          style={{
            position: "absolute",
            width: `${Math.max(6, numericSize * 0.22)}px`,
            height: `${Math.max(6, numericSize * 0.22)}px`,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
            boxShadow: "0 0 8px rgba(2, 132, 199, 0.6)",
            animation: "spinnerCorePulse 1.4s ease-in-out infinite"
          }}
        />
      </div>

      {text ? (
        <span
          className="global-loading-spinner-text"
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--site-text-soft, #64748b)",
            letterSpacing: "0.02em",
            maxWidth: "280px",
            lineHeight: 1.4,
            animation: "spinnerTextFade 1.8s ease-in-out infinite"
          }}
        >
          {text}
        </span>
      ) : null}
    </div>
  );
}
