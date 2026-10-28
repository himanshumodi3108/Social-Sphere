// Use REACT_APP_BACKEND_URL if provided, otherwise use environment-based defaults
export const getBackendUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL.replace(/\/$/, '');
  }
  
  // Fallback to environment-based detection
  const isProduction = typeof window !== 'undefined' && 
                       window.location.hostname !== 'localhost' && 
                       window.location.hostname !== '127.0.0.1';
  return isProduction 
    ? 'https://social-sphere-da82.onrender.com'
    : 'http://localhost:5000';
};

export const getBaseUrl = () => getBackendUrl();

export const getPublicFolder = () => {
  if (process.env.REACT_APP_PUBLIC_FOLDER) {
    const p = process.env.REACT_APP_PUBLIC_FOLDER;
    return p.endsWith('/') ? p : `${p}/`;
  }
  return `${getBackendUrl()}/images/`;
};

export const getImageUrl = (imagePath, fallback = '') => {
  if (!imagePath) return fallback;
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:') ||
    imagePath.startsWith('blob:')
  ) {
    return imagePath;
  }
  const folder = getPublicFolder();
  const clean = imagePath.replace(/^\/+/, '');
  return `${folder}${encodeURIComponent(clean)}`;
};
