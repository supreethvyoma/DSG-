import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import "./Login.css";

function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Forgot password states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  // Dynamically load Google Client library
  useEffect(() => {
    // Avoid double loading if already present
    if (window.google?.accounts?.id) {
      initializeGoogleButton();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initializeGoogleButton();
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      try {
        document.body.removeChild(script);
      } catch (e) {
        // Ignore if already removed
      }
    };
  }, []);

  const initializeGoogleButton = () => {
    try {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          // Mock / placeholder client ID. User can replace with their real client ID.
          client_id: "your-google-client-id.apps.googleusercontent.com",
          callback: handleGoogleCredentialResponse
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { theme: "outline", size: "large", width: "100%" }
        );
      }
    } catch (err) {
      console.warn("Failed to initialize Google Login button:", err);
    }
  };

  const handleGoogleCredentialResponse = async (response) => {
    if (!response.credential) return;
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await loginWithGoogle(response.credential, rememberMe);
      navigate("/");
    } catch (err) {
      const msg = err?.response?.data?.message || "Google Sign-In failed. Please check credentials.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await login(email, password, rememberMe);
      navigate("/");
    } catch (err) {
      const message = err?.response?.data?.message || "Login failed";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setIsForgotSubmitting(true);
    setForgotError("");
    setForgotSuccess("");

    try {
      const res = await axios.post("/api/auth/forgot-password", {
        email: forgotEmail
      });
      setForgotSuccess(res.data?.message || "Reset link sent successfully.");
      setForgotEmail("");
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to submit request.";
      setForgotError(message);
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  return (
    <section className="login-page">
      <div className="login-shell">
        <div className="login-brand">
          <p className="login-kicker">Welcome Back</p>
          <h1>Sign in to your account</h1>
          <p>Access your cart, wishlist, orders, and faster checkout in one place.</p>
        </div>

        <div className="login-card">
          {isForgotPassword ? (
            <>
              <h2>Reset Password</h2>
              <p style={{ fontSize: "14px", color: "var(--site-text-soft)", marginBottom: "15px" }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              {forgotError && <p className="login-error">{forgotError}</p>}
              {forgotSuccess && (
                <p style={{ color: "#2e7d32", backgroundColor: "#e8f5e9", padding: "10px", borderRadius: "10px", marginBottom: "15px", fontSize: "0.9rem" }}>
                  {forgotSuccess}
                </p>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="login-form">
                <label htmlFor="forgot-email">Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
                
                <button type="submit" disabled={isForgotSubmitting}>
                  {isForgotSubmitting ? "Sending Reset Link..." : "Send Reset Link"}
                </button>
              </form>

              <p className="login-footer-text">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsForgotPassword(false);
                    setForgotError("");
                    setForgotSuccess("");
                  }}
                  style={{ background: "none", border: "none", color: "var(--site-link)", fontWeight: 700, padding: 0, cursor: "pointer", textDecoration: "underline" }}
                >
                  Back to Login
                </button>
              </p>
            </>
          ) : (
            <>
              <h2>Login</h2>
              {errorMessage && <p className="login-error">{errorMessage}</p>}

              <form onSubmit={handleSubmit} className="login-form">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label htmlFor="login-password">Password</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="login-forgot-link"
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--site-link)", fontFamily: "inherit" }}
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me on this device</span>
                </label>

                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Login"}
                </button>
              </form>

              <div className="login-divider">or</div>

              <div className="google-signin-container">
                {/* Official Google Sign-In button container */}
                <div id="google-signin-btn"></div>
              </div>

              <p className="login-footer-text">
                New here? <Link to="/register">Create an account</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default Login;
