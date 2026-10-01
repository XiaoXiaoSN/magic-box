// Geohash (base-32 interleaved latitude/longitude bisection)
// https://en.wikipedia.org/wiki/Geohash

import type { LatLng } from './angle';

const ALPHABET = '0123456789bcdefghjkmnpqrstuvwxyz';
const MAX_LENGTH = 12;
const GEOHASH_RE = /^[0-9b-hjkmnp-z]{1,12}$/i;

// 9 characters: a cell of about 4.8 × 4.8 m
export const DEFAULT_GEOHASH_LENGTH = 9;

export function isGeohash(text: string): boolean {
  return GEOHASH_RE.test(text);
}

export function encodeGeohash(
  lat: number,
  lng: number,
  length = DEFAULT_GEOHASH_LENGTH,
): string {
  const chars = Math.min(Math.max(length, 1), MAX_LENGTH);
  let latLo = -90;
  let latHi = 90;
  let lngLo = -180;
  let lngHi = 180;
  // bits alternate longitude, latitude, … starting from the most significant
  let evenBit = true;
  let hash = '';
  for (let c = 0; c < chars; c++) {
    let index = 0;
    for (let b = 0; b < 5; b++) {
      index <<= 1;
      if (evenBit) {
        const mid = (lngLo + lngHi) / 2;
        if (lng >= mid) {
          index |= 1;
          lngLo = mid;
        } else {
          lngHi = mid;
        }
      } else {
        const mid = (latLo + latHi) / 2;
        if (lat >= mid) {
          index |= 1;
          latLo = mid;
        } else {
          latHi = mid;
        }
      }
      evenBit = !evenBit;
    }
    hash += ALPHABET.charAt(index);
  }
  return hash;
}

// decodes to the cell centre
export function decodeGeohash(hash: string): LatLng | null {
  if (!isGeohash(hash)) return null;
  let latLo = -90;
  let latHi = 90;
  let lngLo = -180;
  let lngHi = 180;
  let evenBit = true;
  for (const ch of hash.toLowerCase()) {
    const index = ALPHABET.indexOf(ch);
    for (let b = 4; b >= 0; b--) {
      const bit = (index >> b) & 1;
      if (evenBit) {
        const mid = (lngLo + lngHi) / 2;
        if (bit) lngLo = mid;
        else lngHi = mid;
      } else {
        const mid = (latLo + latHi) / 2;
        if (bit) latLo = mid;
        else latHi = mid;
      }
      evenBit = !evenBit;
    }
  }
  return { lat: (latLo + latHi) / 2, lng: (lngLo + lngHi) / 2 };
}
