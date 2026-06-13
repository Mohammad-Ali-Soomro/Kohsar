export const validators = {
  username: (v: string) => /^[a-zA-Z0-9_]{3,20}$/.test(v),
  spotName: (v: string) => v.trim().length >= 3 && v.trim().length <= 60,
  description: (v: string) => v.trim().length >= 20 && v.trim().length <= 500,
  coordinates: (lat: number, lng: number) => 
    lat >= 24.5 && lat <= 32.5 && lng >= 60.5 && lng <= 70.5,
  isBalochistan: (lat: number, lng: number) => 
    lat >= 24.5 && lat <= 32.5 && lng >= 60.5 && lng <= 70.5,
};

// Input Sanitization helper to trim whitespace and strip HTML tags
export const sanitizeInput = (text: string): string => {
  return text
    .trim()
    .replace(/<\/?[^>]+(>|$)/g, ''); // strip HTML tags
};
