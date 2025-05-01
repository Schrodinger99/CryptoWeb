// /javascript/api_url.mjs
// 1) La URL de tu API Gateway (auth + check-auth)
export const API_BASE = 'https://997h56c3v8.execute-api.us-east-1.amazonaws.com/dev';

// 2) La URL de tu Lambda de datos (plotting) 
export const DATA_URL = 'https://vbanrofvzk3onanlo3fdarbcce0btprr.lambda-url.us-east-1.on.aws';

export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

export default {
  API_BASE,
  DATA_URL
};