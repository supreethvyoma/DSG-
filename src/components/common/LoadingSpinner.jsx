import React from "react";

export default function LoadingSpinner({
  text = "Loading...",
  minHeight = "180px",
  size = "36px",
  style = {}
}) {
  return (
    <div
      className="global-loading-spinner-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        minHeight: minHeight,
        padding: "24px 16px",
        gap: "12px",
        color: "var(--site-text-soft, #64748b)",
        boxSizing: "border-box",
        ...style
      }}
    >
      <div
        className="global-loading-spinner-ring"
        style={{
          width: size,
          height: size,
          border: "3px solid #e2e8f0",
          borderTopColor: "var(--site-link, #0284c7)",
          borderRadius: "50%",
          animation: "globalSpin 0.75s linear infinite"
        }}
      />
      {text ? (
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--site-text-soft, #64748b)",
            letterSpacing: "0.01em"
          }}
        >
          {text}
        </span>
      ) : null}
    </div>
  );
}
