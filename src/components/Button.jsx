import "./Button.css";

function Button({
  children,
  type = "",
  variant = "cart",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const classes = [
    "ui-button",
    `ui-button-${variant}`,
    `ui-button-${size}`,
    fullWidth ? "ui-button-full" : "",
    loading ? "ui-button-loading" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...props}>
      {loading ? "Please wait..." : children}
    </button>
  );
}

export default Button;
