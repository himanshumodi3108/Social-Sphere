import nodemailer from 'nodemailer';
import logger from './logger.js';

/**
 * Helper to strip surrounding quotes and trim whitespace from environment variables
 */
const cleanEnv = (val) => {
  if (!val) return '';
  return String(val).trim().replace(/^["']|["']$/g, '').trim();
};

/**
 * Create SMTP transporter if environment credentials are provided
 */
const createTransporter = () => {
  const host = cleanEnv(process.env.SMTP_HOST);
  const user = cleanEnv(process.env.SMTP_USER);
  let pass = cleanEnv(process.env.SMTP_PASS);
  const service = cleanEnv(process.env.SMTP_SERVICE).toLowerCase();
  const port = parseInt(cleanEnv(process.env.SMTP_PORT) || '587', 10);
  const secure = cleanEnv(process.env.SMTP_SECURE) === 'true' || port === 465;

  if ((!host && !service) || !user || !pass) {
    return null;
  }

  // Google App Passwords are 16 letters usually formatted in 4 blocks of 4 with spaces
  // (e.g., 'abcd efgh ijkl mnop'). Strip spaces automatically for Gmail.
  const isGmail = service === 'gmail' || host.toLowerCase().includes('gmail');
  if (isGmail) {
    pass = pass.replace(/\s+/g, '');
  }

  // Use pre-configured 'gmail' service for optimal port and TLS handshake on cloud hosts
  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

/**
 * Send email using SMTP or fallback to EmailJS / Simulation Logger
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    return { success: false, error: 'Recipient email missing' };
  }

  const user = cleanEnv(process.env.SMTP_USER);
  // Default From address: match authenticated SMTP user to prevent Gmail/provider anti-spoofing rejection
  const defaultFrom = user ? `"SocialSphere" <${user}>` : `"SocialSphere" <no-reply@socialsphere.com>`;
  const from = cleanEnv(process.env.FROM_EMAIL) || defaultFrom;
  const transporter = createTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text: text || html.replace(/<[^>]*>?/gm, ''),
        html,
      });
      logger.info('Email sent successfully via SMTP', { to, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.warn('SMTP delivery failed, falling back to simulated log', {
        to,
        errorMessage: error.message,
        errorCode: error.code || error.errno,
        responseCode: error.responseCode,
        response: error.response,
        command: error.command,
      });
    }
  }

  // Graceful simulation / dev logging if SMTP is not configured or failed
  logger.info('📧 [Email Service - Simulated]', {
    to,
    from,
    subject,
    preview: (text || html.replace(/<[^>]*>?/gm, '')).substring(0, 160) + '...',
  });

  return { success: true, simulated: true };
};

/**
 * Dispatch SMS or simulate SMS delivery
 */
export const sendSms = async ({ to, message }) => {
  if (!to) return { success: false, error: 'Phone number missing' };

  logger.info(`📱 [SMS Service - Simulated] Sent SMS to ${to}: "${message}"`);
  return { success: true, simulated: true };
};

/**
 * Send Welcome Email & SMS to newly registered user
 */
export const sendWelcomeMessage = async ({ to, phone, name }) => {
  const displayName = name || 'there';
  const promises = [];

  if (to) {
    const welcomeHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border-radius: 12px; background: #ffffff; border: 1px solid #e2e8f0; color: #1e293b;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
          <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: linear-gradient(135deg, #0096FF, #00D2FF); color: #ffffff; font-weight: 800; font-size: 22px;">S</div>
          <h1 style="margin: 12px 0 0 0; font-size: 24px; font-weight: 700; color: #0f172a;">Welcome to SocialSphere! 🎉</h1>
        </div>
        <div style="padding: 24px 0;">
          <p style="font-size: 16px; line-height: 1.6; color: #334155;">Hello <strong>${displayName}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            We're thrilled to welcome you to <strong>SocialSphere</strong> — the place to connect with friends, share stories, explore vibrant interest groups, and chat in real-time.
          </p>
          <div style="margin: 24px 0; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #0096FF;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #0f172a;">What you can do next:</p>
            <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
              <li>Customize your profile & upload an avatar</li>
              <li>Discover and join community groups</li>
              <li>Share your first post or 24-hour visual story</li>
              <li>Enable Multi-Factor Authentication (MFA) in settings for extra security</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" style="background: linear-gradient(135deg, #0096FF, #0077cc); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(0, 150, 255, 0.25);">
              Explore SocialSphere
            </a>
          </div>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">You're receiving this because you created an account on SocialSphere.</p>
        </div>
      </div>
    `;

    promises.push(
      sendEmail({
        to,
        subject: `Welcome to SocialSphere, ${displayName}! 🎉`,
        html: welcomeHtml,
      })
    );
  }

  if (phone) {
    promises.push(
      sendSms({
        to: phone,
        message: `Welcome to SocialSphere, ${displayName}! Your account is now active. Explore at ${process.env.CLIENT_URL || 'http://localhost:3000'}`,
      })
    );
  }

  return Promise.all(promises);
};

/**
 * Send One-Time Passcode (OTP) Email for Login MFA or Password Reset
 */
export const sendOtpEmail = async ({ to, name, code, purpose = 'Security Verification' }) => {
  const displayName = name || 'there';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border-radius: 12px; background: #ffffff; border: 1px solid #e2e8f0; color: #1e293b;">
      <div style="text-align: center; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
        <div style="display: inline-block; width: 40px; height: 40px; line-height: 40px; border-radius: 10px; background: linear-gradient(135deg, #0096FF, #00D2FF); color: #ffffff; font-weight: 800; font-size: 20px;">S</div>
        <h2 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 700; color: #0f172a;">${purpose}</h2>
      </div>
      <div style="padding: 24px 0; text-align: center;">
        <p style="font-size: 15px; color: #475569; margin: 0 0 16px 0;">Hello ${displayName},</p>
        <p style="font-size: 14px; color: #64748b; margin: 0 0 24px 0;">Use the verification code below to complete your request. This code is valid for <strong>10 minutes</strong>.</p>
        <div style="background: #f1f5f9; padding: 18px 24px; border-radius: 10px; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #0f172a; display: inline-block; font-family: monospace;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0 0;">If you did not request this code, please secure your account immediately or ignore this message.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Your SocialSphere verification code: ${code}`,
    html,
  });
};
