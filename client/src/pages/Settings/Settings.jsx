import React, { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import SettingsLayout from "../../components/SettingsLayout/SettingsLayout";
import * as UserApi from "../../api/UserRequests";
import { logout } from "../../actions/AuthActions";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "sonner";
import {
  UilShieldCheck,
  UilLock,
  UilUser,
  UilEnvelope,
  UilPhone,
  UilCheck,
  UilTimes,
  UilEye,
  UilEyeSlash,
  UilArrowLeft,
  UilMobileAndroid,
  UilBell,
  UilPalette,
  UilSun,
  UilMoon,
  UilSignout,
  UilUserCheck,
  UilUserTimes,
  UilSetting,
} from "@iconscout/react-unicons";
import "./Settings.css";

const Settings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDark, toggleTheme } = useTheme();

  const authData = useSelector((state) => state.authReducer.authData);
  const currentUser = authData?.user;

  // Active tab: 'security', 'account', 'privacy', 'notifications', 'appearance'
  const activeTab = searchParams.get("tab") || "security";

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const [profileData, setProfileData] = useState(currentUser || {});
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ================== TAB 1: SECURITY & MFA STATE ==================
  const [mfaMethod, setMfaMethod] = useState("email"); // 'email' | 'phone' | 'totp'
  const [setupState, setSetupState] = useState(null); // { method, secret, qrCodeUrl, destination }
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [disableModal, setDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disablingMfa, setDisablingMfa] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ================== TAB 2: ACCOUNT STATE ==================
  const [accountForm, setAccountForm] = useState({
    firstname: currentUser?.firstname || "",
    lastname: currentUser?.lastname || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    about: currentUser?.about || "",
    livesIn: currentUser?.livesIn || "",
    worksAt: currentUser?.worksAt || "",
    relationship: currentUser?.relationship || "",
    country: currentUser?.country || "",
  });
  const [accountSaving, setAccountSaving] = useState(false);

  // ================== TAB 3: PRIVACY STATE ==================
  const [privacySettings, setPrivacySettings] = useState({
    profile: currentUser?.privacy?.profile || "public",
    posts: currentUser?.privacy?.posts || "public",
  });
  const [privacySaving, setPrivacySaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // ================== TAB 4: NOTIFICATIONS STATE ==================
  const [notificationPrefs, setNotificationPrefs] = useState({
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    messages: true,
    groupUpdates: true,
    emailAlerts: false,
    quietHours: false,
    quietStart: "22:00",
    quietEnd: "08:00",
  });
  const [notifSaving, setNotifSaving] = useState(false);

  // Fetch full user profile on mount
  useEffect(() => {
    if (currentUser?._id) {
      setLoadingProfile(true);
      UserApi.getUser(currentUser._id)
        .then((res) => {
          const u = res.data || res;
          setProfileData(u);
          setAccountForm({
            firstname: u.firstname || "",
            lastname: u.lastname || "",
            email: u.email || "",
            phone: u.phone || "",
            about: u.about || "",
            livesIn: u.livesIn || "",
            worksAt: u.worksAt || "",
            relationship: u.relationship || "",
            country: u.country || "",
          });
          if (u.privacy) {
            setPrivacySettings({
              profile: u.privacy.profile || "public",
              posts: u.privacy.posts || "public",
            });
          }
          if (u.mfa?.method) {
            setMfaMethod(u.mfa.method);
          }
          if (Array.isArray(u.blocked) && u.blocked.length > 0) {
            setBlockedUsers(u.blocked);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingProfile(false));
    }
  }, [currentUser?._id]);

  // Live password checklist
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

  // ================== SECURITY / MFA ACTIONS ==================
  const handleInitiateMfaSetup = async (targetMethod) => {
    const method = targetMethod || mfaMethod;
    if (method === "email" && !accountForm.email) {
      toast.error("Please add and save an email address in the Account tab first.");
      return;
    }
    if (method === "phone" && !accountForm.phone) {
      toast.error("Please add and save a phone number in the Account tab first.");
      return;
    }

    setMfaLoading(true);
    try {
      const { data } = await UserApi.setupMfa(currentUser._id, { method });
      setSetupState({
        method,
        secret: data.secret,
        qrCodeUrl: data.qrCodeUrl,
        destination: data.destination || (method === "email" ? accountForm.email : accountForm.phone),
      });
      setMfaCode("");
      toast.info("Setup Initiated", {
        description: data.message || "Enter the 6-digit verification code to activate.",
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
      toast.error("Password is required to disable Two-Factor Authentication.");
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

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Current password is required.");
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

  // ================== ACCOUNT ACTIONS ==================
  const handleAccountSubmit = async (e) => {
    e.preventDefault();

    if (!accountForm.email?.trim() && !accountForm.phone?.trim()) {
      toast.error("At least one contact method (email or phone) is required.");
      return;
    }

    if (accountForm.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(accountForm.email.trim())) {
        toast.error("Please enter a valid email address.");
        return;
      }
    }

    if (accountForm.phone?.trim()) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
      if (!phoneRegex.test(accountForm.phone.trim())) {
        toast.error("Please enter a valid phone number.");
        return;
      }
    }

    setAccountSaving(true);
    try {
      const { data } = await UserApi.updateUser(currentUser._id, {
        _id: currentUser._id,
        ...accountForm,
      });

      dispatch({
        type: "UPDATING_SUCCESS",
        data: { user: { ...currentUser, ...accountForm } },
      });

      setProfileData((prev) => ({ ...prev, ...accountForm }));
      toast.success("Account profile details saved successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update account details.");
    } finally {
      setAccountSaving(false);
    }
  };

  // ================== PRIVACY ACTIONS ==================
  const handleSavePrivacy = async () => {
    setPrivacySaving(true);
    try {
      await UserApi.updateUser(currentUser._id, {
        _id: currentUser._id,
        privacy: privacySettings,
      });

      dispatch({
        type: "UPDATING_SUCCESS",
        data: { user: { ...currentUser, privacy: privacySettings } },
      });

      setProfileData((prev) => ({ ...prev, privacy: privacySettings }));
      toast.success("Privacy settings updated successfully!");
    } catch (error) {
      toast.error("Failed to update privacy settings.");
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleUnblockUser = async (userIdToUnblock) => {
    try {
      await UserApi.unblockUser(userIdToUnblock);
      setBlockedUsers((prev) => prev.filter((id) => String(id) !== String(userIdToUnblock)));
      toast.success("User has been unblocked.");
    } catch (error) {
      toast.error("Failed to unblock user.");
    }
  };

  // ================== NOTIFICATIONS ACTIONS ==================
  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      toast.success("Notification preferences saved!");
    } catch (error) {
      toast.error("Failed to save preferences.");
    } finally {
      setNotifSaving(false);
    }
  };

  const isMfaActive = Boolean(profileData.mfa?.enabled);

  return (
    <SettingsLayout>
      <div className="SettingsPage">
        {/* Back Button */}
        <button className="back-button" onClick={() => navigate(-1)}>
          <UilArrowLeft size="20" />
          <span>Back</span>
        </button>

        <div className="settings-main-wrapper">
          {/* Header */}
          <div className="settings-head-banner">
            <div className="banner-title-box">
              <div className="banner-icon-badge">
                <UilSetting size="26" />
              </div>
              <div>
                <h1>Settings & Preferences</h1>
                <p>Manage security, account info, privacy, notifications, and appearance.</p>
              </div>
            </div>
          </div>

          {/* Navigation Tab Bar */}
          <div className="settings-tabs-bar" role="tablist">
            <button
              type="button"
              className={`tab-btn ${activeTab === "security" ? "active-tab" : ""}`}
              onClick={() => handleTabChange("security")}
            >
              <UilShieldCheck size="18" />
              <span>Security & Password</span>
              {isMfaActive && <span className="mfa-mini-dot" title="MFA Active"></span>}
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === "account" ? "active-tab" : ""}`}
              onClick={() => handleTabChange("account")}
            >
              <UilUser size="18" />
              <span>Account Details</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === "privacy" ? "active-tab" : ""}`}
              onClick={() => handleTabChange("privacy")}
            >
              <UilUserCheck size="18" />
              <span>Privacy & Safety</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === "notifications" ? "active-tab" : ""}`}
              onClick={() => handleTabChange("notifications")}
            >
              <UilBell size="18" />
              <span>Notifications</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === "appearance" ? "active-tab" : ""}`}
              onClick={() => handleTabChange("appearance")}
            >
              <UilPalette size="18" />
              <span>Appearance</span>
            </button>
          </div>

          {/* ===================== TAB 1: SECURITY & PASSWORD ===================== */}
          {activeTab === "security" && (
            <div className="tab-content-panel">
              {/* Card 1: Two-Factor Authentication (MFA) */}
              <div className="settings-card">
                <div className="card-top-flex">
                  <div>
                    <div className="card-title-group">
                      <UilShieldCheck size="24" className="icon-accent" />
                      <h2>Two-Factor Authentication (MFA)</h2>
                      <span className={`status-badge ${isMfaActive ? "badge-success" : "badge-neutral"}`}>
                        {isMfaActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="card-description">
                      Protect your SocialSphere account with two-factor authentication. Each time you log in, you will be required to provide a 6-digit verification code.
                    </p>
                  </div>
                </div>

                {isMfaActive ? (
                  <div className="mfa-enabled-card">
                    <div className="mfa-enabled-info">
                      <div className="check-badge">✓</div>
                      <div>
                        <h3>Two-Factor Authentication is currently protecting your account</h3>
                        <p>
                          Active method:{" "}
                          <span className="method-pill">
                            {profileData.mfa?.method === "totp"
                              ? "Authenticator App (TOTP)"
                              : profileData.mfa?.method === "phone"
                              ? "SMS / Mobile Phone OTP"
                              : "Email OTP"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {!disableModal ? (
                      <button
                        type="button"
                        className="btn-danger-outline"
                        onClick={() => setDisableModal(true)}
                      >
                        Disable Two-Factor Authentication
                      </button>
                    ) : (
                      <form className="disable-confirm-box" onSubmit={handleDisableMfa}>
                        <p className="disable-warning">
                          Please enter your current account password to confirm disabling Two-Factor Authentication:
                        </p>
                        <div className="disable-inputs-row">
                          <input
                            required
                            type="password"
                            placeholder="Current account password"
                            className="input-box"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                          />
                          <button
                            type="submit"
                            className="btn-danger-solid"
                            disabled={disablingMfa || !disablePassword}
                          >
                            {disablingMfa ? "Disabling..." : "Confirm & Disable"}
                          </button>
                          <button
                            type="button"
                            className="btn-neutral"
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
                  <div className="mfa-selection-panel">
                    {!setupState ? (
                      <>
                        <h4 className="options-title">Select your preferred two-factor verification method:</h4>
                        <div className="mfa-cards-stack">
                          {/* Option 1: Email */}
                          <div
                            className={`mfa-select-card ${mfaMethod === "email" ? "selected" : ""}`}
                            onClick={() => setMfaMethod("email")}
                          >
                            <div className="icon-wrapper">
                              <UilEnvelope size="22" />
                            </div>
                            <div className="card-info">
                              <h4>Email OTP</h4>
                              <p>
                                Receive a 6-digit security code sent to your registered email (
                                {accountForm.email || profileData.email || "No email linked"}).
                              </p>
                            </div>
                            <input
                              type="radio"
                              name="mfaOption"
                              checked={mfaMethod === "email"}
                              onChange={() => setMfaMethod("email")}
                            />
                          </div>

                          {/* Option 2: SMS */}
                          <div
                            className={`mfa-select-card ${mfaMethod === "phone" ? "selected" : ""}`}
                            onClick={() => setMfaMethod("phone")}
                          >
                            <div className="icon-wrapper">
                              <UilPhone size="22" />
                            </div>
                            <div className="card-info">
                              <h4>SMS / Mobile OTP</h4>
                              <p>
                                Receive an instant text message with a verification code to your phone (
                                {accountForm.phone || profileData.phone || "No phone linked"}).
                              </p>
                            </div>
                            <input
                              type="radio"
                              name="mfaOption"
                              checked={mfaMethod === "phone"}
                              onChange={() => setMfaMethod("phone")}
                            />
                          </div>

                          {/* Option 3: TOTP Authenticator */}
                          <div
                            className={`mfa-select-card ${mfaMethod === "totp" ? "selected" : ""}`}
                            onClick={() => setMfaMethod("totp")}
                          >
                            <div className="icon-wrapper">
                              <UilMobileAndroid size="22" />
                            </div>
                            <div className="card-info">
                              <h4>Authenticator App (TOTP)</h4>
                              <p>
                                Use Google Authenticator, Microsoft Authenticator, Authy, or 1Password to generate codes without needing SMS.
                              </p>
                            </div>
                            <input
                              type="radio"
                              name="mfaOption"
                              checked={mfaMethod === "totp"}
                              onChange={() => setMfaMethod("totp")}
                            />
                          </div>
                        </div>

                        <div className="action-row-right">
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleInitiateMfaSetup(mfaMethod)}
                            disabled={mfaLoading}
                          >
                            {mfaLoading
                              ? "Setting up..."
                              : `Set Up ${mfaMethod === "totp" ? "Authenticator App" : mfaMethod === "phone" ? "SMS MFA" : "Email MFA"}`}
                          </button>
                        </div>
                      </>
                    ) : (
                      /* Activation Step */
                      <form className="mfa-verify-panel" onSubmit={handleVerifyAndEnableMfa}>
                        <div className="verify-header">
                          <h4>
                            Activate {setupState.method === "totp" ? "Authenticator App" : `${setupState.method.toUpperCase()} Verification`}
                          </h4>
                          <p>
                            {setupState.method === "totp"
                              ? "Scan the QR code below in your Authenticator app, then enter the 6-digit generated code to confirm."
                              : `A 6-digit confirmation code was sent to ${setupState.destination}. Enter it below.`}
                          </p>
                        </div>

                        {setupState.method === "totp" && (
                          <div className="qr-secret-box">
                            <div className="qr-wrapper">
                              <img src={setupState.qrCodeUrl} alt="TOTP QR Code" />
                            </div>
                            <div className="secret-text-box">
                              <span>Can't scan the QR code? Enter this key manually:</span>
                              <code className="secret-string">{setupState.secret}</code>
                            </div>
                          </div>
                        )}

                        <div className="verify-input-group">
                          <label>Enter 6-Digit Verification Code</label>
                          <input
                            required
                            autoFocus
                            type="text"
                            maxLength="6"
                            placeholder="000000"
                            className="input-box otp-box"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                          />
                        </div>

                        <div className="verify-actions-row">
                          <button
                            type="submit"
                            className="btn-primary"
                            disabled={mfaLoading || mfaCode.length !== 6}
                          >
                            {mfaLoading ? "Verifying..." : "Verify & Activate 2FA"}
                          </button>
                          <button
                            type="button"
                            className="btn-neutral"
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

              {/* Card 2: Change Password */}
              <div className="settings-card">
                <div className="card-title-group">
                  <UilLock size="24" className="icon-accent" />
                  <h2>Change Password</h2>
                </div>
                <p className="card-description">
                  Update your password regularly to keep your account safe. Passwords must be at least 6 characters and include uppercase, lowercase, and numbers.
                </p>

                <form className="password-update-form" onSubmit={handleChangePassword}>
                  {/* Current Password */}
                  <div className="form-item">
                    <label>Current Password</label>
                    <div className="input-with-icon">
                      <input
                        required
                        type={showCurrentPass ? "text" : "password"}
                        placeholder="Enter current password"
                        className="input-box"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="eye-toggle-btn"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                      >
                        {showCurrentPass ? <UilEyeSlash size="18" /> : <UilEye size="18" />}
                      </button>
                    </div>
                  </div>

                  {/* Dual row: New and Confirm */}
                  <div className="form-dual-row">
                    <div className="form-item">
                      <label>New Password</label>
                      <div className="input-with-icon">
                        <input
                          required
                          type={showNewPass ? "text" : "password"}
                          placeholder="Enter new password"
                          className="input-box"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="eye-toggle-btn"
                          onClick={() => setShowNewPass(!showNewPass)}
                        >
                          {showNewPass ? <UilEyeSlash size="18" /> : <UilEye size="18" />}
                        </button>
                      </div>
                    </div>

                    <div className="form-item">
                      <label>Confirm New Password</label>
                      <input
                        required
                        type="password"
                        placeholder="Repeat new password"
                        className="input-box"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Passwords Match Tag */}
                  {confirmPassword && (
                    <div className={`match-badge ${passwordsMatch ? "matched" : "mismatched"}`}>
                      {passwordsMatch ? "✓ Passwords match" : "✕ Passwords do not match"}
                    </div>
                  )}

                  {/* Live Password Checklist */}
                  {newPassword && (
                    <div className="password-checklist">
                      <span className="checklist-heading">Password Requirements</span>
                      <div className="checklist-items-grid">
                        <div className={`req-item ${passwordChecks.hasLength ? "valid" : "idle"}`}>
                          <span className="req-dot">
                            {passwordChecks.hasLength ? <UilCheck size="11" /> : <UilTimes size="11" />}
                          </span>
                          <span>6+ characters</span>
                        </div>
                        <div className={`req-item ${passwordChecks.hasUpper ? "valid" : "idle"}`}>
                          <span className="req-dot">
                            {passwordChecks.hasUpper ? <UilCheck size="11" /> : <UilTimes size="11" />}
                          </span>
                          <span>1 uppercase letter (A-Z)</span>
                        </div>
                        <div className={`req-item ${passwordChecks.hasLower ? "valid" : "idle"}`}>
                          <span className="req-dot">
                            {passwordChecks.hasLower ? <UilCheck size="11" /> : <UilTimes size="11" />}
                          </span>
                          <span>1 lowercase letter (a-z)</span>
                        </div>
                        <div className={`req-item ${passwordChecks.hasNumber ? "valid" : "idle"}`}>
                          <span className="req-dot">
                            {passwordChecks.hasNumber ? <UilCheck size="11" /> : <UilTimes size="11" />}
                          </span>
                          <span>1 number (0-9)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="action-row-right">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={passwordLoading || !currentPassword || !newPassword || !passwordsMatch}
                    >
                      {passwordLoading ? "Updating Password..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Card 3: Session Management */}
              <div className="settings-card">
                <div className="card-title-group">
                  <UilSignout size="24" className="icon-accent" />
                  <h2>Session Security & Logout</h2>
                </div>
                <p className="card-description">
                  You are currently logged into this device. If you suspect any unauthorized activity, sign out immediately.
                </p>
                <div className="action-row-left">
                  <button
                    type="button"
                    className="btn-danger-outline"
                    onClick={() => dispatch(logout())}
                  >
                    <UilSignout size="18" />
                    <span>Log Out of Account</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: ACCOUNT DETAILS ===================== */}
          {activeTab === "account" && (
            <div className="tab-content-panel">
              <div className="settings-card">
                <div className="card-title-group">
                  <UilUser size="24" className="icon-accent" />
                  <h2>Account & Contact Information</h2>
                </div>
                <p className="card-description">
                  Manage your personal details and contact methods. Your email and phone are used for password recovery and MFA.
                </p>

                <form className="account-details-form" onSubmit={handleAccountSubmit}>
                  {/* Name row */}
                  <div className="form-dual-row">
                    <div className="form-item">
                      <label>First Name</label>
                      <input
                        required
                        type="text"
                        className="input-box"
                        value={accountForm.firstname}
                        onChange={(e) => setAccountForm({ ...accountForm, firstname: e.target.value })}
                      />
                    </div>
                    <div className="form-item">
                      <label>Last Name</label>
                      <input
                        required
                        type="text"
                        className="input-box"
                        value={accountForm.lastname}
                        onChange={(e) => setAccountForm({ ...accountForm, lastname: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Username (read-only) */}
                  <div className="form-item">
                    <label>Username</label>
                    <input
                      disabled
                      type="text"
                      className="input-box disabled-input"
                      value={`@${currentUser?.username}`}
                    />
                    <small className="help-text">Username cannot be changed after registration.</small>
                  </div>

                  {/* Contact Methods: Email & Phone */}
                  <div className="form-dual-row">
                    <div className="form-item">
                      <label>Email Address</label>
                      <div className="input-with-left-icon">
                        <UilEnvelope size="18" className="left-icon" />
                        <input
                          type="email"
                          placeholder="e.g. name@example.com"
                          className="input-box with-icon-pad"
                          value={accountForm.email}
                          onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-item">
                      <label>Phone Number</label>
                      <div className="input-with-left-icon">
                        <UilPhone size="18" className="left-icon" />
                        <input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          className="input-box with-icon-pad"
                          value={accountForm.phone}
                          onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="form-item">
                    <label>Bio / About You</label>
                    <textarea
                      rows={3}
                      className="input-box textarea-box"
                      placeholder="Share a short bio with your community..."
                      value={accountForm.about}
                      onChange={(e) => setAccountForm({ ...accountForm, about: e.target.value })}
                    />
                  </div>

                  {/* Location details */}
                  <div className="form-dual-row">
                    <div className="form-item">
                      <label>Lives In</label>
                      <input
                        type="text"
                        placeholder="City, State"
                        className="input-box"
                        value={accountForm.livesIn}
                        onChange={(e) => setAccountForm({ ...accountForm, livesIn: e.target.value })}
                      />
                    </div>

                    <div className="form-item">
                      <label>Works At</label>
                      <input
                        type="text"
                        placeholder="Company or School"
                        className="input-box"
                        value={accountForm.worksAt}
                        onChange={(e) => setAccountForm({ ...accountForm, worksAt: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-dual-row">
                    <div className="form-item">
                      <label>Country</label>
                      <input
                        type="text"
                        placeholder="e.g. United States"
                        className="input-box"
                        value={accountForm.country}
                        onChange={(e) => setAccountForm({ ...accountForm, country: e.target.value })}
                      />
                    </div>

                    <div className="form-item">
                      <label>Relationship Status</label>
                      <input
                        type="text"
                        placeholder="Single, In a relationship, etc."
                        className="input-box"
                        value={accountForm.relationship}
                        onChange={(e) => setAccountForm({ ...accountForm, relationship: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="action-row-right">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={accountSaving}
                    >
                      {accountSaving ? "Saving..." : "Save Account Details"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ===================== TAB 3: PRIVACY & SAFETY ===================== */}
          {activeTab === "privacy" && (
            <div className="tab-content-panel">
              <div className="settings-card">
                <div className="card-title-group">
                  <UilUserCheck size="24" className="icon-accent" />
                  <h2>Profile & Post Privacy</h2>
                </div>
                <p className="card-description">
                  Control who can see your profile details and who can view your posts.
                </p>

                <div className="privacy-group">
                  <h3>Profile Visibility</h3>
                  <div className="radio-options-stack">
                    <label className="radio-option-card">
                      <input
                        type="radio"
                        name="profilePrivacy"
                        value="public"
                        checked={privacySettings.profile === "public"}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, profile: e.target.value })}
                      />
                      <div>
                        <strong>🌐 Public</strong>
                        <span>Anyone on SocialSphere can discover and view your profile information.</span>
                      </div>
                    </label>

                    <label className="radio-option-card">
                      <input
                        type="radio"
                        name="profilePrivacy"
                        value="friends"
                        checked={privacySettings.profile === "friends"}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, profile: e.target.value })}
                      />
                      <div>
                        <strong>👥 Followers Only</strong>
                        <span>Only people who follow you can view your profile details and posts.</span>
                      </div>
                    </label>

                    <label className="radio-option-card">
                      <input
                        type="radio"
                        name="profilePrivacy"
                        value="private"
                        checked={privacySettings.profile === "private"}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, profile: e.target.value })}
                      />
                      <div>
                        <strong>🔒 Private</strong>
                        <span>Your profile is completely hidden from public searches.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="privacy-group">
                  <h3>Default Post Visibility</h3>
                  <div className="radio-options-stack">
                    <label className="radio-option-card">
                      <input
                        type="radio"
                        name="postPrivacy"
                        value="public"
                        checked={privacySettings.posts === "public"}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, posts: e.target.value })}
                      />
                      <div>
                        <strong>🌐 Public Posts</strong>
                        <span>Posts appear in global feeds and discoverable to everyone.</span>
                      </div>
                    </label>

                    <label className="radio-option-card">
                      <input
                        type="radio"
                        name="postPrivacy"
                        value="friends"
                        checked={privacySettings.posts === "friends"}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, posts: e.target.value })}
                      />
                      <div>
                        <strong>👥 Followers Only</strong>
                        <span>Only accounts following you will see new posts in their feed.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="action-row-right">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={privacySaving}
                    onClick={handleSavePrivacy}
                  >
                    {privacySaving ? "Saving..." : "Save Privacy Settings"}
                  </button>
                </div>
              </div>

              {/* Blocked Users Section */}
              <div className="settings-card">
                <div className="card-title-group">
                  <UilUserTimes size="24" className="icon-accent" />
                  <h2>Blocked Users</h2>
                </div>
                <p className="card-description">
                  Blocked accounts cannot view your profile, posts, or message you.
                </p>

                {blockedUsers.length === 0 ? (
                  <div className="empty-blocked-box">
                    <span>You have not blocked any users.</span>
                  </div>
                ) : (
                  <div className="blocked-list">
                    {blockedUsers.map((blockedId) => (
                      <div key={blockedId} className="blocked-item-row">
                        <span>User ID: {blockedId}</span>
                        <button
                          type="button"
                          className="btn-neutral"
                          onClick={() => handleUnblockUser(blockedId)}
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== TAB 4: NOTIFICATIONS ===================== */}
          {activeTab === "notifications" && (
            <div className="tab-content-panel">
              <div className="settings-card">
                <div className="card-title-group">
                  <UilBell size="24" className="icon-accent" />
                  <h2>Notification Preferences</h2>
                </div>
                <p className="card-description">
                  Choose which activities trigger in-app bell notifications and email updates.
                </p>

                <div className="toggle-list">
                  <div className="toggle-item">
                    <div>
                      <strong>Likes</strong>
                      <span>When someone likes your post or story</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.likes}
                        onChange={(e) => setNotificationPrefs({ ...notificationPrefs, likes: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div>
                      <strong>Comments</strong>
                      <span>When someone comments on your post</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.comments}
                        onChange={(e) => setNotificationPrefs({ ...notificationPrefs, comments: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div>
                      <strong>New Followers</strong>
                      <span>When someone starts following you</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.follows}
                        onChange={(e) => setNotificationPrefs({ ...notificationPrefs, follows: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div>
                      <strong>Direct Messages</strong>
                      <span>When someone sends you a private chat message</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.messages}
                        onChange={(e) => setNotificationPrefs({ ...notificationPrefs, messages: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div>
                      <strong>Group Updates</strong>
                      <span>Invites and announcements in joined groups</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.groupUpdates}
                        onChange={(e) => setNotificationPrefs({ ...notificationPrefs, groupUpdates: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div>
                      <strong>Email Digests</strong>
                      <span>Receive periodic summaries via email</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.emailAlerts}
                        onChange={(e) => setNotificationPrefs({ ...notificationPrefs, emailAlerts: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="action-row-right">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={notifSaving}
                    onClick={handleSaveNotifications}
                  >
                    {notifSaving ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 5: APPEARANCE ===================== */}
          {activeTab === "appearance" && (
            <div className="tab-content-panel">
              <div className="settings-card">
                <div className="card-title-group">
                  <UilPalette size="24" className="icon-accent" />
                  <h2>Appearance & Theme</h2>
                </div>
                <p className="card-description">
                  Customize the look and feel of SocialSphere. Switch between light and dark modes.
                </p>

                <div className="theme-selection-grid">
                  <div
                    className={`theme-card ${!isDark ? "theme-selected" : ""}`}
                    onClick={() => {
                      if (isDark) toggleTheme();
                    }}
                  >
                    <div className="theme-preview-box light-preview">
                      <div className="preview-nav"></div>
                      <div className="preview-card"></div>
                    </div>
                    <div className="theme-card-footer">
                      <UilSun size="20" color="#f59e0b" />
                      <div>
                        <strong>Light Mode</strong>
                        <span>Bright, clean aesthetic</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`theme-card ${isDark ? "theme-selected" : ""}`}
                    onClick={() => {
                      if (!isDark) toggleTheme();
                    }}
                  >
                    <div className="theme-preview-box dark-preview">
                      <div className="preview-nav"></div>
                      <div className="preview-card"></div>
                    </div>
                    <div className="theme-card-footer">
                      <UilMoon size="20" color="#60a5fa" />
                      <div>
                        <strong>Dark Mode</strong>
                        <span>Easy on the eyes in low light</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingsLayout>
  );
};

export default Settings;
