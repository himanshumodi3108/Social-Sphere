import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";
import { UilUser, UilComment, UilImage, UilLock, UilBell, UilBookmark, UilShield } from "@iconscout/react-unicons";

const Landing = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("home");

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <h2>SocialSphere</h2>
          </div>
          <div className="nav-links">
            <button onClick={() => scrollToSection("home")} className={activeSection === "home" ? "active" : ""}>
              Home
            </button>
            <button onClick={() => scrollToSection("about")} className={activeSection === "about" ? "active" : ""}>
              About
            </button>
            <button onClick={() => scrollToSection("features")} className={activeSection === "features" ? "active" : ""}>
              Features
            </button>
            <button onClick={() => scrollToSection("help")} className={activeSection === "help" ? "active" : ""}>
              Help
            </button>
            <button className="nav-login-btn" onClick={() => navigate("/auth")}>
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to SocialSphere</h1>
          <p className="hero-subtitle">
            Connect, Share, and Engage with Your Social Network
          </p>
          <p className="hero-description">
            Join thousands of users sharing their moments, connecting with friends, and building communities.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => navigate("/auth")}>
              Get Started
            </button>
            <button className="btn-secondary" onClick={() => scrollToSection("features")}>
              Learn More
            </button>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-graphic"></div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="section-container">
          <h2 className="section-title">About SocialSphere</h2>
          <div className="about-content">
            <div className="about-text">
              <p>
                SocialSphere is a modern social media platform designed to bring people together. 
                We believe in creating meaningful connections and providing a safe, engaging space 
                for users to share their stories, ideas, and experiences.
              </p>
              <p>
                Our platform combines the best features of social networking with privacy and security 
                at its core. Whether you're looking to connect with friends, join communities, or 
                share your creative content, SocialSphere has something for everyone.
              </p>
            </div>
            <div className="about-stats">
              <div className="stat-item">
                <h3>10K+</h3>
                <p>Active Users</p>
              </div>
              <div className="stat-item">
                <h3>50K+</h3>
                <p>Posts Shared</p>
              </div>
              <div className="stat-item">
                <h3>5K+</h3>
                <p>Communities</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-container">
          <h2 className="section-title">Features</h2>
          <p className="section-subtitle">Everything you need to stay connected</p>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <UilUser size="48" />
              </div>
              <h3>Connect with Friends</h3>
              <p>Follow your friends, see their updates, and stay connected with your social circle.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <UilImage size="48" />
              </div>
              <h3>Share Stories</h3>
              <p>Share your moments with photos, videos, and 24-hour stories that disappear automatically.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <UilComment size="48" />
              </div>
              <h3>Real-time Chat</h3>
              <p>End-to-end encrypted messaging to chat securely with your friends and family.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <UilUser size="48" />
              </div>
              <h3>Join Groups</h3>
              <p>Create or join communities based on your interests and connect with like-minded people.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <UilBell size="48" />
              </div>
              <h3>Stay Updated</h3>
              <p>Get real-time notifications for likes, comments, messages, and new posts from friends.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <UilBookmark size="48" />
              </div>
              <h3>Save Posts</h3>
              <p>Bookmark your favorite posts and content to revisit them later.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <UilLock size="48" />
              </div>
              <h3>Privacy Controls</h3>
              <p>Control who can see your profile and posts with comprehensive privacy settings.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <UilShield size="48" />
              </div>
              <h3>Secure Platform</h3>
              <p>Your data is protected with industry-standard security and encryption.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section id="help" className="help-section">
        <div className="section-container">
          <h2 className="section-title">Need Help?</h2>
          <p className="section-subtitle">We're here to assist you</p>
          <div className="help-content">
            <div className="help-card">
              <h3>Getting Started</h3>
              <p>New to SocialSphere? Learn how to create your account, set up your profile, and start connecting with others.</p>
              <ul>
                <li>Create your account in minutes</li>
                <li>Customize your profile</li>
                <li>Find and follow friends</li>
                <li>Share your first post</li>
              </ul>
            </div>
            <div className="help-card">
              <h3>Privacy & Security</h3>
              <p>Understand how to protect your privacy and secure your account.</p>
              <ul>
                <li>Configure privacy settings</li>
                <li>Manage your followers</li>
                <li>Report and block users</li>
                <li>Secure your account</li>
              </ul>
            </div>
            <div className="help-card">
              <h3>Features Guide</h3>
              <p>Learn how to use all the features SocialSphere has to offer.</p>
              <ul>
                <li>Posting and sharing content</li>
                <li>Creating and joining groups</li>
                <li>Using stories and chat</li>
                <li>Managing notifications</li>
              </ul>
            </div>
          </div>
          <div className="help-contact">
            <p>Still have questions? <a href="mailto:support@socialsphere.com">Contact our support team</a></p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>SocialSphere</h3>
              <p>Connecting people, sharing moments, building communities.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><button onClick={() => scrollToSection("about")}>About</button></li>
                <li><button onClick={() => scrollToSection("features")}>Features</button></li>
                <li><button onClick={() => scrollToSection("help")}>Help</button></li>
                <li><button onClick={() => navigate("/auth")}>Login</button></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Legal</h4>
              <ul>
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#terms">Terms of Service</a></li>
                <li><a href="#cookies">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 SocialSphere. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

