const normalizedApiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

export const API_BASE = normalizedApiBase || 'http://127.0.0.1:8000';

export default API_BASE;