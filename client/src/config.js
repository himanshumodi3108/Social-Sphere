// Use REACT_APP_BACKEND_URL if provided, otherwise use environment-based defaults
const getBackendUrl = () => {
  // Check if REACT_APP_BACKEND_URL is explicitly set
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // Fallback to environment-based detection
  const isProduction = window.location.hostname !== 'localhost';
  return isProduction 
    ? 'https://social-sphere-da82.onrender.com'
    : 'http://localhost:5000';
};

export const getBaseUrl = () => getBackendUrl();
