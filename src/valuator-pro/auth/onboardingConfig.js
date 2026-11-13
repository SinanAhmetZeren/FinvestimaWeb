import { API_URL } from '../../api/apiSlice.js';

// A0 onboarding — giriş yapmış kullanıcı için authenticated task oluşturma uçları.
export const AUTH = {
  mode: 'api',
  apiBase: API_URL + '/api/ValuatorPro/onboarding',
  resendSeconds: 60,
};
