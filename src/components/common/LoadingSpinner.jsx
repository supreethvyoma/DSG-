import React from "react";

export default function LoadingSpinner({
  text = "Loading...",
  minHeight = "140px",
  size = "34px",
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
        gridColumn: "1 / -1",
        minHeight: minHeight,
        padding: "20px 16px",
        margin: "0 auto",
        gap: "12px",
        color: "var(--site-text-soft, #64748b)",
        boxSizing: "border-box",
        textAlign: "center",
        ...style
      }}
    >
      <div
        className="global-loading-spinner-ring"
        style={{
          width: size,
          height: size,
          border: "3.5px solid rgba(2, 132, 199, 0.15)",
          borderTopColor: "var(--site-button-bg, #0284c7)",
          borderRightColor: "var(--site-button-bg, #0284c7)",
          borderRadius: "50%",
          boxShadow: "0 0 12px rgba(2, 132, 199, 0.2)",
          animation: "globalSpin 0.75s linear infinite"
        }}
      />
      {text ? (
        <span
          className="global-loading-spinner-text"
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--site-text-soft, #64748b)",
            letterSpacing: "0.01em",
            maxWidth: "280px",
            lineHeight: 1.4
          }}
        >
          {text}
        </span>
      ) : null}
    </div>
  );
}
