import React, { useState, useMemo } from "react";
import "./Auth.css";
import { logIn, signUp, verifyLoginMfa } from "../../actions/AuthActions.js";
import * as AuthApi from "../../api/AuthRequests.js";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import SEO from "../../components/SEO/SEO";
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
  UilEnvelope,
  UilPhone,
  UilKeySkeleton,
  UilArrowLeft,
} from "@iconscout/react-unicons";

const Auth = () => {
  const initialFormState = {
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmpass: "",
  };

  const loading = useSelector((state) => state.authReducer.loading);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Mode: 'auth' (standard login/signup), 'mfa' (login 2FA challenge), 'forgot' (forgot password)
  const [viewMode, setViewMode] = useState("auth");
  const [isSignUp, setIsSignUp] = useState(false);
  const [data, setData] = useState(initialFormState);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // MFA Challenge State
  const [mfaDetails, setMfaDetails] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState(1); // 1 = request code, 2 = enter code & new pass
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotDestination, setForgotDestination] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);

  // Live password validation checklist for signup
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

  // Live password validation for forgot password reset
  const forgotPasswordChecks = useMemo(() => {
    const pwd = forgotNewPassword || "";
    return {
      hasLength: pwd.length >= 6,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
    };
  }, [forgotNewPassword]);

  // Contact method status (at least one of email or phone required)
  const contactStatus = useMemo(() => {
    const hasEmail = Boolean(data.email && data.email.trim());
    const hasPhone = Boolean(data.phone && data.phone.trim());
    return {
      hasEmail,
      hasPhone,
      isSatisfied: hasEmail || hasPhone,
    };
  }, [data.email, data.phone]);

  const resetForm = () => {
    setData(initialFormState);
    setErrorMessage("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
    if (errorMessage) setErrorMessage("");
  };

  // Main Submit Handler (Login & Signup)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (isSignUp) {
      // 1. Password confirmation check
      if (data.password !== data.confirmpass) {
        const msg = "Passwords do not match!";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      // 2. Password complexity check
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

      // 3. Username check
      if (data.username.trim().length < 3 || data.username.trim().length > 30) {
        const msg = "Username must be between 3 and 30 characters.";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      // 4. Contact method requirement (at least email OR phone)
      if (!contactStatus.isSatisfied) {
        const msg = "Please provide at least one contact method: Email or Phone Number.";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      // Format validations if provided
      if (data.email && data.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email.trim())) {
          const msg = "Please enter a valid email address.";
          setErrorMessage(msg);
          toast.error(msg);
          return;
        }
      }

      if (data.phone && data.phone.trim()) {
        const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
        if (!phoneRegex.test(data.phone.trim())) {
          const msg = "Please enter a valid phone number (minimum 7 digits).";
          setErrorMessage(msg);
          toast.error(msg);
          return;
        }
      }

      const res = await dispatch(signUp(data, navigate));
      if (!res?.success) {
        setErrorMessage(res?.message || "Registration failed. Please check your details.");
      }
    } else {
      // Login attempt
      const res = await dispatch(logIn(data, navigate));
      if (res?.mfaRequired) {
        // Switch to MFA challenge screen
        setMfaDetails(res);
        setMfaCode("");
        setViewMode("mfa");
        toast.info("Two-Factor Authentication Required", {
          description: res.message || "Please enter your 6-digit verification code.",
        });
      } else if (!res?.success) {
        setErrorMessage(res?.message || "Invalid username or password");
      }
    }
  };

  // MFA Challenge Submit
  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit verification code.");
      return;
    }

    setMfaSubmitting(true);
    try {
      const res = await dispatch(
        verifyLoginMfa(
          {
            tempUserId: mfaDetails.tempUserId,
            code: mfaCode.trim(),
          },
          navigate
        )
      );

      if (!res?.success) {
        toast.error(res?.message || "Verification code is incorrect or expired.");
      }
    } finally {
      setMfaSubmitting(false);
    }
  };

  // Forgot Password: Step 1 (Request Code)
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      toast.error("Please enter your username or registered email.");
      return;
    }

    setForgotSubmitting(true);
    try {
      const { data: res } = await AuthApi.forgotPassword({
        identifier: forgotIdentifier.trim(),
      });

      setForgotDestination(res.destination || "your registered contact");
      setForgotStep(2);
      toast.success("Verification code sent!", {
        description: res.message || "Please check your email or phone for the 6-digit code.",
      });
    } catch (error) {
      const msg =
        error.response?.data?.message || "Failed to find account or send reset code.";
      toast.error(msg);
    } finally {
      setForgotSubmitting(false);
    }
  };

  // Forgot Password: Step 2 (Reset Password)
  const handleForgotReset = async (e) => {
    e.preventDefault();

    if (!forgotCode || forgotCode.trim().length !== 6) {
      toast.error("Please enter the 6-digit reset code.");
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (forgotNewPassword.length < 6 || !passwordRegex.test(forgotNewPassword)) {
      toast.error("Password must be at least 6 characters with upper, lower, and numbers.");
      return;
    }

    setForgotSubmitting(true);
    try {
      const { data: res } = await AuthApi.resetPassword({
        identifier: forgotIdentifier.trim(),
        code: forgotCode.trim(),
        newPassword: forgotNewPassword,
      });

      toast.success("Password reset successful!", {
        description: res.message || "You can now log in with your new password.",
      });

      // Reset forgot state and switch back to Sign In
      setViewMode("auth");
      setIsSignUp(false);
      setForgotStep(1);
      setForgotCode("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to reset password. Code may be invalid.";
      toast.error(msg);
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <SEO 
        title={isSignUp ? "Sign Up for SocialSphere - Join the Community" : "Sign In to SocialSphere - Connect & Share"}
        description="Sign in or register for SocialSphere to connect with friends, share updates, join groups, and chat in real-time."
        url="https://himanshu-social-sphere.vercel.app/auth"
      />
      <div className="auth-card-wrapper">
        {/* ================= LEFT BRAND & HERO COLUMN ================= */}
        <div className="auth-hero-pane">
          <div className="hero-glow-1"></div>
          <div className="hero-glow-2"></div>

          <div className="hero-brand">
            <div className="brand-badge-icon">S</div>
            <span className="brand-logo-text">SocialSphere</span>
          </div>

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
                  <span className="feature-title">Multi-Factor Security</span>
                  <span className="feature-sub">Email, Phone & TOTP</span>
                </div>
              </div>
            </div>
          </div>

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
            {/* ----------------- VIEW 1: MFA CHALLENGE ----------------- */}
            {viewMode === "mfa" && (
              <div className="mfa-challenge-box">
                <div className="mfa-icon-badge">
                  <UilShieldCheck size="28" />
                </div>

                <div className="form-header">
                  <h2 className="form-title">Two-Factor Verification</h2>
                  <p className="form-subtitle">
                    {mfaDetails?.method === "totp"
                      ? "Enter the 6-digit security code generated by your Authenticator app."
                      : `A 6-digit code has been dispatched to ${mfaDetails?.destination || "your device"}.`}
                  </p>
                </div>

                <form className="auth-main-form" onSubmit={handleMfaSubmit}>
                  <div className="form-field-group">
                    <label className="field-label">Verification Code</label>
                    <input
                      required
                      autoFocus
                      type="text"
                      maxLength="6"
                      placeholder="000000"
                      className="modern-input mfa-code-input"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>

                  <button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={mfaSubmitting || mfaCode.length !== 6}
                  >
                    <span>{mfaSubmitting ? "Verifying..." : "Verify & Sign In"}</span>
                    {!mfaSubmitting && <UilArrowRight size="18" />}
                  </button>

                  <button
                    type="button"
                    className="auth-secondary-btn"
                    onClick={() => {
                      setViewMode("auth");
                      setMfaDetails(null);
                      setMfaCode("");
                    }}
                  >
                    <UilArrowLeft size="18" />
                    <span>Back to Sign In</span>
                  </button>
                </form>
              </div>
            )}

            {/* ----------------- VIEW 2: FORGOT PASSWORD ----------------- */}
            {viewMode === "forgot" && (
              <div className="forgot-password-box">
                <div className="forgot-step-badge">
                  Step {forgotStep} of 2
                </div>

                <div className="form-header">
                  <h2 className="form-title">
                    {forgotStep === 1 ? "Reset Password" : "Create New Password"}
                  </h2>
                  <p className="form-subtitle">
                    {forgotStep === 1
                      ? "Enter your username or email address and we'll send a 6-digit reset code."
                      : `Enter the 6-digit code sent to ${forgotDestination} and choose a new password.`}
                  </p>
                </div>

                {forgotStep === 1 ? (
                  <form className="auth-main-form" onSubmit={handleForgotRequest}>
                    <div className="form-field-group">
                      <label className="field-label">Username or Email</label>
                      <div className="field-input-wrapper">
                        <span className="field-icon">
                          <UilUser size="18" />
                        </span>
                        <input
                          required
                          type="text"
                          placeholder="Enter your username or email"
                          className="modern-input"
                          value={forgotIdentifier}
                          onChange={(e) => setForgotIdentifier(e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="auth-submit-btn"
                      disabled={forgotSubmitting || !forgotIdentifier.trim()}
                    >
                      <span>{forgotSubmitting ? "Sending Code..." : "Send Reset Code"}</span>
                      {!forgotSubmitting && <UilArrowRight size="18" />}
                    </button>

                    <button
                      type="button"
                      className="auth-secondary-btn"
                      onClick={() => {
                        setViewMode("auth");
                        setForgotStep(1);
                      }}
                    >
                      <UilArrowLeft size="18" />
                      <span>Back to Sign In</span>
                    </button>
                  </form>
                ) : (
                  <form className="auth-main-form" onSubmit={handleForgotReset}>
                    {/* 6-digit reset code */}
                    <div className="form-field-group">
                      <label className="field-label">6-Digit Reset Code</label>
                      <input
                        required
                        type="text"
                        maxLength="6"
                        placeholder="000000"
                        className="modern-input mfa-code-input"
                        value={forgotCode}
                        onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>

                    {/* New Password */}
                    <div className="form-field-group">
                      <label className="field-label">New Password</label>
                      <div className="field-input-wrapper">
                        <span className="field-icon">
                          <UilLock size="18" />
                        </span>
                        <input
                          required
                          type={showForgotNewPassword ? "text" : "password"}
                          className="modern-input with-toggle"
                          placeholder="Choose a new password"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowForgotNewPassword((prev) => !prev)}
                        >
                          {showForgotNewPassword ? <UilEyeSlash size="18" /> : <UilEye size="18" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="form-field-group">
                      <label className="field-label">Confirm New Password</label>
                      <div className="field-input-wrapper">
                        <span className="field-icon">
                          <UilLock size="18" />
                        </span>
                        <input
                          required
                          type="password"
                          className="modern-input"
                          placeholder="Repeat new password"
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Checklist */}
                    <div className="password-checklist-box">
                      <span className="checklist-title">Password Requirements</span>
                      <div className="checklist-grid">
                        <div className={`checklist-item ${forgotPasswordChecks.hasLength ? "item-valid" : "item-idle"}`}>
                          <span className="checklist-badge">
                            {forgotPasswordChecks.hasLength ? <UilCheck size="11" /> : <UilTimes size="11" />}
                          </span>
                          <span>6+ characters</span>
                        </div>
                        <div className={`checklist-item ${forgotPasswordChecks.hasUpper ? "item-valid" : "item-idle"}`}>
                          <span className="checklist-badge">
                            {forgotPasswordChecks.hasUpper ? <UilCheck size="11" /> : <UilTimes size="11" />}
                          </span>
                          <span>1 uppercase (A-Z)</span>
                        </div>
                        <div className={`checklist-item ${forgotPasswordChecks.hasLower ? "item-valid" : "item-idle"}`}>
                          <span className="checklist-badge">
                            {forgotPasswordChecks.hasLower ? <UilCheck size="11" /> : <UilTimes size="11" />}
                          </span>
                          <span>1 lowercase (a-z)</span>
                        </div>
                        <div className={`checklist-item ${forgotPasswordChecks.hasNumber ? "item-valid" : "item-idle"}`}>
                          <span className="checklist-badge">
                            {forgotPasswordChecks.hasNumber ? <UilCheck size="11" /> : <UilTimes size="11" />}
                          </span>
                          <span>1 number (0-9)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="auth-submit-btn"
                      disabled={forgotSubmitting || forgotCode.length !== 6}
                    >
                      <span>{forgotSubmitting ? "Resetting..." : "Reset Password & Sign In"}</span>
                      {!forgotSubmitting && <UilArrowRight size="18" />}
                    </button>

                    <button
                      type="button"
                      className="auth-secondary-btn"
                      onClick={() => setForgotStep(1)}
                    >
                      <UilArrowLeft size="18" />
                      <span>Back to Step 1</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ----------------- VIEW 3: STANDARD LOGIN / REGISTER ----------------- */}
            {viewMode === "auth" && (
              <>
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

                  {/* Email & Phone (SignUp Only - At least one required) */}
                  {isSignUp && (
                    <>
                      <div className="form-row-dual">
                        <div className="form-field-group">
                          <label className="field-label">Email Address</label>
                          <div className="field-input-wrapper">
                            <span className="field-icon">
                              <UilEnvelope size="18" />
                            </span>
                            <input
                              type="email"
                              placeholder="john@example.com"
                              className="modern-input"
                              name="email"
                              value={data.email}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        <div className="form-field-group">
                          <label className="field-label">Phone Number</label>
                          <div className="field-input-wrapper">
                            <span className="field-icon">
                              <UilPhone size="18" />
                            </span>
                            <input
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              className="modern-input"
                              name="phone"
                              value={data.phone}
                              onChange={handleChange}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Contact Requirement Pill Indicator */}
                      <div
                        className={`contact-requirement-pill ${
                          contactStatus.isSatisfied ? "pill-satisfied" : "pill-pending"
                        }`}
                      >
                        <span>
                          {contactStatus.isSatisfied ? "✓" : "ℹ"}
                        </span>
                        <span>
                          {contactStatus.isSatisfied
                            ? `Welcome message will be sent to: ${
                                contactStatus.hasEmail && contactStatus.hasPhone
                                  ? "Email & Phone"
                                  : contactStatus.hasEmail
                                  ? "Email"
                                  : "Phone"
                              }`
                            : "Please provide at least 1 contact method (Email or Phone)."}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Password */}
                  <div className="form-field-group">
                    <div className="field-label-row">
                      <label className="field-label">Password</label>
                      {!isSignUp && (
                        <button
                          type="button"
                          className="auth-forgot-link"
                          onClick={() => {
                            setErrorMessage("");
                            setForgotIdentifier(data.username);
                            setViewMode("forgot");
                            setForgotStep(1);
                          }}
                        >
                          Forgot password?
                        </button>
                      )}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
