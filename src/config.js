const normalizedApiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

export const API_BASE = normalizedApiBase || 'https://certifier-backend-b2ne.onrender.com';

export default API_BASE;