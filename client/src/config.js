const config = {
  production: {
    baseURL: 'https://social-sphere-da82.onrender.com',
  },
  development: {
    baseURL: 'http://localhost:5000',
  }
};

export const getBaseUrl = () => {
  const isProduction = window.location.hostname !== 'localhost';
  return isProduction ? config.production.baseURL : config.development.baseURL;
};
