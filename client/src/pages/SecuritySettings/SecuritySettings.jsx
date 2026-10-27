import React, { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import SettingsLayout from "../../components/SettingsLayout/SettingsLayout";
import * as UserApi from "../../api/UserRequests";
import { toast } from "sonner";
import {
  UilShieldCheck,
  UilLock,
  UilEnvelope,
  UilPhone,
  UilCheck,
  UilTimes,
  UilEye,
  UilEyeSlash,
  UilArrowLeft,
  UilMobileAndroid,
} from "@iconscout/react-unicons";
import "./SecuritySettings.css";

const SecuritySettings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const authData = useSelector((state) => state.authReducer.authData);
  const currentUser = authData?.user;

  const [profileData, setProfileData] = useState(currentUser || {});
  const [loadingProfile, setLoadingProfile] = useState(false);

  // --- MFA State ---
  const [mfaMethod, setMfaMethod] = useState("email"); // 'email' | 'phone' | 'totp'
  const [setupState, setSetupState] = useState(null); // null or { method, secret, qrCodeUrl, destination }
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [disableModal, setDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disablingMfa, setDisablingMfa] = useState(false);

  // --- Change Password State ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // --- Contact Info State ---
  const [emailInput, setEmailInput] = useState(currentUser?.email || "");
  const [phoneInput, setPhoneInput] = useState(currentUser?.phone || "");
  const [contactLoading, setContactLoading] = useState(false);

  // Fetch fresh user profile on mount
  useEffect(() => {
    if (currentUser?._id) {
      setLoadingProfile(true);
      UserApi.getUser(currentUser._id)
        .then((res) => {
          const u = res.data || res;
          setProfileData(u);
          setEmailInput(u.email || "");
          setPhoneInput(u.phone || "");
          if (u.mfa?.method) {
            setMfaMethod(u.mfa.method);
          }
        })
        .catch((err) => {
          // fallback to Redux user
        })
        .finally(() => setLoadingProfile(false));
    }
  }, [currentUser?._id]);

  // Live password checks
  const passwordChecks = useMemo(() => {
    const pwd = newPassword || "";
    return {
      hasLength: pwd.length >= 6,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
    };
  }, [newPassword]);

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return false;
    return newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

  // ================== MFA Handlers ==================
  const handleInitiateMfaSetup = async (methodToSetup) => {
    const targetMethod = methodToSetup || mfaMethod;
    if (targetMethod === "email" && !profileData.email && !emailInput) {
      toast.error("Please add and save an email address before setting up Email MFA.");
      return;
    }
    if (targetMethod === "phone" && !profileData.phone && !phoneInput) {
      toast.error("Please add and save a phone number before setting up SMS MFA.");
      return;
    }

    setMfaLoading(true);
    try {
      const { data } = await UserApi.setupMfa(currentUser._id, { method: targetMethod });
      setSetupState({
        method: targetMethod,
        secret: data.secret,
        qrCodeUrl: data.qrCodeUrl,
        destination: data.destination || (targetMethod === "email" ? profileData.email : profileData.phone),
      });
      setMfaCode("");
      toast.info("Setup Initiated", {
        description: data.message || "Enter the verification code to activate.",
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start MFA setup.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyAndEnableMfa = async (e) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit verification code.");
      return;
    }

    setMfaLoading(true);
    try {
      const { data } = await UserApi.enableMfa(currentUser._id, {
        method: setupState.method,
        code: mfaCode.trim(),
      });

      setProfileData((prev) => ({
        ...prev,
        mfa: { enabled: true, method: setupState.method },
      }));
      setSetupState(null);
      setMfaCode("");
      toast.success("Success! Two-Factor Authentication is now enabled.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid or expired code.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async (e) => {
    e.preventDefault();
    if (!disablePassword) {
      toast.error("Please enter your current password to disable MFA.");
      return;
    }

    setDisablingMfa(true);
    try {
      await UserApi.disableMfa(currentUser._id, { password: disablePassword });
      setProfileData((prev) => ({
        ...prev,
        mfa: { enabled: false },
      }));
      setDisableModal(false);
      setDisablePassword("");
      toast.success("Two-Factor Authentication has been disabled.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Incorrect password.");
    } finally {
      setDisablingMfa(false);
    }
  };

  // ================== Change Password Handler ==================
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (newPassword.length < 6 || !passwordRegex.test(newPassword)) {
      toast.error("Password must be 6+ chars and contain uppercase, lowercase, and numbers.");
      return;
    }

    setPasswordLoading(true);
    try {
      const { data } = await UserApi.changePassword(currentUser._id, {
        currentPassword,
        newPassword,
      });

      toast.success(data.message || "Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // ================== Update Contact Info Handler ==================
  const handleUpdateContact = async (e) => {
    e.preventDefault();

    if (!emailInput.trim() && !phoneInput.trim()) {
      toast.error("You must have at least one contact method (email or phone).");
      return;
    }

    if (emailInput.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput.trim())) {
        toast.error("Please enter a valid email address.");
        return;
      }
    }

    if (phoneInput.trim()) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
      if (!phoneRegex.test(phoneInput.trim())) {
        toast.error("Please enter a valid phone number.");
        return;
      }
    }

    setContactLoading(true);
    try {
      const { data } = await UserApi.updateUser(currentUser._id, {
        _id: currentUser._id,
        email: emailInput.trim() || undefined,
        phone: phoneInput.trim() || undefined,
      });

      setProfileData((prev) => ({
        ...prev,
        email: emailInput.trim(),
        phone: phoneInput.trim(),
      }));

      // Update Redux state
      dispatch({
        type: "UPDATING_SUCCESS",
        data: { user: { ...currentUser, email: emailInput.trim(), phone: phoneInput.trim() } },
      });

      toast.success("Contact details updated successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update contact info.");
    } finally {
      setContactLoading(false);
    }
  };

  const isMfaActive = Boolean(profileData.mfa?.enabled);

  return (
    <SettingsLayout>
      <div className="SecuritySettings">
        <button className="back-button" onClick={() => navigate(-1)}>
          <UilArrowLeft size="20" />
          Back
        </button>

        <div className="security-settings-container">
          {/* Settings Top Tabs */}
          <div className="settings-nav-tabs">
            <Link to="/settings" className="nav-tab active">
              🔒 Security & MFA
            </Link>
            <Link to="/privacy-settings" className="nav-tab">
              🛡️ Privacy
            </Link>
            <Link to="/notification-settings" className="nav-tab">
              🔔 Notifications
            </Link>
          </div>

          <div className="settings-header">
            <h1>Security & Authentication</h1>
            <p className="settings-subtitle">
              Manage multi-factor authentication, account passwords, and verification methods.
            </p>
          </div>

          {/* ================= SECTION 1: TWO-FACTOR AUTHENTICATION (MFA) ================= */}
          <div className="security-card">
            <div className="card-header-flex">
              <div>
                <div className="card-title-row">
                  <UilShieldCheck size="24" className="text-primary" />
                  <h2>Two-Factor Authentication (MFA)</h2>
                  <span className={`status-pill ${isMfaActive ? "pill-active" : "pill-inactive"}`}>
                    {isMfaActive ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="card-desc">
                  Add an extra layer of defense. Whenever you sign in, SocialSphere will require a 6-digit verification code.
                </p>
              </div>
            </div>

            {isMfaActive ? (
              <div className="mfa-active-box">
                <div className="mfa-active-info">
                  <span className="active-icon">✓</span>
                  <div>
                    <strong>MFA is currently protecting your account</strong>
                    <p>
                      Active method:{" "}
                      <span className="badge-method">
                        {profileData.mfa?.method === "totp"
                          ? "Authenticator App (TOTP)"
                          : profileData.mfa?.method === "phone"
                          ? "SMS / Mobile OTP"
                          : "Email OTP"}
                      </span>
                    </p>
                  </div>
                </div>

                {!disableModal ? (
                  <button
                    type="button"
                    className="danger-outline-btn"
                    onClick={() => setDisableModal(true)}
                  >
                    Disable Two-Factor Authentication
                  </button>
                ) : (
                  <form className="disable-mfa-form" onSubmit={handleDisableMfa}>
                    <p className="confirm-prompt">
                      Please enter your current account password to confirm disabling MFA:
                    </p>
                    <div className="disable-input-row">
                      <input
                        required
                        type="password"
                        placeholder="Current password"
                        className="modern-input"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="danger-btn"
                        disabled={disablingMfa || !disablePassword}
                      >
                        {disablingMfa ? "Disabling..." : "Confirm & Disable"}
                      </button>
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => {
                          setDisableModal(false);
                          setDisablePassword("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="mfa-setup-section">
                {!setupState ? (
                  <>
                    <h3 className="sub-heading">Choose your preferred verification method:</h3>
                    <div className="mfa-methods-grid">
                      {/* Option A: Email OTP */}
                      <div
                        className={`mfa-method-card ${mfaMethod === "email" ? "method-selected" : ""}`}
                        onClick={() => setMfaMethod("email")}
                      >
                        <div className="method-icon-box">
                          <UilEnvelope size="22" />
                        </div>
                        <div className="method-info">
                          <h4>Email OTP</h4>
                          <p>
                            Receive a 6-digit code sent to your registered email address (
                            {profileData.email || "No email set"}).
                          </p>
                        </div>
                        <input
                          type="radio"
                          name="mfaMethod"
                          checked={mfaMethod === "email"}
                          onChange={() => setMfaMethod("email")}
                        />
                      </div>

                      {/* Option B: SMS OTP */}
                      <div
                        className={`mfa-method-card ${mfaMethod === "phone" ? "method-selected" : ""}`}
                        onClick={() => setMfaMethod("phone")}
                      >
                        <div className="method-icon-box">
                          <UilPhone size="22" />
                        </div>
                        <div className="method-info">
                          <h4>SMS / Phone OTP</h4>
                          <p>
                            Receive a text message with a one-time passcode to your mobile device (
                            {profileData.phone || "No phone set"}).
                          </p>
                        </div>
                        <input
                          type="radio"
                          name="mfaMethod"
                          checked={mfaMethod === "phone"}
                          onChange={() => setMfaMethod("phone")}
                        />
                      </div>

                      {/* Option C: Authenticator App */}
                      <div
                        className={`mfa-method-card ${mfaMethod === "totp" ? "method-selected" : ""}`}
                        onClick={() => setMfaMethod("totp")}
                      >
                        <div className="method-icon-box">
                          <UilMobileAndroid size="22" />
                        </div>
                        <div className="method-info">
                          <h4>Authenticator App (TOTP)</h4>
                          <p>
                            Generate codes using Google Authenticator, Microsoft Authenticator, or 1Password.
                          </p>
                        </div>
                        <input
                          type="radio"
                          name="mfaMethod"
                          checked={mfaMethod === "totp"}
                          onChange={() => setMfaMethod("totp")}
                        />
                      </div>
                    </div>

                    <div className="mfa-actions-row">
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() => handleInitiateMfaSetup(mfaMethod)}
                        disabled={mfaLoading}
                      >
                        {mfaLoading ? "Setting up..." : `Set Up ${mfaMethod === "totp" ? "Authenticator App" : mfaMethod === "phone" ? "SMS MFA" : "Email MFA"}`}
                      </button>
                    </div>
                  </>
                ) : (
                  /* Setup Step: Code Entry & Verification */
                  <form className="mfa-activation-box" onSubmit={handleVerifyAndEnableMfa}>
                    <div className="setup-header">
                      <h4>
                        Activate {setupState.method === "totp" ? "Authenticator App" : `${setupState.method.toUpperCase()} Verification`}
                      </h4>
                      <p>
                        {setupState.method === "totp"
                          ? "Scan the QR code with your Authenticator app, then enter the 6-digit code below to confirm."
                          : `A 6-digit activation code was sent to ${setupState.destination}. Enter it below.`}
                      </p>
                    </div>

                    {setupState.method === "totp" && (
                      <div className="totp-setup-display">
                        <div className="qr-container">
                          <img
                            src={setupState.qrCodeUrl}
                            alt="TOTP QR Code"
                            className="qr-image"
                          />
                        </div>
                        <div className="secret-display">
                          <span className="secret-label">Can't scan? Enter this code manually:</span>
                          <code className="secret-code">{setupState.secret}</code>
                        </div>
                      </div>
                    )}

                    <div className="activation-input-group">
                      <label>Enter 6-Digit Verification Code</label>
                      <input
                        required
                        autoFocus
                        type="text"
                        maxLength="6"
                        placeholder="000000"
                        className="modern-input activation-code-input"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>

                    <div className="activation-actions">
                      <button
                        type="submit"
                        className="primary-btn"
                        disabled={mfaLoading || mfaCode.length !== 6}
                      >
                        {mfaLoading ? "Verifying..." : "Verify & Activate 2FA"}
                      </button>
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => setSetupState(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* ================= SECTION 2: CHANGE PASSWORD ================= */}
          <div className="security-card">
            <div className="card-title-row">
              <UilLock size="24" className="text-primary" />
              <h2>Change Password</h2>
            </div>
            <p className="card-desc">
              Ensure your account is using a strong, unique password to prevent unauthorized access.
            </p>

            <form className="change-password-form" onSubmit={handleChangePassword}>
              {/* Current Password */}
              <div className="form-group">
                <label>Current Password</label>
                <div className="input-toggle-wrapper">
                  <input
                    required
                    type={showCurrentPass ? "text" : "password"}
                    placeholder="Enter current password"
                    className="modern-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle-icon-btn"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                  >
                    {showCurrentPass ? <UilEyeSlash size="18" /> : <UilEye size="18" />}
                  </button>
                </div>
              </div>

              {/* New Password & Confirm Password */}
              <div className="dual-form-row">
                <div className="form-group">
                  <label>New Password</label>
                  <div className="input-toggle-wrapper">
                    <input
                      required
                      type={showNewPass ? "text" : "password"}
                      placeholder="Enter new password"
                      className="modern-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="toggle-icon-btn"
                      onClick={() => setShowNewPass(!showNewPass)}
                    >
                      {showNewPass ? <UilEyeSlash size="18" /> : <UilEye size="18" />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    required
                    type="password"
                    placeholder="Repeat new password"
                    className="modern-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* Match tag */}
              {confirmPassword && (
                <div className={`password-match-tag ${passwordsMatch ? "tag-matched" : "tag-mismatched"}`}>
                  {passwordsMatch ? "✓ Passwords match" : "✕ Passwords do not match"}
                </div>
              )}

              {/* Live Checklist */}
              {newPassword && (
                <div className="password-checklist-box">
                  <span className="checklist-title">Password Requirements</span>
                  <div className="checklist-grid">
                    <div className={`checklist-item ${passwordChecks.hasLength ? "item-valid" : "item-idle"}`}>
                      <span className="checklist-badge">
                        {passwordChecks.hasLength ? <UilCheck size="11" /> : <UilTimes size="11" />}
                      </span>
                      <span>6+ characters</span>
                    </div>
                    <div className={`checklist-item ${passwordChecks.hasUpper ? "item-valid" : "item-idle"}`}>
                      <span className="checklist-badge">
                        {passwordChecks.hasUpper ? <UilCheck size="11" /> : <UilTimes size="11" />}
                      </span>
                      <span>1 uppercase (A-Z)</span>
                    </div>
                    <div className={`checklist-item ${passwordChecks.hasLower ? "item-valid" : "item-idle"}`}>
                      <span className="checklist-badge">
                        {passwordChecks.hasLower ? <UilCheck size="11" /> : <UilTimes size="11" />}
                      </span>
                      <span>1 lowercase (a-z)</span>
                    </div>
                    <div className={`checklist-item ${passwordChecks.hasNumber ? "item-valid" : "item-idle"}`}>
                      <span className="checklist-badge">
                        {passwordChecks.hasNumber ? <UilCheck size="11" /> : <UilTimes size="11" />}
                      </span>
                      <span>1 number (0-9)</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-action-row">
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={passwordLoading || !currentPassword || !newPassword || !passwordsMatch}
                >
                  {passwordLoading ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>

          {/* ================= SECTION 3: CONTACT METHODS ================= */}
          <div className="security-card">
            <div className="card-title-row">
              <UilEnvelope size="24" className="text-primary" />
              <h2>Registered Contact Methods</h2>
            </div>
            <p className="card-desc">
              Your email and phone are used for account recovery and two-factor notifications.
            </p>

            <form className="contact-info-form" onSubmit={handleUpdateContact}>
              <div className="dual-form-row">
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-icon-wrapper">
                    <UilEnvelope size="18" className="input-icon" />
                    <input
                      type="email"
                      placeholder="e.g. name@example.com"
                      className="modern-input"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <div className="input-icon-wrapper">
                    <UilPhone size="18" className="input-icon" />
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      className="modern-input"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-action-row">
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={contactLoading || (!emailInput.trim() && !phoneInput.trim())}
                >
                  {contactLoading ? "Saving..." : "Save Contact Info"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
};

export default SecuritySettings;
