/**
 * geolocation.js
 * ---------------------------------------------------------------------------
 * Browser Geolocation API ke liye ek hi jagah se helpers — seller upload
 * form aur buyer marketplace dono yahi use karte hain, taaki permission
 * handling (denied ho to dobara na pucho) aur buyer location persistence
 * har page pe alag se na likhni pade.
 *
 * PRIVACY: buyer ki location sirf is browser ke localStorage me rehti hai —
 * backend/DB me kabhi save nahi hoti (marketplace har request ke saath
 * lat/lng bhejta hai as a query param, koi profile field nahi).
 * ---------------------------------------------------------------------------
 */

const DENIED_KEY = 'hb_geo_denied';       // is session me ek baar deny hua — dobara mat pucho
const BUYER_LOCATION_KEY = 'hb_buyer_location'; // sirf is browser me, kabhi backend ko nahi

export function hasGeolocationSupport() {
  return typeof window !== 'undefined' && 'geolocation' in navigator;
}

export function wasPermissionDeniedThisSession() {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DENIED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<{lat:number, lng:number}>}
 */
export function getCurrentPosition({ timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!hasGeolocationSupport()) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        // PERMISSION_DENIED === 1 — is session me dobara auto-prompt mat karo
        if (err.code === 1 && typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(DENIED_KEY, '1');
          } catch {
            // storage blocked (private mode) — koi baat nahi, bas repeat-prompt bach nahi payega
          }
        }
        reject(err);
      },
      { enableHighAccuracy: false, timeout, maximumAge: 5 * 60 * 1000 }
    );
  });
}

/**
 * Buyer ne jo location choose ki (GPS-detect ya manual) — sirf browser me
 * yaad rakhte hain, agli visit pe dobara GPS-prompt/manual-select na karna pade.
 */
export function getSavedBuyerLocation() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BUYER_LOCATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveBuyerLocation(location) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BUYER_LOCATION_KEY, JSON.stringify({ ...location, savedAt: Date.now() }));
  } catch {
    // storage blocked — non-fatal, bas next visit pe dobara detect/select karna padega
  }
}

export function clearSavedBuyerLocation() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BUYER_LOCATION_KEY);
  } catch {
    // ignore
  }
}
