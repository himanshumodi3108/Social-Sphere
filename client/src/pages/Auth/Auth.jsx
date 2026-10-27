import React, { useState, useMemo } from "react";
import "./Auth.css";
import { logIn, signUp } from "../../actions/AuthActions.js";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  UilUser,
  UilLock,
  UilEye,
  UilEyeSlash,
  UilArrowRight,
  UilShieldCheck,
  UilUsersAlt,
  UilCamera,
  UilBolt,
  UilCheck,
  UilTimes,
} from "@iconscout/react-unicons";

const Auth = () => {
  const initialState = {
    firstname: "",
    lastname: "",
    username: "",
    password: "",
    confirmpass: "",
  };

  const loading = useSelector((state) => state.authReducer.loading);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [isSignUp, setIsSignUp] = useState(false);
  const [data, setData] = useState(initialState);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Live password validation checklist
  const passwordChecks = useMemo(() => {
    const pwd = data.password || "";
    return {
      hasLength: pwd.length >= 6,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
    };
  }, [data.password]);

  const passwordsMatch = useMemo(() => {
    if (!data.confirmpass) return false;
    return data.password === data.confirmpass;
  }, [data.password, data.confirmpass]);

  const resetForm = () => {
    setData(initialState);
    setErrorMessage("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
    if (errorMessage) setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (isSignUp) {
      if (data.password !== data.confirmpass) {
        const msg = "Passwords do not match!";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      if (data.password.length < 6) {
        const msg = "Password must be at least 6 characters long.";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(data.password)) {
        const msg =
          "Password must contain at least one uppercase letter, one lowercase letter, and one number.";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      if (data.username.trim().length < 3 || data.username.trim().length > 30) {
        const msg = "Username must be between 3 and 30 characters.";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      const res = await dispatch(signUp(data, navigate));
      if (!res) {
        setErrorMessage("Registration failed. Please check your details.");
      }
    } else {
      const res = await dispatch(logIn(data, navigate));
      if (!res) {
        setErrorMessage("Invalid username or password");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card-wrapper">
        {/* ================= LEFT BRAND & HERO COLUMN ================= */}
        <div className="auth-hero-pane">
          {/* Subtle Ambient Glows */}
          <div className="hero-glow-1"></div>
          <div className="hero-glow-2"></div>

          {/* Top Brand Logo */}
          <div className="hero-brand">
            <div className="brand-badge-icon">S</div>
            <span className="brand-logo-text">SocialSphere</span>
          </div>

          {/* Hero Content */}
          <div className="hero-main-content">
            <div className="hero-tagline-pill">
              <span className="status-indicator-dot"></span>
              Real-Time Community Platform
            </div>

            <h2 className="hero-headline">
              Connect deeply with people who share your world.
            </h2>

            <p className="hero-description">
              Experience end-to-end encrypted messaging, vibrant interest groups,
              ephemeral stories, and real-time feeds without the noise.
            </p>

            {/* Feature Highlights Grid */}
            <div className="hero-features-grid">
              <div className="feature-card">
                <div className="feature-icon-box">
                  <UilShieldCheck size="18" />
                </div>
                <div className="feature-text">
                  <span className="feature-title">E2EE Private Chat</span>
                  <span className="feature-sub">End-to-end encryption</span>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-icon-box">
                  <UilUsersAlt size="18" />
                </div>
                <div className="feature-text">
                  <span className="feature-title">Interest Groups</span>
                  <span className="feature-sub">Engage & collaborate</span>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-icon-box">
                  <UilCamera size="18" />
                </div>
                <div className="feature-text">
                  <span className="feature-title">24h Stories</span>
                  <span className="feature-sub">Share visual moments</span>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-icon-box">
                  <UilBolt size="18" />
                </div>
                <div className="feature-text">
                  <span className="feature-title">Zero-Lag Feeds</span>
                  <span className="feature-sub">Instant notifications</span>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof Footer */}
          <div className="hero-footer">
            <div className="avatar-stack">
              <span className="mini-avatar avatar-1">👩‍💻</span>
              <span className="mini-avatar avatar-2">👨‍🎨</span>
              <span className="mini-avatar avatar-3">🚀</span>
              <div className="avatar-plus">+4k</div>
            </div>
            <span className="hero-footer-caption">Active creators joined this week</span>
          </div>
        </div>

        {/* ================= RIGHT FORM COLUMN ================= */}
        <div className="auth-form-pane">
          <div className="form-inner-wrapper">
            {/* Header / Titles */}
            <div className="form-header">
              <h2 className="form-title">
                {isSignUp ? "Create an Account" : "Welcome Back"}
              </h2>
              <p className="form-subtitle">
                {isSignUp
                  ? "Join the SocialSphere community to discover groups, chats, and friends."
                  : "Please enter your credentials to access your account."}
              </p>
            </div>

            {/* Segmented Pill Selector (Login / Register) */}
            <div className="auth-segmented-pill">
              <button
                type="button"
                className={`pill-tab ${!isSignUp ? "pill-active" : ""}`}
                onClick={() => {
                  if (isSignUp) {
                    resetForm();
                    setIsSignUp(false);
                  }
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`pill-tab ${isSignUp ? "pill-active" : ""}`}
                onClick={() => {
                  if (!isSignUp) {
                    resetForm();
                    setIsSignUp(true);
                  }
                }}
              >
                Create Account
              </button>
            </div>

            {/* The Form */}
            <form className="auth-main-form" onSubmit={handleSubmit}>
              {/* First Name & Last Name (SignUp Only) */}
              {isSignUp && (
                <div className="form-row-dual">
                  <div className="form-field-group">
                    <label className="field-label">First Name</label>
                    <div className="field-input-wrapper">
                      <span className="field-icon">
                        <UilUser size="18" />
                      </span>
                      <input
                        required
                        type="text"
                        placeholder="John"
                        className="modern-input"
                        name="firstname"
                        value={data.firstname}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label className="field-label">Last Name</label>
                    <div className="field-input-wrapper">
                      <span className="field-icon">
                        <UilUser size="18" />
                      </span>
                      <input
                        required
                        type="text"
                        placeholder="Doe"
                        className="modern-input"
                        name="lastname"
                        value={data.lastname}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Username */}
              <div className="form-field-group">
                <label className="field-label">Username</label>
                <div className="field-input-wrapper">
                  <span className="field-icon">
                    <UilUser size="18" />
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="Enter your username"
                    className="modern-input"
                    name="username"
                    value={data.username}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-field-group">
                <div className="field-label-row">
                  <label className="field-label">Password</label>
                </div>
                <div className="field-input-wrapper">
                  <span className="field-icon">
                    <UilLock size="18" />
                  </span>
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    className="modern-input with-toggle"
                    placeholder="Enter your password"
                    name="password"
                    value={data.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <UilEyeSlash size="18" /> : <UilEye size="18" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (SignUp Only) */}
              {isSignUp && (
                <div className="form-field-group">
                  <label className="field-label">Confirm Password</label>
                  <div className="field-input-wrapper">
                    <span className="field-icon">
                      <UilLock size="18" />
                    </span>
                    <input
                      required
                      type={showConfirmPassword ? "text" : "password"}
                      className="modern-input with-toggle"
                      name="confirmpass"
                      placeholder="Repeat your password"
                      value={data.confirmpass}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? (
                        <UilEyeSlash size="18" />
                      ) : (
                        <UilEye size="18" />
                      )}
                    </button>
                  </div>
                  {data.confirmpass && (
                    <div
                      className={`password-match-tag ${
                        passwordsMatch ? "tag-matched" : "tag-mismatched"
                      }`}
                    >
                      {passwordsMatch ? "✓ Passwords match" : "✕ Passwords do not match"}
                    </div>
                  )}
                </div>
              )}

              {/* Live Password Checklist (SignUp Only) */}
              {isSignUp && (
                <div className="password-checklist-box">
                  <span className="checklist-title">Password Requirements</span>
                  <div className="checklist-grid">
                    <div
                      className={`checklist-item ${
                        passwordChecks.hasLength ? "item-valid" : "item-idle"
                      }`}
                    >
                      <span className="checklist-badge">
                        {passwordChecks.hasLength ? (
                          <UilCheck size="11" />
                        ) : (
                          <UilTimes size="11" />
                        )}
                      </span>
                      <span>6+ characters</span>
                    </div>

                    <div
                      className={`checklist-item ${
                        passwordChecks.hasUpper ? "item-valid" : "item-idle"
                      }`}
                    >
                      <span className="checklist-badge">
                        {passwordChecks.hasUpper ? (
                          <UilCheck size="11" />
                        ) : (
                          <UilTimes size="11" />
                        )}
                      </span>
                      <span>1 uppercase (A-Z)</span>
                    </div>

                    <div
                      className={`checklist-item ${
                        passwordChecks.hasLower ? "item-valid" : "item-idle"
                      }`}
                    >
                      <span className="checklist-badge">
                        {passwordChecks.hasLower ? (
                          <UilCheck size="11" />
                        ) : (
                          <UilTimes size="11" />
                        )}
                      </span>
                      <span>1 lowercase (a-z)</span>
                    </div>

                    <div
                      className={`checklist-item ${
                        passwordChecks.hasNumber ? "item-valid" : "item-idle"
                      }`}
                    >
                      <span className="checklist-badge">
                        {passwordChecks.hasNumber ? (
                          <UilCheck size="11" />
                        ) : (
                          <UilTimes size="11" />
                        )}
                      </span>
                      <span>1 number (0-9)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {errorMessage && (
                <div className="auth-error-banner" role="alert">
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                <span>
                  {loading
                    ? "Authenticating..."
                    : isSignUp
                    ? "Create Account"
                    : "Sign In"}
                </span>
                {!loading && <UilArrowRight size="18" />}
              </button>

              {/* Footer Switch Prompt */}
              <div className="auth-switch-footer">
                <span>
                  {isSignUp
                    ? "Already have an account?"
                    : "Don't have an account yet?"}
                </span>
                <button
                  type="button"
                  className="auth-switch-btn"
                  onClick={() => {
                    resetForm();
                    setIsSignUp((prev) => !prev);
                  }}
                >
                  {isSignUp ? "Log in here" : "Sign up now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
