// utils/auth.ts
export function logout() {
  localStorage.removeItem('token');
  window.location.href = '/auth/login';
}