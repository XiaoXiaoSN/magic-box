// Open Location Code ("Plus Code"), ported from the reference implementation
// https://github.com/google/open-location-code/blob/main/js/src/openlocationcode.js
// only full codes are decoded: a short code ("Q257+5X Mountain View") needs a
// reference location this tool does not have.

import type { LatLng } from './angle';

const ALPHABET = '23456789CFGHJMPQRVWX';
const SEPARATOR = '+';
const SEPARATOR_POSITION = 8;
const PADDING = '0';
const BASE = 20;
const LATITUDE_MAX = 90;
const LONGITUDE_MAX = 180;
const MAX_DIGIT_COUNT = 15;
const PAIR_CODE_LENGTH = 10;
const PAIR_FIRST_PLACE_VALUE = BASE ** (PAIR_CODE_LENGTH / 2 - 1);
const PAIR_PRECISION = BASE ** 3;
const GRID_CODE_LENGTH = MAX_DIGIT_COUNT - PAIR_CODE_LENGTH;
const GRID_COLUMNS = 4;
const GRID_ROWS = 5;
const GRID_LAT_FIRST_PLACE_VALUE = GRID_ROWS ** (GRID_CODE_LENGTH - 1);
const GRID_LNG_FIRST_PLACE_VALUE = GRID_COLUMNS ** (GRID_CODE_LENGTH - 1);
// integer steps per degree at full precision; integer maths keeps encoding
// exact where repeated float division would drift
const FINAL_LAT_PRECISION = PAIR_PRECISION * GRID_ROWS ** GRID_CODE_LENGTH;
const FINAL_LNG_PRECISION = PAIR_PRECISION * GRID_COLUMNS ** GRID_CODE_LENGTH;

// 10 digits is what Google Maps shows: a cell of about 14 × 14 m
export const DEFAULT_PLUS_CODE_LENGTH = 10;

export function isValidPlusCode(code: string): boolean {
  const separator = code.indexOf(SEPARATOR);
  if (separator === -1 || separator !== code.lastIndexOf(SEPARATOR)) {
    return false;
  }
  if (separator > SEPARATOR_POSITION || separator % 2 === 1) return false;

  const padding = code.indexOf(PADDING);
  if (padding > -1) {
    // padding only fills out the pairs before the separator of a full code
    if (separator < SEPARATOR_POSITION || padding === 0) return false;
    const [run, ...others] = code.match(/0+/g) ?? [];
    if (!run || others.length > 0 || run.length % 2 === 1) return false;
    if (code.length > separator + 1) return false;
  }

  // a single digit after the separator is not a valid precision
  if (code.length - separator - 1 === 1) return false;

  const digits = code.replace(SEPARATOR, '').replace(/0+/, '').toUpperCase();
  return [...digits].every((ch) => ALPHABET.includes(ch));
}

export function isFullPlusCode(code: string): boolean {
  if (!isValidPlusCode(code)) return false;
  if (code.indexOf(SEPARATOR) < SEPARATOR_POSITION) return false;

  const upper = code.toUpperCase();
  // the first pair must stay within ±90° latitude and ±180° longitude
  const firstLat = ALPHABET.indexOf(upper.charAt(0)) * BASE;
  if (firstLat >= LATITUDE_MAX * 2) return false;
  if (upper.length > 1) {
    const firstLng = ALPHABET.indexOf(upper.charAt(1)) * BASE;
    if (firstLng >= LONGITUDE_MAX * 2) return false;
  }
  return true;
}

export function encodePlusCode(
  latitude: number,
  longitude: number,
  codeLength = DEFAULT_PLUS_CODE_LENGTH,
): string {
  if (
    codeLength < 2 ||
    (codeLength < PAIR_CODE_LENGTH && codeLength % 2 === 1)
  ) {
    throw new RangeError(`Invalid Plus Code length: ${codeLength}`);
  }
  const length = Math.min(codeLength, MAX_DIGIT_COUNT);

  let lat = Math.min(Math.max(latitude, -LATITUDE_MAX), LATITUDE_MAX);
  // the north pole has no cell above it; move it into the topmost cell
  if (lat === LATITUDE_MAX) lat -= latitudePrecision(length);
  let lng = longitude;
  while (lng < -LONGITUDE_MAX) lng += LONGITUDE_MAX * 2;
  while (lng >= LONGITUDE_MAX) lng -= LONGITUDE_MAX * 2;

  // round to 6 decimals of a step first, as the reference does, so values
  // such as 0.1 that are not exact in binary land in the expected cell
  let latVal = Math.floor(
    Math.round((lat + LATITUDE_MAX) * FINAL_LAT_PRECISION * 1e6) / 1e6,
  );
  let lngVal = Math.floor(
    Math.round((lng + LONGITUDE_MAX) * FINAL_LNG_PRECISION * 1e6) / 1e6,
  );

  let code = '';
  if (length > PAIR_CODE_LENGTH) {
    for (let i = 0; i < GRID_CODE_LENGTH; i++) {
      const index =
        (latVal % GRID_ROWS) * GRID_COLUMNS + (lngVal % GRID_COLUMNS);
      code = ALPHABET.charAt(index) + code;
      latVal = Math.floor(latVal / GRID_ROWS);
      lngVal = Math.floor(lngVal / GRID_COLUMNS);
    }
  } else {
    latVal = Math.floor(latVal / GRID_ROWS ** GRID_CODE_LENGTH);
    lngVal = Math.floor(lngVal / GRID_COLUMNS ** GRID_CODE_LENGTH);
  }
  for (let i = 0; i < PAIR_CODE_LENGTH / 2; i++) {
    code = ALPHABET.charAt(lngVal % BASE) + code;
    code = ALPHABET.charAt(latVal % BASE) + code;
    latVal = Math.floor(latVal / BASE);
    lngVal = Math.floor(lngVal / BASE);
  }

  code = `${code.slice(0, SEPARATOR_POSITION)}${SEPARATOR}${code.slice(SEPARATOR_POSITION)}`;
  if (length >= SEPARATOR_POSITION) return code.slice(0, length + 1);
  return `${code.slice(0, length).padEnd(SEPARATOR_POSITION, PADDING)}${SEPARATOR}`;
}

function latitudePrecision(codeLength: number): number {
  if (codeLength <= PAIR_CODE_LENGTH) {
    return BASE ** (Math.floor(codeLength / -2) + 2);
  }
  return BASE ** -3 / GRID_ROWS ** (codeLength - PAIR_CODE_LENGTH);
}

export interface PlusCodeArea extends LatLng {
  // the cell's south-west corner and size, in degrees
  south: number;
  west: number;
  latSize: number;
  lngSize: number;
}

// decodes a full code to its cell; `lat`/`lng` are the cell centre
export function decodePlusCode(code: string): PlusCodeArea | null {
  if (!isFullPlusCode(code)) return null;
  const digits = code
    .replace(SEPARATOR, '')
    .replace(/0+/, '')
    .toUpperCase()
    .slice(0, MAX_DIGIT_COUNT);

  let normalLat = -LATITUDE_MAX * PAIR_PRECISION;
  let normalLng = -LONGITUDE_MAX * PAIR_PRECISION;
  let gridLat = 0;
  let gridLng = 0;

  const pairDigits = Math.min(digits.length, PAIR_CODE_LENGTH);
  let placeValue = PAIR_FIRST_PLACE_VALUE;
  for (let i = 0; i < pairDigits; i += 2) {
    normalLat += ALPHABET.indexOf(digits.charAt(i)) * placeValue;
    normalLng += ALPHABET.indexOf(digits.charAt(i + 1)) * placeValue;
    if (i < pairDigits - 2) placeValue /= BASE;
  }
  let latSize = placeValue / PAIR_PRECISION;
  let lngSize = placeValue / PAIR_PRECISION;

  if (digits.length > PAIR_CODE_LENGTH) {
    let rowPlaceValue = GRID_LAT_FIRST_PLACE_VALUE;
    let colPlaceValue = GRID_LNG_FIRST_PLACE_VALUE;
    for (let i = PAIR_CODE_LENGTH; i < digits.length; i++) {
      const value = ALPHABET.indexOf(digits.charAt(i));
      gridLat += Math.floor(value / GRID_COLUMNS) * rowPlaceValue;
      gridLng += (value % GRID_COLUMNS) * colPlaceValue;
      if (i < digits.length - 1) {
        rowPlaceValue /= GRID_ROWS;
        colPlaceValue /= GRID_COLUMNS;
      }
    }
    latSize = rowPlaceValue / FINAL_LAT_PRECISION;
    lngSize = colPlaceValue / FINAL_LNG_PRECISION;
  }

  const south = normalLat / PAIR_PRECISION + gridLat / FINAL_LAT_PRECISION;
  const west = normalLng / PAIR_PRECISION + gridLng / FINAL_LNG_PRECISION;
  return {
    south,
    west,
    latSize,
    lngSize,
    lat: Math.min(south + latSize / 2, LATITUDE_MAX),
    lng: Math.min(west + lngSize / 2, LONGITUDE_MAX),
  };
}
