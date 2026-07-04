// configuration constants for client-side environment variables
// VITE_ prefix is required by Vite for env vars exposed to code

// Temporarily hardcoded for production - TODO: fix .env loading
export const API_URL = import.meta.env.VITE_API_URL;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

// Debug logging
// console.log('🔧 Config loaded:', { API_URL, SOCKET_URL });
