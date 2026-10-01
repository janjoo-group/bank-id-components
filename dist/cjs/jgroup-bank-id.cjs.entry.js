'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const index = require('./index-174af952.js');

var browser = {};

// can-promise has a crash in some versions of react native that dont have
// standard global objects
// https://github.com/soldair/node-qrcode/issues/157

var canPromise$1 = function () {
  return typeof Promise === 'function' && Promise.prototype && Promise.prototype.then
};

var qrcode = {};

var utils$3 = {};

let toSJISFunction;
const CODEWORDS_COUNT = [
  0, // Not used
  26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
  404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
  1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185,
  2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706
];

/**
 * Returns the QR Code size for the specified version
 *
 * @param  {Number} version QR Code version
 * @return {Number}         size of QR code
 */
utils$3.getSymbolSize = function getSymbolSize (version) {
  if (!version) throw new Error('"version" cannot be null or undefined')
  if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40')
  return version * 4 + 17
};

/**
 * Returns the total number of codewords used to store data and EC information.
 *
 * @param  {Number} version QR Code version
 * @return {Number}         Data length in bits
 */
utils$3.getSymbolTotalCodewords = function getSymbolTotalCodewords (version) {
  return CODEWORDS_COUNT[version]
};

/**
 * Encode data with Bose-Chaudhuri-Hocquenghem
 *
 * @param  {Number} data Value to encode
 * @return {Number}      Encoded value
 */
utils$3.getBCHDigit = function (data) {
  let digit = 0;

  while (data !== 0) {
    digit++;
    data >>>= 1;
  }

  return digit
};

utils$3.setToSJISFunction = function setToSJISFunction (f) {
  if (typeof f !== 'function') {
    throw new Error('"toSJISFunc" is not a valid function.')
  }

  toSJISFunction = f;
};

utils$3.isKanjiModeEnabled = function () {
  return typeof toSJISFunction !== 'undefined'
};

utils$3.toSJIS = function toSJIS (kanji) {
  return toSJISFunction(kanji)
};

var errorCorrectionLevel = {};

(function (exports) {
exports.L = { bit: 1 };
exports.M = { bit: 0 };
exports.Q = { bit: 3 };
exports.H = { bit: 2 };

function fromString (string) {
  if (typeof string !== 'string') {
    throw new Error('Param is not a string')
  }

  const lcStr = string.toLowerCase();

  switch (lcStr) {
    case 'l':
    case 'low':
      return exports.L

    case 'm':
    case 'medium':
      return exports.M

    case 'q':
    case 'quartile':
      return exports.Q

    case 'h':
    case 'high':
      return exports.H

    default:
      throw new Error('Unknown EC Level: ' + string)
  }
}

exports.isValid = function isValid (level) {
  return level && typeof level.bit !== 'undefined' &&
    level.bit >= 0 && level.bit < 4
};

exports.from = function from (value, defaultValue) {
  if (exports.isValid(value)) {
    return value
  }

  try {
    return fromString(value)
  } catch (e) {
    return defaultValue
  }
};
}(errorCorrectionLevel));

function BitBuffer$1 () {
  this.buffer = [];
  this.length = 0;
}

BitBuffer$1.prototype = {

  get: function (index) {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1
  },

  put: function (num, length) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  },

  getLengthInBits: function () {
    return this.length
  },

  putBit: function (bit) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }

    if (bit) {
      this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
    }

    this.length++;
  }
};

var bitBuffer = BitBuffer$1;

/**
 * Helper class to handle QR Code symbol modules
 *
 * @param {Number} size Symbol size
 */

function BitMatrix$1 (size) {
  if (!size || size < 1) {
    throw new Error('BitMatrix size must be defined and greater than 0')
  }

  this.size = size;
  this.data = new Uint8Array(size * size);
  this.reservedBit = new Uint8Array(size * size);
}

/**
 * Set bit value at specified location
 * If reserved flag is set, this bit will be ignored during masking process
 *
 * @param {Number}  row
 * @param {Number}  col
 * @param {Boolean} value
 * @param {Boolean} reserved
 */
BitMatrix$1.prototype.set = function (row, col, value, reserved) {
  const index = row * this.size + col;
  this.data[index] = value;
  if (reserved) this.reservedBit[index] = true;
};

/**
 * Returns bit value at specified location
 *
 * @param  {Number}  row
 * @param  {Number}  col
 * @return {Boolean}
 */
BitMatrix$1.prototype.get = function (row, col) {
  return this.data[row * this.size + col]
};

/**
 * Applies xor operator at specified location
 * (used during masking process)
 *
 * @param {Number}  row
 * @param {Number}  col
 * @param {Boolean} value
 */
BitMatrix$1.prototype.xor = function (row, col, value) {
  this.data[row * this.size + col] ^= value;
};

/**
 * Check if bit at specified location is reserved
 *
 * @param {Number}   row
 * @param {Number}   col
 * @return {Boolean}
 */
BitMatrix$1.prototype.isReserved = function (row, col) {
  return this.reservedBit[row * this.size + col]
};

var bitMatrix = BitMatrix$1;

var alignmentPattern = {};

/**
 * Alignment pattern are fixed reference pattern in defined positions
 * in a matrix symbology, which enables the decode software to re-synchronise
 * the coordinate mapping of the image modules in the event of moderate amounts
 * of distortion of the image.
 *
 * Alignment patterns are present only in QR Code symbols of version 2 or larger
 * and their number depends on the symbol version.
 */

(function (exports) {
const getSymbolSize = utils$3.getSymbolSize;

/**
 * Calculate the row/column coordinates of the center module of each alignment pattern
 * for the specified QR Code version.
 *
 * The alignment patterns are positioned symmetrically on either side of the diagonal
 * running from the top left corner of the symbol to the bottom right corner.
 *
 * Since positions are simmetrical only half of the coordinates are returned.
 * Each item of the array will represent in turn the x and y coordinate.
 * @see {@link getPositions}
 *
 * @param  {Number} version QR Code version
 * @return {Array}          Array of coordinate
 */
exports.getRowColCoords = function getRowColCoords (version) {
  if (version === 1) return []

  const posCount = Math.floor(version / 7) + 2;
  const size = getSymbolSize(version);
  const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
  const positions = [size - 7]; // Last coord is always (size - 7)

  for (let i = 1; i < posCount - 1; i++) {
    positions[i] = positions[i - 1] - intervals;
  }

  positions.push(6); // First coord is always 6

  return positions.reverse()
};

/**
 * Returns an array containing the positions of each alignment pattern.
 * Each array's element represent the center point of the pattern as (x, y) coordinates
 *
 * Coordinates are calculated expanding the row/column coordinates returned by {@link getRowColCoords}
 * and filtering out the items that overlaps with finder pattern
 *
 * @example
 * For a Version 7 symbol {@link getRowColCoords} returns values 6, 22 and 38.
 * The alignment patterns, therefore, are to be centered on (row, column)
 * positions (6,22), (22,6), (22,22), (22,38), (38,22), (38,38).
 * Note that the coordinates (6,6), (6,38), (38,6) are occupied by finder patterns
 * and are not therefore used for alignment patterns.
 *
 * let pos = getPositions(7)
 * // [[6,22], [22,6], [22,22], [22,38], [38,22], [38,38]]
 *
 * @param  {Number} version QR Code version
 * @return {Array}          Array of coordinates
 */
exports.getPositions = function getPositions (version) {
  const coords = [];
  const pos = exports.getRowColCoords(version);
  const posLength = pos.length;

  for (let i = 0; i < posLength; i++) {
    for (let j = 0; j < posLength; j++) {
      // Skip if position is occupied by finder patterns
      if ((i === 0 && j === 0) || // top-left
          (i === 0 && j === posLength - 1) || // bottom-left
          (i === posLength - 1 && j === 0)) { // top-right
        continue
      }

      coords.push([pos[i], pos[j]]);
    }
  }

  return coords
};
}(alignmentPattern));

var finderPattern = {};

const getSymbolSize = utils$3.getSymbolSize;
const FINDER_PATTERN_SIZE = 7;

/**
 * Returns an array containing the positions of each finder pattern.
 * Each array's element represent the top-left point of the pattern as (x, y) coordinates
 *
 * @param  {Number} version QR Code version
 * @return {Array}          Array of coordinates
 */
finderPattern.getPositions = function getPositions (version) {
  const size = getSymbolSize(version);

  return [
    // top-left
    [0, 0],
    // top-right
    [size - FINDER_PATTERN_SIZE, 0],
    // bottom-left
    [0, size - FINDER_PATTERN_SIZE]
  ]
};

var maskPattern = {};

/**
 * Data mask pattern reference
 * @type {Object}
 */

(function (exports) {
exports.Patterns = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7
};

/**
 * Weighted penalty scores for the undesirable features
 * @type {Object}
 */
const PenaltyScores = {
  N1: 3,
  N2: 3,
  N3: 40,
  N4: 10
};

/**
 * Check if mask pattern value is valid
 *
 * @param  {Number}  mask    Mask pattern
 * @return {Boolean}         true if valid, false otherwise
 */
exports.isValid = function isValid (mask) {
  return mask != null && mask !== '' && !isNaN(mask) && mask >= 0 && mask <= 7
};

/**
 * Returns mask pattern from a value.
 * If value is not valid, returns undefined
 *
 * @param  {Number|String} value        Mask pattern value
 * @return {Number}                     Valid mask pattern or undefined
 */
exports.from = function from (value) {
  return exports.isValid(value) ? parseInt(value, 10) : undefined
};

/**
* Find adjacent modules in row/column with the same color
* and assign a penalty value.
*
* Points: N1 + i
* i is the amount by which the number of adjacent modules of the same color exceeds 5
*/
exports.getPenaltyN1 = function getPenaltyN1 (data) {
  const size = data.size;
  let points = 0;
  let sameCountCol = 0;
  let sameCountRow = 0;
  let lastCol = null;
  let lastRow = null;

  for (let row = 0; row < size; row++) {
    sameCountCol = sameCountRow = 0;
    lastCol = lastRow = null;

    for (let col = 0; col < size; col++) {
      let module = data.get(row, col);
      if (module === lastCol) {
        sameCountCol++;
      } else {
        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
        lastCol = module;
        sameCountCol = 1;
      }

      module = data.get(col, row);
      if (module === lastRow) {
        sameCountRow++;
      } else {
        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
        lastRow = module;
        sameCountRow = 1;
      }
    }

    if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
    if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
  }

  return points
};

/**
 * Find 2x2 blocks with the same color and assign a penalty value
 *
 * Points: N2 * (m - 1) * (n - 1)
 */
exports.getPenaltyN2 = function getPenaltyN2 (data) {
  const size = data.size;
  let points = 0;

  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const last = data.get(row, col) +
        data.get(row, col + 1) +
        data.get(row + 1, col) +
        data.get(row + 1, col + 1);

      if (last === 4 || last === 0) points++;
    }
  }

  return points * PenaltyScores.N2
};

/**
 * Find 1:1:3:1:1 ratio (dark:light:dark:light:dark) pattern in row/column,
 * preceded or followed by light area 4 modules wide
 *
 * Points: N3 * number of pattern found
 */
exports.getPenaltyN3 = function getPenaltyN3 (data) {
  const size = data.size;
  let points = 0;
  let bitsCol = 0;
  let bitsRow = 0;

  for (let row = 0; row < size; row++) {
    bitsCol = bitsRow = 0;
    for (let col = 0; col < size; col++) {
      bitsCol = ((bitsCol << 1) & 0x7FF) | data.get(row, col);
      if (col >= 10 && (bitsCol === 0x5D0 || bitsCol === 0x05D)) points++;

      bitsRow = ((bitsRow << 1) & 0x7FF) | data.get(col, row);
      if (col >= 10 && (bitsRow === 0x5D0 || bitsRow === 0x05D)) points++;
    }
  }

  return points * PenaltyScores.N3
};

/**
 * Calculate proportion of dark modules in entire symbol
 *
 * Points: N4 * k
 *
 * k is the rating of the deviation of the proportion of dark modules
 * in the symbol from 50% in steps of 5%
 */
exports.getPenaltyN4 = function getPenaltyN4 (data) {
  let darkCount = 0;
  const modulesCount = data.data.length;

  for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];

  const k = Math.abs(Math.ceil((darkCount * 100 / modulesCount) / 5) - 10);

  return k * PenaltyScores.N4
};

/**
 * Return mask value at given position
 *
 * @param  {Number} maskPattern Pattern reference value
 * @param  {Number} i           Row
 * @param  {Number} j           Column
 * @return {Boolean}            Mask value
 */
function getMaskAt (maskPattern, i, j) {
  switch (maskPattern) {
    case exports.Patterns.PATTERN000: return (i + j) % 2 === 0
    case exports.Patterns.PATTERN001: return i % 2 === 0
    case exports.Patterns.PATTERN010: return j % 3 === 0
    case exports.Patterns.PATTERN011: return (i + j) % 3 === 0
    case exports.Patterns.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0
    case exports.Patterns.PATTERN101: return (i * j) % 2 + (i * j) % 3 === 0
    case exports.Patterns.PATTERN110: return ((i * j) % 2 + (i * j) % 3) % 2 === 0
    case exports.Patterns.PATTERN111: return ((i * j) % 3 + (i + j) % 2) % 2 === 0

    default: throw new Error('bad maskPattern:' + maskPattern)
  }
}

/**
 * Apply a mask pattern to a BitMatrix
 *
 * @param  {Number}    pattern Pattern reference number
 * @param  {BitMatrix} data    BitMatrix data
 */
exports.applyMask = function applyMask (pattern, data) {
  const size = data.size;

  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      if (data.isReserved(row, col)) continue
      data.xor(row, col, getMaskAt(pattern, row, col));
    }
  }
};

/**
 * Returns the best mask pattern for data
 *
 * @param  {BitMatrix} data
 * @return {Number} Mask pattern reference number
 */
exports.getBestMask = function getBestMask (data, setupFormatFunc) {
  const numPatterns = Object.keys(exports.Patterns).length;
  let bestPattern = 0;
  let lowerPenalty = Infinity;

  for (let p = 0; p < numPatterns; p++) {
    setupFormatFunc(p);
    exports.applyMask(p, data);

    // Calculate penalty
    const penalty =
      exports.getPenaltyN1(data) +
      exports.getPenaltyN2(data) +
      exports.getPenaltyN3(data) +
      exports.getPenaltyN4(data);

    // Undo previously applied mask
    exports.applyMask(p, data);

    if (penalty < lowerPenalty) {
      lowerPenalty = penalty;
      bestPattern = p;
    }
  }

  return bestPattern
};
}(maskPattern));

var errorCorrectionCode = {};

const ECLevel$1 = errorCorrectionLevel;

const EC_BLOCKS_TABLE = [
// L  M  Q  H
  1, 1, 1, 1,
  1, 1, 1, 1,
  1, 1, 2, 2,
  1, 2, 2, 4,
  1, 2, 4, 4,
  2, 4, 4, 4,
  2, 4, 6, 5,
  2, 4, 6, 6,
  2, 5, 8, 8,
  4, 5, 8, 8,
  4, 5, 8, 11,
  4, 8, 10, 11,
  4, 9, 12, 16,
  4, 9, 16, 16,
  6, 10, 12, 18,
  6, 10, 17, 16,
  6, 11, 16, 19,
  6, 13, 18, 21,
  7, 14, 21, 25,
  8, 16, 20, 25,
  8, 17, 23, 25,
  9, 17, 23, 34,
  9, 18, 25, 30,
  10, 20, 27, 32,
  12, 21, 29, 35,
  12, 23, 34, 37,
  12, 25, 34, 40,
  13, 26, 35, 42,
  14, 28, 38, 45,
  15, 29, 40, 48,
  16, 31, 43, 51,
  17, 33, 45, 54,
  18, 35, 48, 57,
  19, 37, 51, 60,
  19, 38, 53, 63,
  20, 40, 56, 66,
  21, 43, 59, 70,
  22, 45, 62, 74,
  24, 47, 65, 77,
  25, 49, 68, 81
];

const EC_CODEWORDS_TABLE = [
// L  M  Q  H
  7, 10, 13, 17,
  10, 16, 22, 28,
  15, 26, 36, 44,
  20, 36, 52, 64,
  26, 48, 72, 88,
  36, 64, 96, 112,
  40, 72, 108, 130,
  48, 88, 132, 156,
  60, 110, 160, 192,
  72, 130, 192, 224,
  80, 150, 224, 264,
  96, 176, 260, 308,
  104, 198, 288, 352,
  120, 216, 320, 384,
  132, 240, 360, 432,
  144, 280, 408, 480,
  168, 308, 448, 532,
  180, 338, 504, 588,
  196, 364, 546, 650,
  224, 416, 600, 700,
  224, 442, 644, 750,
  252, 476, 690, 816,
  270, 504, 750, 900,
  300, 560, 810, 960,
  312, 588, 870, 1050,
  336, 644, 952, 1110,
  360, 700, 1020, 1200,
  390, 728, 1050, 1260,
  420, 784, 1140, 1350,
  450, 812, 1200, 1440,
  480, 868, 1290, 1530,
  510, 924, 1350, 1620,
  540, 980, 1440, 1710,
  570, 1036, 1530, 1800,
  570, 1064, 1590, 1890,
  600, 1120, 1680, 1980,
  630, 1204, 1770, 2100,
  660, 1260, 1860, 2220,
  720, 1316, 1950, 2310,
  750, 1372, 2040, 2430
];

/**
 * Returns the number of error correction block that the QR Code should contain
 * for the specified version and error correction level.
 *
 * @param  {Number} version              QR Code version
 * @param  {Number} errorCorrectionLevel Error correction level
 * @return {Number}                      Number of error correction blocks
 */
errorCorrectionCode.getBlocksCount = function getBlocksCount (version, errorCorrectionLevel) {
  switch (errorCorrectionLevel) {
    case ECLevel$1.L:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 0]
    case ECLevel$1.M:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 1]
    case ECLevel$1.Q:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 2]
    case ECLevel$1.H:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 3]
    default:
      return undefined
  }
};

/**
 * Returns the number of error correction codewords to use for the specified
 * version and error correction level.
 *
 * @param  {Number} version              QR Code version
 * @param  {Number} errorCorrectionLevel Error correction level
 * @return {Number}                      Number of error correction codewords
 */
errorCorrectionCode.getTotalCodewordsCount = function getTotalCodewordsCount (version, errorCorrectionLevel) {
  switch (errorCorrectionLevel) {
    case ECLevel$1.L:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0]
    case ECLevel$1.M:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1]
    case ECLevel$1.Q:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2]
    case ECLevel$1.H:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3]
    default:
      return undefined
  }
};

var polynomial = {};

var galoisField = {};

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256)
/**
 * Precompute the log and anti-log tables for faster computation later
 *
 * For each possible value in the galois field 2^8, we will pre-compute
 * the logarithm and anti-logarithm (exponential) of this value
 *
 * ref {@link https://en.wikiversity.org/wiki/Reed%E2%80%93Solomon_codes_for_coders#Introduction_to_mathematical_fields}
 */
;(function initTables () {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;

    x <<= 1; // multiply by 2

    // The QR code specification says to use byte-wise modulo 100011101 arithmetic.
    // This means that when a number is 256 or larger, it should be XORed with 0x11D.
    if (x & 0x100) { // similar to x >= 256, but a lot faster (because 0x100 == 256)
      x ^= 0x11D;
    }
  }

  // Optimization: double the size of the anti-log table so that we don't need to mod 255 to
  // stay inside the bounds (because we will mainly use this table for the multiplication of
  // two GF numbers, no more).
  // @see {@link mul}
  for (let i = 255; i < 512; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 255];
  }
}());

/**
 * Returns log value of n inside Galois Field
 *
 * @param  {Number} n
 * @return {Number}
 */
galoisField.log = function log (n) {
  if (n < 1) throw new Error('log(' + n + ')')
  return LOG_TABLE[n]
};

/**
 * Returns anti-log value of n inside Galois Field
 *
 * @param  {Number} n
 * @return {Number}
 */
galoisField.exp = function exp (n) {
  return EXP_TABLE[n]
};

/**
 * Multiplies two number inside Galois Field
 *
 * @param  {Number} x
 * @param  {Number} y
 * @return {Number}
 */
galoisField.mul = function mul (x, y) {
  if (x === 0 || y === 0) return 0

  // should be EXP_TABLE[(LOG_TABLE[x] + LOG_TABLE[y]) % 255] if EXP_TABLE wasn't oversized
  // @see {@link initTables}
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]]
};

(function (exports) {
const GF = galoisField;

/**
 * Multiplies two polynomials inside Galois Field
 *
 * @param  {Uint8Array} p1 Polynomial
 * @param  {Uint8Array} p2 Polynomial
 * @return {Uint8Array}    Product of p1 and p2
 */
exports.mul = function mul (p1, p2) {
  const coeff = new Uint8Array(p1.length + p2.length - 1);

  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      coeff[i + j] ^= GF.mul(p1[i], p2[j]);
    }
  }

  return coeff
};

/**
 * Calculate the remainder of polynomials division
 *
 * @param  {Uint8Array} divident Polynomial
 * @param  {Uint8Array} divisor  Polynomial
 * @return {Uint8Array}          Remainder
 */
exports.mod = function mod (divident, divisor) {
  let result = new Uint8Array(divident);

  while ((result.length - divisor.length) >= 0) {
    const coeff = result[0];

    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= GF.mul(divisor[i], coeff);
    }

    // remove all zeros from buffer head
    let offset = 0;
    while (offset < result.length && result[offset] === 0) offset++;
    result = result.slice(offset);
  }

  return result
};

/**
 * Generate an irreducible generator polynomial of specified degree
 * (used by Reed-Solomon encoder)
 *
 * @param  {Number} degree Degree of the generator polynomial
 * @return {Uint8Array}    Buffer containing polynomial coefficients
 */
exports.generateECPolynomial = function generateECPolynomial (degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
  }

  return poly
};
}(polynomial));

const Polynomial = polynomial;

function ReedSolomonEncoder$1 (degree) {
  this.genPoly = undefined;
  this.degree = degree;

  if (this.degree) this.initialize(this.degree);
}

/**
 * Initialize the encoder.
 * The input param should correspond to the number of error correction codewords.
 *
 * @param  {Number} degree
 */
ReedSolomonEncoder$1.prototype.initialize = function initialize (degree) {
  // create an irreducible generator polynomial
  this.degree = degree;
  this.genPoly = Polynomial.generateECPolynomial(this.degree);
};

/**
 * Encodes a chunk of data
 *
 * @param  {Uint8Array} data Buffer containing input data
 * @return {Uint8Array}      Buffer containing encoded data
 */
ReedSolomonEncoder$1.prototype.encode = function encode (data) {
  if (!this.genPoly) {
    throw new Error('Encoder not initialized')
  }

  // Calculate EC for this data block
  // extends data size to data+genPoly size
  const paddedData = new Uint8Array(data.length + this.degree);
  paddedData.set(data);

  // The error correction codewords are the remainder after dividing the data codewords
  // by a generator polynomial
  const remainder = Polynomial.mod(paddedData, this.genPoly);

  // return EC data blocks (last n byte, where n is the degree of genPoly)
  // If coefficients number in remainder are less than genPoly degree,
  // pad with 0s to the left to reach the needed number of coefficients
  const start = this.degree - remainder.length;
  if (start > 0) {
    const buff = new Uint8Array(this.degree);
    buff.set(remainder, start);

    return buff
  }

  return remainder
};

var reedSolomonEncoder = ReedSolomonEncoder$1;

var version = {};

var mode = {};

var versionCheck = {};

/**
 * Check if QR Code version is valid
 *
 * @param  {Number}  version QR Code version
 * @return {Boolean}         true if valid version, false otherwise
 */

versionCheck.isValid = function isValid (version) {
  return !isNaN(version) && version >= 1 && version <= 40
};

var regex = {};

const numeric = '[0-9]+';
const alphanumeric = '[A-Z $%*+\\-./:]+';
let kanji = '(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|' +
  '[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|' +
  '[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|' +
  '[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+';
kanji = kanji.replace(/u/g, '\\u');

const byte = '(?:(?![A-Z0-9 $%*+\\-./:]|' + kanji + ')(?:.|[\r\n]))+';

regex.KANJI = new RegExp(kanji, 'g');
regex.BYTE_KANJI = new RegExp('[^A-Z0-9 $%*+\\-./:]+', 'g');
regex.BYTE = new RegExp(byte, 'g');
regex.NUMERIC = new RegExp(numeric, 'g');
regex.ALPHANUMERIC = new RegExp(alphanumeric, 'g');

const TEST_KANJI = new RegExp('^' + kanji + '$');
const TEST_NUMERIC = new RegExp('^' + numeric + '$');
const TEST_ALPHANUMERIC = new RegExp('^[A-Z0-9 $%*+\\-./:]+$');

regex.testKanji = function testKanji (str) {
  return TEST_KANJI.test(str)
};

regex.testNumeric = function testNumeric (str) {
  return TEST_NUMERIC.test(str)
};

regex.testAlphanumeric = function testAlphanumeric (str) {
  return TEST_ALPHANUMERIC.test(str)
};

(function (exports) {
const VersionCheck = versionCheck;
const Regex = regex;

/**
 * Numeric mode encodes data from the decimal digit set (0 - 9)
 * (byte values 30HEX to 39HEX).
 * Normally, 3 data characters are represented by 10 bits.
 *
 * @type {Object}
 */
exports.NUMERIC = {
  id: 'Numeric',
  bit: 1 << 0,
  ccBits: [10, 12, 14]
};

/**
 * Alphanumeric mode encodes data from a set of 45 characters,
 * i.e. 10 numeric digits (0 - 9),
 *      26 alphabetic characters (A - Z),
 *   and 9 symbols (SP, $, %, *, +, -, ., /, :).
 * Normally, two input characters are represented by 11 bits.
 *
 * @type {Object}
 */
exports.ALPHANUMERIC = {
  id: 'Alphanumeric',
  bit: 1 << 1,
  ccBits: [9, 11, 13]
};

/**
 * In byte mode, data is encoded at 8 bits per character.
 *
 * @type {Object}
 */
exports.BYTE = {
  id: 'Byte',
  bit: 1 << 2,
  ccBits: [8, 16, 16]
};

/**
 * The Kanji mode efficiently encodes Kanji characters in accordance with
 * the Shift JIS system based on JIS X 0208.
 * The Shift JIS values are shifted from the JIS X 0208 values.
 * JIS X 0208 gives details of the shift coded representation.
 * Each two-byte character value is compacted to a 13-bit binary codeword.
 *
 * @type {Object}
 */
exports.KANJI = {
  id: 'Kanji',
  bit: 1 << 3,
  ccBits: [8, 10, 12]
};

/**
 * Mixed mode will contain a sequences of data in a combination of any of
 * the modes described above
 *
 * @type {Object}
 */
exports.MIXED = {
  bit: -1
};

/**
 * Returns the number of bits needed to store the data length
 * according to QR Code specifications.
 *
 * @param  {Mode}   mode    Data mode
 * @param  {Number} version QR Code version
 * @return {Number}         Number of bits
 */
exports.getCharCountIndicator = function getCharCountIndicator (mode, version) {
  if (!mode.ccBits) throw new Error('Invalid mode: ' + mode)

  if (!VersionCheck.isValid(version)) {
    throw new Error('Invalid version: ' + version)
  }

  if (version >= 1 && version < 10) return mode.ccBits[0]
  else if (version < 27) return mode.ccBits[1]
  return mode.ccBits[2]
};

/**
 * Returns the most efficient mode to store the specified data
 *
 * @param  {String} dataStr Input data string
 * @return {Mode}           Best mode
 */
exports.getBestModeForData = function getBestModeForData (dataStr) {
  if (Regex.testNumeric(dataStr)) return exports.NUMERIC
  else if (Regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC
  else if (Regex.testKanji(dataStr)) return exports.KANJI
  else return exports.BYTE
};

/**
 * Return mode name as string
 *
 * @param {Mode} mode Mode object
 * @returns {String}  Mode name
 */
exports.toString = function toString (mode) {
  if (mode && mode.id) return mode.id
  throw new Error('Invalid mode')
};

/**
 * Check if input param is a valid mode object
 *
 * @param   {Mode}    mode Mode object
 * @returns {Boolean} True if valid mode, false otherwise
 */
exports.isValid = function isValid (mode) {
  return mode && mode.bit && mode.ccBits
};

/**
 * Get mode object from its name
 *
 * @param   {String} string Mode name
 * @returns {Mode}          Mode object
 */
function fromString (string) {
  if (typeof string !== 'string') {
    throw new Error('Param is not a string')
  }

  const lcStr = string.toLowerCase();

  switch (lcStr) {
    case 'numeric':
      return exports.NUMERIC
    case 'alphanumeric':
      return exports.ALPHANUMERIC
    case 'kanji':
      return exports.KANJI
    case 'byte':
      return exports.BYTE
    default:
      throw new Error('Unknown mode: ' + string)
  }
}

/**
 * Returns mode from a value.
 * If value is not a valid mode, returns defaultValue
 *
 * @param  {Mode|String} value        Encoding mode
 * @param  {Mode}        defaultValue Fallback value
 * @return {Mode}                     Encoding mode
 */
exports.from = function from (value, defaultValue) {
  if (exports.isValid(value)) {
    return value
  }

  try {
    return fromString(value)
  } catch (e) {
    return defaultValue
  }
};
}(mode));

(function (exports) {
const Utils = utils$3;
const ECCode = errorCorrectionCode;
const ECLevel = errorCorrectionLevel;
const Mode = mode;
const VersionCheck = versionCheck;

// Generator polynomial used to encode version information
const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
const G18_BCH = Utils.getBCHDigit(G18);

function getBestVersionForDataLength (mode, length, errorCorrectionLevel) {
  for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
    if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
      return currentVersion
    }
  }

  return undefined
}

function getReservedBitsCount (mode, version) {
  // Character count indicator + mode indicator bits
  return Mode.getCharCountIndicator(mode, version) + 4
}

function getTotalBitsFromDataArray (segments, version) {
  let totalBits = 0;

  segments.forEach(function (data) {
    const reservedBits = getReservedBitsCount(data.mode, version);
    totalBits += reservedBits + data.getBitsLength();
  });

  return totalBits
}

function getBestVersionForMixedData (segments, errorCorrectionLevel) {
  for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
    const length = getTotalBitsFromDataArray(segments, currentVersion);
    if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
      return currentVersion
    }
  }

  return undefined
}

/**
 * Returns version number from a value.
 * If value is not a valid version, returns defaultValue
 *
 * @param  {Number|String} value        QR Code version
 * @param  {Number}        defaultValue Fallback value
 * @return {Number}                     QR Code version number
 */
exports.from = function from (value, defaultValue) {
  if (VersionCheck.isValid(value)) {
    return parseInt(value, 10)
  }

  return defaultValue
};

/**
 * Returns how much data can be stored with the specified QR code version
 * and error correction level
 *
 * @param  {Number} version              QR Code version (1-40)
 * @param  {Number} errorCorrectionLevel Error correction level
 * @param  {Mode}   mode                 Data mode
 * @return {Number}                      Quantity of storable data
 */
exports.getCapacity = function getCapacity (version, errorCorrectionLevel, mode) {
  if (!VersionCheck.isValid(version)) {
    throw new Error('Invalid QR Code version')
  }

  // Use Byte mode as default
  if (typeof mode === 'undefined') mode = Mode.BYTE;

  // Total codewords for this QR code version (Data + Error correction)
  const totalCodewords = Utils.getSymbolTotalCodewords(version);

  // Total number of error correction codewords
  const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);

  // Total number of data codewords
  const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;

  if (mode === Mode.MIXED) return dataTotalCodewordsBits

  const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);

  // Return max number of storable codewords
  switch (mode) {
    case Mode.NUMERIC:
      return Math.floor((usableBits / 10) * 3)

    case Mode.ALPHANUMERIC:
      return Math.floor((usableBits / 11) * 2)

    case Mode.KANJI:
      return Math.floor(usableBits / 13)

    case Mode.BYTE:
    default:
      return Math.floor(usableBits / 8)
  }
};

/**
 * Returns the minimum version needed to contain the amount of data
 *
 * @param  {Segment} data                    Segment of data
 * @param  {Number} [errorCorrectionLevel=H] Error correction level
 * @param  {Mode} mode                       Data mode
 * @return {Number}                          QR Code version
 */
exports.getBestVersionForData = function getBestVersionForData (data, errorCorrectionLevel) {
  let seg;

  const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);

  if (Array.isArray(data)) {
    if (data.length > 1) {
      return getBestVersionForMixedData(data, ecl)
    }

    if (data.length === 0) {
      return 1
    }

    seg = data[0];
  } else {
    seg = data;
  }

  return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl)
};

/**
 * Returns version information with relative error correction bits
 *
 * The version information is included in QR Code symbols of version 7 or larger.
 * It consists of an 18-bit sequence containing 6 data bits,
 * with 12 error correction bits calculated using the (18, 6) Golay code.
 *
 * @param  {Number} version QR Code version
 * @return {Number}         Encoded version info bits
 */
exports.getEncodedBits = function getEncodedBits (version) {
  if (!VersionCheck.isValid(version) || version < 7) {
    throw new Error('Invalid QR Code version')
  }

  let d = version << 12;

  while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
    d ^= (G18 << (Utils.getBCHDigit(d) - G18_BCH));
  }

  return (version << 12) | d
};
}(version));

var formatInfo = {};

const Utils$3 = utils$3;

const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
const G15_BCH = Utils$3.getBCHDigit(G15);

/**
 * Returns format information with relative error correction bits
 *
 * The format information is a 15-bit sequence containing 5 data bits,
 * with 10 error correction bits calculated using the (15, 5) BCH code.
 *
 * @param  {Number} errorCorrectionLevel Error correction level
 * @param  {Number} mask                 Mask pattern
 * @return {Number}                      Encoded format information bits
 */
formatInfo.getEncodedBits = function getEncodedBits (errorCorrectionLevel, mask) {
  const data = ((errorCorrectionLevel.bit << 3) | mask);
  let d = data << 10;

  while (Utils$3.getBCHDigit(d) - G15_BCH >= 0) {
    d ^= (G15 << (Utils$3.getBCHDigit(d) - G15_BCH));
  }

  // xor final data with mask pattern in order to ensure that
  // no combination of Error Correction Level and data mask pattern
  // will result in an all-zero data string
  return ((data << 10) | d) ^ G15_MASK
};

var segments = {};

const Mode$4 = mode;

function NumericData (data) {
  this.mode = Mode$4.NUMERIC;
  this.data = data.toString();
}

NumericData.getBitsLength = function getBitsLength (length) {
  return 10 * Math.floor(length / 3) + ((length % 3) ? ((length % 3) * 3 + 1) : 0)
};

NumericData.prototype.getLength = function getLength () {
  return this.data.length
};

NumericData.prototype.getBitsLength = function getBitsLength () {
  return NumericData.getBitsLength(this.data.length)
};

NumericData.prototype.write = function write (bitBuffer) {
  let i, group, value;

  // The input data string is divided into groups of three digits,
  // and each group is converted to its 10-bit binary equivalent.
  for (i = 0; i + 3 <= this.data.length; i += 3) {
    group = this.data.substr(i, 3);
    value = parseInt(group, 10);

    bitBuffer.put(value, 10);
  }

  // If the number of input digits is not an exact multiple of three,
  // the final one or two digits are converted to 4 or 7 bits respectively.
  const remainingNum = this.data.length - i;
  if (remainingNum > 0) {
    group = this.data.substr(i);
    value = parseInt(group, 10);

    bitBuffer.put(value, remainingNum * 3 + 1);
  }
};

var numericData = NumericData;

const Mode$3 = mode;

/**
 * Array of characters available in alphanumeric mode
 *
 * As per QR Code specification, to each character
 * is assigned a value from 0 to 44 which in this case coincides
 * with the array index
 *
 * @type {Array}
 */
const ALPHA_NUM_CHARS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  ' ', '$', '%', '*', '+', '-', '.', '/', ':'
];

function AlphanumericData (data) {
  this.mode = Mode$3.ALPHANUMERIC;
  this.data = data;
}

AlphanumericData.getBitsLength = function getBitsLength (length) {
  return 11 * Math.floor(length / 2) + 6 * (length % 2)
};

AlphanumericData.prototype.getLength = function getLength () {
  return this.data.length
};

AlphanumericData.prototype.getBitsLength = function getBitsLength () {
  return AlphanumericData.getBitsLength(this.data.length)
};

AlphanumericData.prototype.write = function write (bitBuffer) {
  let i;

  // Input data characters are divided into groups of two characters
  // and encoded as 11-bit binary codes.
  for (i = 0; i + 2 <= this.data.length; i += 2) {
    // The character value of the first character is multiplied by 45
    let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;

    // The character value of the second digit is added to the product
    value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);

    // The sum is then stored as 11-bit binary number
    bitBuffer.put(value, 11);
  }

  // If the number of input data characters is not a multiple of two,
  // the character value of the final character is encoded as a 6-bit binary number.
  if (this.data.length % 2) {
    bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
  }
};

var alphanumericData = AlphanumericData;

const Mode$2 = mode;

function ByteData (data) {
  this.mode = Mode$2.BYTE;
  if (typeof (data) === 'string') {
    this.data = new TextEncoder().encode(data);
  } else {
    this.data = new Uint8Array(data);
  }
}

ByteData.getBitsLength = function getBitsLength (length) {
  return length * 8
};

ByteData.prototype.getLength = function getLength () {
  return this.data.length
};

ByteData.prototype.getBitsLength = function getBitsLength () {
  return ByteData.getBitsLength(this.data.length)
};

ByteData.prototype.write = function (bitBuffer) {
  for (let i = 0, l = this.data.length; i < l; i++) {
    bitBuffer.put(this.data[i], 8);
  }
};

var byteData = ByteData;

const Mode$1 = mode;
const Utils$2 = utils$3;

function KanjiData (data) {
  this.mode = Mode$1.KANJI;
  this.data = data;
}

KanjiData.getBitsLength = function getBitsLength (length) {
  return length * 13
};

KanjiData.prototype.getLength = function getLength () {
  return this.data.length
};

KanjiData.prototype.getBitsLength = function getBitsLength () {
  return KanjiData.getBitsLength(this.data.length)
};

KanjiData.prototype.write = function (bitBuffer) {
  let i;

  // In the Shift JIS system, Kanji characters are represented by a two byte combination.
  // These byte values are shifted from the JIS X 0208 values.
  // JIS X 0208 gives details of the shift coded representation.
  for (i = 0; i < this.data.length; i++) {
    let value = Utils$2.toSJIS(this.data[i]);

    // For characters with Shift JIS values from 0x8140 to 0x9FFC:
    if (value >= 0x8140 && value <= 0x9FFC) {
      // Subtract 0x8140 from Shift JIS value
      value -= 0x8140;

    // For characters with Shift JIS values from 0xE040 to 0xEBBF
    } else if (value >= 0xE040 && value <= 0xEBBF) {
      // Subtract 0xC140 from Shift JIS value
      value -= 0xC140;
    } else {
      throw new Error(
        'Invalid SJIS character: ' + this.data[i] + '\n' +
        'Make sure your charset is UTF-8')
    }

    // Multiply most significant byte of result by 0xC0
    // and add least significant byte to product
    value = (((value >>> 8) & 0xff) * 0xC0) + (value & 0xff);

    // Convert result to a 13-bit binary string
    bitBuffer.put(value, 13);
  }
};

var kanjiData = KanjiData;

var dijkstra = {exports: {}};

(function (module) {

/******************************************************************************
 * Created 2008-08-19.
 *
 * Dijkstra path-finding functions. Adapted from the Dijkstar Python project.
 *
 * Copyright (C) 2008
 *   Wyatt Baldwin <self@wyattbaldwin.com>
 *   All rights reserved
 *
 * Licensed under the MIT license.
 *
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *****************************************************************************/
var dijkstra = {
  single_source_shortest_paths: function(graph, s, d) {
    // Predecessor map for each node that has been encountered.
    // node ID => predecessor node ID
    var predecessors = {};

    // Costs of shortest paths from s to all nodes encountered.
    // node ID => cost
    var costs = {};
    costs[s] = 0;

    // Costs of shortest paths from s to all nodes encountered; differs from
    // `costs` in that it provides easy access to the node that currently has
    // the known shortest path from s.
    // XXX: Do we actually need both `costs` and `open`?
    var open = dijkstra.PriorityQueue.make();
    open.push(s, 0);

    var closest,
        u, v,
        cost_of_s_to_u,
        adjacent_nodes,
        cost_of_e,
        cost_of_s_to_u_plus_cost_of_e,
        cost_of_s_to_v,
        first_visit;
    while (!open.empty()) {
      // In the nodes remaining in graph that have a known cost from s,
      // find the node, u, that currently has the shortest path from s.
      closest = open.pop();
      u = closest.value;
      cost_of_s_to_u = closest.cost;

      // Get nodes adjacent to u...
      adjacent_nodes = graph[u] || {};

      // ...and explore the edges that connect u to those nodes, updating
      // the cost of the shortest paths to any or all of those nodes as
      // necessary. v is the node across the current edge from u.
      for (v in adjacent_nodes) {
        if (adjacent_nodes.hasOwnProperty(v)) {
          // Get the cost of the edge running from u to v.
          cost_of_e = adjacent_nodes[v];

          // Cost of s to u plus the cost of u to v across e--this is *a*
          // cost from s to v that may or may not be less than the current
          // known cost to v.
          cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;

          // If we haven't visited v yet OR if the current known cost from s to
          // v is greater than the new cost we just found (cost of s to u plus
          // cost of u to v across e), update v's cost in the cost list and
          // update v's predecessor in the predecessor list (it's now u).
          cost_of_s_to_v = costs[v];
          first_visit = (typeof costs[v] === 'undefined');
          if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
            costs[v] = cost_of_s_to_u_plus_cost_of_e;
            open.push(v, cost_of_s_to_u_plus_cost_of_e);
            predecessors[v] = u;
          }
        }
      }
    }

    if (typeof d !== 'undefined' && typeof costs[d] === 'undefined') {
      var msg = ['Could not find a path from ', s, ' to ', d, '.'].join('');
      throw new Error(msg);
    }

    return predecessors;
  },

  extract_shortest_path_from_predecessor_list: function(predecessors, d) {
    var nodes = [];
    var u = d;
    while (u) {
      nodes.push(u);
      u = predecessors[u];
    }
    nodes.reverse();
    return nodes;
  },

  find_path: function(graph, s, d) {
    var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
    return dijkstra.extract_shortest_path_from_predecessor_list(
      predecessors, d);
  },

  /**
   * A very naive priority queue implementation.
   */
  PriorityQueue: {
    make: function (opts) {
      var T = dijkstra.PriorityQueue,
          t = {},
          key;
      opts = opts || {};
      for (key in T) {
        if (T.hasOwnProperty(key)) {
          t[key] = T[key];
        }
      }
      t.queue = [];
      t.sorter = opts.sorter || T.default_sorter;
      return t;
    },

    default_sorter: function (a, b) {
      return a.cost - b.cost;
    },

    /**
     * Add a new item to the queue and ensure the highest priority element
     * is at the front of the queue.
     */
    push: function (value, cost) {
      var item = {value: value, cost: cost};
      this.queue.push(item);
      this.queue.sort(this.sorter);
    },

    /**
     * Return the highest priority element in the queue.
     */
    pop: function () {
      return this.queue.shift();
    },

    empty: function () {
      return this.queue.length === 0;
    }
  }
};


// node.js module exports
{
  module.exports = dijkstra;
}
}(dijkstra));

(function (exports) {
const Mode = mode;
const NumericData = numericData;
const AlphanumericData = alphanumericData;
const ByteData = byteData;
const KanjiData = kanjiData;
const Regex = regex;
const Utils = utils$3;
const dijkstra$1 = dijkstra.exports;

/**
 * Returns UTF8 byte length
 *
 * @param  {String} str Input string
 * @return {Number}     Number of byte
 */
function getStringByteLength (str) {
  return unescape(encodeURIComponent(str)).length
}

/**
 * Get a list of segments of the specified mode
 * from a string
 *
 * @param  {Mode}   mode Segment mode
 * @param  {String} str  String to process
 * @return {Array}       Array of object with segments data
 */
function getSegments (regex, mode, str) {
  const segments = [];
  let result;

  while ((result = regex.exec(str)) !== null) {
    segments.push({
      data: result[0],
      index: result.index,
      mode: mode,
      length: result[0].length
    });
  }

  return segments
}

/**
 * Extracts a series of segments with the appropriate
 * modes from a string
 *
 * @param  {String} dataStr Input string
 * @return {Array}          Array of object with segments data
 */
function getSegmentsFromString (dataStr) {
  const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
  const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
  let byteSegs;
  let kanjiSegs;

  if (Utils.isKanjiModeEnabled()) {
    byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
    kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
  } else {
    byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
    kanjiSegs = [];
  }

  const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);

  return segs
    .sort(function (s1, s2) {
      return s1.index - s2.index
    })
    .map(function (obj) {
      return {
        data: obj.data,
        mode: obj.mode,
        length: obj.length
      }
    })
}

/**
 * Returns how many bits are needed to encode a string of
 * specified length with the specified mode
 *
 * @param  {Number} length String length
 * @param  {Mode} mode     Segment mode
 * @return {Number}        Bit length
 */
function getSegmentBitsLength (length, mode) {
  switch (mode) {
    case Mode.NUMERIC:
      return NumericData.getBitsLength(length)
    case Mode.ALPHANUMERIC:
      return AlphanumericData.getBitsLength(length)
    case Mode.KANJI:
      return KanjiData.getBitsLength(length)
    case Mode.BYTE:
      return ByteData.getBitsLength(length)
  }
}

/**
 * Merges adjacent segments which have the same mode
 *
 * @param  {Array} segs Array of object with segments data
 * @return {Array}      Array of object with segments data
 */
function mergeSegments (segs) {
  return segs.reduce(function (acc, curr) {
    const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
    if (prevSeg && prevSeg.mode === curr.mode) {
      acc[acc.length - 1].data += curr.data;
      return acc
    }

    acc.push(curr);
    return acc
  }, [])
}

/**
 * Generates a list of all possible nodes combination which
 * will be used to build a segments graph.
 *
 * Nodes are divided by groups. Each group will contain a list of all the modes
 * in which is possible to encode the given text.
 *
 * For example the text '12345' can be encoded as Numeric, Alphanumeric or Byte.
 * The group for '12345' will contain then 3 objects, one for each
 * possible encoding mode.
 *
 * Each node represents a possible segment.
 *
 * @param  {Array} segs Array of object with segments data
 * @return {Array}      Array of object with segments data
 */
function buildNodes (segs) {
  const nodes = [];
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];

    switch (seg.mode) {
      case Mode.NUMERIC:
        nodes.push([seg,
          { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
          { data: seg.data, mode: Mode.BYTE, length: seg.length }
        ]);
        break
      case Mode.ALPHANUMERIC:
        nodes.push([seg,
          { data: seg.data, mode: Mode.BYTE, length: seg.length }
        ]);
        break
      case Mode.KANJI:
        nodes.push([seg,
          { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
        ]);
        break
      case Mode.BYTE:
        nodes.push([
          { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
        ]);
    }
  }

  return nodes
}

/**
 * Builds a graph from a list of nodes.
 * All segments in each node group will be connected with all the segments of
 * the next group and so on.
 *
 * At each connection will be assigned a weight depending on the
 * segment's byte length.
 *
 * @param  {Array} nodes    Array of object with segments data
 * @param  {Number} version QR Code version
 * @return {Object}         Graph of all possible segments
 */
function buildGraph (nodes, version) {
  const table = {};
  const graph = { start: {} };
  let prevNodeIds = ['start'];

  for (let i = 0; i < nodes.length; i++) {
    const nodeGroup = nodes[i];
    const currentNodeIds = [];

    for (let j = 0; j < nodeGroup.length; j++) {
      const node = nodeGroup[j];
      const key = '' + i + j;

      currentNodeIds.push(key);
      table[key] = { node: node, lastCount: 0 };
      graph[key] = {};

      for (let n = 0; n < prevNodeIds.length; n++) {
        const prevNodeId = prevNodeIds[n];

        if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
          graph[prevNodeId][key] =
            getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) -
            getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);

          table[prevNodeId].lastCount += node.length;
        } else {
          if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;

          graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) +
            4 + Mode.getCharCountIndicator(node.mode, version); // switch cost
        }
      }
    }

    prevNodeIds = currentNodeIds;
  }

  for (let n = 0; n < prevNodeIds.length; n++) {
    graph[prevNodeIds[n]].end = 0;
  }

  return { map: graph, table: table }
}

/**
 * Builds a segment from a specified data and mode.
 * If a mode is not specified, the more suitable will be used.
 *
 * @param  {String} data             Input data
 * @param  {Mode | String} modesHint Data mode
 * @return {Segment}                 Segment
 */
function buildSingleSegment (data, modesHint) {
  let mode;
  const bestMode = Mode.getBestModeForData(data);

  mode = Mode.from(modesHint, bestMode);

  // Make sure data can be encoded
  if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
    throw new Error('"' + data + '"' +
      ' cannot be encoded with mode ' + Mode.toString(mode) +
      '.\n Suggested mode is: ' + Mode.toString(bestMode))
  }

  // Use Mode.BYTE if Kanji support is disabled
  if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
    mode = Mode.BYTE;
  }

  switch (mode) {
    case Mode.NUMERIC:
      return new NumericData(data)

    case Mode.ALPHANUMERIC:
      return new AlphanumericData(data)

    case Mode.KANJI:
      return new KanjiData(data)

    case Mode.BYTE:
      return new ByteData(data)
  }
}

/**
 * Builds a list of segments from an array.
 * Array can contain Strings or Objects with segment's info.
 *
 * For each item which is a string, will be generated a segment with the given
 * string and the more appropriate encoding mode.
 *
 * For each item which is an object, will be generated a segment with the given
 * data and mode.
 * Objects must contain at least the property "data".
 * If property "mode" is not present, the more suitable mode will be used.
 *
 * @param  {Array} array Array of objects with segments data
 * @return {Array}       Array of Segments
 */
exports.fromArray = function fromArray (array) {
  return array.reduce(function (acc, seg) {
    if (typeof seg === 'string') {
      acc.push(buildSingleSegment(seg, null));
    } else if (seg.data) {
      acc.push(buildSingleSegment(seg.data, seg.mode));
    }

    return acc
  }, [])
};

/**
 * Builds an optimized sequence of segments from a string,
 * which will produce the shortest possible bitstream.
 *
 * @param  {String} data    Input string
 * @param  {Number} version QR Code version
 * @return {Array}          Array of segments
 */
exports.fromString = function fromString (data, version) {
  const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());

  const nodes = buildNodes(segs);
  const graph = buildGraph(nodes, version);
  const path = dijkstra$1.find_path(graph.map, 'start', 'end');

  const optimizedSegs = [];
  for (let i = 1; i < path.length - 1; i++) {
    optimizedSegs.push(graph.table[path[i]].node);
  }

  return exports.fromArray(mergeSegments(optimizedSegs))
};

/**
 * Splits a string in various segments with the modes which
 * best represent their content.
 * The produced segments are far from being optimized.
 * The output of this function is only used to estimate a QR Code version
 * which may contain the data.
 *
 * @param  {string} data Input string
 * @return {Array}       Array of segments
 */
exports.rawSplit = function rawSplit (data) {
  return exports.fromArray(
    getSegmentsFromString(data, Utils.isKanjiModeEnabled())
  )
};
}(segments));

const Utils$1 = utils$3;
const ECLevel = errorCorrectionLevel;
const BitBuffer = bitBuffer;
const BitMatrix = bitMatrix;
const AlignmentPattern = alignmentPattern;
const FinderPattern = finderPattern;
const MaskPattern = maskPattern;
const ECCode = errorCorrectionCode;
const ReedSolomonEncoder = reedSolomonEncoder;
const Version = version;
const FormatInfo = formatInfo;
const Mode = mode;
const Segments = segments;

/**
 * QRCode for JavaScript
 *
 * modified by Ryan Day for nodejs support
 * Copyright (c) 2011 Ryan Day
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
*/

/**
 * Add finder patterns bits to matrix
 *
 * @param  {BitMatrix} matrix  Modules matrix
 * @param  {Number}    version QR Code version
 */
function setupFinderPattern (matrix, version) {
  const size = matrix.size;
  const pos = FinderPattern.getPositions(version);

  for (let i = 0; i < pos.length; i++) {
    const row = pos[i][0];
    const col = pos[i][1];

    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || size <= row + r) continue

      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || size <= col + c) continue

        if ((r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix.set(row + r, col + c, true, true);
        } else {
          matrix.set(row + r, col + c, false, true);
        }
      }
    }
  }
}

/**
 * Add timing pattern bits to matrix
 *
 * Note: this function must be called before {@link setupAlignmentPattern}
 *
 * @param  {BitMatrix} matrix Modules matrix
 */
function setupTimingPattern (matrix) {
  const size = matrix.size;

  for (let r = 8; r < size - 8; r++) {
    const value = r % 2 === 0;
    matrix.set(r, 6, value, true);
    matrix.set(6, r, value, true);
  }
}

/**
 * Add alignment patterns bits to matrix
 *
 * Note: this function must be called after {@link setupTimingPattern}
 *
 * @param  {BitMatrix} matrix  Modules matrix
 * @param  {Number}    version QR Code version
 */
function setupAlignmentPattern (matrix, version) {
  const pos = AlignmentPattern.getPositions(version);

  for (let i = 0; i < pos.length; i++) {
    const row = pos[i][0];
    const col = pos[i][1];

    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (r === -2 || r === 2 || c === -2 || c === 2 ||
          (r === 0 && c === 0)) {
          matrix.set(row + r, col + c, true, true);
        } else {
          matrix.set(row + r, col + c, false, true);
        }
      }
    }
  }
}

/**
 * Add version info bits to matrix
 *
 * @param  {BitMatrix} matrix  Modules matrix
 * @param  {Number}    version QR Code version
 */
function setupVersionInfo (matrix, version) {
  const size = matrix.size;
  const bits = Version.getEncodedBits(version);
  let row, col, mod;

  for (let i = 0; i < 18; i++) {
    row = Math.floor(i / 3);
    col = i % 3 + size - 8 - 3;
    mod = ((bits >> i) & 1) === 1;

    matrix.set(row, col, mod, true);
    matrix.set(col, row, mod, true);
  }
}

/**
 * Add format info bits to matrix
 *
 * @param  {BitMatrix} matrix               Modules matrix
 * @param  {ErrorCorrectionLevel}    errorCorrectionLevel Error correction level
 * @param  {Number}    maskPattern          Mask pattern reference value
 */
function setupFormatInfo (matrix, errorCorrectionLevel, maskPattern) {
  const size = matrix.size;
  const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
  let i, mod;

  for (i = 0; i < 15; i++) {
    mod = ((bits >> i) & 1) === 1;

    // vertical
    if (i < 6) {
      matrix.set(i, 8, mod, true);
    } else if (i < 8) {
      matrix.set(i + 1, 8, mod, true);
    } else {
      matrix.set(size - 15 + i, 8, mod, true);
    }

    // horizontal
    if (i < 8) {
      matrix.set(8, size - i - 1, mod, true);
    } else if (i < 9) {
      matrix.set(8, 15 - i - 1 + 1, mod, true);
    } else {
      matrix.set(8, 15 - i - 1, mod, true);
    }
  }

  // fixed module
  matrix.set(size - 8, 8, 1, true);
}

/**
 * Add encoded data bits to matrix
 *
 * @param  {BitMatrix}  matrix Modules matrix
 * @param  {Uint8Array} data   Data codewords
 */
function setupData (matrix, data) {
  const size = matrix.size;
  let inc = -1;
  let row = size - 1;
  let bitIndex = 7;
  let byteIndex = 0;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;

    while (true) {
      for (let c = 0; c < 2; c++) {
        if (!matrix.isReserved(row, col - c)) {
          let dark = false;

          if (byteIndex < data.length) {
            dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
          }

          matrix.set(row, col - c, dark);
          bitIndex--;

          if (bitIndex === -1) {
            byteIndex++;
            bitIndex = 7;
          }
        }
      }

      row += inc;

      if (row < 0 || size <= row) {
        row -= inc;
        inc = -inc;
        break
      }
    }
  }
}

/**
 * Create encoded codewords from data input
 *
 * @param  {Number}   version              QR Code version
 * @param  {ErrorCorrectionLevel}   errorCorrectionLevel Error correction level
 * @param  {ByteData} data                 Data input
 * @return {Uint8Array}                    Buffer containing encoded codewords
 */
function createData (version, errorCorrectionLevel, segments) {
  // Prepare data buffer
  const buffer = new BitBuffer();

  segments.forEach(function (data) {
    // prefix data with mode indicator (4 bits)
    buffer.put(data.mode.bit, 4);

    // Prefix data with character count indicator.
    // The character count indicator is a string of bits that represents the
    // number of characters that are being encoded.
    // The character count indicator must be placed after the mode indicator
    // and must be a certain number of bits long, depending on the QR version
    // and data mode
    // @see {@link Mode.getCharCountIndicator}.
    buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));

    // add binary data sequence to buffer
    data.write(buffer);
  });

  // Calculate required number of bits
  const totalCodewords = Utils$1.getSymbolTotalCodewords(version);
  const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
  const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;

  // Add a terminator.
  // If the bit string is shorter than the total number of required bits,
  // a terminator of up to four 0s must be added to the right side of the string.
  // If the bit string is more than four bits shorter than the required number of bits,
  // add four 0s to the end.
  if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
    buffer.put(0, 4);
  }

  // If the bit string is fewer than four bits shorter, add only the number of 0s that
  // are needed to reach the required number of bits.

  // After adding the terminator, if the number of bits in the string is not a multiple of 8,
  // pad the string on the right with 0s to make the string's length a multiple of 8.
  while (buffer.getLengthInBits() % 8 !== 0) {
    buffer.putBit(0);
  }

  // Add pad bytes if the string is still shorter than the total number of required bits.
  // Extend the buffer to fill the data capacity of the symbol corresponding to
  // the Version and Error Correction Level by adding the Pad Codewords 11101100 (0xEC)
  // and 00010001 (0x11) alternately.
  const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
  for (let i = 0; i < remainingByte; i++) {
    buffer.put(i % 2 ? 0x11 : 0xEC, 8);
  }

  return createCodewords(buffer, version, errorCorrectionLevel)
}

/**
 * Encode input data with Reed-Solomon and return codewords with
 * relative error correction bits
 *
 * @param  {BitBuffer} bitBuffer            Data to encode
 * @param  {Number}    version              QR Code version
 * @param  {ErrorCorrectionLevel} errorCorrectionLevel Error correction level
 * @return {Uint8Array}                     Buffer containing encoded codewords
 */
function createCodewords (bitBuffer, version, errorCorrectionLevel) {
  // Total codewords for this QR code version (Data + Error correction)
  const totalCodewords = Utils$1.getSymbolTotalCodewords(version);

  // Total number of error correction codewords
  const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);

  // Total number of data codewords
  const dataTotalCodewords = totalCodewords - ecTotalCodewords;

  // Total number of blocks
  const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);

  // Calculate how many blocks each group should contain
  const blocksInGroup2 = totalCodewords % ecTotalBlocks;
  const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;

  const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);

  const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
  const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;

  // Number of EC codewords is the same for both groups
  const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;

  // Initialize a Reed-Solomon encoder with a generator polynomial of degree ecCount
  const rs = new ReedSolomonEncoder(ecCount);

  let offset = 0;
  const dcData = new Array(ecTotalBlocks);
  const ecData = new Array(ecTotalBlocks);
  let maxDataSize = 0;
  const buffer = new Uint8Array(bitBuffer.buffer);

  // Divide the buffer into the required number of blocks
  for (let b = 0; b < ecTotalBlocks; b++) {
    const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;

    // extract a block of data from buffer
    dcData[b] = buffer.slice(offset, offset + dataSize);

    // Calculate EC codewords for this data block
    ecData[b] = rs.encode(dcData[b]);

    offset += dataSize;
    maxDataSize = Math.max(maxDataSize, dataSize);
  }

  // Create final data
  // Interleave the data and error correction codewords from each block
  const data = new Uint8Array(totalCodewords);
  let index = 0;
  let i, r;

  // Add data codewords
  for (i = 0; i < maxDataSize; i++) {
    for (r = 0; r < ecTotalBlocks; r++) {
      if (i < dcData[r].length) {
        data[index++] = dcData[r][i];
      }
    }
  }

  // Apped EC codewords
  for (i = 0; i < ecCount; i++) {
    for (r = 0; r < ecTotalBlocks; r++) {
      data[index++] = ecData[r][i];
    }
  }

  return data
}

/**
 * Build QR Code symbol
 *
 * @param  {String} data                 Input string
 * @param  {Number} version              QR Code version
 * @param  {ErrorCorretionLevel} errorCorrectionLevel Error level
 * @param  {MaskPattern} maskPattern     Mask pattern
 * @return {Object}                      Object containing symbol data
 */
function createSymbol (data, version, errorCorrectionLevel, maskPattern) {
  let segments;

  if (Array.isArray(data)) {
    segments = Segments.fromArray(data);
  } else if (typeof data === 'string') {
    let estimatedVersion = version;

    if (!estimatedVersion) {
      const rawSegments = Segments.rawSplit(data);

      // Estimate best version that can contain raw splitted segments
      estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
    }

    // Build optimized segments
    // If estimated version is undefined, try with the highest version
    segments = Segments.fromString(data, estimatedVersion || 40);
  } else {
    throw new Error('Invalid data')
  }

  // Get the min version that can contain data
  const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);

  // If no version is found, data cannot be stored
  if (!bestVersion) {
    throw new Error('The amount of data is too big to be stored in a QR Code')
  }

  // If not specified, use min version as default
  if (!version) {
    version = bestVersion;

  // Check if the specified version can contain the data
  } else if (version < bestVersion) {
    throw new Error('\n' +
      'The chosen QR Code version cannot contain this amount of data.\n' +
      'Minimum version required to store current data is: ' + bestVersion + '.\n'
    )
  }

  const dataBits = createData(version, errorCorrectionLevel, segments);

  // Allocate matrix buffer
  const moduleCount = Utils$1.getSymbolSize(version);
  const modules = new BitMatrix(moduleCount);

  // Add function modules
  setupFinderPattern(modules, version);
  setupTimingPattern(modules);
  setupAlignmentPattern(modules, version);

  // Add temporary dummy bits for format info just to set them as reserved.
  // This is needed to prevent these bits from being masked by {@link MaskPattern.applyMask}
  // since the masking operation must be performed only on the encoding region.
  // These blocks will be replaced with correct values later in code.
  setupFormatInfo(modules, errorCorrectionLevel, 0);

  if (version >= 7) {
    setupVersionInfo(modules, version);
  }

  // Add data codewords
  setupData(modules, dataBits);

  if (isNaN(maskPattern)) {
    // Find best mask pattern
    maskPattern = MaskPattern.getBestMask(modules,
      setupFormatInfo.bind(null, modules, errorCorrectionLevel));
  }

  // Apply mask pattern
  MaskPattern.applyMask(maskPattern, modules);

  // Replace format info bits with correct values
  setupFormatInfo(modules, errorCorrectionLevel, maskPattern);

  return {
    modules: modules,
    version: version,
    errorCorrectionLevel: errorCorrectionLevel,
    maskPattern: maskPattern,
    segments: segments
  }
}

/**
 * QR Code
 *
 * @param {String | Array} data                 Input data
 * @param {Object} options                      Optional configurations
 * @param {Number} options.version              QR Code version
 * @param {String} options.errorCorrectionLevel Error correction level
 * @param {Function} options.toSJISFunc         Helper func to convert utf8 to sjis
 */
qrcode.create = function create (data, options) {
  if (typeof data === 'undefined' || data === '') {
    throw new Error('No input text')
  }

  let errorCorrectionLevel = ECLevel.M;
  let version;
  let mask;

  if (typeof options !== 'undefined') {
    // Use higher error correction level as default
    errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
    version = Version.from(options.version);
    mask = MaskPattern.from(options.maskPattern);

    if (options.toSJISFunc) {
      Utils$1.setToSJISFunction(options.toSJISFunc);
    }
  }

  return createSymbol(data, version, errorCorrectionLevel, mask)
};

var canvas = {};

var utils$2 = {};

(function (exports) {
function hex2rgba (hex) {
  if (typeof hex === 'number') {
    hex = hex.toString();
  }

  if (typeof hex !== 'string') {
    throw new Error('Color should be defined as hex string')
  }

  let hexCode = hex.slice().replace('#', '').split('');
  if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
    throw new Error('Invalid hex color: ' + hex)
  }

  // Convert from short to long form (fff -> ffffff)
  if (hexCode.length === 3 || hexCode.length === 4) {
    hexCode = Array.prototype.concat.apply([], hexCode.map(function (c) {
      return [c, c]
    }));
  }

  // Add default alpha value
  if (hexCode.length === 6) hexCode.push('F', 'F');

  const hexValue = parseInt(hexCode.join(''), 16);

  return {
    r: (hexValue >> 24) & 255,
    g: (hexValue >> 16) & 255,
    b: (hexValue >> 8) & 255,
    a: hexValue & 255,
    hex: '#' + hexCode.slice(0, 6).join('')
  }
}

exports.getOptions = function getOptions (options) {
  if (!options) options = {};
  if (!options.color) options.color = {};

  const margin = typeof options.margin === 'undefined' ||
    options.margin === null ||
    options.margin < 0
    ? 4
    : options.margin;

  const width = options.width && options.width >= 21 ? options.width : undefined;
  const scale = options.scale || 4;

  return {
    width: width,
    scale: width ? 4 : scale,
    margin: margin,
    color: {
      dark: hex2rgba(options.color.dark || '#000000ff'),
      light: hex2rgba(options.color.light || '#ffffffff')
    },
    type: options.type,
    rendererOpts: options.rendererOpts || {}
  }
};

exports.getScale = function getScale (qrSize, opts) {
  return opts.width && opts.width >= qrSize + opts.margin * 2
    ? opts.width / (qrSize + opts.margin * 2)
    : opts.scale
};

exports.getImageWidth = function getImageWidth (qrSize, opts) {
  const scale = exports.getScale(qrSize, opts);
  return Math.floor((qrSize + opts.margin * 2) * scale)
};

exports.qrToImageData = function qrToImageData (imgData, qr, opts) {
  const size = qr.modules.size;
  const data = qr.modules.data;
  const scale = exports.getScale(size, opts);
  const symbolSize = Math.floor((size + opts.margin * 2) * scale);
  const scaledMargin = opts.margin * scale;
  const palette = [opts.color.light, opts.color.dark];

  for (let i = 0; i < symbolSize; i++) {
    for (let j = 0; j < symbolSize; j++) {
      let posDst = (i * symbolSize + j) * 4;
      let pxColor = opts.color.light;

      if (i >= scaledMargin && j >= scaledMargin &&
        i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
        const iSrc = Math.floor((i - scaledMargin) / scale);
        const jSrc = Math.floor((j - scaledMargin) / scale);
        pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
      }

      imgData[posDst++] = pxColor.r;
      imgData[posDst++] = pxColor.g;
      imgData[posDst++] = pxColor.b;
      imgData[posDst] = pxColor.a;
    }
  }
};
}(utils$2));

(function (exports) {
const Utils = utils$2;

function clearCanvas (ctx, canvas, size) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!canvas.style) canvas.style = {};
  canvas.height = size;
  canvas.width = size;
  canvas.style.height = size + 'px';
  canvas.style.width = size + 'px';
}

function getCanvasElement () {
  try {
    return document.createElement('canvas')
  } catch (e) {
    throw new Error('You need to specify a canvas element')
  }
}

exports.render = function render (qrData, canvas, options) {
  let opts = options;
  let canvasEl = canvas;

  if (typeof opts === 'undefined' && (!canvas || !canvas.getContext)) {
    opts = canvas;
    canvas = undefined;
  }

  if (!canvas) {
    canvasEl = getCanvasElement();
  }

  opts = Utils.getOptions(opts);
  const size = Utils.getImageWidth(qrData.modules.size, opts);

  const ctx = canvasEl.getContext('2d');
  const image = ctx.createImageData(size, size);
  Utils.qrToImageData(image.data, qrData, opts);

  clearCanvas(ctx, canvasEl, size);
  ctx.putImageData(image, 0, 0);

  return canvasEl
};

exports.renderToDataURL = function renderToDataURL (qrData, canvas, options) {
  let opts = options;

  if (typeof opts === 'undefined' && (!canvas || !canvas.getContext)) {
    opts = canvas;
    canvas = undefined;
  }

  if (!opts) opts = {};

  const canvasEl = exports.render(qrData, canvas, opts);

  const type = opts.type || 'image/png';
  const rendererOpts = opts.rendererOpts || {};

  return canvasEl.toDataURL(type, rendererOpts.quality)
};
}(canvas));

var svgTag = {};

const Utils = utils$2;

function getColorAttrib (color, attrib) {
  const alpha = color.a / 255;
  const str = attrib + '="' + color.hex + '"';

  return alpha < 1
    ? str + ' ' + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"'
    : str
}

function svgCmd (cmd, x, y) {
  let str = cmd + x;
  if (typeof y !== 'undefined') str += ' ' + y;

  return str
}

function qrToPath (data, size, margin) {
  let path = '';
  let moveBy = 0;
  let newRow = false;
  let lineLength = 0;

  for (let i = 0; i < data.length; i++) {
    const col = Math.floor(i % size);
    const row = Math.floor(i / size);

    if (!col && !newRow) newRow = true;

    if (data[i]) {
      lineLength++;

      if (!(i > 0 && col > 0 && data[i - 1])) {
        path += newRow
          ? svgCmd('M', col + margin, 0.5 + row + margin)
          : svgCmd('m', moveBy, 0);

        moveBy = 0;
        newRow = false;
      }

      if (!(col + 1 < size && data[i + 1])) {
        path += svgCmd('h', lineLength);
        lineLength = 0;
      }
    } else {
      moveBy++;
    }
  }

  return path
}

svgTag.render = function render (qrData, options, cb) {
  const opts = Utils.getOptions(options);
  const size = qrData.modules.size;
  const data = qrData.modules.data;
  const qrcodesize = size + opts.margin * 2;

  const bg = !opts.color.light.a
    ? ''
    : '<path ' + getColorAttrib(opts.color.light, 'fill') +
      ' d="M0 0h' + qrcodesize + 'v' + qrcodesize + 'H0z"/>';

  const path =
    '<path ' + getColorAttrib(opts.color.dark, 'stroke') +
    ' d="' + qrToPath(data, size, opts.margin) + '"/>';

  const viewBox = 'viewBox="' + '0 0 ' + qrcodesize + ' ' + qrcodesize + '"';

  const width = !opts.width ? '' : 'width="' + opts.width + '" height="' + opts.width + '" ';

  const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + '</svg>\n';

  if (typeof cb === 'function') {
    cb(null, svgTag);
  }

  return svgTag
};

const canPromise = canPromise$1;

const QRCode = qrcode;
const CanvasRenderer = canvas;
const SvgRenderer = svgTag;

function renderCanvas (renderFunc, canvas, text, opts, cb) {
  const args = [].slice.call(arguments, 1);
  const argsNum = args.length;
  const isLastArgCb = typeof args[argsNum - 1] === 'function';

  if (!isLastArgCb && !canPromise()) {
    throw new Error('Callback required as last argument')
  }

  if (isLastArgCb) {
    if (argsNum < 2) {
      throw new Error('Too few arguments provided')
    }

    if (argsNum === 2) {
      cb = text;
      text = canvas;
      canvas = opts = undefined;
    } else if (argsNum === 3) {
      if (canvas.getContext && typeof cb === 'undefined') {
        cb = opts;
        opts = undefined;
      } else {
        cb = opts;
        opts = text;
        text = canvas;
        canvas = undefined;
      }
    }
  } else {
    if (argsNum < 1) {
      throw new Error('Too few arguments provided')
    }

    if (argsNum === 1) {
      text = canvas;
      canvas = opts = undefined;
    } else if (argsNum === 2 && !canvas.getContext) {
      opts = text;
      text = canvas;
      canvas = undefined;
    }

    return new Promise(function (resolve, reject) {
      try {
        const data = QRCode.create(text, opts);
        resolve(renderFunc(data, canvas, opts));
      } catch (e) {
        reject(e);
      }
    })
  }

  try {
    const data = QRCode.create(text, opts);
    cb(null, renderFunc(data, canvas, opts));
  } catch (e) {
    cb(e);
  }
}

browser.create = QRCode.create;
browser.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
browser.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);

// only svg for now.
browser.toString = renderCanvas.bind(null, function (data, _, opts) {
  return SvgRenderer.render(data, opts)
});

var isMobile$1 = {exports: {}};

isMobile$1.exports = isMobile;
isMobile$1.exports.isMobile = isMobile;
isMobile$1.exports.default = isMobile;

const mobileRE = /(android|bb\d+|meego).+mobile|armv7l|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series[46]0|samsungbrowser.*mobile|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i;
const notMobileRE = /CrOS/;

const tabletRE = /android|ipad|playbook|silk/i;

function isMobile (opts) {
  if (!opts) opts = {};
  let ua = opts.ua;
  if (!ua && typeof navigator !== 'undefined') ua = navigator.userAgent;
  if (ua && ua.headers && typeof ua.headers['user-agent'] === 'string') {
    ua = ua.headers['user-agent'];
  }
  if (typeof ua !== 'string') return false

  let result =
    (mobileRE.test(ua) && !notMobileRE.test(ua)) ||
    (!!opts.tablet && tabletRE.test(ua));

  if (
    !result &&
    opts.tablet &&
    opts.featureDetect &&
    navigator &&
    navigator.maxTouchPoints > 1 &&
    ua.indexOf('Macintosh') !== -1 &&
    ua.indexOf('Safari') !== -1
  ) {
    result = true;
  }

  return result
}

const isMobileLib = isMobile$1.exports;

async function getQrCodeImageUrl(qrCode, options = {}) {
    try {
        return await browser.toDataURL(qrCode, Object.assign({ width: 200, 
            // The QR spec's recommended minimum quiet zone is 4 modules - this
            // was below that at 2. Can't make the pattern itself less dense
            // (that's BankID's own token payload length + errorCorrectionLevel,
            // already at 'L', the lowest/sparsest level) without either
            // breaking the real flow or hurting scan reliability, but more
            // margin gives the actual pattern more breathing room and, as a
            // side effect, more context for a camera's own finder-pattern
            // detection - a pure improvement, not just cosmetic.
            margin: 4, errorCorrectionLevel: 'L' }, options));
    }
    catch (_a) {
        return null;
    }
}
const useDevice = () => {
    const isMobileOrTablet = isMobileLib({ tablet: true, featureDetect: true });
    const isChromeOnAppleDevice = Boolean(navigator.userAgent.match(/CriOS/));
    const isFirefoxOnAppleDevice = Boolean(navigator.userAgent.match(/FxiOS/));
    const isOperaTouchOnAppleDevice = Boolean(navigator.userAgent.match(/OPT/));
    const isChromeOnAndroidMobile = Boolean(navigator.userAgent.match(/Android/) && navigator.userAgent.match(/Chrome/));
    return {
        isMobileOrTablet,
        isChromeOnAppleDevice,
        isFirefoxOnAppleDevice,
        isOperaTouchOnAppleDevice,
        isChromeOnAndroidMobile,
    };
};
function getHashParams(hash) {
    if (hash === undefined) {
        return {};
    }
    const params = new URLSearchParams(hash.substring(1));
    return [...params.entries()].reduce((acc, curr) => (Object.assign(Object.assign({}, acc), { [curr[0]]: curr[1] })), {});
}

// Inter (OFL-1.1 licensed, https://github.com/rsms/inter), self-hosted so
// the widget's text renders identically everywhere it's embedded instead
// of depending on -apple-system/BlinkMacSystemFont resolving correctly
// (confirmed unreliable in Chromium - falls through to plain Helvetica).
//
// Registered via the FontFace API rather than a CSS `@font-face` rule in
// the component's own shadow stylesheet - confirmed (by directly comparing
// rendered glyph widths) that Chromium does not apply a shadow-root-scoped
// `@font-face` to that same shadow tree's own text. `document.fonts` is
// document-global, so a font registered there is available to every shadow
// root's inherited font-family, this one included.
const INTER_400_BASE64 = 'd09GMgABAAAAAFxwABAAAAABBWAAAFwNAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGoFQG4GvRhzVcAZgP1NUQVReAIU2EQgKgbtAgaEUC4gOAAE2AiQDkBgEIAWEXAehBAwHGw7zJ5huOl475bYBtOPXkPVLdAHVazeH0HNrHDdaqtTZgdrjQMa0T/b//2ckqDEGwlsHomq1bYbCsDBcZiTWsxNV1a1G2qzqFdVZ6UNgIaKzpsNF5bDt1lmK+4wJAuaM6cYjQYIECc2vCjsyLghJw2P1Eb2H+sS5+Wk9BoiB3CSejPblcoR+3ffTTvu8/ve22xfN0DQ85cPFRX+v6vG6z7bljR/7xPmXScNKt68ouQqMXTYjYtVJX3rAuh7+66STnrmP1E7SN3YCVwSnf56v259z35sxmzEGQ7KMYU+S7PklhdolRUQb2oQ0DBOTtMuv+b5la5Lk+6Xla1o22j+jVcumkt/XLmNLG0Og5/+VmlXaGqU1ahZdRkpqRrasQUJEkIREEBIhEYmVCLGrVtWsGKWLDtTqmr/RVsd8Y63PP3z7Pez3GXkXT5AISTwkGnQWVURDshJo5df4053//92se+ER6L1RoHLOsGPmXzuRppkpdaZD6yNJ3gr80t9VFWRNfPs1e6tcO75VdVWAcAuc5C+wcP4wslWW59soiILr/522W/u3vZ10zaQzt6dGKIzioZASo5Eo/BnDWH/pvv3rECuvT4dWnqFdxIP4YtVDNNsvJTM7/UN00eqlPPIQPZPFTjQfC7N3nkPsf6fN87AoixIohdMo5NrdI7dy7U+a9nZuT2iGwmr7AElOl1FUJ9bKOYx/qAv91ZQ6c5qdw+Vg/MY7fl4qhyNSsYxHrCj7oh6qOBiI3u3svWAaiNV4U2FFJ4hmnqBAcgtlAAcjt3+u+f2jlywXje1kE5ZsbAFYu7tStUqnRaIW0FmsI+8810rvbKq7N8YH6cdjAAGDIbQgSN0TpHhHroe4erkz5Jo6YqndorjvvCHXUuesDZI3PvrU+ujz8Ez0zqbxp/Gn0cPz/Vqf+v5Tk7dAXR0Yl1qhI0xXTyL9QP9NvTkDAe6E1V9AhdAL5X/FAikCR45AhXWMidARlq3/zbTsztsri7qQVoVx8DcNJvWTjjuXUlWzMv83VanHvCRthYILS+BYAxHbJ71f6XpR54RrAJLvfyd5SO7YC8C+Pl4KS5lk5LB2y8WkBNSVaV79rM1jr/HzvKCxgI7nEQnBxoKfSEAwdRbQ4+H75Tu7J6WqLyNv3JsY16TMzNufBLg8Wl+qXD50FUer44mxKGSMxP9v2u9TajK0prrtxhDhWKExZjN3XibtbfbM7vzej6e0WVoSqvyLQ+KQYNG4qgyeg0VpjsdriCbHv98RBMItjMg5dReew084VSidCjFOzP+cKrX9rKyl66kDrUGIzQofDKKR5ChD/wrXxL0C2rKUFRqzwteW8ObNgF7MQSSVjyxhsRL+sdR3+yL3vWzPY5AiYQgiIYjYIEOZnt9l/b8R/b/TsEHDjG+MtdZIkitJkiQZGVlrjb8NZ4hW2WUMq1jGmxxjM7fBslyUGwroEWV+GqpLXVxw5Vq/hQCGEf8qFIIPwLciTBFKKF89pPYYeuol1O479MsQjCABjEYGYDzkAcZHPcAsE8Nss4MFhYHNigRTag8r1hNWpi+swomww06FHXE67IIrYQ2Ww5q6iaqrLzBtWlT99aMgAtwKuBbErKnmNLWkrR/CbkLgGkLko5/0lPUZnp9FCcHpqxk7hNP3/ZnAFA04DhswUAJV2GEc9ebXJgLvw3L4vu4O8Q9l/sCmQBhusXfbQBuvLmC/3b9xpl/Dbz/UAnxMAogD4Z6TK9yn4GGwYEKIt5nBwWBoYe/XfZjquUFfUcNYlQ07+mHB3W/lhGsILw4jeYkXf3E/4cVZN2Vn2iIs9IJBjOq+XKY4LEnabImko5lgcRiS57xwYXf5C0Z0LQrEgCojP8JBg2QEVeCsP8VJBoyn30MHTUXo+RhV9DArpkJOoZdH9q1ySOEUTcGB9BOYwkIl8pKK7wL7seHqbIZo0ZjnaSRC/SwmX8OogW02q95gbQQrWJCUlxfMmjK14Khau6qZFSuaUs1dRbMtU/w79riSSa4NCcdb2hgjDfvA4YGeeFwuoppaSYeNDPKFm5WXu/g8i/Xi6SdbOKqcRzEpIP/jcKsrE85lNpXy5qIjcSDVe4WG7zGcKXg2+1GnRqUyBeI1WrrbDjlM8C2ipiAlxsflyLHQEKDBxBgKuXQiR/+B2zVSB9e3FrhCtv2w/GuGyV8oscN8SznYUdzaj3K9+Lza4/pOHH9eMyXISWZbEbc8bb0wahdNZ0zlv37U9ZqAWkSDY6qOyVsQGqtFgBN9nFi7aGue6MQ7Jmvl3nDcRZJMOpwQXUwCSxpSkibiOvXHGNZGqwbZXXZ7bvCUe0Rtv502qjch0CrZR79TvZoWCzM6mtHjZyVvG6OIKEQhClGzoOXOOItxJ62cbAfS4Xc9SJcIcWlU7kRFgYctXyNi/HD6EwAYKLQxGjx36s7VyaYN0dwQ/nDUQhzSNDfIIlB5gpK7iF3Mq5p3sqJbwS+lA7mI07RokLZAkz6hlKVBuKSXfFNMMogDccjVtOiNDWD0G3sk2GQ3KDuqjScBMFBoY4BrfNRzQE835+Vyah4NDqu9shKRizhNazYDYSi2XgJkz99bjrvjMU3VxH08RR8G8BXf+L064qcOOQDO0m121plNXfwRC5jAw4Y8QO4ld5HbvdwCxs2bmJVR9l5VE1+JOXf1vLOe9LfVG9iwxTy3T6NrjXfRMbitfDTuohn0iGs0cDmdv2PT2WSHQF903t4Wvks7oqZOjWKQNMTw67kla9AgDEaXsBHTc8clzRzMj+C5RFszIKoXwLmB3ohDdYMrPd9glPmmztp7NhrCsSco7htH6fTq9siIIxNW27xFoB9jXgjiRGhMXwbUcXX7clmcfcV8yw4QCgncS+PtxW8HjV4dyZfgsumIYhzwJ0cDCpzWc+WmxQ8WAfl68GSpARRs0JaCNV6Cg5DhOgZuBFJ2xZXfY9BD8IDr0cdlxI0ud/OMssAuM+yhtEm+ApsVq7ct46niAtdpsTOzfdfKPvYBtonR17SrC5JzH0OABjam6188olpdfhJY8+U9QoC60X8YqsAHxnW3RIMbvC2YDaO4WCZ32U5IunP1vtL59UGVcFua6WlFMSWT6i/hqL/wpxMzzPYvHba4G8NF7ep+6zW+70ebhFv3LLp8mSfKJrhVZaR18iJyQbmuBVorzc4VcMhTez7eI0yiv5otb05YUnkbYUREeCsT4kptWCzBCWNacyLKS5an9yY0zWX1QgQTlSzFtrhr+/Kx5nARvSzdJnLtIhKXYdePFy3b0ywzrv5Taech/fJ5WLR0l/OVFwBtG5FE8nELnYzfahqAOP4BOcHBQhDDCHg/i0aXPa1nk/mroD01vDAI+i166ra3SaTJUrRwwu6DyxW1UBDv8+hAboUbHW5PK0ziHWyxzq/dWBj5Iqr/K5djVwlWu9H/2jJVHfFxv21E/Ho5auu73oUpPS6FI0z7uX7iF47SZ6qwKT59sm7zMzdEwacZg1kjv0nbu8mJKC0IyXcuTfwZ2A9WXvUpXIlFMYGKjVxgZQXcrOFli24Od/HzyI9eAeEZN+vCqjmHJIXFdCg8lk9FxWHf4nI5troCbiUl55msSn5l0ze5Bq1Nr1Nnc+vSV2j9KLwBRTSshY1GFNmkqaKavhTd7NvFtGCxxZl7aGkfeiMOEeJF3KFG3tpQjhcBwihgGg2cYwDLmMAwFhDGBo5xlmDjXRyjPJA884J5A50PmC+k8WB+0AWg32RMCoRfMPymwW86zMIY1XyowpEUARYF3SKwxdAtgdvSm9gtKwen2PivfFyCR+LLxWp1EjqtrQijZMDWISoF49bXV16aPFpWGVJ6Spgc6DaAZULKAsuuk9+kprcZ0W0RtrWe5bepP9ypMd12Ibo8WfS7mO2WoD3LdCMYG1FD5hVrdCWyqlT2lcmgco1sr8SpZFRlzc0o75yq0jJblIoeZh9u16OewJ72DMGZ8cUGK/gYQ+GAkSMii+3wtYeLXDBOaViwZMW6ibIkvk1kIYiONG9KSAIcrl9QaIJptIqpYcexRv8hXjP6vVhZAUtW9Kv26sRdEnEIunDgogsHdjDXCtAlIQ1GYsZIzJpYS6I8ie9qZCUxbaKJHgQxPAzRg8ISJxhYa5KrOGKKHSYIsUCSHNWghyr25sgh5IIGbqD9rd1whdrRma2Wv/K8Vb5NpjSxFnDISBgihTrIQjbOL7WnuMEMOvU6ZcZ5epOK4IaTdSzoOwMz7zArOzZVE0xicZKw0iyQCBlkF8a+DGHzBaLTGS7HHR7LH/TzwCj8uKIUqMbA1uqD5Q8kGZZOFMANdRhIiO0M+nTxOb4ZBKDzWSIADdwqlR4d6ojrgS3moV3okCSWx9d61JQGSKDbIZUqjXPHLVeHooiSAjLzKrL4+rk4sUnhSo1X1mUhZaQgaYoMW51Ak2YtWg07bYXyJYeWdaj4Ewno+sqUl+6bogOjDGniwQxpM/3IsGU5HMRwzHrYsOG2AnvYUo47SOoh48H5xBpG1cibF7Sanfth0bGHoQJA6IUwlFNMr46ViE87Sr0351mRGxrHROgp4QEYeOCZqC+chQfiJ2IF0J4oW6GcIydqGtfuIbNjY6Yz7OPKnKhhaIdRunUNvyvB418idxTYYt4UsPqMlhx4czzzSL2RwY3tL7vU0fv8n9NDMz4MQ3z9GbnjFwMN7vrhUjgEmQRJnmPPX6an9MPTRR4Icp4XR7bHQ0QOtu6bZX1Q23ld16T6S4I55wCghu66/jl47UAMxvWth2g/pz8RZBhWp7KT2Dxmrt7otztP6sWUS+fJS/wm71oEhfKpjDJtJAtyhHB3OxUBOzpzP8MFRgPiaxXjltXrvhDgWAw45cb9bXiM57OXQ5PXf9yuvRcoN005dkhBiHQdWcsyQOX7svD/ADsr7V27hUTeNSbWC08c2fW2J+TIfjAdqzL5Jvhp/kt/yaNbc0wy7eo7S3ozUV7S/xnVMIlqdYhMsUTD9AqSbkQSjNUj8FlHJBiUU5cOafWxk1QtJDFzDHgqGC3PHdlS03ZCM9CwW590kPFSZJGjLtj6MWa50dae0CezSr/9/lCT3HAG0ekC526uVgk2i4WQCaykCAzXDditxozRlsB/MNXshtdKG12QeV009+hcgmAynnwiJAQpjuoY4CvV0Tlx1vxVcXQLVU8cl81XX3ZJAkQ+6eOgh20Zagh8TrqmzSWdZAh+t7qlG9oxEwCUKNDydVQvf8TlEEF2CVwKeJlfNNEmFnqTqM53bhE3lSLN/IB+qm4pIiTORWVXjlUf4XffFzHxLdzDldV+6TPTDxwF6V5C1ZMbhaLMBAUd7D0Joc9WUVmQrub4xzXWXtPLW9U1Qdh36xXDHnT/wBYIP7xdgpcpsNA4bEpP3oU69Kto66vlq1Zmf6rfRbGlmKLb6bH+v3jUWrBzJER4FpqrJz/wG9U0C+2cx+BEXvuf7QqlkpCOkoRGHRF5bF1g6XXMEwy4TKnWcx33NuIkAwFyZFurxYhbB4f2hrvZGPs/FQvJJIbEygM+2ZUPjbnxk43NriBbdBrGgLhLT2/1CkcH0o/sMflP+u0+1e48ZF/PVh8268z3NWnzi1516Weyv+8Ij14OuxucR2PD6C5WqVoAMOjSFFH2rd/7w2UwWDAc2FMiFXhDnH4lRF84AKef8oDkfWZQB898hQp45jtmTbr2jexmJ4+476v/ZzXL/YW0yPuecrSWq4qz6CoC55gEV5ZOtkdgJjn/r1f8j87Vk3eGi2HER3h/Pu4t/udBdOFrr6H7ffSBG1i9C7ifDt9Cd+pi1Tuof4mwXyy4JLMuFuAkFt3lMqhR3X+/owGqzsQUlJtXiOLwcmXsUp1Ct7xaeDpEh1mPVbLvhsnELfB08OSKbbZ74N0aAMZicz2ZlEIdRiK+f/n/GfItghT8jIFMGIqNXAS8fTcotDZotDUY6OAwR1lZOiwnlgdrF2s3y4vlw/JlhbIOsiBlsYc6wevCIDXrkEdTWSEHC+s7/ldFILYg9DAI6ENChmhGJJA1WzQ7jpCTUQw5Gw25cGVoLDdonHGsuZsEBZiHFmY+tMACtHALoUiL6IsWQ9diCdjWSjJCMilzqdIIySjwbLSJSI7ddOzxB5RvH6JSJRv7HUBUq4H+UkvP3w6xcNgReo46ysIx/9BT7wQTaueg866gXHUbccddlHvuIVo9QHnoMa4nnkBPPcfU5iWWV16ZoN3/WDq9w/HeZ2a6fGGq21ccg74z9sMP6KefiF9+8TVkiGMECYyJQgo8YiADvGIiE1xjIQvGxEY2TIyDHBifJAmrbLJhlV12rEaau0nrQTDwCx8j+AjgY4SL40ZCGYUzo3BmFM4PWTbTfVbNHj1FSJQxwx8DfYaC4WMEHyMcsMUOB2yRIGYkfMbixljcEMDHCD4C+AjgYwQfAXycMMITS0Yf6ZTS0ewHSXUfG/W3YVD9RnrhTwV5sZF3bA/eHl16dLIDYYzIIj7OmBUdEhKjM0XzHNFk0mQKVvY8XPPiw1QRmud1dXKkaltvCAsbJFXjsPh2uxB5drO3RwFUbB/MFCwxg8DGDnbYDQl2eYooSHsXZgdmcOBXhVBMhoKLFWK4GuQFyCTG4Ys13o7PCKboPRaNL7qgUCmrAgCuAgBmxpoRY0aMGTE2HpeGQqGcMCQAwAAYRkgEI8TXG53G1c0OgCUrltUVAK5CFQBwglL/AEMwW2ImDEmmRuXY9GyCKs8+C48xLo1VvP30H2NoWsuUeWIcVUV46C0AmMm6J+gPMRe/b3wlOcD39sMfAnh79iMmdHgfonzzhV/cV6iMdVMk33+w6eItvy/v0Ct8oXLy/rYM8GhdE9yKJvRq2Wh9XiYxyL+jYyGZgthOO41RqIhrDnG3suIJ7k47Z0J+eAGG+17mnpwNCCqV4KRMTbE0LTK76Rm40QxzCATSr7Z1sbaOrp4+BBNJZAqVRmdzuDy+QIIZGhmbmJqZW1haWdvY2kGOMPOFi7DQHkp/qHZQjb/UOqzOEccc9w+1k0457YyzzjnvgosaNLrksivuuKvVfQ888aMkUk9aWslHgM207E7OrlzDNV3LtV3Hdcsh+kgxJcvac6VESZF8TOukWE9aUp4Cv+N3f+/s8yUyrn013TMwAd/QDukDMIBvNQHgNHDQpwauUcytw2F1jjjmuH/UO9FoSkfPmO3t/IhySPcwBCAAbev/7zw323VOqTvVsKwjDUs+OErX0X05OpBbXxzs+3H+rkjmNrNGpygEHyhKtCNisXBIlVOqUK1GHb16z2x0z6+F7vW31LNFZT3Oo4+9otZNh5PkZLhP+/f93a45ea7sF3rdUewunz6Rbayeda3GdC6mUwt5cFvGwn0DUFeUTktcipaglmym+1JXXd9tk7dnW+UWb5xPChpNo+Hu6Umtf8+cPDt+riiERPkOHMkwjg9mY/FtdIVZwEK0TaxUqhRU84tgR5xW5x+e7oyLWRq/zWzXXDfHEy/N1e6ziLptfEv7UGKJ6ksq6V7JRc11VcuU0kaqabXoYVn1mF43lH+T52gFFtnh0gcnkUFuw7vJcvCJxUj56OSOJ53Nhb8AgeAQkFDQMLCS4eAREJGQUVDR0KVExv/zcDNzJQ9ZsuXgExDKlUdELJ8kCmhIR0qUFPWuO5Gd5Fu8002rR68+/QZ8vUysXzYuPrUAAAAA1aSRekxpITtCugxyG2TKooiNR5dtU6lr7aESJUXqsaWF7GDpMshtkCmL4nsqJhNd0RlDdB7srXe6afXo1affgK9TA6oSaw+XKCllMdORQW6DTFkUl+1CUj/QdFUkH2qdFOtJQ3ZAugxyG2TKoojOw731znsffPTJZ920evTq02+g+1poG9Kuozv6JEukJgUaA5MOFjYOLh5dfHrGveMRhBNso+y26YMlyFSF8Cj1+njTsag1XcJBXtzlqDVApR8A/SlRnwMlhlk10pLPqJpKLvgcw7oqkeg0BR0yF1FfnEjCYeVKojfnZpgyUuivKi3/YtMcI/HQH5b1G/h0UfLDFupb6Wj02j5M6sU28zaQJqqOA66th7qeT6eTcAfTo4Tzpn39AUvzY8p509w1ouRg11yPtsO98NIr7V7r8J83/s8PZ7QGfeu+TwP+BOPAOkQVWvp7mWFMelbyZXzw6iwi+UTDRkkPfRxCOjUxpe18ZSyf/PpxZ8vG0bVejU6+t4cfMnX7FC20K8SoHdiO+6NsGCXI+LikL/iWrYguX+39fD4b+MTHn1uAA47DudIuqC+Yj/lEmk7N4zdivfqVlCHtM5MjJH4uirHyy0Q3Mf17ZRKm/Jhzggk//3kE3r9vupnqBBxhhgLUyb02Fg4ePgEhQyImTJmxIAayaw9xxkwS1uzYG/VSnWOR5I2kSpIjWbbY2uoHLfMtt1jGLoBY8i/FohvuwlHIhVjwQ0LFvNO8cvo/BOaV5vk8yjVfXvPSNVX/mwkfczlABATCQiQYFw91kY96KEg/YQYZZtTIzLJMnHkWWSXJNruss8k+h0QZZ9KITHPMqVE5NzqXxuTa2MblnkeeeeWdT76Nzy2/fmsCghNBLkBPKhmnGVEIiohF1KI4jFtdPpPWVsS01PSZl8vYmG5121h3aZexHWn908wMB7mm0QoqPGkhQ4UtOXSY8BEiR4kYKVacqrlfVnnKuv6K1FXWSJO2qhMlKaPr6OgZLSLyAePhBGC5OJtNmwnJrzFSTtWHnxG3zApJ/lj6UEf/9ab/6+xt73rfhz72qc8IHV26QE8KB4soHau1FeCVWiXdcjUmqrWXjDGBJ1/L38hn+ApPjFPMicns2dv2a/uh1/TK9+wdt4ftQkH9ayIsQQcl8M+CJgiBIQwo4EMhBh1VLlF9ay/Y10qmmHCEhXlXcDzJk4gmhiqHnaF+KikzbpDkStDtmStqKVHIVcWrOHQGmQXPRuBuNtTMfHV9xKFKZK6Uppc9sQjZbXDXxHAkhRIPI9MfDQfV/V7GI/To7m+pmt1T3sEfXtkw54rfWfZZ7QYpmA4Y6jz4+HYEdSFIFHIBujYa3RWKzrq0Huhy4LxxQLE3c1UhcbF519o+xtqGxE1tXfMy9EpA4lxalxSMvMISJ2rXsDdyLdgsF0reDAieaZkCCJR15xCAgMLMNwACse15EyA4c/ec1+ZxAIH2wZkPIHglTwMQrEkXAQjmxVMAglJIMOMDIKGGw6dmYDYj6kEvKfN0SqzwuCnSH68nenxuLU9kQ9XXwd3hcHoZ1jr0JOZ24eADEYa0WUMNzK76DqeRWtFq0PnajrLGDama14eeK8wQqjRz+tDhNEQRu3D4kT+P6bVXZFDdn3mkoKchYLcVvxuCgwZCj1HoOl4lLXrfzBvj74Uvvi0x46/ig3GAxEG3xwc0ALPIHmjq/AbxpuuBDUPrNP8U5JX6HWRp5+Cp4JNFHRIsqOY7GlSHbmYJZbYLZeEQYAGWcYXtmncoesVE4AJs8Reh2HX7cRqQfOhTEUL3woDdqi6HMO5sIRAxWo7jxe/00pivrCq5qGerLJnGxRdABy48jIY4in+7CZwaPz7br27u40qOiU1W1jF1XzfxyMquWGn/6fAi6cEceq2VK5W4BDi/YTa7I9LVHELbzZPdIQDyA8IkBrxhu2NGfQs6M8mPDB5jWPA2HoSqLFq4Voc8EC6sC3Bh1MBBCOTIPweYxtSuFDmRVL2MxIEwKBfzAGQ/UorOyHakRdmELCRNdUpsDyVpQf+uHd0D+vjPg7oXe1KtqJR5pWFhIdBlsvVIwYnqTa3GEtlzqU6PhROxcRQsXTElDclqVr22G8KMofzzAiNA7CJil1Z6G9Eqq6HrrP229g9OgZVfPFhgtil8ORAheJh9RNq4zdMOfOCrA4iu7cnzH0J56RENoTpVSuy2hVyyeDHU3y/IBJ5c2EVgoDeoslXtlM1l7yHzG9lcy1DMZSxk7bdo06X2uXrcrmxVZ3uyJEuyFdkRGByI49/yeuflyov7+tKFyR4yXn66gg5vrhxImBERBClm0RkO8Rji/zn3qIe+2G9cnvfWmo9Ypf6M1FTF3P12riIqCN21oMNrsUjURihDOUVE1yoF5qpTCDdi/N+JqH7cBwLufJgWYrp0p6wJQeIJSBs1Ik4OUyhUMdVCYHLClNGNs4gv2Gre60qJ/r8S/0v/9vTo78vv/R/ht/p0SHHldV3T1Vz5FR7/0o5y6Is7du7J17rKNdHALpYv2+p6q+zZNW3/dqxhNStf8fI2ZQkLX+iGay5abgtX/ze7mUx7YNBYI8z0jEzPtEzdqEY6wuEMbbCTMMMho05nalfj/F9dddCiuEG1nu9EB9rZxlZVUUmzyyqpyMY0rl2xQkunSw6ZpRuacpxIOZ2T6Utb9FGnJHnhhhFcYImKHz29NE5z/x9vPHLTiSMbnvOUh9zlJte43IXmO80Uox1nZteyW67sUgNaiIup2jW9aZyVSf3qkEEaySUWTykiCC6oQplC4lSY/8eOCW0AhIXANCP00EIdKqQI4UADSwJDCCodalM3hBrcaoMVwwumXQGdqVOtYLnLXtokyx5rpCEXMzYyfWjCKhQh3+3M8HrxJhCHot4hVcrky5VDroRYtjQ0OHAxGEKHtDQIixDsONKeddtzdCXdNuV2I7T56ZqZGUmSAACoqqqKiEgyHzgPNDcboZXNZ2ZmZiRJAgCgqqoqIiLJO3eYEXphZmZGkiQAAKqqqiIikowhJkmSJEmSJEmSJEmSJAkAAAAAAAAAAAAAAAAA5CVJkiRJkiRJkiRJkiQJAAAAAAAAAAB4/DJL2FWjXwcDTfLE8UqJEDxoLtlkmiAm/NTjnZce0LjklDpVyuTLlUMuxWrLRAozu3UkwLetTvOUy9UdWUoRy6wEmGVXIUFMpJIkSQAAUbS5GY1MN2reDbuEDUemrrMaRciglYECFtDUq6VSIFe2NBLZWEiQYsRsIkEJhzoElfPSUleX5O45vm2MNCUiBvXw1x/XRfLkSFeILw0FWhzGJWupEMD/aBGPVc1L6Xg1VZSZPEn8ODHCnvf4tTPRBhCLoE6VErttISclxEGDlWCIUHXUCMHBVg0qwgVp1VebqoJyyy4tSdmxIoUsrmF+ZmKtakjDT+lS+uxIG9s4Utp5jydyYjwpCOCgQiaEU8Cf7ZrUDkJZCdVVVUm725I8acI40cKW0DCSWqcaEhjU5Y1n7rqhwSlH1VApsts2Csuhxb/i1T+AHxzdpUlKSIXAewoeUiG4+9/c93M2QpOZmZmZkSQJAACNSZIAKP071B9T2XwKCTrjin6KAmJNDJtW9kBpGtjN2SdBYb7tpeAM6PttLOf9wO0h7JZyA+EzUwzwR2+LwEpNBfMHB20/cfJbVRpc7dZ6r3YXOwEzVtTd0prx/jPZvfnq1N38ZQo6GnBvO0TdTQ9EYCqBn0Tdjfe5Y5DCJlF3wz1CtFBYI2quf8joQXHDbaLuuj4Yb3Wl8NqBLA5b7LVGxtH0307/AvHPd8ZZ55w3a85l8xYtuOSCi4QzRYz6wDXH0Tkj2rcOB4H/bzJMG6y7QQS4HqOuVM1AEi1o4ljQo00TtSpK2ZItE2YqP85wbcHVJJkDwBaQBdXw2M7BoRse85wcxi4e6zw8MRse+3k5OmdxTuflPdZZPJ3PwxP7LJ6uzsuDc14e17hgDve8PF3zvPyxCnuXMcAQOEVJRlUytLAHk6VUj3xGAm7k0JY5/lPOHzZg0JBhI0aNmzBlkslJYxE0JSCHDF6XT/P2OjMo39GEzqTmv3oBflSkhcCD3xV0p5MwvpjsxTW9VNudueU05h4Owk4jky+e1gLGj8Ar5xGvziL/ibu/cfvn+rDa16N1cymWZKUtt0XTPbN9NvRHn5ZMwRx+P96whRtn89sEPwQ9/tw6u0xLMtLakZN5+L13PUrdDnw2I3hhBrxxxRkKCV36jb4XN317rSY63LlcDmzUW2h8LVoMtP36NaOvbaa9ZLLHaOyPX97ntFnL8VnPDxI/afjRpLHJu3hb3+L/dnjjf/Z56QsaXlfbfS6LZ/ObBx+/8iN6TTxY3nd0efd57Vt+e9M+LWi8ZiGuty2awL9neMsVL0u8hGjstXCxe8EdznXPHjjFSZmXfeOLjD2G+I65EkcLjUNli7+t0/OwvZcj2vEAWKPsHjx4wPTaVd66j1CVDffqW6FpCaMslVI0fkYBTd0OtM00D27RQI+eBnQarVvLqG9orJ6vXQVVpmqMrKREbQVTiWW5c1dTpCdyZJRUiymCNpb45TyxFgkz0xQTeHOLjAkWWWPcTCzLWcqStdWoNO+8au5sqcnKrM1cgWEkXo2T3ZgwuujVjUoRFi4jfFrOfxK6XlfiBeZ6f74Bc66rhDDNyU7GlLZFMAhizrDF7NDErNxyNJ/peszILZ5Pd/mMkDIp/MtmE2NCrwW/7nhf8Ol6H/DE42EWv7LPlRObH/3rpnCsF7q67xhqnZijGc4xaqkl1EHVtQ9r2JYaNs/GFhTX1pAVpWIrWppopu1IxghMwiI0mu9NhiRRMqzqw78ePQ/lzXBhQ0HDhLHkJE1ovyvHIXQJCBkxZs2OI3defP0mQKAw4SJFW2ytZKlkNsqRZ498hYrtV+0vtdROO6/BVTfc0eqhp9p0eq9Lt8Fa7EnRpwf8R/2wBKZk0zEiTeCAAdxk1aqeHfQR00U11XJPhRDSh6BrtoeOd5VyYnu6fCWSBam84068DpmeHSljgPXAeQv4wr3T+Hl5Y7AfYwMgW/Vjg9cDb7Kcb896f3PCJXA5dC5dhADn3x8FQV8WMF+2zMDt8GBLLG60XTz3Qt7+jrTRoOD9X3mZtgnwje/RSYMh7IgwUQjSJICADR6Qsnf8MC+OfPCVoaERC9xVelTlnsS/Jbh23pcPhTrDjW3euLJujmejbUOKptiU9e2I+Ep8TfGNxKZiC7FEbCceJ/YVT1k4bSWx+sPqT4lwaHj4gNtx5avS0cILHYsEc4HaKNbMG4pNxGaP3U3sAyV/xaIe73fHl/8f+nR5p+XlG/741kDNQPWAAPjj914f8dDXUa+9X89v7+ePpJ3UTnyVS36EwBOAl+k0BPpSQwH0xS+Gp6vPDw6yn8+/nGh+1SixZa1coUbltZ9VfoyxWVLo0MIgPBySB7aE147jjyPMAqvP+g6MqYHBmpyssCt5lxOEddxDf1Nj9iHg5fuwSYYCfLbhFnTM1X7XRla9JjfaQ123HqteVUDarYq0k7fkimWIkeybPoVFlwETI5gaydloLpzqMkGQYFNNMTmVQEsstcxy6X54YrvNtthlq1x5/lSqTLkSh9U54m8/NfpXk2bXXWuDG9q91uGFHn/Qmuf2AHxld7JTSSP6f/nCc/meh8d/1wWMHYB5LYCeCW74L8Bt3wG4ztPANSYArgGMY9Eksi2pZ2gMRLGtUsJGoUgBsBX1ZbPhzXUbYsr/0RNtQcRIdX7Q0ks2fD/HcEdRVECTRxzbtrY6/vviLR+XVgATGBMogatNOJOvUUSo0fPrWACzpa0SAlWPaKkTE7AH0T0F36qHZFvplgCphUlooAIsp2sYjgXdqx6qgGtr4rWhfKhWhXGNRQ+KsYeo15ZG24lzyNhsahXkFfTnDHqXFkFCqAoJRdWFKfJEyzuESitVkaW0UNYXTLND7cq4VZfYkunQly80u1ZmnU7T5nLblPmVwlqehgotLYRYPbXMV/n82rXCHORyfWlhnio6xDxTbBHLxXr7girMhYjyzMJtpKxYYmUK9lj5IpPPC5E+JNQbLDatbf3RPW1mEvlD95AN5qiKQuSqKmekeJlsF25Gx8J8Po1bZalRrrZr4kA2c936oUFm3jpSlizQMgtL3yJNLB1V3OSsTu/23VUotClCHIjJbN2qrNijqbpim6nq+cLYgp7TXcIEOomzIEcv0qURgobkoQrck9CSNmG8PAEjA6H7wQX3jr5PQNKwZy1RX0zMkiOKm9TlOthhgMaqmAM9YexypqTFMGOONKBynoLGqSkNaHMZVmmTVJREEpqPavw3Xmj8z3MIz6GmK6Ua/AKVvMEdpqrHdWGkRr/Hi4xb7v0KFfZPHJFkaRVrXJ8bwbEfj6loUB9lliysFEeUMoWMSI7XKCJDZVCKbZypQAlb7iDPlfhyRyg50e0I46oXyU/zymvRvYRFF9H9GV8w8yhdTWIJ3BGFkOL7qI6sB1W3lPT2s0BcTOvP+gizZAOqLlXcVdMQt8f6lNNAfSR5PMlta7qu0CzFn51Zdg755B62uY+Jdj/GJR4dr4G0OclxXcABF2rYpENjVMcsd8z51M5FiTlQTWlxSVNKJSO7jIB/jJijJV4UPcmhdscwmQevNWGIpVkCBnx1E71sBvtLMaKRj+zdbuYXoH5wyEjZwwxRqSAYZSrdVAfSMQdhcOzN8yIb0F8Tm+zvq5V9j1hdJNa6K+YpQ0AQ0jPUcqGm8RZwqaV1xQyqhZyzW+NeAKkSW5wLFploXpFJCrI6YVLXTebiOufHVt2sK64mIMmCn06kttEKZuTaXCN5QAV1cLzl87J9n/GalaT2BU4ghbuKAz+N9AQdO6MPF8BEy67KfMcSdIzaqoVl9m3CaR4y07Vr2cPekyQCWdukO61AC6vVi6r3LkVZOUGIOiGZqr52uA1pSosaGSJktlwJucSX6WIZzFzyrlRack7+d0alxUHqwMIsa4wDP/A+aJDqZn0jXzKYPU72qFcmyUaUUlTjZPTqhT2F2ygq+u1wW5AgRBUTHiIiiNrtl4hIOc7YZm3Tm14bKm2KMJt2opi5gVqnEHCmQueHK5xHhi6OL3IpFr7ZIcUZSrLry8duPFqp6MxAzaFd8e5VmsiKFvOFcoaKZCb5tcE5G1JPw0dqVrG7uWxfYid5pMcXcZTcPqH9tu8t+zQhyFAraL2MEnW0IAQDOpwXK/trqHeUU+5sGFh967ipxTf3669QCem3seTIrc+EkWWNq9bEMrLjSHLoKZQeBxMjcDzscm5vk3nYzjgXGmmLNlpzZpvTDChGC6RtehHgUOe9Nss94BjE6NSqBWuwOadl4hPSEA4yllvy11DQYPmmh8CApl0LHSN1xKaW0ZJ/wQFKBgrBgqGk18YRA4OqfK9btEDv5vcr9SUlYYCDRt4H+GPuQVdpetU9wB53b9LDOAinqpXrFe81eDp6AfqgPjIdwYzHpsH+mpl3gNGC2MRuEZs51jk40GRWoryEIloJBcq/YqJC+CoyXEualASwQtpwEtXbYIm00VHZ855OP5iB5jsRXeVQ6coXPNsXiKzEOiv38hFBzGF3bUgwLlQq+AtG8b0ocR6Lta1vYAQoxTWvMYqg384MPVpenkkM0ghKXyhWG7+fWsxQy/3qULPwWw3jZX9zuWr+F5LZvtSAIgYfWRJqkQ77ohp3I/0CRBc65FdaTC+0TNl1jHWiNqc43rWz9e/jq1nhvNFmmYbaTxh7OTuMqbUYNkK+imcOSNdzwh30zpchydKaDli0WJWmxmOOJOjIIfsmYpytOXmBLPL5Xrw3ru13zkkfHCnx0LBXGuHhoSJKmOqEjmmQIc7msX0Go2JFItyfTLMyw9crwUQZe1HoSudaO8qntrdneZ5OYNlUikXQjGWcbyvdTZIbZvTc76rdco5M6mglLI5HhoGGyjxKPdxdDvrcwQGvPzcZdPr67QF/Mji15CD5SclPS47ytT3jz5ruE3ouO2pKm2v3UA1VX1yiXIfjeYWPjh8NAVahrX84M1zR4DRvyF72Az6vplho8InMJCdGUANpher9nnJF3amVvW213yxrXkBi6fC5KbM7ysU0K3EtwWrKc3WoYJmgNAO/jIkSyRz2kaoSwB9UCyVH018lFjV3D3wHSnTGpE7rghj73l39Wu6z8++eksUnAZg/1YinZof44y6pUIps9CSW3k9flmsvIM+g7TiHn4bVsHCv8S1ER+MLbYiGTFWMC4NWuISaON15IdbrvHl4qiPof2yL+c5QMunh8NFD9LDMQN2ggY1LUqxkNITcUs1b7gYaqDbfbgVyHPhKAPexbkpHhqBNPyg8QLiMKhpwEc9Qdgd+FhsAxKu9oHy1wTXerzWjYzIQqWEY9eRaCx7Gyw+mWAygAbPf60jgU8ADJK1nU1DxfOGEM61lNXPXOv7zjn7A3cV7CFhQG1jHgIQCPDfRJ1r3WZJHtof9egtjne++2s9+de1q6Ldf8tznguNDrKvXHPuH4J1d8/pmOgdZtrS5ffWbxL2IfU7yo0uIIeofuhluGj4VLl8ZcccST0LO9d7P+Ddpz8pXoE5ZzM2RxrZV39Hm9a53RQ4eI0Y59Ea3dBPePMLzkXvtqv8kIUo7xpxzV0+KEqQdd5lvQMS1nl4vsFsqsKs/D5HXrtjuTzXbH151bwYy9BPAXbDmV2TJXltevuo5P24tO7T6Ptr856JQL6x8XpsHqipLWK163YP8FAkD9oHc+i1YIReQd/dDJfPJh/W1flhZxapC5DEsLbJ73POl6vk9p0EyL9WNjUb3qedksD8mXxMjRY1RmTHRPC+DIqxAbLp0zjmTEQCOK53dAqlQWh+ZHvZb3YYHqo8vQPtp6/1ZHwOAufzGM02Sb/58QwtgIHFltWr1/2bCimzjkl5N1LL8e9jQ/0VydeixjLcHxoNpE99nb2hFu/LaeG3+jyQpD0B8n5pf+6HMt52vyT2phF+ilgIOr5D+8MA7R8pRg6Z/TQDZf8OcPXH/m4GJge82JpqBVWrG3k9TdYMDpwfAHLAyb+u/K84+X8BDqAuTYdsdUZaN4ZzhUqlw9lXe2exx7ukOXRYeX9mI5+UNYSnVCfgSYpZe104CYT+4rIRenkr55tuplND5leLbSYMa8ZxzybITgSArJOv2Jus36iutVxo01ht6XbIuuJBEkDvhl3cUi2cHtbfhQJc3wbn4XWOp5YUTcvBZw4xiovYl5NxJwudfjpHiZ30EZmBlXgZWZgE30DTx8LMTEyd+2Zi4XaqbuPVfLbZhHQinuNzaNz+e8vW3cDHsnV9R3EcNV4vPO+dfd8Pgi/OotaHk2qf6SuvVZY3Vi/oGzYpYfF3fuGiKG50/4bSjgE//cp1jXUN8AJOjCXYG5tlij/ON3z9/RlmmGIwtshJ+UgzBy8HPfvscHJ68F4Hia0XKiivv/6yYbPO+FkJ+CP9Z+Ftwop7s+rX0aHBOI9eFwCq0HuzVyNGtd/rSnuwAmW/JaugbX2mA3Few5jY67QSszIv0g6DUopro+NsMkQdb9tftLVh3WaePufrTzYHi/TWH2tyxO3ZaVGMdqsLpvaP0PvDjeTlCRmoPpO22Zdr0Y61LB+Cj+pHvNQoOp86cQlf6by60WaSNDjQQDpwEp9pODV0JmZ9K+fYbaBRyefmM7pleY718ieAQ1ek36qMrDRqrUrDz+oGFKdLbD7Txgfnreyb2tL1oVlqcO0rSL1rapuvAOuOHvf+dbtdInup0ko132tOicZ6ilQJrYrFgjW3ksihgtQ8eP7459qL39+Sbwy+6l3rB6PxVheTR0bj3ruT0sckmRQsySZPKTqppxUa3J2W5A88KBkCbx/A3uboFW/U1G3qWpAeSKhhKyigjYyls3RGy62zEbMStpU5N/ZXPc9uOfsitOW8pXXCQXFDoeG0JZAmaxOPWQbidwStt0bUcRkueSnPtx2JgHeg0IZxYB1ahDcAqFP7aeda6Yc/3vRvLt/O5pjOZKtXpzAxT/u3ljd7W7zc3AKs8bnRWvgtP+ffwfODhZXJ0hO/6fmoGdz0E5quO1zp2YH27fPq2Unc6Uh+Of9e0sZNz/nPHnzsMsH5dvn0b8V2TG9d2rONs/nUPnfnNNsuzJukHnrs2B7vqQsyeIqefz8KRAFlSs1+O9+tnsYdQcZkR6f+3uiPSE3iHUC9jN/zobk0BzthXm5UnjrDCWd+GvIxgxaQtWysBK9sPIX0d9D6cQugILiIEFxM7DxIC379SJzob1OhDRt/thwv0EUnEdKt5wtkywTM4Wj46hBY3Q5AGXbw5OE7AMw/xNFnQW8jDl2mQvb5EuxyHyq1rIdboSF5uJIlSHI7GuU1DQwXtJWcOpUBbdtWRU/prP5zrcQiaR9NFJw7wG4gYNfL4dLIL14ll3+FvIw1C4GAxscTcvWDDQzzD97d6ptaIG99DY9ATtkqSZpoFAkF7NnEgXaBmnuplCxD5gSQC9vR+D0ZF1SWsXLVKrWh3yfSGBFDlZQMwPvtUjLGG9vQ4fpGsD6bRYak1LD7fQESrkZmoiCwhwOtXUrdfjdhH7Dfu4kilyRIa/MHJneJqLIpz0GXmNLAyz+11PDA5TYspaHpiLLc4V19m+aTZNCRqkqKXS+WohaYCca4xF31ZrcYsNYnpngkdyXPARt6Iv7Pnk1at5fQx7eZw+9RDbQ1RkJglbtjpsIVwDBqS7hktbZWjlqSFqCutMik0wwsbFY6/cirMFZciL6O1hwLYTuPT5jLL8/+UWzw1Ggu0GGSal+NeNbAyn55x8UZzqrDkIaFRjFlSq9GXjbm54qYC1IK8FL3cLAWynSNftWo2TddVWH10tIc9HdNUQ396HM/vsaRHFyKn6nkCQWs23vy7T/exhHBEvEnPHPKgV2gvYkAon9vX0bf1OvfnrLTq9iQqjO4CDe99ci+IjmdQ74HsefVcQlnu/vYMLZpYHpWtn9Y2vt9+CJlaBZfon2oqfj5zRPnfM6NRUoVGpR/YPnumoq364mtmU77QyMGcVpWh54zCXHGzBH1BKsOcac4G1BMDMl0L52p9IvquVGuLpzjchZabFy5V69tLKVpUsg4McOe4wO4J98JpIErubicXBJh8SRgWHaDb3/m++ebd5h2GBThgZZ4DVmanUxKtZscwcA00P5FnL74z4E9HUWS2oi4Wq+o65qp0d6aLlF1J7KxBOney5qe5z8r63DS8JCGmAPNy7v8fWZyZVBKHKmOvAlvGnQGOHig02WVudS5O937aGqJn6rSWX2DPUHG7DHWlsAi13C4vdvSnDk4MA2twetYlkHqafO0lig71qVHI6pE5sqPr15HvHR8hl9nT3tee+sRt+wD39LSDd9iAkO+S9cOFdb8HUDRwjJxwBXjslJ2Hy2qdM6eCd6bXMfmljTmoGAqBtmN+X7f/0S4FL79jgVYmG0Lyy91JIyH54iwJvy4dncDGZblN7O32b++SZRf23EwFc/TKwrnrvCrNTY7sVLlac1oc4Nime+5anyJ//rqobmx8TN7YkF/c215bPZWOzcNC5fDc+haFtKNOTAGBfG4fvG/cbi4IH4fEbMfQA7rn0Xb+fwz3NAD3rZG72Kx3qEeajeozBy5wTzu5j+tf1urzRjlnysPWquLwBEU8sibPNJcV/Vec1/EAY4O2QhBaFN/Co4j3HDgg3pNJiW8pCrYAH3bNcW982xUohNz3zIR7ZkLuBwi/7bqxa44Lel0h3JX6z3fnJP7jPejj1RP/r6dI9/lq7ee7hXH/ePXv8elL+Mczr/7zFcxVeLbtT1dCyODecZeUYGdm8ETIsCuu7U+QdLkGNAzxzY3PD9NJ7SEIbigC3R5Fb37+cESimyt9PPoXhEpoCoZlBsNQTYepY38BY+eB4wEFbAcMfhfZh7Nrjg8skht57/8m+77ruvcFK98IbkllFDkMtRVo9Hsjg7ZkjmNag5y9tpSOA3td6yqwMq9aze3XgqFX8pI1RVnJ1VeyoSpTlbApHiOj0TBlTTBhFYgrrU/zP1jA9ncJ2tr1oqH8x35V2Q9369UM9REmQ7VtT3rt47cPJ5lYtTru57VbmxXI1TnV/9vqOwbzjFmYMSEXdqGxXCpqFCPP5GYnnmoUA8YLYKNPBzb68Ssdt+8DrMwKeDkeGmtQzwTHX807ZdDWpN21Km9/6M5aqHn3URW44LjEB4EGjAFSvKe/JQAFZYfYBIEFz+WUZU3CowflLSUX0xWmbdLp3TvEdZX5mRWEI9WbKC6Tm+CRaYzoTE+GnYds3PbgggMJk4d06jp9mN9A174uAP/4GqLtIqQNkuUP74BCOjB+M9iBS/y4Yj+Yak1fZLW2UmS9plMlSX2zjlTj+vGYe1jprOvl/pRvvmUnzHV+tvgOAeicTV/OVjB+/knN/PLC2NhXFyqYP/2kKq1mTWMF3c1k+6UGskP37wWkYwt5y/JFsn0GBD9t9NDiP3z9OLn29xHfgb6G79xp7IL6aBWKlFxcGUdhqpEINeNinfLW40Kd7n6hfLGUeqSnfa3WiEpzOPMXUDl3fMipO7e5dNUKzRA2RjG5bTB6KZFKUfWiipRjytS6hORiIg5WUBZHJdRFMQQW2EuW8tpzz3NqjbeL8i+INXVnin0duI76pehjXFXtyqeFoOzg8eDrtrLviN4yC4eSce3BDIDdfwFYmQHdufaRsOL85uLLVknEXHUMPq2JTj7K5dG721K4qOZ95865pn7YNi6NOG/71BhGFE4na/XoC5LWqnfvqoDOOWMe0TOYvv3hDVxYi/mORFt5I6fy3Hb5gjvPWC0vOalL/WeWV1nEajhIrFqv1LxtM1Z89EHfbUprZdO7MtIpnc2paUg5JJUTpkhiUbtaOeB2iMDH4Z/xq+dCmL6g3Ln7M3HVopKLH6rNpznaSnZr5xUlpecfCHW1D4SK8yWKqnnRbluKY+0a4hBXWbP4mfjYyZxWGElOptM17VgOtx1L19DJRHk7LGeZrExAF+PxiAJVHJWmikMU4PHI4ooEkOasvZFTObtdccUt21irKBnVsf6d46mLWIYwUtVTjeZtq7Hyk4/0PRbp4BKy+0S608ObuPBm8x1JwTKy9HAqJ1wBT6F1tnA4aS0sehcnndJpTAXdftNZyfzppwrmF+qXF1SmkrHeHTeRtiw1kraYzVRZufgp5YEPQ71DLr/6zlWTqstUZfIVnwmDj6ZxOw/kd2sAV671PuLFoSK6ArzpJ/I796dxg4/mflKWKVBlKrsCqUivDKinlluqzTh3cfYieKBTdgVQEV6cI96aDHlVd/7RA8QnVfiZgsdXBX78z7HsjFKtJ9Qrg4rsClRmqkCmQPFJbl63Akf3+0RiZ8HFWQAQzkefSkouy7LJzU1KVtLrkdHf9xMhGG46Fco8cJASBY0QpBZEI0I/hr2AjJF5mh7sMXYOu/sks1A6nJLaxkZGyFhZfSGv0xE4OSoZVVgZT2OPYqvr8SvlM52IpZSCe3FY0ksiuPcWXPv5Plj/OfVrKIkUDdtDoUQU7YHVvC0+e1SwlpqjW9wCERFx+ekJNKtbGtw7c1KQwUl72apUNIxfEI2MlYRhcq1oy5srFWfWOIqaZb7oXIlSdIoX8xsJ65fL3pL6gP8Guvu3GNyP5TCRITw6oWCCwmiEis3drKoVZ2dVrwhEZ0fD9hIxfnks3E6E6qCuXeAFdxTOl+FwqjOEfik9FtehgzgVHmSeO6N5XrMGMt1YFwvCIrZW5cfiiujE/jM4lRyXJBh5V7emfgI+uAEbZEvvR8B6R0cvULmdecvOyxe0+sKD/PmtXFKS8V2q8quvylJeP1VSv/iGqH7yMKru8Ucir55812fI8waJHKL04SQ32w5u5RXrztemvW/Wi9cXVGW8KtSYPWPgaBycDUsm5ng9GlXTvhif/z89O701b/FWlvfFy1nea9d3CxYoPV5lAXdCjea2wJPuJ7BZCmJUv6I8Vq+ISqXJGPFNDE74cFE2uOUkMHc7ocyRH467H+O4H4vbfnxGn47Q1tF97t1pbt3gg7N6I3NkKv1jnQ6ajUxucNUVz7mjk5wuz/lkdKqUqobLr2pK1rXVrMFVdXnZdbV8vVpLWlzX+P7slFpx64Gywuak3A4vVd67h65Sr5x7SsffNM0q7j0A+9Du3tZ/mODuwK7o88CuY+9hwUrH5KlJ+64P45PjYOu7t6XhHz0ytZgAzGJEAKoSVUA3StzOamcy21lsZluIsthtzCibxWxfHthbHi+PakyN6kXDox4e7+hYW+4addV1fdY5lyJ33a3YBYIcgq5ytxT80qrcUNs/bNjIAHLrynr40BjM2GhiN72+/oCR7snu/Ksg2Ww7H3L1IUPkmU/59VIOPtw3GUzQ6vP+hABKzs3Jm1FHB28MAsz5E9OT0wA2JI2shcpK2bCYyCq5TBbwhBwcgf6pySkzPZpIjI4iEqKjCYQoSBOjfl3IBCgQMTehG+XgAXLi7ESsBdFfmPsCf53sB+MXN1XQjunhOJwynoIm/hqUgGanntykoh/TwXGEChgBzv0kKAZPBVwQfS7W6fg+5Glgcg2Bp44CwUNKn+2X39Ktz332i9ObX8Blo0Mcdyq40qP95mC0Cc/yyi1xHBvSmpUMsyMEqP/sz8QqfiQaWu7FND8i18t+4TNTZU1pxBPMzZgtvJ1W/CgfqoYwyS43pw0OppnLyweeeLnlSg3sMLukSXVLobilUhk7p1LeFswF/stMzr81W/594L7NjxgQhYuJhdIoIYHX2IMehWFhJW6Fa+D/43LZteuysrzTrJLurbyzjsl1mQxsGRpTlozFKOYJxDLkXEfcWQdefq+JlVd2XS67Nl4/6KpYX1e4Dg4ODF71BnWjgZmKZ+mjo+nPKiqMjV2vQi4QcDhy4eud2SP6UX3Wlzsj3DPdpe5Z7u1fZH1hcY0xxgBeiPiMHnZ6DycjvbcnLYPTnZbW+6TTerrfJcci6eHh9EhIc+gRchgR1YFE6gbCCAfFeqYhhlJMyxQKTuyn25Jts+2/8tqMTMWnpAqRsUNBPvgSTlsI4XCZuzgBUZx2wCSzq95Ew+pwuZAoRph4gb49w/4ayU4ETYjhxYFv6ysXJcK16lrh1cX8ysqF/NyrtdUXZiJ1C11MgtSQyZG1+WQ6baVrKeSIdfUAWZ+7D7tv/rkyiBngzwgKQPoHIYDTL8++G3TvrbI+IU2mFre0a50G+4hMFgbDSQdJzP3CzYzBV8riJ/X6YvMr1eDCln9TYfH3QBBxoGQ4ObvRlTcU4p6WJy7MKKaQo8OTMZE7PEZ/5QkgpXHx0VIBHmUZEABFFJNb7p00jZ4bDu3qDvblpQuFPBEz+XA4DhsZ4DGWFMQVRhTHJMYUCjFJVkG9cUSv1AhuVsMMbqvxNdsdSYWHeKOu3PYa/Ym+O56WFOyFfvc38Ik6vX+m1/ZlVc/DCmCTU1NBd/j1z0+8ozISUBhWQpSp5KKhrXuuLs/XGX4YL0inxvYU2lzYBTxHy7MHj3DzNqHO7hRFJJOy4w+Fi+M5hAoCMScu7AATikRnR3mOA1SaqCeWm9UWR85NQgrSaPbWYofiLCKKkz8SB9pgVubJJPCfa1Bv27PffO/uyNPu7pFnd+4OrffoCbjW+gZcO4GA6zAYcC1gd87+/cMn7VY7h0bUQCxxCpoawzh4CBd5KOLX8OMFA2qZ6lhtRqAPhV2WkimS26PrQYstvfYgKQU3mkfxCYshQw9CMEgiQ8OIRiZA9teF70sNjOiLo6ZXRxKYJYmx/Gg0NuONPdOOJiTlnKoFaepqxAHRKuJ2xpaH+n/Uo6Gk7v2gxp5YHoXK2Hc8HBm6L5aMj09gMhDb5oqbfY4ob9ajdl20eY3eGUhQoJBKIomg0mFAi+3BxN05lMT+6i72alc6m6CMJQnsYYOfJIVH4jPV6i0BcdEwtAyBKiMrRk8aaxIZzMQ4MhMWBAs4jRalZAFNSt+Wlm3QJtYgqLblNMYQhPDwvXT0kct2AwH8uERMljqaSqmEYrIS4hE5GrvuwCOh9Ag4SdgYk6ZG4uIhUCoyPpGChEKS41EiCDImIiIJGg2FQSMi4DFAYUdUxhLz7JOGnsIiIRGE6H1FdHtkbmwCuhSJKifRSTWNyWyLqtUefCK8v66HvXY0nXl0f1LoXoQfksFDwmgpCfFEJiBog6uC6c+Ue5WgZ70usA7oHmsdtVstq/hVUNeRGnQLubAP3pGox+8pRXga401h+R3YUtIvIJYUWRQ3scsAK8Xtgek79iUhFvbeYpUSfsGVga/tDnQdQCVA4I2+Pqa+vrNHbajxSII9s4mZNTR4A41EQxhqaFxeFS3JMMErs4p+a9QQ4vMQJHisiISHieAkREJeEuId6eNbTYPtnbhNGKKN7eu6jbZ31gKBq/yH1YiMZ+KhT9dbQltAsM43EO3+Huu8q9pTY8EmlVL2Jnm0JXt4HMNVWGTQikGK0X1/IpOZH/vVFFXnRa300LbSbEOIiYSE2tIcuxslnOQcGocmMD8mK6wbAiaoQlo4vGrdznE/8t7dHVIATHucK1618vHy8TnmeXKshgJMNVRuJ5cDFxCYNxRwaDk0TrJkpZ7mqP1QYiKhXelWQ2NQTV51UYTCFz4soxEoYIBQF6Uq8Zva4Q6sp3iKuyEAWWUtK5aOl9esZWt7RrWlKeQ9GBtDV3NNeQ8PlL4/UX18fKLt7a2bOuZQwMmx8k2JctCPRSfrDs8f62rCovC1oumXTR7g+LDyQFCNVyGCdzghXT4E7lbhTPCVesEpWMqHdmJEmQHKyLn2Hl6fw2gMjEaPzf5F1Xk12X8bdE0nWqiLySW0SCv/+2YyPDPlcDHg+skJ795PWpNbnfO30hFCUMijb6U1lIBIK9exKFQ4IGQb8kWhnt03Bk6lrpHJqPCIZGQkhDoR4eWIg+2lFufYX9mf+mhvN/v7aeDsMoYtQ6CL0c6UhjQ2WcFAKhcrnMrD1odAsNjDQPgvPsnAhf+DIcgwetXFqDAmkPZAbfGToG9YpIieDgw8FU3z+jQzLCXLMo1AZRVSy8GhTy+1hLY86DY631lzBpGb/wT6MqExU7235/6ucqoa7pfIXHW+Y3QW4qX5Wk/6loNgnXULuBFSftjpMs5uVhnJxai8VAFPXiZ8ptCovFhOPRg8d9i4l6tV9EQu4rskzl2bvCf+6e8+hO9rmVuXLF93kFu7oxZh+2ubFsL+n5xngwuvrvb7J2NED+h/cK69aJVGqrU4mz/Iv8b+V5bvi9wFAU5pxSVX3OIiN2fDTbVwbyNPf/VHUNd4ate/WY3Tnm7/d9BDf6cB3bpmC4Ruml4i8KAYwq+BQQ8XeGgaJhCjLmRH4/m7XivjzR3CvZ6wloQ0iqYGDcWmr9yo4i7uT6pbyMV6xk0htSZxtAvoDlrs5kB5dOTVyykevJzn5kNxEzPuPRK45ZjFmmOu6cea0WUp7nmhWdwXxc3fXqPEy4ZMfIkq8V0NB+W3TDCsfoOuF9NcvAUEKgAnEFBriasuDYQrwAcgxYObxgjubRVrsudvzvBwhaD8szQ0NWh0GPbVz180M/2Dsb7rxD+mi2HSqbAvvFlgE8Y/EmmjVEVCJdFElSxOA9FqMWi1eDMMrKXiFgOsScjfHCgPlr/zTz/MjwxsNtDJF3frvl57GwWGmwPJunnM8+Cm8d1oK7Dh+CWpqyEasnpTl8hakaxx2zQ3ws6BqyKbGHVKhnrZGC6/i/cgV3LsFy9A02v7x572l59XjqIPN1Nyf9ZG82So9/lldlrujjyt6ZwX3TTqZM8Y7EO+HijKQzeVKIVdWByLZ80uUjwdLnrhpmJNL/VM63e9raKaK+xKCEFxp+V5sh+Ij/vd2XtUNVZJ9a2J8nUtOj1Das0/FRS3XPp087HXO4pN3HuE1jXHnJ5B/z+s7jLE3aFgoHau0vrlzieQu1A/Byp1MjeB0/trihhJjlWXgwsDJef3h535+e7Iiw25ZS9oNnwTatYY3qVXk/3mDG+HLa/Qg2Dlxb9euKnErV4NbkPZR9RVrPM47i8SLO/yyyFE2VM8mXJnAPbHVjHUQh75w25u+cNuHvEpBra6qzA+m31sWzpV1W7LC0JS/l1IMcD0OjW/jqotXe3gFkVo7AxeP6JWPZiB9yttCco0V2v3jDnqPULR1dH+Sux+iz+tJsU0bxrN88E0q7JBiJVuwiPvzh4pg+/gLoNzr8rF2GabaeuezBhxOBNdx81Z5s4Oc45F5prL49Kj8X+GwmTNP/EuLE5fjpHNkf2Laxe1dEZfwiXW7pHZlDuDxwOv50GPG4L/HSxwJ9xENofCItr41gw6RVz2ePfVGsxSr4+c9svisn/x9H9GBuTYgEzJ+nIqtwLcS6XvQJV2tFWyY6xKP0Ytw+S2QTKlWLK+VWC2awPCbIoYBCIIwZgq0z7b4HTgj8J9hDVgoUTWqUQ9fx67lk31uCwGMJZUS5JiKZamTKU9vSO2JLTDB1g5W9lVORX9aT+rwF2HQbInzjs0GbGVAvphr/g7L1ZhbhC+QGu2C+tuPMMHrBvW1TURUroU1Y08C5BxUEwm6fJFpxn6VA7bIJnyeZIlX7xXFoyvtXKrsL2msn1Wafutyg5YtR20GvtLa7eyr3woXcSV/lGxnwFWpdq48V774eTbXz1xVEczWnppQUPffOBOC1izxlbRcJ8HPOQRj3nCU57xnDZe5Imglz47Ri+23QejA0he17bb/9902x+RR9OPffa87//H3/n/+0OXV/9Rdiz9mOa3w//KH/Lr4sfwQB0/j+Hzf5b/07N8+x3Uf4DbnuZjCsDHnBLwILCeeVIUSXT/NEp/hTHyWSTfUS+0zD3u6a0txnRjapR5e6j8nrfy1mfIx2uWsgj9ajCfrqtTUoQxkfMG+Y5avVeIoiFdo8CMCCdgoqe0o14ZL4GWlV953sAFvcvrjJujjIPnwEjsIadVxz//bqdgCSfw9QOld1SdUfZdV5D2xu+k8dSw9f7JGL039+yTCJMaqRfodNZc9acgiJDrfUA/J40IYx7an0jamDcIA/IdRXdgRAhHSulb7b9aAb7ISs9ni0sjP/3FXrZLR302lj+rF0khicKYbc6i+2dDDGYBMEbjygWvWPvpW4PFUrQwBOTTux51lcUjQGxoKVjkRkFMsIdmngfzs00zwpPsPrTI83lr30VABIN5CWYCetd9LVW09bt7r0WFnLRS3VFTs8xW3jHz4ExAPl+JYSVgqc4F7Ra8P9ySa71XoL0BC37FhePMCjkB1VCv1XpQwEk+pckEvX+3HE6C8YTdYvg9GLda/YcW9KzZCOiQjyplPAI++tdh3Beaoc9ej8w7KtVuCRtRNrnH50tMiriqCsynnRpTrUBIjT+SRJcMZW1deWp/TQZYyVni6bvV6gexAfmO0lfDp3ELEu133nkzZdNoPQdu1LMJ8Rk1j9ZKnMq1THXHTM0oZfw6yuowns5ECc52HzzlOyo6ExjezShdeUfTMRY9OYBq52m+k61XPzmtju7snzVjLMvzriJfuKcguRAE9v+1Xrq4YWMI6iSAiHwvMBB2exFrXT/65GIjlirA9vdgy3cU2TW/COa71meKjp9KeIZj33vN6rkMKOal5qcy+CCU8GJrOOQvJdyldXSX8oynsqnIJ1RxXHze4hddPnz563H8HZAsZPUCSSA3tIPh411kJIBvbSjQwwfjp/TfcNII2drGHVBn081XI+eVNLM1TEg8MQ8aORdtMmqxSzlDXU07E8aJrko+4d74U5dkYr5A4IazFNd2urYDMknenY0zdKewrKDBkDj0QQ2HM93UIhs6Yz5wdRQcyQajQwYzaa45PsZO8yuN2k7MH4rH/lm0J7pheK6a656dVcP4jC0BtkMHSGED2IHS/g7worX8bD/Bdg3l6Nzemy9g6wPgb/0BfsOuOiFaZ/m6m81KHnxHdU6/SzdHuNusrIHuiZ+XdlCGspVMIyvP+D69TYh29ITKbiXv5pZ1V8sjvunGi6Vc7AkTIkDd/VF3Vsyygs+w94zoqOGIp5urhueOc0PrKDgVG0xrBlMx17T6SKf5ldvajuIfasb+eXBPNHucWFfXczOGyVUzlyux2sRjM1hBUcq660vH8TUt2gvLKLh3aQUuYfH+7Mx4J2MGjcpLIp2/jdKjsm3KR+f53daR2pmXwg8Q3vEMsL9umeFGEEsjymvXD/3aRYpAHyfIcBltNc8C4rcFeeeT2rGtNofV78EOHP+t+5zWwQXdKyq/Y/qT66+I9VZ6rKER/Ri5pdzqyYUZ4c/LUxUkehWBHXquBNAPSkBMWfB8JhjWy1pU2p+NMoSHR6xnG4L1+j81CAiPtSngr9+Z8WIj7t9ZFAsAf/LndmVZde9/8kWcP8TaePpdFYjDfwB1bvz7Rvm/yDrg49eQsTP8w86zwfqk3L9Erl47bT/qyHPyyTepH1nrEZrfbf9BPv0n6vYRpBz1qKUXV4PjI6B/ioT7LF3txW4edWTpi1wxHtbD5knqTS4/Yb/j9qTGkAVB3Yz4kU4JteyJ/gt1cA/r6MBOO5XP45/IfToL5M/w0oiMXKl2W59RRTpaKX32AE7d1/iN4Xpn5dTFVJ2G/CATqZTjODyytRrOoDe9Qtuw0erkrjOWiva5431hnJN1WYDqYa2FR79vZb15OmjL1/8rVx9YOS1BJXOz1hEJd/od9RjI0J2mtQzA2ftncbqW51N75BXE/kxgYO2xYvoaiuW2m9o12crrx3Z0VgtZrP8kbib3zQP5TLJkfVC2fpS190lfK2Wv38hXfcvWz+S1sMPsNryGi1AEGVAPxXDKKoH+41irZCxh7jEMyfHQ0p5kTNbCHdZsKhqhAR6AetJVzebFJw8E5gg3hh3gPay7WjmIKndYO4XG4sfXnsES6IhtmCLK93jDtZCcR2lvJ9k3pY+PuIy/WRNHl+qXdB5NuQA4A/NjAb2A3ESlxIRa57kp26qMcaX33e63xc/G6CDJjqp8fEWkIS4+F6azWGIha7LYWMjGOwqfoQOudm2F28+LmvZNq33WBNuPC10WkLJDXN1hYi+K2vWx0DlWzhxu8nxtdseKmBWWLLPE1ZR8FFk+G0qe7a2o4Ze8bTN77DZj/Gj53Aqx01fU+It0OsDscVPwtILZtTA9ZOzKpXOXbX1tq2N+PZH9fI/3d3jcMuOR3/RyhNjrlc5RWC0npGgtcNlmi1/20DFbPRjLOA1b5cAyIMCv3eOf9IV8wMDRnUDvAXD6yjRPnUvzghQKjjIgA3shqNRa/BzAz0jqUfdlrfvO0v2a4cpODaAbAR8CXgfcA3gN8EXAr63jXNaistzWqnoB+JM2wfrh+p0zbClWf8zZLLR8kcCvzVXcIBg7ROKIxIA+ik1nrq3q2yqTDeBzC5XZiJN4NsFPOJviqmM2zVTTbAZP+ZyZSenADwcUEIF3a5ztzYTFbB8sIu6/lzh8Ujvp4FmSrLVUommklkqwynJjuUsmNeegJ2aegLti89YoFyd8bF1lhZWktZTJ1vM1JpM0xkkUXx4kkoZNT7n+SZdklmKFafbxOClGCxXnMVWCpbQFMqy3ytvET1yQrn0ca7wVTulx82RNJ16W5zLeidpG/L53DDXPrPGr40e/r97taZOXepQhZelBzI2GMj1/Muwl7j0XMuR5O8lqcZZrDpOkhqol+XaymEPYDpErT2bLuFgelzZGs85cX73XYhXxnCNiud7lq+X5rrEDiI1ljjqi2b+W3xjEgJK3wbZ+N9iJ9Yt9bHDQIk4TTRzk3odkFhw53YnEGMU/w9ntDN1x062M7kAyazSXe5AYY+5LYrg+5owVf3OSL7PiZoVj/nDfXfeSZJ3NPUrG7XPAJxw3LmfuPG5QYnjyP8qrsbw98sBDK4u4UclJPo03fPk/qon5G98kfj46HzxEyFCh/VZwWFOsskZCyVaHCy/RWpURIgqMpEuQJEOCI5tqvXWSpUSJGi26aabHiGlGKaWa6TFZLKmk0u4pMGwW1rllmvNfMRgh/CcyV3qChOUKlSnLfnIZNpSXKHH5/jEviTDzK6jQgoqS2im84kpE2JQsuY0Usu9qYizkgyL5PlHvscg5n+5aYormP9xnH+jYosjW9BkwZETE+PvxE2Zt/38dCiMfa9P+S6W1Tsd0fZX+2b2/a1o7aYzpp03JZH3oD5hWL7jo0m+YfvHYaAdIVOHimcBfjCWsO2fRFUuWrVjFdJHQYu9MJFDvhO2tdaWrXXPKaRwMaiddd63r3aBH32Hm/cvCVQ0a/e0QS1bE+L7odsaflv53dunNO6z8ZXanu6oFmES3e3LtkmezvVSZu2+HbT3pYY9caKMnPe1Zz2vrRS97VfvdVfC/5P2fu9PWU2999TfQ1wb16TeA5XeT7fbEU8+88LJvfe9HP/uFaqi/FyDJiqrphmnZjuv5eIKmlraOrp4+BBNJITcoVBqdwWSxOVwegvIFQpFYghlQwl4GPJ3fzieUy5a0Ie7n2mhJTmXtSE92TsafjyUs4dOERxNTsF0tmC8POy1s7qk4TZYSJriQvxFhkW0PiyVavGXc1mv49jAjGymsC2aZhB9jfuRtKWXWdhsl2pV8glIrsfeK4MfDgvj0sPe3xWKXHqb3TfLk3cfhqL/WwslKSsY9XMpYvXQAC0Go3AlWafj2cOQsndjjhgg39zZ9LQVSfDe7Wdvl4wGrX6s1QdArCGUUHsrOJi4IuVHDM+fCWNuijyGdJTFW7GEiRENAtnWGCMehbSiopa0QGccV+DVV9YeDMNaVJB2dSYgqxWoQcEs+yP6SdX4AFU17++ktzkAGijDNsaqyFOHNqVAd3yAgaXCQCkaR54yCvFQQ9hPnpNJ8liRWhAMmU1Z2aRfKrvZK6lg2hEMz9DGoO1gIoRoMNIb9famRFL0L3vBjBTxdiiYrDRm+a2tYU3QFV0gd/+V1IvU/uGqsZLg3rGQnxD+18BNMhuTZlVyV+fjhfMoryFu3ho5LP3jc2uflY1/K27XKINDxLVFTGpeAjQiECLvrif3y8cuNPuKlboyUXdFLVJuzbmKuD1hccD9Rh/PA6vK1zKsvm0bhWiHbFF1gNpyc3/xWNgkuWyudT0T0nMPsn+RW8To66TcxdblaNE/4N5H7eqWn8+1Ykb6bM/NYXgVX+kEmlCY3aUXGrMpO/uvEtL2Kl1B00idTXhdB15nOicYDhdEx6DwRMnzVWlkHmATGklh7dFBdQ2s79V7fpTV1+9U1tIt0qVx0RlzQeCF4o13F0cNUeo/s332B8+KauFtKee8tsgaulLSU0yKjpZxWK1ouaE1N6xparego+N3zV3VAxBRP25X783LHFXKWc/AsG93y/FbwAzkEUADPslEOBRxBJAfAlQqufEkOoJxQAGKoB+CB9oXegTRyMU8gApYOAIXWpYMsASiAo9BQAABAEABQAAMAAApADAAeAPQOpJEAjYAEscSG0cyy2RgKluc5RnjWndIyhy31uJcwo5EgpZhKphBm2WV6ckPIHMAyq5KodfKdUlLryJR2dO4LeSNmZGN4kGWVe99idvjLTeLyPsRkGVRlkAc/By3qPi9+5U2IizpfahpQ0YCafg4dV08XTV7diJ7MBk69WKVXcDeEZ4q6Co6zp1rdaD0/nh3+u7b2qLE5tBRrSShBP2YrT53309m5XXO6xS4Gzwcbtu4Di6PDfGij1n1i2p8cIhrKPbInIat6DeILA+eFmBs95wPbXgG9npuNOiDMOlf+nsZQ7WdJ559R9o5qd1d5XpFEfsq6l4mOZ5ey8UsZ3vqc//d/XUIz';
const INTER_500_BASE64 = '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';
const INTER_600_BASE64 = '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';
let registered = false;
function registerInterFont() {
    // Guards against redundant work when several <jgroup-bank-id> instances
    // mount on the same page (e.g. a multi-signer flow) - FontFace objects
    // are cheap, but there's no reason to construct/add them more than once.
    if (registered || typeof document === 'undefined' || !('fonts' in document))
        return;
    registered = true;
    const weights = [
        ['400', INTER_400_BASE64],
        ['500', INTER_500_BASE64],
        // Registered for real rather than left to the browser's synthetic
        // bold - font-synthesis fakes a bold weight by distorting the 500,
        // which reads noticeably blurrier/heavier than Inter's actual 600 cut.
        ['600', INTER_600_BASE64],
    ];
    for (const [weight, base64] of weights) {
        const fontFace = new FontFace('Inter', `url(data:font/woff2;base64,${base64})`, {
            weight,
            style: 'normal',
            display: 'swap',
        });
        // This TS lib's FontFaceSet type omits add()/delete() (the WHATWG spec
        // has them; lib.dom.d.ts here just doesn't declare them) - the method
        // exists at runtime in every browser that supports FontFace at all.
        document.fonts.add(fontFace);
    }
}

const htmlLang$1 = "sv";
const locale$1 = "sv-SE";
const cancel$1 = "Avbryt";
const sweJson = {
	htmlLang: htmlLang$1,
	locale: locale$1,
	"lang-name": "SE",
	"lang-name-long": "Svenska",
	"try-again": "Försök igen",
	cancel: cancel$1,
	"start-qr": "Mobilt BankID",
	"start-app": "Öppna BankID",
	"start-qr-another-device": "BankID på annan enhet",
	"qr-code-alt": "QR-kod, skanna med BankID-appen för att identifiera dig",
	"app-in-progress": "Fortsätt i BankID-appen...",
	"hintcode-app-starting": "Försöker starta BankID-appen...",
	"hintcode-qr-outstandingTransaction": "Starta BankID-appen och tryck på QR-ikonen. Skanna sedan QR-koden nedan.",
	"hintcode-qr-started": "Starta BankID-appen och tryck på QR-ikonen. Skanna sedan QR-koden nedan.",
	"hintcode-userSign": "Skriv din säkerhetskod i BankID- appen och välj Identifiera eller Skriv under.",
	"hintcode-unknown": "Något gick fel. Försök igen.",
	"hintcode-userCancel": "Åtgärden avbröts.",
	"hintcode-startFailed": "BankID-appen verkar inte finnas i din dator eller telefon. Installera den och skaffa ett BankID hos din internetbank. Installera appen från din appbutik eller https://install.bankid.com.",
	"hintcode-qr-startFailed": "Skanningen misslyckades. Starta BankID-appen och skanna QR koden. Kontrollera att appen är uppdaterad. Om du inte har appen måste du installera den och skaffa ett BankID hos din internetbank. Installera appen från din appbutik eller https://install.bankid.com.",
	"hintcode-expiredTransaction": "BankID-appen svarar inte. Kontrollera att den är startad och att du har internetanslutning. Om du inte har något giltigt BankID kan du skaffa det hos din bank. Försök sedan igen.",
	"hintcode-certificateErr": "Det BankID du försöker använda är för gammalt eller spärrat. Använd ett annat BankID eller skaffa ett nytt hos din internetbank.",
	"hintcode-alreadyInProgress": "En identifiering eller underskrift för det här personnumret är redan påbörjad. Försök igen.",
	"hintcode-requestTimeout": "Något gick fel. Försök igen.",
	"hintcode-maintenance": "Något gick fel. Försök igen.",
	"hintcode-internalError": "Något gick fel. Försök igen.",
	"hintcode-userMrtd": "Fotografera och läs av din ID-handling med BankID-appen."
};

const htmlLang = "en";
const locale = "en";
const cancel = "Cancel";
const engJson = {
	htmlLang: htmlLang,
	locale: locale,
	"lang-name": "EN",
	"lang-name-long": "English",
	"try-again": "Try again",
	cancel: cancel,
	"start-qr": "Mobile BankID",
	"start-app": "Open BankID",
	"start-qr-another-device": "BankID on another device",
	"qr-code-alt": "QR code, scan it with the BankID app to identify yourself",
	"app-in-progress": "Continue in the BankID app...",
	"hintcode-app-starting": "Trying to start the BankID app...",
	"hintcode-qr-outstandingTransaction": "Start the BankID app and scan the QR code.",
	"hintcode-qr-started": "Start the BankID app and scan the QR code.",
	"hintcode-userSign": "Enter your security code in the BankID app and select Identify or Sign.",
	"hintcode-unknown": "Something went wrong. Please try again.",
	"hintcode-userCancel": "Action cancelled.",
	"hintcode-startFailed": "The BankID app couldn't be found on your computer or mobile device. Please install it and get a BankID from your internet bank. Install the app from your app store or https://install.bankid.com.",
	"hintcode-qr-startFailed": "The scan failed. Start the BankID app and scan the QR code. Check that the BankID app is up to date. If you don't have the BankID app, you need to install it and get a BankID from your internet bank. Install the app from your app store or https://install.bankid.com.",
	"hintcode-expiredTransaction": "The BankID app is not responding. Please check that the program is started and that you have internet access. If you don't have a valid BankID you can get one from your bank. Try again.",
	"hintcode-certificateErr": "The BankID you are trying to use is revoked or too old. Please use a different BankID or get a new one from your internet bank.",
	"hintcode-alreadyInProgress": "An identification or signing for this personal number is already started. Please try again.",
	"hintcode-requestTimeout": "Something went wrong. Please try again.",
	"hintcode-maintenance": "Something went wrong. Please try again.",
	"hintcode-internalError": "Something went wrong. Please try again.",
	"hintcode-userMrtd": "Process your machine-readable travel document using the BankID app."
};

const translationSets = [sweJson, engJson];
// `locale` is always an explicit, caller-provided value (the component's
// own `language` prop, typed and defaulted to 'sv') - it must win outright.
// A prior version of this also matched against navigator.language as a
// fallback, but since that check ran unconditionally alongside the direct
// match rather than only when no explicit locale was available, it could
// silently override an explicitly-requested language whenever the
// visitor's browser locale happened to match a *different* set earlier in
// `translationSets` (sv is checked before en) - e.g. language="en" would
// still resolve to the Swedish set for a visitor with a Swedish browser.
const getTranslationSet = (locale) => {
    var _a;
    return (_a = translationSets.find((set) => set.htmlLang === locale || set.locale === locale)) !== null && _a !== void 0 ? _a : engJson;
};
function createTranslateFunction(language = 'sv') {
    const translationSet = getTranslationSet(language);
    return function translate(...keys) {
        for (const key of keys) {
            const value = translationSet[key];
            if (value !== undefined && value.length > 0) {
                return value;
            }
        }
        return keys[0];
    };
}

var resolveConfig$3 = {};

var resolveConfig$2 = {};

var negateValue = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return negateValue;
    }
});
function negateValue(value) {
    value = `${value}`;
    if (value === "0") {
        return "0";
    }
    // Flip sign of numbers
    if (/^[+-]?(\d+|\d*\.\d+)(e[+-]?\d+)?(%|\w+)?$/.test(value)) {
        return value.replace(/^[+-]?/, (sign)=>sign === "-" ? "" : "-");
    }
    // What functions we support negating numeric values for
    // var() isn't inherently a numeric function but we support it anyway
    // The trigonometric functions are omitted because you'll need to use calc(…) with them _anyway_
    // to produce generally useful results and that will be covered already
    let numericFunctions = [
        "var",
        "calc",
        "min",
        "max",
        "clamp"
    ];
    for (const fn of numericFunctions){
        if (value.includes(`${fn}(`)) {
            return `calc(${value} * -1)`;
        }
    }
}
}(negateValue));

var corePluginList = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _default = [
    "preflight",
    "container",
    "accessibility",
    "pointerEvents",
    "visibility",
    "position",
    "inset",
    "isolation",
    "zIndex",
    "order",
    "gridColumn",
    "gridColumnStart",
    "gridColumnEnd",
    "gridRow",
    "gridRowStart",
    "gridRowEnd",
    "float",
    "clear",
    "margin",
    "boxSizing",
    "lineClamp",
    "display",
    "aspectRatio",
    "size",
    "height",
    "maxHeight",
    "minHeight",
    "width",
    "minWidth",
    "maxWidth",
    "flex",
    "flexShrink",
    "flexGrow",
    "flexBasis",
    "tableLayout",
    "captionSide",
    "borderCollapse",
    "borderSpacing",
    "transformOrigin",
    "translate",
    "rotate",
    "skew",
    "scale",
    "transform",
    "animation",
    "cursor",
    "touchAction",
    "userSelect",
    "resize",
    "scrollSnapType",
    "scrollSnapAlign",
    "scrollSnapStop",
    "scrollMargin",
    "scrollPadding",
    "listStylePosition",
    "listStyleType",
    "listStyleImage",
    "appearance",
    "columns",
    "breakBefore",
    "breakInside",
    "breakAfter",
    "gridAutoColumns",
    "gridAutoFlow",
    "gridAutoRows",
    "gridTemplateColumns",
    "gridTemplateRows",
    "flexDirection",
    "flexWrap",
    "placeContent",
    "placeItems",
    "alignContent",
    "alignItems",
    "justifyContent",
    "justifyItems",
    "gap",
    "space",
    "divideWidth",
    "divideStyle",
    "divideColor",
    "divideOpacity",
    "placeSelf",
    "alignSelf",
    "justifySelf",
    "overflow",
    "overscrollBehavior",
    "scrollBehavior",
    "textOverflow",
    "hyphens",
    "whitespace",
    "textWrap",
    "wordBreak",
    "borderRadius",
    "borderWidth",
    "borderStyle",
    "borderColor",
    "borderOpacity",
    "backgroundColor",
    "backgroundOpacity",
    "backgroundImage",
    "gradientColorStops",
    "boxDecorationBreak",
    "backgroundSize",
    "backgroundAttachment",
    "backgroundClip",
    "backgroundPosition",
    "backgroundRepeat",
    "backgroundOrigin",
    "fill",
    "stroke",
    "strokeWidth",
    "objectFit",
    "objectPosition",
    "padding",
    "textAlign",
    "textIndent",
    "verticalAlign",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "textTransform",
    "fontStyle",
    "fontVariantNumeric",
    "lineHeight",
    "letterSpacing",
    "textColor",
    "textOpacity",
    "textDecoration",
    "textDecorationColor",
    "textDecorationStyle",
    "textDecorationThickness",
    "textUnderlineOffset",
    "fontSmoothing",
    "placeholderColor",
    "placeholderOpacity",
    "caretColor",
    "accentColor",
    "opacity",
    "backgroundBlendMode",
    "mixBlendMode",
    "boxShadow",
    "boxShadowColor",
    "outlineStyle",
    "outlineWidth",
    "outlineOffset",
    "outlineColor",
    "ringWidth",
    "ringColor",
    "ringOpacity",
    "ringOffsetWidth",
    "ringOffsetColor",
    "blur",
    "brightness",
    "contrast",
    "dropShadow",
    "grayscale",
    "hueRotate",
    "invert",
    "saturate",
    "sepia",
    "filter",
    "backdropBlur",
    "backdropBrightness",
    "backdropContrast",
    "backdropGrayscale",
    "backdropHueRotate",
    "backdropInvert",
    "backdropOpacity",
    "backdropSaturate",
    "backdropSepia",
    "backdropFilter",
    "transitionProperty",
    "transitionDelay",
    "transitionDuration",
    "transitionTimingFunction",
    "willChange",
    "contain",
    "content",
    "forcedColorAdjust"
];
}(corePluginList));

var configurePlugins = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
function _default(pluginConfig, plugins) {
    if (pluginConfig === undefined) {
        return plugins;
    }
    const pluginNames = Array.isArray(pluginConfig) ? pluginConfig : [
        ...new Set(plugins.filter((pluginName)=>{
            return pluginConfig !== false && pluginConfig[pluginName] !== false;
        }).concat(Object.keys(pluginConfig).filter((pluginName)=>{
            return pluginConfig[pluginName] !== false;
        })))
    ];
    return pluginNames;
}
}(configurePlugins));

var colors = {};

var log = {};

var picocolors_browser = {exports: {}};

var x=String;
var create=function() {return {isColorSupported:false,reset:x,bold:x,dim:x,italic:x,underline:x,inverse:x,hidden:x,strikethrough:x,black:x,red:x,green:x,yellow:x,blue:x,magenta:x,cyan:x,white:x,gray:x,bgBlack:x,bgRed:x,bgGreen:x,bgYellow:x,bgBlue:x,bgMagenta:x,bgCyan:x,bgWhite:x,blackBright:x,redBright:x,greenBright:x,yellowBright:x,blueBright:x,magentaBright:x,cyanBright:x,whiteBright:x,bgBlackBright:x,bgRedBright:x,bgGreenBright:x,bgYellowBright:x,bgBlueBright:x,bgMagentaBright:x,bgCyanBright:x,bgWhiteBright:x}};
picocolors_browser.exports=create();
picocolors_browser.exports.createColors = create;

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    dim: function() {
        return dim;
    },
    default: function() {
        return _default;
    }
});
const _picocolors = /*#__PURE__*/ _interop_require_default(picocolors_browser.exports);
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let alreadyShown = new Set();
function log(type, messages, key) {
    if (typeof process !== "undefined" && process.env.JEST_WORKER_ID) return;
    if (key && alreadyShown.has(key)) return;
    if (key) alreadyShown.add(key);
    console.warn("");
    messages.forEach((message)=>console.warn(type, "-", message));
}
function dim(input) {
    return _picocolors.default.dim(input);
}
const _default = {
    info (key, messages) {
        log(_picocolors.default.bold(_picocolors.default.cyan("info")), ...Array.isArray(key) ? [
            key
        ] : [
            messages,
            key
        ]);
    },
    warn (key, messages) {
        log(_picocolors.default.bold(_picocolors.default.yellow("warn")), ...Array.isArray(key) ? [
            key
        ] : [
            messages,
            key
        ]);
    },
    risk (key, messages) {
        log(_picocolors.default.bold(_picocolors.default.magenta("risk")), ...Array.isArray(key) ? [
            key
        ] : [
            messages,
            key
        ]);
    }
};
}(log));

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _log = /*#__PURE__*/ _interop_require_default(log);
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function warn({ version , from , to  }) {
    _log.default.warn(`${from}-color-renamed`, [
        `As of Tailwind CSS ${version}, \`${from}\` has been renamed to \`${to}\`.`,
        "Update your configuration file to silence this warning."
    ]);
}
const _default = {
    inherit: "inherit",
    current: "currentColor",
    transparent: "transparent",
    black: "#000",
    white: "#fff",
    slate: {
        50: "#f8fafc",
        100: "#f1f5f9",
        200: "#e2e8f0",
        300: "#cbd5e1",
        400: "#94a3b8",
        500: "#64748b",
        600: "#475569",
        700: "#334155",
        800: "#1e293b",
        900: "#0f172a",
        950: "#020617"
    },
    gray: {
        50: "#f9fafb",
        100: "#f3f4f6",
        200: "#e5e7eb",
        300: "#d1d5db",
        400: "#9ca3af",
        500: "#6b7280",
        600: "#4b5563",
        700: "#374151",
        800: "#1f2937",
        900: "#111827",
        950: "#030712"
    },
    zinc: {
        50: "#fafafa",
        100: "#f4f4f5",
        200: "#e4e4e7",
        300: "#d4d4d8",
        400: "#a1a1aa",
        500: "#71717a",
        600: "#52525b",
        700: "#3f3f46",
        800: "#27272a",
        900: "#18181b",
        950: "#09090b"
    },
    neutral: {
        50: "#fafafa",
        100: "#f5f5f5",
        200: "#e5e5e5",
        300: "#d4d4d4",
        400: "#a3a3a3",
        500: "#737373",
        600: "#525252",
        700: "#404040",
        800: "#262626",
        900: "#171717",
        950: "#0a0a0a"
    },
    stone: {
        50: "#fafaf9",
        100: "#f5f5f4",
        200: "#e7e5e4",
        300: "#d6d3d1",
        400: "#a8a29e",
        500: "#78716c",
        600: "#57534e",
        700: "#44403c",
        800: "#292524",
        900: "#1c1917",
        950: "#0c0a09"
    },
    red: {
        50: "#fef2f2",
        100: "#fee2e2",
        200: "#fecaca",
        300: "#fca5a5",
        400: "#f87171",
        500: "#ef4444",
        600: "#dc2626",
        700: "#b91c1c",
        800: "#991b1b",
        900: "#7f1d1d",
        950: "#450a0a"
    },
    orange: {
        50: "#fff7ed",
        100: "#ffedd5",
        200: "#fed7aa",
        300: "#fdba74",
        400: "#fb923c",
        500: "#f97316",
        600: "#ea580c",
        700: "#c2410c",
        800: "#9a3412",
        900: "#7c2d12",
        950: "#431407"
    },
    amber: {
        50: "#fffbeb",
        100: "#fef3c7",
        200: "#fde68a",
        300: "#fcd34d",
        400: "#fbbf24",
        500: "#f59e0b",
        600: "#d97706",
        700: "#b45309",
        800: "#92400e",
        900: "#78350f",
        950: "#451a03"
    },
    yellow: {
        50: "#fefce8",
        100: "#fef9c3",
        200: "#fef08a",
        300: "#fde047",
        400: "#facc15",
        500: "#eab308",
        600: "#ca8a04",
        700: "#a16207",
        800: "#854d0e",
        900: "#713f12",
        950: "#422006"
    },
    lime: {
        50: "#f7fee7",
        100: "#ecfccb",
        200: "#d9f99d",
        300: "#bef264",
        400: "#a3e635",
        500: "#84cc16",
        600: "#65a30d",
        700: "#4d7c0f",
        800: "#3f6212",
        900: "#365314",
        950: "#1a2e05"
    },
    green: {
        50: "#f0fdf4",
        100: "#dcfce7",
        200: "#bbf7d0",
        300: "#86efac",
        400: "#4ade80",
        500: "#22c55e",
        600: "#16a34a",
        700: "#15803d",
        800: "#166534",
        900: "#14532d",
        950: "#052e16"
    },
    emerald: {
        50: "#ecfdf5",
        100: "#d1fae5",
        200: "#a7f3d0",
        300: "#6ee7b7",
        400: "#34d399",
        500: "#10b981",
        600: "#059669",
        700: "#047857",
        800: "#065f46",
        900: "#064e3b",
        950: "#022c22"
    },
    teal: {
        50: "#f0fdfa",
        100: "#ccfbf1",
        200: "#99f6e4",
        300: "#5eead4",
        400: "#2dd4bf",
        500: "#14b8a6",
        600: "#0d9488",
        700: "#0f766e",
        800: "#115e59",
        900: "#134e4a",
        950: "#042f2e"
    },
    cyan: {
        50: "#ecfeff",
        100: "#cffafe",
        200: "#a5f3fc",
        300: "#67e8f9",
        400: "#22d3ee",
        500: "#06b6d4",
        600: "#0891b2",
        700: "#0e7490",
        800: "#155e75",
        900: "#164e63",
        950: "#083344"
    },
    sky: {
        50: "#f0f9ff",
        100: "#e0f2fe",
        200: "#bae6fd",
        300: "#7dd3fc",
        400: "#38bdf8",
        500: "#0ea5e9",
        600: "#0284c7",
        700: "#0369a1",
        800: "#075985",
        900: "#0c4a6e",
        950: "#082f49"
    },
    blue: {
        50: "#eff6ff",
        100: "#dbeafe",
        200: "#bfdbfe",
        300: "#93c5fd",
        400: "#60a5fa",
        500: "#3b82f6",
        600: "#2563eb",
        700: "#1d4ed8",
        800: "#1e40af",
        900: "#1e3a8a",
        950: "#172554"
    },
    indigo: {
        50: "#eef2ff",
        100: "#e0e7ff",
        200: "#c7d2fe",
        300: "#a5b4fc",
        400: "#818cf8",
        500: "#6366f1",
        600: "#4f46e5",
        700: "#4338ca",
        800: "#3730a3",
        900: "#312e81",
        950: "#1e1b4b"
    },
    violet: {
        50: "#f5f3ff",
        100: "#ede9fe",
        200: "#ddd6fe",
        300: "#c4b5fd",
        400: "#a78bfa",
        500: "#8b5cf6",
        600: "#7c3aed",
        700: "#6d28d9",
        800: "#5b21b6",
        900: "#4c1d95",
        950: "#2e1065"
    },
    purple: {
        50: "#faf5ff",
        100: "#f3e8ff",
        200: "#e9d5ff",
        300: "#d8b4fe",
        400: "#c084fc",
        500: "#a855f7",
        600: "#9333ea",
        700: "#7e22ce",
        800: "#6b21a8",
        900: "#581c87",
        950: "#3b0764"
    },
    fuchsia: {
        50: "#fdf4ff",
        100: "#fae8ff",
        200: "#f5d0fe",
        300: "#f0abfc",
        400: "#e879f9",
        500: "#d946ef",
        600: "#c026d3",
        700: "#a21caf",
        800: "#86198f",
        900: "#701a75",
        950: "#4a044e"
    },
    pink: {
        50: "#fdf2f8",
        100: "#fce7f3",
        200: "#fbcfe8",
        300: "#f9a8d4",
        400: "#f472b6",
        500: "#ec4899",
        600: "#db2777",
        700: "#be185d",
        800: "#9d174d",
        900: "#831843",
        950: "#500724"
    },
    rose: {
        50: "#fff1f2",
        100: "#ffe4e6",
        200: "#fecdd3",
        300: "#fda4af",
        400: "#fb7185",
        500: "#f43f5e",
        600: "#e11d48",
        700: "#be123c",
        800: "#9f1239",
        900: "#881337",
        950: "#4c0519"
    },
    get lightBlue () {
        warn({
            version: "v2.2",
            from: "lightBlue",
            to: "sky"
        });
        return this.sky;
    },
    get warmGray () {
        warn({
            version: "v3.0",
            from: "warmGray",
            to: "stone"
        });
        return this.stone;
    },
    get trueGray () {
        warn({
            version: "v3.0",
            from: "trueGray",
            to: "neutral"
        });
        return this.neutral;
    },
    get coolGray () {
        warn({
            version: "v3.0",
            from: "coolGray",
            to: "gray"
        });
        return this.gray;
    },
    get blueGray () {
        warn({
            version: "v3.0",
            from: "blueGray",
            to: "slate"
        });
        return this.slate;
    }
};
}(colors));

var defaults$2 = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "defaults", {
    enumerable: true,
    get: function() {
        return defaults;
    }
});
function defaults(target, ...sources) {
    for (let source of sources){
        for(let k in source){
            var _target_hasOwnProperty;
            if (!(target === null || target === void 0 ? void 0 : (_target_hasOwnProperty = target.hasOwnProperty) === null || _target_hasOwnProperty === void 0 ? void 0 : _target_hasOwnProperty.call(target, k))) {
                target[k] = source[k];
            }
        }
        for (let k of Object.getOwnPropertySymbols(source)){
            var _target_hasOwnProperty1;
            if (!(target === null || target === void 0 ? void 0 : (_target_hasOwnProperty1 = target.hasOwnProperty) === null || _target_hasOwnProperty1 === void 0 ? void 0 : _target_hasOwnProperty1.call(target, k))) {
                target[k] = source[k];
            }
        }
    }
    return target;
}
}(defaults$2));

var toPath = {};

/**
 * Parse a path string into an array of path segments.
 *
 * Square bracket notation `a[b]` may be used to "escape" dots that would otherwise be interpreted as path separators.
 *
 * Example:
 * a -> ['a']
 * a.b.c -> ['a', 'b', 'c']
 * a[b].c -> ['a', 'b', 'c']
 * a[b.c].e.f -> ['a', 'b.c', 'e', 'f']
 * a[b][c][d] -> ['a', 'b', 'c', 'd']
 *
 * @param {string|string[]} path
 **/

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "toPath", {
    enumerable: true,
    get: function() {
        return toPath;
    }
});
function toPath(path) {
    if (Array.isArray(path)) return path;
    let openBrackets = path.split("[").length - 1;
    let closedBrackets = path.split("]").length - 1;
    if (openBrackets !== closedBrackets) {
        throw new Error(`Path is invalid. Has unbalanced brackets: ${path}`);
    }
    return path.split(/\.(?![^\[]*\])|[\[\]]/g).filter(Boolean);
}
}(toPath));

var normalizeConfig = {};

var featureFlags = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    flagEnabled: function() {
        return flagEnabled;
    },
    issueFlagNotices: function() {
        return issueFlagNotices;
    },
    default: function() {
        return _default;
    }
});
const _picocolors = /*#__PURE__*/ _interop_require_default(picocolors_browser.exports);
const _log = /*#__PURE__*/ _interop_require_default(log);
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let defaults = {
    optimizeUniversalDefaults: false,
    generalizedModifiers: true,
    disableColorOpacityUtilitiesByDefault: false,
    relativeContentPathsByDefault: false
};
let featureFlags = {
    future: [
        "hoverOnlyWhenSupported",
        "respectDefaultRingColorOpacity",
        "disableColorOpacityUtilitiesByDefault",
        "relativeContentPathsByDefault"
    ],
    experimental: [
        "optimizeUniversalDefaults",
        "generalizedModifiers"
    ]
};
function flagEnabled(config, flag) {
    if (featureFlags.future.includes(flag)) {
        var _config_future;
        var _config_future_flag, _ref;
        return config.future === "all" || ((_ref = (_config_future_flag = config === null || config === void 0 ? void 0 : (_config_future = config.future) === null || _config_future === void 0 ? void 0 : _config_future[flag]) !== null && _config_future_flag !== void 0 ? _config_future_flag : defaults[flag]) !== null && _ref !== void 0 ? _ref : false);
    }
    if (featureFlags.experimental.includes(flag)) {
        var _config_experimental;
        var _config_experimental_flag, _ref1;
        return config.experimental === "all" || ((_ref1 = (_config_experimental_flag = config === null || config === void 0 ? void 0 : (_config_experimental = config.experimental) === null || _config_experimental === void 0 ? void 0 : _config_experimental[flag]) !== null && _config_experimental_flag !== void 0 ? _config_experimental_flag : defaults[flag]) !== null && _ref1 !== void 0 ? _ref1 : false);
    }
    return false;
}
function experimentalFlagsEnabled(config) {
    if (config.experimental === "all") {
        return featureFlags.experimental;
    }
    var _config_experimental;
    return Object.keys((_config_experimental = config === null || config === void 0 ? void 0 : config.experimental) !== null && _config_experimental !== void 0 ? _config_experimental : {}).filter((flag)=>featureFlags.experimental.includes(flag) && config.experimental[flag]);
}
function issueFlagNotices(config) {
    if (process.env.JEST_WORKER_ID !== undefined) {
        return;
    }
    if (experimentalFlagsEnabled(config).length > 0) {
        let changes = experimentalFlagsEnabled(config).map((s)=>_picocolors.default.yellow(s)).join(", ");
        _log.default.warn("experimental-flags-enabled", [
            `You have enabled experimental features: ${changes}`,
            "Experimental features in Tailwind CSS are not covered by semver, may introduce breaking changes, and can change at any time."
        ]);
    }
}
const _default = featureFlags;
}(featureFlags));

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "normalizeConfig", {
    enumerable: true,
    get: function() {
        return normalizeConfig;
    }
});
const _featureFlags = featureFlags;
const _log = /*#__PURE__*/ _interop_require_wildcard(log);
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function normalizeConfig(config) {
    // Quick structure validation
    /**
   * type FilePath = string
   * type RawFile = { raw: string, extension?: string }
   * type ExtractorFn = (content: string) => Array<string>
   * type TransformerFn = (content: string) => string
   *
   * type Content =
   *   | Array<FilePath | RawFile>
   *   | {
   *       files: Array<FilePath | RawFile>,
   *       extract?: ExtractorFn | { [extension: string]: ExtractorFn }
   *       transform?: TransformerFn | { [extension: string]: TransformerFn }
   *   }
   */ let valid = (()=>{
        // `config.purge` should not exist anymore
        if (config.purge) {
            return false;
        }
        // `config.content` should exist
        if (!config.content) {
            return false;
        }
        // `config.content` should be an object or an array
        if (!Array.isArray(config.content) && !(typeof config.content === "object" && config.content !== null)) {
            return false;
        }
        // When `config.content` is an array, it should consist of FilePaths or RawFiles
        if (Array.isArray(config.content)) {
            return config.content.every((path)=>{
                // `path` can be a string
                if (typeof path === "string") return true;
                // `path` can be an object { raw: string, extension?: string }
                // `raw` must be a string
                if (typeof (path === null || path === void 0 ? void 0 : path.raw) !== "string") return false;
                // `extension` (if provided) should also be a string
                if ((path === null || path === void 0 ? void 0 : path.extension) && typeof (path === null || path === void 0 ? void 0 : path.extension) !== "string") {
                    return false;
                }
                return true;
            });
        }
        // When `config.content` is an object
        if (typeof config.content === "object" && config.content !== null) {
            // Only `files`, `relative`, `extract`, and `transform` can exist in `config.content`
            if (Object.keys(config.content).some((key)=>![
                    "files",
                    "relative",
                    "extract",
                    "transform"
                ].includes(key))) {
                return false;
            }
            // `config.content.files` should exist of FilePaths or RawFiles
            if (Array.isArray(config.content.files)) {
                if (!config.content.files.every((path)=>{
                    // `path` can be a string
                    if (typeof path === "string") return true;
                    // `path` can be an object { raw: string, extension?: string }
                    // `raw` must be a string
                    if (typeof (path === null || path === void 0 ? void 0 : path.raw) !== "string") return false;
                    // `extension` (if provided) should also be a string
                    if ((path === null || path === void 0 ? void 0 : path.extension) && typeof (path === null || path === void 0 ? void 0 : path.extension) !== "string") {
                        return false;
                    }
                    return true;
                })) {
                    return false;
                }
                // `config.content.extract` is optional, and can be a Function or a Record<String, Function>
                if (typeof config.content.extract === "object") {
                    for (let value of Object.values(config.content.extract)){
                        if (typeof value !== "function") {
                            return false;
                        }
                    }
                } else if (!(config.content.extract === undefined || typeof config.content.extract === "function")) {
                    return false;
                }
                // `config.content.transform` is optional, and can be a Function or a Record<String, Function>
                if (typeof config.content.transform === "object") {
                    for (let value of Object.values(config.content.transform)){
                        if (typeof value !== "function") {
                            return false;
                        }
                    }
                } else if (!(config.content.transform === undefined || typeof config.content.transform === "function")) {
                    return false;
                }
                // `config.content.relative` is optional and can be a boolean
                if (typeof config.content.relative !== "boolean" && typeof config.content.relative !== "undefined") {
                    return false;
                }
            }
            return true;
        }
        return false;
    })();
    if (!valid) {
        _log.default.warn("purge-deprecation", [
            "The `purge`/`content` options have changed in Tailwind CSS v3.0.",
            "Update your configuration file to eliminate this warning.",
            "https://tailwindcss.com/docs/upgrade-guide#configure-content-sources"
        ]);
    }
    // Normalize the `safelist`
    config.safelist = (()=>{
        var _purge_options;
        let { content , purge , safelist  } = config;
        if (Array.isArray(safelist)) return safelist;
        if (Array.isArray(content === null || content === void 0 ? void 0 : content.safelist)) return content.safelist;
        if (Array.isArray(purge === null || purge === void 0 ? void 0 : purge.safelist)) return purge.safelist;
        if (Array.isArray(purge === null || purge === void 0 ? void 0 : (_purge_options = purge.options) === null || _purge_options === void 0 ? void 0 : _purge_options.safelist)) return purge.options.safelist;
        return [];
    })();
    // Normalize the `blocklist`
    config.blocklist = (()=>{
        let { blocklist  } = config;
        if (Array.isArray(blocklist)) {
            if (blocklist.every((item)=>typeof item === "string")) {
                return blocklist;
            }
            _log.default.warn("blocklist-invalid", [
                "The `blocklist` option must be an array of strings.",
                "https://tailwindcss.com/docs/content-configuration#discarding-classes"
            ]);
        }
        return [];
    })();
    // Normalize prefix option
    if (typeof config.prefix === "function") {
        _log.default.warn("prefix-function", [
            "As of Tailwind CSS v3.0, `prefix` cannot be a function.",
            "Update `prefix` in your configuration to be a string to eliminate this warning.",
            "https://tailwindcss.com/docs/upgrade-guide#prefix-cannot-be-a-function"
        ]);
        config.prefix = "";
    } else {
        var _config_prefix;
        config.prefix = (_config_prefix = config.prefix) !== null && _config_prefix !== void 0 ? _config_prefix : "";
    }
    // Normalize the `content`
    config.content = {
        relative: (()=>{
            let { content  } = config;
            if (content === null || content === void 0 ? void 0 : content.relative) {
                return content.relative;
            }
            return (0, _featureFlags.flagEnabled)(config, "relativeContentPathsByDefault");
        })(),
        files: (()=>{
            let { content , purge  } = config;
            if (Array.isArray(purge)) return purge;
            if (Array.isArray(purge === null || purge === void 0 ? void 0 : purge.content)) return purge.content;
            if (Array.isArray(content)) return content;
            if (Array.isArray(content === null || content === void 0 ? void 0 : content.content)) return content.content;
            if (Array.isArray(content === null || content === void 0 ? void 0 : content.files)) return content.files;
            return [];
        })(),
        extract: (()=>{
            let extract = (()=>{
                var _config_purge, _config_content, _config_purge1, _config_purge_extract, _config_content1, _config_content_extract, _config_purge2, _config_purge_options, _config_content2, _config_content_options;
                if ((_config_purge = config.purge) === null || _config_purge === void 0 ? void 0 : _config_purge.extract) return config.purge.extract;
                if ((_config_content = config.content) === null || _config_content === void 0 ? void 0 : _config_content.extract) return config.content.extract;
                if ((_config_purge1 = config.purge) === null || _config_purge1 === void 0 ? void 0 : (_config_purge_extract = _config_purge1.extract) === null || _config_purge_extract === void 0 ? void 0 : _config_purge_extract.DEFAULT) return config.purge.extract.DEFAULT;
                if ((_config_content1 = config.content) === null || _config_content1 === void 0 ? void 0 : (_config_content_extract = _config_content1.extract) === null || _config_content_extract === void 0 ? void 0 : _config_content_extract.DEFAULT) return config.content.extract.DEFAULT;
                if ((_config_purge2 = config.purge) === null || _config_purge2 === void 0 ? void 0 : (_config_purge_options = _config_purge2.options) === null || _config_purge_options === void 0 ? void 0 : _config_purge_options.extractors) return config.purge.options.extractors;
                if ((_config_content2 = config.content) === null || _config_content2 === void 0 ? void 0 : (_config_content_options = _config_content2.options) === null || _config_content_options === void 0 ? void 0 : _config_content_options.extractors) return config.content.options.extractors;
                return {};
            })();
            let extractors = {};
            let defaultExtractor = (()=>{
                var _config_purge, _config_purge_options, _config_content, _config_content_options;
                if ((_config_purge = config.purge) === null || _config_purge === void 0 ? void 0 : (_config_purge_options = _config_purge.options) === null || _config_purge_options === void 0 ? void 0 : _config_purge_options.defaultExtractor) {
                    return config.purge.options.defaultExtractor;
                }
                if ((_config_content = config.content) === null || _config_content === void 0 ? void 0 : (_config_content_options = _config_content.options) === null || _config_content_options === void 0 ? void 0 : _config_content_options.defaultExtractor) {
                    return config.content.options.defaultExtractor;
                }
                return undefined;
            })();
            if (defaultExtractor !== undefined) {
                extractors.DEFAULT = defaultExtractor;
            }
            // Functions
            if (typeof extract === "function") {
                extractors.DEFAULT = extract;
            } else if (Array.isArray(extract)) {
                for (let { extensions , extractor  } of extract !== null && extract !== void 0 ? extract : []){
                    for (let extension of extensions){
                        extractors[extension] = extractor;
                    }
                }
            } else if (typeof extract === "object" && extract !== null) {
                Object.assign(extractors, extract);
            }
            return extractors;
        })(),
        transform: (()=>{
            let transform = (()=>{
                var _config_purge, _config_content, _config_purge1, _config_purge_transform, _config_content1, _config_content_transform;
                if ((_config_purge = config.purge) === null || _config_purge === void 0 ? void 0 : _config_purge.transform) return config.purge.transform;
                if ((_config_content = config.content) === null || _config_content === void 0 ? void 0 : _config_content.transform) return config.content.transform;
                if ((_config_purge1 = config.purge) === null || _config_purge1 === void 0 ? void 0 : (_config_purge_transform = _config_purge1.transform) === null || _config_purge_transform === void 0 ? void 0 : _config_purge_transform.DEFAULT) return config.purge.transform.DEFAULT;
                if ((_config_content1 = config.content) === null || _config_content1 === void 0 ? void 0 : (_config_content_transform = _config_content1.transform) === null || _config_content_transform === void 0 ? void 0 : _config_content_transform.DEFAULT) return config.content.transform.DEFAULT;
                return {};
            })();
            let transformers = {};
            if (typeof transform === "function") {
                transformers.DEFAULT = transform;
            } else if (typeof transform === "object" && transform !== null) {
                Object.assign(transformers, transform);
            }
            return transformers;
        })()
    };
    // Validate globs to prevent bogus globs.
    // E.g.: `./src/*.{html}` is invalid, the `{html}` should just be `html`
    for (let file of config.content.files){
        if (typeof file === "string" && /{([^,]*?)}/g.test(file)) {
            _log.default.warn("invalid-glob-braces", [
                `The glob pattern ${(0, _log.dim)(file)} in your Tailwind CSS configuration is invalid.`,
                `Update it to ${(0, _log.dim)(file.replace(/{([^,]*?)}/g, "$1"))} to silence this warning.`
            ]);
            break;
        }
    }
    return config;
}
}(normalizeConfig));

var isPlainObject$1 = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return isPlainObject;
    }
});
function isPlainObject(value) {
    if (Object.prototype.toString.call(value) !== "[object Object]") {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || Object.getPrototypeOf(prototype) === null;
}
}(isPlainObject$1));

var cloneDeep = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "cloneDeep", {
    enumerable: true,
    get: function() {
        return cloneDeep;
    }
});
function cloneDeep(value) {
    if (Array.isArray(value)) {
        return value.map((child)=>cloneDeep(child));
    }
    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(Object.entries(value).map(([k, v])=>[
                k,
                cloneDeep(v)
            ]));
    }
    return value;
}
}(cloneDeep));

var pluginUtils = {};

var escapeCommas = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return escapeCommas;
    }
});
function escapeCommas(className) {
    return className.replace(/\\,/g, "\\2c ");
}
}(escapeCommas));

var withAlphaVariable = {};

var color = {};

var colorNames = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _default = {
    aliceblue: [
        240,
        248,
        255
    ],
    antiquewhite: [
        250,
        235,
        215
    ],
    aqua: [
        0,
        255,
        255
    ],
    aquamarine: [
        127,
        255,
        212
    ],
    azure: [
        240,
        255,
        255
    ],
    beige: [
        245,
        245,
        220
    ],
    bisque: [
        255,
        228,
        196
    ],
    black: [
        0,
        0,
        0
    ],
    blanchedalmond: [
        255,
        235,
        205
    ],
    blue: [
        0,
        0,
        255
    ],
    blueviolet: [
        138,
        43,
        226
    ],
    brown: [
        165,
        42,
        42
    ],
    burlywood: [
        222,
        184,
        135
    ],
    cadetblue: [
        95,
        158,
        160
    ],
    chartreuse: [
        127,
        255,
        0
    ],
    chocolate: [
        210,
        105,
        30
    ],
    coral: [
        255,
        127,
        80
    ],
    cornflowerblue: [
        100,
        149,
        237
    ],
    cornsilk: [
        255,
        248,
        220
    ],
    crimson: [
        220,
        20,
        60
    ],
    cyan: [
        0,
        255,
        255
    ],
    darkblue: [
        0,
        0,
        139
    ],
    darkcyan: [
        0,
        139,
        139
    ],
    darkgoldenrod: [
        184,
        134,
        11
    ],
    darkgray: [
        169,
        169,
        169
    ],
    darkgreen: [
        0,
        100,
        0
    ],
    darkgrey: [
        169,
        169,
        169
    ],
    darkkhaki: [
        189,
        183,
        107
    ],
    darkmagenta: [
        139,
        0,
        139
    ],
    darkolivegreen: [
        85,
        107,
        47
    ],
    darkorange: [
        255,
        140,
        0
    ],
    darkorchid: [
        153,
        50,
        204
    ],
    darkred: [
        139,
        0,
        0
    ],
    darksalmon: [
        233,
        150,
        122
    ],
    darkseagreen: [
        143,
        188,
        143
    ],
    darkslateblue: [
        72,
        61,
        139
    ],
    darkslategray: [
        47,
        79,
        79
    ],
    darkslategrey: [
        47,
        79,
        79
    ],
    darkturquoise: [
        0,
        206,
        209
    ],
    darkviolet: [
        148,
        0,
        211
    ],
    deeppink: [
        255,
        20,
        147
    ],
    deepskyblue: [
        0,
        191,
        255
    ],
    dimgray: [
        105,
        105,
        105
    ],
    dimgrey: [
        105,
        105,
        105
    ],
    dodgerblue: [
        30,
        144,
        255
    ],
    firebrick: [
        178,
        34,
        34
    ],
    floralwhite: [
        255,
        250,
        240
    ],
    forestgreen: [
        34,
        139,
        34
    ],
    fuchsia: [
        255,
        0,
        255
    ],
    gainsboro: [
        220,
        220,
        220
    ],
    ghostwhite: [
        248,
        248,
        255
    ],
    gold: [
        255,
        215,
        0
    ],
    goldenrod: [
        218,
        165,
        32
    ],
    gray: [
        128,
        128,
        128
    ],
    green: [
        0,
        128,
        0
    ],
    greenyellow: [
        173,
        255,
        47
    ],
    grey: [
        128,
        128,
        128
    ],
    honeydew: [
        240,
        255,
        240
    ],
    hotpink: [
        255,
        105,
        180
    ],
    indianred: [
        205,
        92,
        92
    ],
    indigo: [
        75,
        0,
        130
    ],
    ivory: [
        255,
        255,
        240
    ],
    khaki: [
        240,
        230,
        140
    ],
    lavender: [
        230,
        230,
        250
    ],
    lavenderblush: [
        255,
        240,
        245
    ],
    lawngreen: [
        124,
        252,
        0
    ],
    lemonchiffon: [
        255,
        250,
        205
    ],
    lightblue: [
        173,
        216,
        230
    ],
    lightcoral: [
        240,
        128,
        128
    ],
    lightcyan: [
        224,
        255,
        255
    ],
    lightgoldenrodyellow: [
        250,
        250,
        210
    ],
    lightgray: [
        211,
        211,
        211
    ],
    lightgreen: [
        144,
        238,
        144
    ],
    lightgrey: [
        211,
        211,
        211
    ],
    lightpink: [
        255,
        182,
        193
    ],
    lightsalmon: [
        255,
        160,
        122
    ],
    lightseagreen: [
        32,
        178,
        170
    ],
    lightskyblue: [
        135,
        206,
        250
    ],
    lightslategray: [
        119,
        136,
        153
    ],
    lightslategrey: [
        119,
        136,
        153
    ],
    lightsteelblue: [
        176,
        196,
        222
    ],
    lightyellow: [
        255,
        255,
        224
    ],
    lime: [
        0,
        255,
        0
    ],
    limegreen: [
        50,
        205,
        50
    ],
    linen: [
        250,
        240,
        230
    ],
    magenta: [
        255,
        0,
        255
    ],
    maroon: [
        128,
        0,
        0
    ],
    mediumaquamarine: [
        102,
        205,
        170
    ],
    mediumblue: [
        0,
        0,
        205
    ],
    mediumorchid: [
        186,
        85,
        211
    ],
    mediumpurple: [
        147,
        112,
        219
    ],
    mediumseagreen: [
        60,
        179,
        113
    ],
    mediumslateblue: [
        123,
        104,
        238
    ],
    mediumspringgreen: [
        0,
        250,
        154
    ],
    mediumturquoise: [
        72,
        209,
        204
    ],
    mediumvioletred: [
        199,
        21,
        133
    ],
    midnightblue: [
        25,
        25,
        112
    ],
    mintcream: [
        245,
        255,
        250
    ],
    mistyrose: [
        255,
        228,
        225
    ],
    moccasin: [
        255,
        228,
        181
    ],
    navajowhite: [
        255,
        222,
        173
    ],
    navy: [
        0,
        0,
        128
    ],
    oldlace: [
        253,
        245,
        230
    ],
    olive: [
        128,
        128,
        0
    ],
    olivedrab: [
        107,
        142,
        35
    ],
    orange: [
        255,
        165,
        0
    ],
    orangered: [
        255,
        69,
        0
    ],
    orchid: [
        218,
        112,
        214
    ],
    palegoldenrod: [
        238,
        232,
        170
    ],
    palegreen: [
        152,
        251,
        152
    ],
    paleturquoise: [
        175,
        238,
        238
    ],
    palevioletred: [
        219,
        112,
        147
    ],
    papayawhip: [
        255,
        239,
        213
    ],
    peachpuff: [
        255,
        218,
        185
    ],
    peru: [
        205,
        133,
        63
    ],
    pink: [
        255,
        192,
        203
    ],
    plum: [
        221,
        160,
        221
    ],
    powderblue: [
        176,
        224,
        230
    ],
    purple: [
        128,
        0,
        128
    ],
    rebeccapurple: [
        102,
        51,
        153
    ],
    red: [
        255,
        0,
        0
    ],
    rosybrown: [
        188,
        143,
        143
    ],
    royalblue: [
        65,
        105,
        225
    ],
    saddlebrown: [
        139,
        69,
        19
    ],
    salmon: [
        250,
        128,
        114
    ],
    sandybrown: [
        244,
        164,
        96
    ],
    seagreen: [
        46,
        139,
        87
    ],
    seashell: [
        255,
        245,
        238
    ],
    sienna: [
        160,
        82,
        45
    ],
    silver: [
        192,
        192,
        192
    ],
    skyblue: [
        135,
        206,
        235
    ],
    slateblue: [
        106,
        90,
        205
    ],
    slategray: [
        112,
        128,
        144
    ],
    slategrey: [
        112,
        128,
        144
    ],
    snow: [
        255,
        250,
        250
    ],
    springgreen: [
        0,
        255,
        127
    ],
    steelblue: [
        70,
        130,
        180
    ],
    tan: [
        210,
        180,
        140
    ],
    teal: [
        0,
        128,
        128
    ],
    thistle: [
        216,
        191,
        216
    ],
    tomato: [
        255,
        99,
        71
    ],
    turquoise: [
        64,
        224,
        208
    ],
    violet: [
        238,
        130,
        238
    ],
    wheat: [
        245,
        222,
        179
    ],
    white: [
        255,
        255,
        255
    ],
    whitesmoke: [
        245,
        245,
        245
    ],
    yellow: [
        255,
        255,
        0
    ],
    yellowgreen: [
        154,
        205,
        50
    ]
};
}(colorNames));

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    parseColor: function() {
        return parseColor;
    },
    formatColor: function() {
        return formatColor;
    }
});
const _colorNames = /*#__PURE__*/ _interop_require_default(colorNames);
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let HEX = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i;
let SHORT_HEX = /^#([a-f\d])([a-f\d])([a-f\d])([a-f\d])?$/i;
let VALUE = /(?:\d+|\d*\.\d+)%?/;
let SEP = /(?:\s*,\s*|\s+)/;
let ALPHA_SEP = /\s*[,/]\s*/;
let CUSTOM_PROPERTY = /var\(--(?:[^ )]*?)(?:,(?:[^ )]*?|var\(--[^ )]*?\)))?\)/;
let RGB = new RegExp(`^(rgba?)\\(\\s*(${VALUE.source}|${CUSTOM_PROPERTY.source})(?:${SEP.source}(${VALUE.source}|${CUSTOM_PROPERTY.source}))?(?:${SEP.source}(${VALUE.source}|${CUSTOM_PROPERTY.source}))?(?:${ALPHA_SEP.source}(${VALUE.source}|${CUSTOM_PROPERTY.source}))?\\s*\\)$`);
let HSL = new RegExp(`^(hsla?)\\(\\s*((?:${VALUE.source})(?:deg|rad|grad|turn)?|${CUSTOM_PROPERTY.source})(?:${SEP.source}(${VALUE.source}|${CUSTOM_PROPERTY.source}))?(?:${SEP.source}(${VALUE.source}|${CUSTOM_PROPERTY.source}))?(?:${ALPHA_SEP.source}(${VALUE.source}|${CUSTOM_PROPERTY.source}))?\\s*\\)$`);
function parseColor(value, { loose =false  } = {}) {
    var _match_, _match__toString;
    if (typeof value !== "string") {
        return null;
    }
    value = value.trim();
    if (value === "transparent") {
        return {
            mode: "rgb",
            color: [
                "0",
                "0",
                "0"
            ],
            alpha: "0"
        };
    }
    if (value in _colorNames.default) {
        return {
            mode: "rgb",
            color: _colorNames.default[value].map((v)=>v.toString())
        };
    }
    let hex = value.replace(SHORT_HEX, (_, r, g, b, a)=>[
            "#",
            r,
            r,
            g,
            g,
            b,
            b,
            a ? a + a : ""
        ].join("")).match(HEX);
    if (hex !== null) {
        return {
            mode: "rgb",
            color: [
                parseInt(hex[1], 16),
                parseInt(hex[2], 16),
                parseInt(hex[3], 16)
            ].map((v)=>v.toString()),
            alpha: hex[4] ? (parseInt(hex[4], 16) / 255).toString() : undefined
        };
    }
    var _value_match;
    let match = (_value_match = value.match(RGB)) !== null && _value_match !== void 0 ? _value_match : value.match(HSL);
    if (match === null) {
        return null;
    }
    let color = [
        match[2],
        match[3],
        match[4]
    ].filter(Boolean).map((v)=>v.toString());
    // rgba(var(--my-color), 0.1)
    // hsla(var(--my-color), 0.1)
    if (color.length === 2 && color[0].startsWith("var(")) {
        return {
            mode: match[1],
            color: [
                color[0]
            ],
            alpha: color[1]
        };
    }
    if (!loose && color.length !== 3) {
        return null;
    }
    if (color.length < 3 && !color.some((part)=>/^var\(.*?\)$/.test(part))) {
        return null;
    }
    return {
        mode: match[1],
        color,
        alpha: (_match_ = match[5]) === null || _match_ === void 0 ? void 0 : (_match__toString = _match_.toString) === null || _match__toString === void 0 ? void 0 : _match__toString.call(_match_)
    };
}
function formatColor({ mode , color , alpha  }) {
    let hasAlpha = alpha !== undefined;
    if (mode === "rgba" || mode === "hsla") {
        return `${mode}(${color.join(", ")}${hasAlpha ? `, ${alpha}` : ""})`;
    }
    return `${mode}(${color.join(" ")}${hasAlpha ? ` / ${alpha}` : ""})`;
}
}(color));

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    withAlphaValue: function() {
        return withAlphaValue;
    },
    default: function() {
        return withAlphaVariable;
    }
});
const _color = color;
function withAlphaValue(color, alphaValue, defaultValue) {
    if (typeof color === "function") {
        return color({
            opacityValue: alphaValue
        });
    }
    let parsed = (0, _color.parseColor)(color, {
        loose: true
    });
    if (parsed === null) {
        return defaultValue;
    }
    return (0, _color.formatColor)({
        ...parsed,
        alpha: alphaValue
    });
}
function withAlphaVariable({ color , property , variable  }) {
    let properties = [].concat(property);
    if (typeof color === "function") {
        return {
            [variable]: "1",
            ...Object.fromEntries(properties.map((p)=>{
                return [
                    p,
                    color({
                        opacityVariable: variable,
                        opacityValue: `var(${variable}, 1)`
                    })
                ];
            }))
        };
    }
    const parsed = (0, _color.parseColor)(color);
    if (parsed === null) {
        return Object.fromEntries(properties.map((p)=>[
                p,
                color
            ]));
    }
    if (parsed.alpha !== undefined) {
        // Has an alpha value, return color as-is
        return Object.fromEntries(properties.map((p)=>[
                p,
                color
            ]));
    }
    return {
        [variable]: "1",
        ...Object.fromEntries(properties.map((p)=>{
            return [
                p,
                (0, _color.formatColor)({
                    ...parsed,
                    alpha: `var(${variable}, 1)`
                })
            ];
        }))
    };
}
}(withAlphaVariable));

var dataTypes = {};

var mathOperators = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    hasMathFn: function() {
        return hasMathFn;
    },
    addWhitespaceAroundMathOperators: function() {
        return addWhitespaceAroundMathOperators;
    }
});
const LOWER_A = 0x61;
const LOWER_Z = 0x7a;
const UPPER_A = 0x41;
const UPPER_Z = 0x5a;
const LOWER_E = 0x65;
const UPPER_E = 0x45;
const ZERO = 0x30;
const NINE = 0x39;
const ADD = 0x2b;
const SUB = 0x2d;
const MUL = 0x2a;
const DIV = 0x2f;
const OPEN_PAREN = 0x28;
const CLOSE_PAREN = 0x29;
const COMMA = 0x2c;
const SPACE = 0x20;
const PERCENT = 0x25;
const MATH_FUNCTIONS = [
    "calc",
    "min",
    "max",
    "clamp",
    "mod",
    "rem",
    "sin",
    "cos",
    "tan",
    "asin",
    "acos",
    "atan",
    "atan2",
    "pow",
    "sqrt",
    "hypot",
    "log",
    "exp",
    "round"
];
function hasMathFn(input) {
    return input.indexOf("(") !== -1 && MATH_FUNCTIONS.some((fn)=>input.includes(`${fn}(`));
}
function addWhitespaceAroundMathOperators(input) {
    // Bail early if there are no math functions in the input
    if (!MATH_FUNCTIONS.some((fn)=>input.includes(fn))) {
        return input;
    }
    let result = "";
    let formattable = [];
    let valuePos = null;
    let lastValuePos = null;
    for(let i = 0; i < input.length; i++){
        let char = input.charCodeAt(i);
        // Track if we see a number followed by a unit, then we know for sure that
        // this is not a function call.
        if (char >= ZERO && char <= NINE) {
            valuePos = i;
        } else if (valuePos !== null && (char === PERCENT || char >= LOWER_A && char <= LOWER_Z || char >= UPPER_A && char <= UPPER_Z)) {
            valuePos = i;
        } else {
            lastValuePos = valuePos;
            valuePos = null;
        }
        // Determine if we're inside a math function
        if (char === OPEN_PAREN) {
            result += input[i];
            // Scan backwards to determine the function name. This assumes math
            // functions are named with lowercase alphanumeric characters.
            let start = i;
            for(let j = i - 1; j >= 0; j--){
                let inner = input.charCodeAt(j);
                if (inner >= ZERO && inner <= NINE) {
                    start = j // 0-9
                    ;
                } else if (inner >= LOWER_A && inner <= LOWER_Z) {
                    start = j // a-z
                    ;
                } else {
                    break;
                }
            }
            let fn = input.slice(start, i);
            // This is a known math function so start formatting
            if (MATH_FUNCTIONS.includes(fn)) {
                formattable.unshift(true);
                continue;
            } else if (formattable[0] && fn === "") {
                formattable.unshift(true);
                continue;
            }
            // This is not a known math function so don't format it
            formattable.unshift(false);
            continue;
        } else if (char === CLOSE_PAREN) {
            result += input[i];
            formattable.shift();
        } else if (char === COMMA && formattable[0]) {
            result += `, `;
            continue;
        } else if (char === SPACE && formattable[0] && result.charCodeAt(result.length - 1) === SPACE) {
            continue;
        } else if ((char === ADD || char === MUL || char === DIV || char === SUB) && formattable[0]) {
            let trimmed = result.trimEnd();
            let prev = trimmed.charCodeAt(trimmed.length - 1);
            let prevPrev = trimmed.charCodeAt(trimmed.length - 2);
            let next = input.charCodeAt(i + 1);
            // Do not add spaces for scientific notation, e.g.: `-3.4e-2`
            if ((prev === LOWER_E || prev === UPPER_E) && prevPrev >= ZERO && prevPrev <= NINE) {
                result += input[i];
                continue;
            } else if (prev === ADD || prev === MUL || prev === DIV || prev === SUB) {
                result += input[i];
                continue;
            } else if (prev === OPEN_PAREN || prev === COMMA) {
                result += input[i];
                continue;
            } else if (input.charCodeAt(i - 1) === SPACE) {
                result += `${input[i]} `;
            } else if (// Previous is a digit
            prev >= ZERO && prev <= NINE || // Next is a digit
            next >= ZERO && next <= NINE || // Previous is end of a function call (or parenthesized expression)
            prev === CLOSE_PAREN || // Next is start of a parenthesized expression
            next === OPEN_PAREN || // Next is an operator
            next === ADD || next === MUL || next === DIV || next === SUB || // Previous position was a value (+ unit)
            lastValuePos !== null && lastValuePos === i - 1) {
                result += ` ${input[i]} `;
            } else {
                result += input[i];
            }
        } else {
            result += input[i];
        }
    }
    return result;
}
}(mathOperators));

var parseBoxShadowValue = {};

var splitAtTopLevelOnly = {};

/**
 * This splits a string on a top-level character.
 *
 * Regex doesn't support recursion (at least not the JS-flavored version).
 * So we have to use a tiny state machine to keep track of paren placement.
 *
 * Expected behavior using commas:
 * var(--a, 0 0 1px rgb(0, 0, 0)), 0 0 1px rgb(0, 0, 0)
 *       ─┬─             ┬  ┬    ┬
 *        x              x  x    ╰──────── Split because top-level
 *        ╰──────────────┴──┴───────────── Ignored b/c inside >= 1 levels of parens
 *
 * @param {string} input
 * @param {string} separator
 */

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "splitAtTopLevelOnly", {
    enumerable: true,
    get: function() {
        return splitAtTopLevelOnly;
    }
});
function splitAtTopLevelOnly(input, separator) {
    let stack = [];
    let parts = [];
    let lastPos = 0;
    let isEscaped = false;
    for(let idx = 0; idx < input.length; idx++){
        let char = input[idx];
        if (stack.length === 0 && char === separator[0] && !isEscaped) {
            if (separator.length === 1 || input.slice(idx, idx + separator.length) === separator) {
                parts.push(input.slice(lastPos, idx));
                lastPos = idx + separator.length;
            }
        }
        isEscaped = isEscaped ? false : char === "\\";
        if (char === "(" || char === "[" || char === "{") {
            stack.push(char);
        } else if (char === ")" && stack[stack.length - 1] === "(" || char === "]" && stack[stack.length - 1] === "[" || char === "}" && stack[stack.length - 1] === "{") {
            stack.pop();
        }
    }
    parts.push(input.slice(lastPos));
    return parts;
}
}(splitAtTopLevelOnly));

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    parseBoxShadowValue: function() {
        return parseBoxShadowValue;
    },
    formatBoxShadowValue: function() {
        return formatBoxShadowValue;
    }
});
const _splitAtTopLevelOnly = splitAtTopLevelOnly;
let KEYWORDS = new Set([
    "inset",
    "inherit",
    "initial",
    "revert",
    "unset"
]);
let SPACE = /\ +(?![^(]*\))/g // Similar to the one above, but with spaces instead.
;
let LENGTH = /^-?(\d+|\.\d+)(.*?)$/g;
function parseBoxShadowValue(input) {
    let shadows = (0, _splitAtTopLevelOnly.splitAtTopLevelOnly)(input, ",");
    return shadows.map((shadow)=>{
        let value = shadow.trim();
        let result = {
            raw: value
        };
        let parts = value.split(SPACE);
        let seen = new Set();
        for (let part of parts){
            // Reset index, since the regex is stateful.
            LENGTH.lastIndex = 0;
            // Keyword
            if (!seen.has("KEYWORD") && KEYWORDS.has(part)) {
                result.keyword = part;
                seen.add("KEYWORD");
            } else if (LENGTH.test(part)) {
                if (!seen.has("X")) {
                    result.x = part;
                    seen.add("X");
                } else if (!seen.has("Y")) {
                    result.y = part;
                    seen.add("Y");
                } else if (!seen.has("BLUR")) {
                    result.blur = part;
                    seen.add("BLUR");
                } else if (!seen.has("SPREAD")) {
                    result.spread = part;
                    seen.add("SPREAD");
                }
            } else {
                if (!result.color) {
                    result.color = part;
                } else {
                    if (!result.unknown) result.unknown = [];
                    result.unknown.push(part);
                }
            }
        }
        // Check if valid
        result.valid = result.x !== undefined && result.y !== undefined;
        return result;
    });
}
function formatBoxShadowValue(shadows) {
    return shadows.map((shadow)=>{
        if (!shadow.valid) {
            return shadow.raw;
        }
        return [
            shadow.keyword,
            shadow.x,
            shadow.y,
            shadow.blur,
            shadow.spread,
            shadow.color
        ].filter(Boolean).join(" ");
    }).join(", ");
}
}(parseBoxShadowValue));

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    normalize: function() {
        return normalize;
    },
    normalizeAttributeSelectors: function() {
        return normalizeAttributeSelectors;
    },
    url: function() {
        return url;
    },
    number: function() {
        return number;
    },
    percentage: function() {
        return percentage;
    },
    length: function() {
        return length;
    },
    lineWidth: function() {
        return lineWidth;
    },
    shadow: function() {
        return shadow;
    },
    color: function() {
        return color$1;
    },
    image: function() {
        return image;
    },
    gradient: function() {
        return gradient;
    },
    position: function() {
        return position;
    },
    familyName: function() {
        return familyName;
    },
    genericName: function() {
        return genericName;
    },
    absoluteSize: function() {
        return absoluteSize;
    },
    relativeSize: function() {
        return relativeSize;
    }
});
const _color = color;
const _mathoperators = mathOperators;
const _parseBoxShadowValue = parseBoxShadowValue;
const _splitAtTopLevelOnly = splitAtTopLevelOnly;
let cssFunctions = [
    "min",
    "max",
    "clamp",
    "calc"
];
// Ref: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Types
function isCSSFunction(value) {
    return cssFunctions.some((fn)=>new RegExp(`^${fn}\\(.*\\)`).test(value));
}
// These properties accept a `<dashed-ident>` as one of the values. This means that you can use them
// as: `timeline-scope: --tl;`
//
// Without the `var(--tl)`, in these cases we don't want to normalize the value, and you should add
// the `var()` yourself.
//
// More info:
// - https://drafts.csswg.org/scroll-animations/#propdef-timeline-scope
// - https://developer.mozilla.org/en-US/docs/Web/CSS/timeline-scope#dashed-ident
// - https://www.w3.org/TR/css-anchor-position-1
//
const AUTO_VAR_INJECTION_EXCEPTIONS = new Set([
    // Concrete properties
    "scroll-timeline-name",
    "timeline-scope",
    "view-timeline-name",
    "font-palette",
    "anchor-name",
    "anchor-scope",
    "position-anchor",
    "position-try-options",
    // Shorthand properties
    "scroll-timeline",
    "animation-timeline",
    "view-timeline",
    "position-try"
]);
function normalize(value, context = null, isRoot = true) {
    let isVarException = context && AUTO_VAR_INJECTION_EXCEPTIONS.has(context.property);
    if (value.startsWith("--") && !isVarException) {
        return `var(${value})`;
    }
    // Keep raw strings if it starts with `url(`
    if (value.includes("url(")) {
        return value.split(/(url\(.*?\))/g).filter(Boolean).map((part)=>{
            if (/^url\(.*?\)$/.test(part)) {
                return part;
            }
            return normalize(part, context, false);
        }).join("");
    }
    // Convert `_` to ` `, except for escaped underscores `\_`
    value = value.replace(/([^\\])_+/g, (fullMatch, characterBefore)=>characterBefore + " ".repeat(fullMatch.length - 1)).replace(/^_/g, " ").replace(/\\_/g, "_");
    // Remove leftover whitespace
    if (isRoot) {
        value = value.trim();
    }
    value = (0, _mathoperators.addWhitespaceAroundMathOperators)(value);
    return value;
}
function normalizeAttributeSelectors(value) {
    // Wrap values in attribute selectors with quotes
    if (value.includes("=")) {
        value = value.replace(/(=.*)/g, (_fullMatch, match)=>{
            if (match[1] === "'" || match[1] === '"') {
                return match;
            }
            // Handle regex flags on unescaped values
            if (match.length > 2) {
                let trailingCharacter = match[match.length - 1];
                if (match[match.length - 2] === " " && (trailingCharacter === "i" || trailingCharacter === "I" || trailingCharacter === "s" || trailingCharacter === "S")) {
                    return `="${match.slice(1, -2)}" ${match[match.length - 1]}`;
                }
            }
            return `="${match.slice(1)}"`;
        });
    }
    return value;
}
function url(value) {
    return value.startsWith("url(");
}
function number(value) {
    return !isNaN(Number(value)) || isCSSFunction(value);
}
function percentage(value) {
    return value.endsWith("%") && number(value.slice(0, -1)) || isCSSFunction(value);
}
// Please refer to MDN when updating this list:
// https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units
// https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries#container_query_length_units
let lengthUnits = [
    "cm",
    "mm",
    "Q",
    "in",
    "pc",
    "pt",
    "px",
    "em",
    "ex",
    "ch",
    "rem",
    "lh",
    "rlh",
    "vw",
    "vh",
    "vmin",
    "vmax",
    "vb",
    "vi",
    "svw",
    "svh",
    "lvw",
    "lvh",
    "dvw",
    "dvh",
    "cqw",
    "cqh",
    "cqi",
    "cqb",
    "cqmin",
    "cqmax"
];
let lengthUnitsPattern = `(?:${lengthUnits.join("|")})`;
function length(value) {
    return value === "0" || new RegExp(`^[+-]?[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?${lengthUnitsPattern}$`).test(value) || isCSSFunction(value);
}
let lineWidths = new Set([
    "thin",
    "medium",
    "thick"
]);
function lineWidth(value) {
    return lineWidths.has(value);
}
function shadow(value) {
    let parsedShadows = (0, _parseBoxShadowValue.parseBoxShadowValue)(normalize(value));
    for (let parsedShadow of parsedShadows){
        if (!parsedShadow.valid) {
            return false;
        }
    }
    return true;
}
function color$1(value) {
    let colors = 0;
    let result = (0, _splitAtTopLevelOnly.splitAtTopLevelOnly)(value, "_").every((part)=>{
        part = normalize(part);
        if (part.startsWith("var(")) return true;
        if ((0, _color.parseColor)(part, {
            loose: true
        }) !== null) return colors++, true;
        return false;
    });
    if (!result) return false;
    return colors > 0;
}
function image(value) {
    let images = 0;
    let result = (0, _splitAtTopLevelOnly.splitAtTopLevelOnly)(value, ",").every((part)=>{
        part = normalize(part);
        if (part.startsWith("var(")) return true;
        if (url(part) || gradient(part) || [
            "element(",
            "image(",
            "cross-fade(",
            "image-set("
        ].some((fn)=>part.startsWith(fn))) {
            images++;
            return true;
        }
        return false;
    });
    if (!result) return false;
    return images > 0;
}
let gradientTypes = new Set([
    "conic-gradient",
    "linear-gradient",
    "radial-gradient",
    "repeating-conic-gradient",
    "repeating-linear-gradient",
    "repeating-radial-gradient"
]);
function gradient(value) {
    value = normalize(value);
    for (let type of gradientTypes){
        if (value.startsWith(`${type}(`)) {
            return true;
        }
    }
    return false;
}
let validPositions = new Set([
    "center",
    "top",
    "right",
    "bottom",
    "left"
]);
function position(value) {
    let positions = 0;
    let result = (0, _splitAtTopLevelOnly.splitAtTopLevelOnly)(value, "_").every((part)=>{
        part = normalize(part);
        if (part.startsWith("var(")) return true;
        if (validPositions.has(part) || length(part) || percentage(part)) {
            positions++;
            return true;
        }
        return false;
    });
    if (!result) return false;
    return positions > 0;
}
function familyName(value) {
    let fonts = 0;
    let result = (0, _splitAtTopLevelOnly.splitAtTopLevelOnly)(value, ",").every((part)=>{
        part = normalize(part);
        if (part.startsWith("var(")) return true;
        // If it contains spaces, then it should be quoted
        if (part.includes(" ")) {
            if (!/(['"])([^"']+)\1/g.test(part)) {
                return false;
            }
        }
        // If it starts with a number, it's invalid
        if (/^\d/g.test(part)) {
            return false;
        }
        fonts++;
        return true;
    });
    if (!result) return false;
    return fonts > 0;
}
let genericNames = new Set([
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
    "ui-rounded",
    "math",
    "emoji",
    "fangsong"
]);
function genericName(value) {
    return genericNames.has(value);
}
let absoluteSizes = new Set([
    "xx-small",
    "x-small",
    "small",
    "medium",
    "large",
    "x-large",
    "xx-large",
    "xxx-large"
]);
function absoluteSize(value) {
    return absoluteSizes.has(value);
}
let relativeSizes = new Set([
    "larger",
    "smaller"
]);
function relativeSize(value) {
    return relativeSizes.has(value);
}
}(dataTypes));

var validateFormalSyntax = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "backgroundSize", {
    enumerable: true,
    get: function() {
        return backgroundSize;
    }
});
const _dataTypes = dataTypes;
const _splitAtTopLevelOnly = splitAtTopLevelOnly;
function backgroundSize(value) {
    let keywordValues = [
        "cover",
        "contain"
    ];
    // the <length-percentage> type will probably be a css function
    // so we have to use `splitAtTopLevelOnly`
    return (0, _splitAtTopLevelOnly.splitAtTopLevelOnly)(value, ",").every((part)=>{
        let sizes = (0, _splitAtTopLevelOnly.splitAtTopLevelOnly)(part, "_").filter(Boolean);
        if (sizes.length === 1 && keywordValues.includes(sizes[0])) return true;
        if (sizes.length !== 1 && sizes.length !== 2) return false;
        return sizes.every((size)=>(0, _dataTypes.length)(size) || (0, _dataTypes.percentage)(size) || size === "auto");
    });
}
}(validateFormalSyntax));

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    updateAllClasses: function() {
        return updateAllClasses;
    },
    asValue: function() {
        return asValue;
    },
    parseColorFormat: function() {
        return parseColorFormat;
    },
    asColor: function() {
        return asColor;
    },
    asLookupValue: function() {
        return asLookupValue;
    },
    typeMap: function() {
        return typeMap;
    },
    coerceValue: function() {
        return coerceValue;
    },
    getMatchingTypes: function() {
        return getMatchingTypes;
    }
});
const _escapeCommas = /*#__PURE__*/ _interop_require_default(escapeCommas);
const _withAlphaVariable = withAlphaVariable;
const _dataTypes = dataTypes;
const _negateValue = /*#__PURE__*/ _interop_require_default(negateValue);
const _validateFormalSyntax = validateFormalSyntax;
const _featureFlags = featureFlags;
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function updateAllClasses(selectors, updateClass) {
    selectors.walkClasses((sel)=>{
        sel.value = updateClass(sel.value);
        if (sel.raws && sel.raws.value) {
            sel.raws.value = (0, _escapeCommas.default)(sel.raws.value);
        }
    });
}
function resolveArbitraryValue(modifier, validate) {
    if (!isArbitraryValue(modifier)) {
        return undefined;
    }
    let value = modifier.slice(1, -1);
    if (!validate(value)) {
        return undefined;
    }
    return (0, _dataTypes.normalize)(value);
}
function asNegativeValue(modifier, lookup = {}, validate) {
    let positiveValue = lookup[modifier];
    if (positiveValue !== undefined) {
        return (0, _negateValue.default)(positiveValue);
    }
    if (isArbitraryValue(modifier)) {
        let resolved = resolveArbitraryValue(modifier, validate);
        if (resolved === undefined) {
            return undefined;
        }
        return (0, _negateValue.default)(resolved);
    }
}
function asValue(modifier, options = {}, { validate =()=>true  } = {}) {
    var _options_values;
    let value = (_options_values = options.values) === null || _options_values === void 0 ? void 0 : _options_values[modifier];
    if (value !== undefined) {
        return value;
    }
    if (options.supportsNegativeValues && modifier.startsWith("-")) {
        return asNegativeValue(modifier.slice(1), options.values, validate);
    }
    return resolveArbitraryValue(modifier, validate);
}
function isArbitraryValue(input) {
    return input.startsWith("[") && input.endsWith("]");
}
function splitUtilityModifier(modifier) {
    let slashIdx = modifier.lastIndexOf("/");
    // If the `/` is inside an arbitrary, we want to find the previous one if any
    // This logic probably isn't perfect but it should work for most cases
    let arbitraryStartIdx = modifier.lastIndexOf("[", slashIdx);
    let arbitraryEndIdx = modifier.indexOf("]", slashIdx);
    let isNextToArbitrary = modifier[slashIdx - 1] === "]" || modifier[slashIdx + 1] === "[";
    // Backtrack to the previous `/` if the one we found was inside an arbitrary
    if (!isNextToArbitrary) {
        if (arbitraryStartIdx !== -1 && arbitraryEndIdx !== -1) {
            if (arbitraryStartIdx < slashIdx && slashIdx < arbitraryEndIdx) {
                slashIdx = modifier.lastIndexOf("/", arbitraryStartIdx);
            }
        }
    }
    if (slashIdx === -1 || slashIdx === modifier.length - 1) {
        return [
            modifier,
            undefined
        ];
    }
    let arbitrary = isArbitraryValue(modifier);
    // The modifier could be of the form `[foo]/[bar]`
    // We want to handle this case properly
    // without affecting `[foo/bar]`
    if (arbitrary && !modifier.includes("]/[")) {
        return [
            modifier,
            undefined
        ];
    }
    return [
        modifier.slice(0, slashIdx),
        modifier.slice(slashIdx + 1)
    ];
}
function parseColorFormat(value) {
    if (typeof value === "string" && value.includes("<alpha-value>")) {
        let oldValue = value;
        return ({ opacityValue =1  })=>oldValue.replace(/<alpha-value>/g, opacityValue);
    }
    return value;
}
function unwrapArbitraryModifier(modifier) {
    return (0, _dataTypes.normalize)(modifier.slice(1, -1));
}
function asColor(modifier, options = {}, { tailwindConfig ={}  } = {}) {
    var _options_values;
    if (((_options_values = options.values) === null || _options_values === void 0 ? void 0 : _options_values[modifier]) !== undefined) {
        var _options_values1;
        return parseColorFormat((_options_values1 = options.values) === null || _options_values1 === void 0 ? void 0 : _options_values1[modifier]);
    }
    // TODO: Hoist this up to getMatchingTypes or something
    // We do this here because we need the alpha value (if any)
    let [color, alpha] = splitUtilityModifier(modifier);
    if (alpha !== undefined) {
        var _options_values2, _tailwindConfig_theme, _tailwindConfig_theme_opacity;
        var _options_values_color;
        let normalizedColor = (_options_values_color = (_options_values2 = options.values) === null || _options_values2 === void 0 ? void 0 : _options_values2[color]) !== null && _options_values_color !== void 0 ? _options_values_color : isArbitraryValue(color) ? color.slice(1, -1) : undefined;
        if (normalizedColor === undefined) {
            return undefined;
        }
        normalizedColor = parseColorFormat(normalizedColor);
        if (isArbitraryValue(alpha)) {
            return (0, _withAlphaVariable.withAlphaValue)(normalizedColor, unwrapArbitraryModifier(alpha));
        }
        if (((_tailwindConfig_theme = tailwindConfig.theme) === null || _tailwindConfig_theme === void 0 ? void 0 : (_tailwindConfig_theme_opacity = _tailwindConfig_theme.opacity) === null || _tailwindConfig_theme_opacity === void 0 ? void 0 : _tailwindConfig_theme_opacity[alpha]) === undefined) {
            return undefined;
        }
        return (0, _withAlphaVariable.withAlphaValue)(normalizedColor, tailwindConfig.theme.opacity[alpha]);
    }
    return asValue(modifier, options, {
        validate: _dataTypes.color
    });
}
function asLookupValue(modifier, options = {}) {
    var _options_values;
    return (_options_values = options.values) === null || _options_values === void 0 ? void 0 : _options_values[modifier];
}
function guess(validate) {
    return (modifier, options)=>{
        return asValue(modifier, options, {
            validate
        });
    };
}
let typeMap = {
    any: asValue,
    color: asColor,
    url: guess(_dataTypes.url),
    image: guess(_dataTypes.image),
    length: guess(_dataTypes.length),
    percentage: guess(_dataTypes.percentage),
    position: guess(_dataTypes.position),
    lookup: asLookupValue,
    "generic-name": guess(_dataTypes.genericName),
    "family-name": guess(_dataTypes.familyName),
    number: guess(_dataTypes.number),
    "line-width": guess(_dataTypes.lineWidth),
    "absolute-size": guess(_dataTypes.absoluteSize),
    "relative-size": guess(_dataTypes.relativeSize),
    shadow: guess(_dataTypes.shadow),
    size: guess(_validateFormalSyntax.backgroundSize)
};
let supportedTypes = Object.keys(typeMap);
function splitAtFirst(input, delim) {
    let idx = input.indexOf(delim);
    if (idx === -1) return [
        undefined,
        input
    ];
    return [
        input.slice(0, idx),
        input.slice(idx + 1)
    ];
}
function coerceValue(types, modifier, options, tailwindConfig) {
    if (options.values && modifier in options.values) {
        for (let { type  } of types !== null && types !== void 0 ? types : []){
            let result = typeMap[type](modifier, options, {
                tailwindConfig
            });
            if (result === undefined) {
                continue;
            }
            return [
                result,
                type,
                null
            ];
        }
    }
    if (isArbitraryValue(modifier)) {
        let arbitraryValue = modifier.slice(1, -1);
        let [explicitType, value] = splitAtFirst(arbitraryValue, ":");
        // It could be that this resolves to `url(https` which is not a valid
        // identifier. We currently only support "simple" words with dashes or
        // underscores. E.g.: family-name
        if (!/^[\w-_]+$/g.test(explicitType)) {
            value = arbitraryValue;
        } else if (explicitType !== undefined && !supportedTypes.includes(explicitType)) {
            return [];
        }
        if (value.length > 0 && supportedTypes.includes(explicitType)) {
            return [
                asValue(`[${value}]`, options),
                explicitType,
                null
            ];
        }
    }
    let matches = getMatchingTypes(types, modifier, options, tailwindConfig);
    // Find first matching type
    for (let match of matches){
        return match;
    }
    return [];
}
function* getMatchingTypes(types, rawModifier, options, tailwindConfig) {
    let modifiersEnabled = (0, _featureFlags.flagEnabled)(tailwindConfig, "generalizedModifiers");
    let [modifier, utilityModifier] = splitUtilityModifier(rawModifier);
    let canUseUtilityModifier = modifiersEnabled && options.modifiers != null && (options.modifiers === "any" || typeof options.modifiers === "object" && (utilityModifier && isArbitraryValue(utilityModifier) || utilityModifier in options.modifiers));
    if (!canUseUtilityModifier) {
        modifier = rawModifier;
        utilityModifier = undefined;
    }
    if (utilityModifier !== undefined && modifier === "") {
        modifier = "DEFAULT";
    }
    // Check the full value first
    // TODO: Move to asValue… somehow
    if (utilityModifier !== undefined) {
        if (typeof options.modifiers === "object") {
            var _options_modifiers;
            var _options_modifiers_utilityModifier;
            let configValue = (_options_modifiers_utilityModifier = (_options_modifiers = options.modifiers) === null || _options_modifiers === void 0 ? void 0 : _options_modifiers[utilityModifier]) !== null && _options_modifiers_utilityModifier !== void 0 ? _options_modifiers_utilityModifier : null;
            if (configValue !== null) {
                utilityModifier = configValue;
            } else if (isArbitraryValue(utilityModifier)) {
                utilityModifier = unwrapArbitraryModifier(utilityModifier);
            }
        }
    }
    for (let { type  } of types !== null && types !== void 0 ? types : []){
        let result = typeMap[type](modifier, options, {
            tailwindConfig
        });
        if (result === undefined) {
            continue;
        }
        yield [
            result,
            type,
            utilityModifier !== null && utilityModifier !== void 0 ? utilityModifier : null
        ];
    }
}
}(pluginUtils));

var toColorValue = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return toColorValue;
    }
});
function toColorValue(maybeFunction) {
    return typeof maybeFunction === "function" ? maybeFunction({}) : maybeFunction;
}
}(toColorValue));

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return resolveConfig;
    }
});
const _negateValue = /*#__PURE__*/ _interop_require_default(negateValue);
const _corePluginList = /*#__PURE__*/ _interop_require_default(corePluginList);
const _configurePlugins = /*#__PURE__*/ _interop_require_default(configurePlugins);
const _colors = /*#__PURE__*/ _interop_require_default(colors);
const _defaults = defaults$2;
const _toPath = toPath;
const _normalizeConfig = normalizeConfig;
const _isPlainObject = /*#__PURE__*/ _interop_require_default(isPlainObject$1);
const _cloneDeep = cloneDeep;
const _pluginUtils = pluginUtils;
const _withAlphaVariable = withAlphaVariable;
const _toColorValue = /*#__PURE__*/ _interop_require_default(toColorValue);
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function isFunction(input) {
    return typeof input === "function";
}
function mergeWith(target, ...sources) {
    let customizer = sources.pop();
    for (let source of sources){
        for(let k in source){
            let merged = customizer(target[k], source[k]);
            if (merged === undefined) {
                if ((0, _isPlainObject.default)(target[k]) && (0, _isPlainObject.default)(source[k])) {
                    target[k] = mergeWith({}, target[k], source[k], customizer);
                } else {
                    target[k] = source[k];
                }
            } else {
                target[k] = merged;
            }
        }
    }
    return target;
}
const configUtils = {
    colors: _colors.default,
    negative (scale) {
        // TODO: Log that this function isn't really needed anymore?
        return Object.keys(scale).filter((key)=>scale[key] !== "0").reduce((negativeScale, key)=>{
            let negativeValue = (0, _negateValue.default)(scale[key]);
            if (negativeValue !== undefined) {
                negativeScale[`-${key}`] = negativeValue;
            }
            return negativeScale;
        }, {});
    },
    breakpoints (screens) {
        return Object.keys(screens).filter((key)=>typeof screens[key] === "string").reduce((breakpoints, key)=>({
                ...breakpoints,
                [`screen-${key}`]: screens[key]
            }), {});
    }
};
function value(valueToResolve, ...args) {
    return isFunction(valueToResolve) ? valueToResolve(...args) : valueToResolve;
}
function collectExtends(items) {
    return items.reduce((merged, { extend  })=>{
        return mergeWith(merged, extend, (mergedValue, extendValue)=>{
            if (mergedValue === undefined) {
                return [
                    extendValue
                ];
            }
            if (Array.isArray(mergedValue)) {
                return [
                    extendValue,
                    ...mergedValue
                ];
            }
            return [
                extendValue,
                mergedValue
            ];
        });
    }, {});
}
function mergeThemes(themes) {
    return {
        ...themes.reduce((merged, theme)=>(0, _defaults.defaults)(merged, theme), {}),
        // In order to resolve n config objects, we combine all of their `extend` properties
        // into arrays instead of objects so they aren't overridden.
        extend: collectExtends(themes)
    };
}
function mergeExtensionCustomizer(merged, value) {
    // When we have an array of objects, we do want to merge it
    if (Array.isArray(merged) && (0, _isPlainObject.default)(merged[0])) {
        return merged.concat(value);
    }
    // When the incoming value is an array, and the existing config is an object, prepend the existing object
    if (Array.isArray(value) && (0, _isPlainObject.default)(value[0]) && (0, _isPlainObject.default)(merged)) {
        return [
            merged,
            ...value
        ];
    }
    // Override arrays (for example for font-families, box-shadows, ...)
    if (Array.isArray(value)) {
        return value;
    }
    // Execute default behaviour
    return undefined;
}
function mergeExtensions({ extend , ...theme }) {
    return mergeWith(theme, extend, (themeValue, extensions)=>{
        // The `extend` property is an array, so we need to check if it contains any functions
        if (!isFunction(themeValue) && !extensions.some(isFunction)) {
            return mergeWith({}, themeValue, ...extensions, mergeExtensionCustomizer);
        }
        return (resolveThemePath, utils)=>mergeWith({}, ...[
                themeValue,
                ...extensions
            ].map((e)=>value(e, resolveThemePath, utils)), mergeExtensionCustomizer);
    });
}
/**
 *
 * @param {string} key
 * @return {Iterable<string[] & {alpha: string | undefined}>}
 */ function* toPaths(key) {
    let path = (0, _toPath.toPath)(key);
    if (path.length === 0) {
        return;
    }
    yield path;
    if (Array.isArray(key)) {
        return;
    }
    let pattern = /^(.*?)\s*\/\s*([^/]+)$/;
    let matches = key.match(pattern);
    if (matches !== null) {
        let [, prefix, alpha] = matches;
        let newPath = (0, _toPath.toPath)(prefix);
        newPath.alpha = alpha;
        yield newPath;
    }
}
function resolveFunctionKeys(object) {
    // theme('colors.red.500 / 0.5') -> ['colors', 'red', '500 / 0', '5]
    const resolvePath = (key, defaultValue)=>{
        for (const path of toPaths(key)){
            let index = 0;
            let val = object;
            while(val !== undefined && val !== null && index < path.length){
                val = val[path[index++]];
                let shouldResolveAsFn = isFunction(val) && (path.alpha === undefined || index <= path.length - 1);
                val = shouldResolveAsFn ? val(resolvePath, configUtils) : val;
            }
            if (val !== undefined) {
                if (path.alpha !== undefined) {
                    let normalized = (0, _pluginUtils.parseColorFormat)(val);
                    return (0, _withAlphaVariable.withAlphaValue)(normalized, path.alpha, (0, _toColorValue.default)(normalized));
                }
                if ((0, _isPlainObject.default)(val)) {
                    return (0, _cloneDeep.cloneDeep)(val);
                }
                return val;
            }
        }
        return defaultValue;
    };
    Object.assign(resolvePath, {
        theme: resolvePath,
        ...configUtils
    });
    return Object.keys(object).reduce((resolved, key)=>{
        resolved[key] = isFunction(object[key]) ? object[key](resolvePath, configUtils) : object[key];
        return resolved;
    }, {});
}
function extractPluginConfigs(configs) {
    let allConfigs = [];
    configs.forEach((config)=>{
        allConfigs = [
            ...allConfigs,
            config
        ];
        var _config_plugins;
        const plugins = (_config_plugins = config === null || config === void 0 ? void 0 : config.plugins) !== null && _config_plugins !== void 0 ? _config_plugins : [];
        if (plugins.length === 0) {
            return;
        }
        plugins.forEach((plugin)=>{
            if (plugin.__isOptionsFunction) {
                plugin = plugin();
            }
            var _plugin_config;
            allConfigs = [
                ...allConfigs,
                ...extractPluginConfigs([
                    (_plugin_config = plugin === null || plugin === void 0 ? void 0 : plugin.config) !== null && _plugin_config !== void 0 ? _plugin_config : {}
                ])
            ];
        });
    });
    return allConfigs;
}
function resolveCorePlugins(corePluginConfigs) {
    const result = [
        ...corePluginConfigs
    ].reduceRight((resolved, corePluginConfig)=>{
        if (isFunction(corePluginConfig)) {
            return corePluginConfig({
                corePlugins: resolved
            });
        }
        return (0, _configurePlugins.default)(corePluginConfig, resolved);
    }, _corePluginList.default);
    return result;
}
function resolvePluginLists(pluginLists) {
    const result = [
        ...pluginLists
    ].reduceRight((resolved, pluginList)=>{
        return [
            ...resolved,
            ...pluginList
        ];
    }, []);
    return result;
}
function resolveConfig(configs) {
    let allConfigs = [
        ...extractPluginConfigs(configs),
        {
            prefix: "",
            important: false,
            separator: ":"
        }
    ];
    var _t_theme, _c_plugins;
    return (0, _normalizeConfig.normalizeConfig)((0, _defaults.defaults)({
        theme: resolveFunctionKeys(mergeExtensions(mergeThemes(allConfigs.map((t)=>{
            return (_t_theme = t === null || t === void 0 ? void 0 : t.theme) !== null && _t_theme !== void 0 ? _t_theme : {};
        })))),
        corePlugins: resolveCorePlugins(allConfigs.map((c)=>c.corePlugins)),
        plugins: resolvePluginLists(configs.map((c)=>{
            return (_c_plugins = c === null || c === void 0 ? void 0 : c.plugins) !== null && _c_plugins !== void 0 ? _c_plugins : [];
        }))
    }, ...allConfigs));
}
}(resolveConfig$2));

var getAllConfigs = {};

var config_full = {
  content: [],
  presets: [],
  darkMode: 'media', // or 'class'
  theme: {
    accentColor: ({ theme }) => ({
      ...theme('colors'),
      auto: 'auto',
    }),
    animation: {
      none: 'none',
      spin: 'spin 1s linear infinite',
      ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
      pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      bounce: 'bounce 1s infinite',
    },
    aria: {
      busy: 'busy="true"',
      checked: 'checked="true"',
      disabled: 'disabled="true"',
      expanded: 'expanded="true"',
      hidden: 'hidden="true"',
      pressed: 'pressed="true"',
      readonly: 'readonly="true"',
      required: 'required="true"',
      selected: 'selected="true"',
    },
    aspectRatio: {
      auto: 'auto',
      square: '1 / 1',
      video: '16 / 9',
    },
    backdropBlur: ({ theme }) => theme('blur'),
    backdropBrightness: ({ theme }) => theme('brightness'),
    backdropContrast: ({ theme }) => theme('contrast'),
    backdropGrayscale: ({ theme }) => theme('grayscale'),
    backdropHueRotate: ({ theme }) => theme('hueRotate'),
    backdropInvert: ({ theme }) => theme('invert'),
    backdropOpacity: ({ theme }) => theme('opacity'),
    backdropSaturate: ({ theme }) => theme('saturate'),
    backdropSepia: ({ theme }) => theme('sepia'),
    backgroundColor: ({ theme }) => theme('colors'),
    backgroundImage: {
      none: 'none',
      'gradient-to-t': 'linear-gradient(to top, var(--tw-gradient-stops))',
      'gradient-to-tr': 'linear-gradient(to top right, var(--tw-gradient-stops))',
      'gradient-to-r': 'linear-gradient(to right, var(--tw-gradient-stops))',
      'gradient-to-br': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
      'gradient-to-b': 'linear-gradient(to bottom, var(--tw-gradient-stops))',
      'gradient-to-bl': 'linear-gradient(to bottom left, var(--tw-gradient-stops))',
      'gradient-to-l': 'linear-gradient(to left, var(--tw-gradient-stops))',
      'gradient-to-tl': 'linear-gradient(to top left, var(--tw-gradient-stops))',
    },
    backgroundOpacity: ({ theme }) => theme('opacity'),
    backgroundPosition: {
      bottom: 'bottom',
      center: 'center',
      left: 'left',
      'left-bottom': 'left bottom',
      'left-top': 'left top',
      right: 'right',
      'right-bottom': 'right bottom',
      'right-top': 'right top',
      top: 'top',
    },
    backgroundSize: {
      auto: 'auto',
      cover: 'cover',
      contain: 'contain',
    },
    blur: {
      0: '0',
      none: '',
      sm: '4px',
      DEFAULT: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      '2xl': '40px',
      '3xl': '64px',
    },
    borderColor: ({ theme }) => ({
      ...theme('colors'),
      DEFAULT: theme('colors.gray.200', 'currentColor'),
    }),
    borderOpacity: ({ theme }) => theme('opacity'),
    borderRadius: {
      none: '0px',
      sm: '0.125rem',
      DEFAULT: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      '3xl': '1.5rem',
      full: '9999px',
    },
    borderSpacing: ({ theme }) => ({
      ...theme('spacing'),
    }),
    borderWidth: {
      DEFAULT: '1px',
      0: '0px',
      2: '2px',
      4: '4px',
      8: '8px',
    },
    boxShadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      none: 'none',
    },
    boxShadowColor: ({ theme }) => theme('colors'),
    brightness: {
      0: '0',
      50: '.5',
      75: '.75',
      90: '.9',
      95: '.95',
      100: '1',
      105: '1.05',
      110: '1.1',
      125: '1.25',
      150: '1.5',
      200: '2',
    },
    caretColor: ({ theme }) => theme('colors'),
    colors: ({ colors }) => ({
      inherit: colors.inherit,
      current: colors.current,
      transparent: colors.transparent,
      black: colors.black,
      white: colors.white,
      slate: colors.slate,
      gray: colors.gray,
      zinc: colors.zinc,
      neutral: colors.neutral,
      stone: colors.stone,
      red: colors.red,
      orange: colors.orange,
      amber: colors.amber,
      yellow: colors.yellow,
      lime: colors.lime,
      green: colors.green,
      emerald: colors.emerald,
      teal: colors.teal,
      cyan: colors.cyan,
      sky: colors.sky,
      blue: colors.blue,
      indigo: colors.indigo,
      violet: colors.violet,
      purple: colors.purple,
      fuchsia: colors.fuchsia,
      pink: colors.pink,
      rose: colors.rose,
    }),
    columns: {
      auto: 'auto',
      1: '1',
      2: '2',
      3: '3',
      4: '4',
      5: '5',
      6: '6',
      7: '7',
      8: '8',
      9: '9',
      10: '10',
      11: '11',
      12: '12',
      '3xs': '16rem',
      '2xs': '18rem',
      xs: '20rem',
      sm: '24rem',
      md: '28rem',
      lg: '32rem',
      xl: '36rem',
      '2xl': '42rem',
      '3xl': '48rem',
      '4xl': '56rem',
      '5xl': '64rem',
      '6xl': '72rem',
      '7xl': '80rem',
    },
    container: {},
    content: {
      none: 'none',
    },
    contrast: {
      0: '0',
      50: '.5',
      75: '.75',
      100: '1',
      125: '1.25',
      150: '1.5',
      200: '2',
    },
    cursor: {
      auto: 'auto',
      default: 'default',
      pointer: 'pointer',
      wait: 'wait',
      text: 'text',
      move: 'move',
      help: 'help',
      'not-allowed': 'not-allowed',
      none: 'none',
      'context-menu': 'context-menu',
      progress: 'progress',
      cell: 'cell',
      crosshair: 'crosshair',
      'vertical-text': 'vertical-text',
      alias: 'alias',
      copy: 'copy',
      'no-drop': 'no-drop',
      grab: 'grab',
      grabbing: 'grabbing',
      'all-scroll': 'all-scroll',
      'col-resize': 'col-resize',
      'row-resize': 'row-resize',
      'n-resize': 'n-resize',
      'e-resize': 'e-resize',
      's-resize': 's-resize',
      'w-resize': 'w-resize',
      'ne-resize': 'ne-resize',
      'nw-resize': 'nw-resize',
      'se-resize': 'se-resize',
      'sw-resize': 'sw-resize',
      'ew-resize': 'ew-resize',
      'ns-resize': 'ns-resize',
      'nesw-resize': 'nesw-resize',
      'nwse-resize': 'nwse-resize',
      'zoom-in': 'zoom-in',
      'zoom-out': 'zoom-out',
    },
    divideColor: ({ theme }) => theme('borderColor'),
    divideOpacity: ({ theme }) => theme('borderOpacity'),
    divideWidth: ({ theme }) => theme('borderWidth'),
    dropShadow: {
      sm: '0 1px 1px rgb(0 0 0 / 0.05)',
      DEFAULT: ['0 1px 2px rgb(0 0 0 / 0.1)', '0 1px 1px rgb(0 0 0 / 0.06)'],
      md: ['0 4px 3px rgb(0 0 0 / 0.07)', '0 2px 2px rgb(0 0 0 / 0.06)'],
      lg: ['0 10px 8px rgb(0 0 0 / 0.04)', '0 4px 3px rgb(0 0 0 / 0.1)'],
      xl: ['0 20px 13px rgb(0 0 0 / 0.03)', '0 8px 5px rgb(0 0 0 / 0.08)'],
      '2xl': '0 25px 25px rgb(0 0 0 / 0.15)',
      none: '0 0 #0000',
    },
    fill: ({ theme }) => ({
      none: 'none',
      ...theme('colors'),
    }),
    flex: {
      1: '1 1 0%',
      auto: '1 1 auto',
      initial: '0 1 auto',
      none: 'none',
    },
    flexBasis: ({ theme }) => ({
      auto: 'auto',
      ...theme('spacing'),
      '1/2': '50%',
      '1/3': '33.333333%',
      '2/3': '66.666667%',
      '1/4': '25%',
      '2/4': '50%',
      '3/4': '75%',
      '1/5': '20%',
      '2/5': '40%',
      '3/5': '60%',
      '4/5': '80%',
      '1/6': '16.666667%',
      '2/6': '33.333333%',
      '3/6': '50%',
      '4/6': '66.666667%',
      '5/6': '83.333333%',
      '1/12': '8.333333%',
      '2/12': '16.666667%',
      '3/12': '25%',
      '4/12': '33.333333%',
      '5/12': '41.666667%',
      '6/12': '50%',
      '7/12': '58.333333%',
      '8/12': '66.666667%',
      '9/12': '75%',
      '10/12': '83.333333%',
      '11/12': '91.666667%',
      full: '100%',
    }),
    flexGrow: {
      0: '0',
      DEFAULT: '1',
    },
    flexShrink: {
      0: '0',
      DEFAULT: '1',
    },
    fontFamily: {
      sans: [
        'ui-sans-serif',
        'system-ui',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
        '"Noto Color Emoji"',
      ],
      serif: ['ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
      mono: [
        'ui-monospace',
        'SFMono-Regular',
        'Menlo',
        'Monaco',
        'Consolas',
        '"Liberation Mono"',
        '"Courier New"',
        'monospace',
      ],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
      '7xl': ['4.5rem', { lineHeight: '1' }],
      '8xl': ['6rem', { lineHeight: '1' }],
      '9xl': ['8rem', { lineHeight: '1' }],
    },
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
    gap: ({ theme }) => theme('spacing'),
    gradientColorStops: ({ theme }) => theme('colors'),
    gradientColorStopPositions: {
      '0%': '0%',
      '5%': '5%',
      '10%': '10%',
      '15%': '15%',
      '20%': '20%',
      '25%': '25%',
      '30%': '30%',
      '35%': '35%',
      '40%': '40%',
      '45%': '45%',
      '50%': '50%',
      '55%': '55%',
      '60%': '60%',
      '65%': '65%',
      '70%': '70%',
      '75%': '75%',
      '80%': '80%',
      '85%': '85%',
      '90%': '90%',
      '95%': '95%',
      '100%': '100%',
    },
    grayscale: {
      0: '0',
      DEFAULT: '100%',
    },
    gridAutoColumns: {
      auto: 'auto',
      min: 'min-content',
      max: 'max-content',
      fr: 'minmax(0, 1fr)',
    },
    gridAutoRows: {
      auto: 'auto',
      min: 'min-content',
      max: 'max-content',
      fr: 'minmax(0, 1fr)',
    },
    gridColumn: {
      auto: 'auto',
      'span-1': 'span 1 / span 1',
      'span-2': 'span 2 / span 2',
      'span-3': 'span 3 / span 3',
      'span-4': 'span 4 / span 4',
      'span-5': 'span 5 / span 5',
      'span-6': 'span 6 / span 6',
      'span-7': 'span 7 / span 7',
      'span-8': 'span 8 / span 8',
      'span-9': 'span 9 / span 9',
      'span-10': 'span 10 / span 10',
      'span-11': 'span 11 / span 11',
      'span-12': 'span 12 / span 12',
      'span-full': '1 / -1',
    },
    gridColumnEnd: {
      auto: 'auto',
      1: '1',
      2: '2',
      3: '3',
      4: '4',
      5: '5',
      6: '6',
      7: '7',
      8: '8',
      9: '9',
      10: '10',
      11: '11',
      12: '12',
      13: '13',
    },
    gridColumnStart: {
      auto: 'auto',
      1: '1',
      2: '2',
      3: '3',
      4: '4',
      5: '5',
      6: '6',
      7: '7',
      8: '8',
      9: '9',
      10: '10',
      11: '11',
      12: '12',
      13: '13',
    },
    gridRow: {
      auto: 'auto',
      'span-1': 'span 1 / span 1',
      'span-2': 'span 2 / span 2',
      'span-3': 'span 3 / span 3',
      'span-4': 'span 4 / span 4',
      'span-5': 'span 5 / span 5',
      'span-6': 'span 6 / span 6',
      'span-7': 'span 7 / span 7',
      'span-8': 'span 8 / span 8',
      'span-9': 'span 9 / span 9',
      'span-10': 'span 10 / span 10',
      'span-11': 'span 11 / span 11',
      'span-12': 'span 12 / span 12',
      'span-full': '1 / -1',
    },
    gridRowEnd: {
      auto: 'auto',
      1: '1',
      2: '2',
      3: '3',
      4: '4',
      5: '5',
      6: '6',
      7: '7',
      8: '8',
      9: '9',
      10: '10',
      11: '11',
      12: '12',
      13: '13',
    },
    gridRowStart: {
      auto: 'auto',
      1: '1',
      2: '2',
      3: '3',
      4: '4',
      5: '5',
      6: '6',
      7: '7',
      8: '8',
      9: '9',
      10: '10',
      11: '11',
      12: '12',
      13: '13',
    },
    gridTemplateColumns: {
      none: 'none',
      subgrid: 'subgrid',
      1: 'repeat(1, minmax(0, 1fr))',
      2: 'repeat(2, minmax(0, 1fr))',
      3: 'repeat(3, minmax(0, 1fr))',
      4: 'repeat(4, minmax(0, 1fr))',
      5: 'repeat(5, minmax(0, 1fr))',
      6: 'repeat(6, minmax(0, 1fr))',
      7: 'repeat(7, minmax(0, 1fr))',
      8: 'repeat(8, minmax(0, 1fr))',
      9: 'repeat(9, minmax(0, 1fr))',
      10: 'repeat(10, minmax(0, 1fr))',
      11: 'repeat(11, minmax(0, 1fr))',
      12: 'repeat(12, minmax(0, 1fr))',
    },
    gridTemplateRows: {
      none: 'none',
      subgrid: 'subgrid',
      1: 'repeat(1, minmax(0, 1fr))',
      2: 'repeat(2, minmax(0, 1fr))',
      3: 'repeat(3, minmax(0, 1fr))',
      4: 'repeat(4, minmax(0, 1fr))',
      5: 'repeat(5, minmax(0, 1fr))',
      6: 'repeat(6, minmax(0, 1fr))',
      7: 'repeat(7, minmax(0, 1fr))',
      8: 'repeat(8, minmax(0, 1fr))',
      9: 'repeat(9, minmax(0, 1fr))',
      10: 'repeat(10, minmax(0, 1fr))',
      11: 'repeat(11, minmax(0, 1fr))',
      12: 'repeat(12, minmax(0, 1fr))',
    },
    height: ({ theme }) => ({
      auto: 'auto',
      ...theme('spacing'),
      '1/2': '50%',
      '1/3': '33.333333%',
      '2/3': '66.666667%',
      '1/4': '25%',
      '2/4': '50%',
      '3/4': '75%',
      '1/5': '20%',
      '2/5': '40%',
      '3/5': '60%',
      '4/5': '80%',
      '1/6': '16.666667%',
      '2/6': '33.333333%',
      '3/6': '50%',
      '4/6': '66.666667%',
      '5/6': '83.333333%',
      full: '100%',
      screen: '100vh',
      svh: '100svh',
      lvh: '100lvh',
      dvh: '100dvh',
      min: 'min-content',
      max: 'max-content',
      fit: 'fit-content',
    }),
    hueRotate: {
      0: '0deg',
      15: '15deg',
      30: '30deg',
      60: '60deg',
      90: '90deg',
      180: '180deg',
    },
    inset: ({ theme }) => ({
      auto: 'auto',
      ...theme('spacing'),
      '1/2': '50%',
      '1/3': '33.333333%',
      '2/3': '66.666667%',
      '1/4': '25%',
      '2/4': '50%',
      '3/4': '75%',
      full: '100%',
    }),
    invert: {
      0: '0',
      DEFAULT: '100%',
    },
    keyframes: {
      spin: {
        to: {
          transform: 'rotate(360deg)',
        },
      },
      ping: {
        '75%, 100%': {
          transform: 'scale(2)',
          opacity: '0',
        },
      },
      pulse: {
        '50%': {
          opacity: '.5',
        },
      },
      bounce: {
        '0%, 100%': {
          transform: 'translateY(-25%)',
          animationTimingFunction: 'cubic-bezier(0.8,0,1,1)',
        },
        '50%': {
          transform: 'none',
          animationTimingFunction: 'cubic-bezier(0,0,0.2,1)',
        },
      },
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
      3: '.75rem',
      4: '1rem',
      5: '1.25rem',
      6: '1.5rem',
      7: '1.75rem',
      8: '2rem',
      9: '2.25rem',
      10: '2.5rem',
    },
    listStyleType: {
      none: 'none',
      disc: 'disc',
      decimal: 'decimal',
    },
    listStyleImage: {
      none: 'none',
    },
    margin: ({ theme }) => ({
      auto: 'auto',
      ...theme('spacing'),
    }),
    lineClamp: {
      1: '1',
      2: '2',
      3: '3',
      4: '4',
      5: '5',
      6: '6',
    },
    maxHeight: ({ theme }) => ({
      ...theme('spacing'),
      none: 'none',
      full: '100%',
      screen: '100vh',
      svh: '100svh',
      lvh: '100lvh',
      dvh: '100dvh',
      min: 'min-content',
      max: 'max-content',
      fit: 'fit-content',
    }),
    maxWidth: ({ theme, breakpoints }) => ({
      ...theme('spacing'),
      none: 'none',
      xs: '20rem',
      sm: '24rem',
      md: '28rem',
      lg: '32rem',
      xl: '36rem',
      '2xl': '42rem',
      '3xl': '48rem',
      '4xl': '56rem',
      '5xl': '64rem',
      '6xl': '72rem',
      '7xl': '80rem',
      full: '100%',
      min: 'min-content',
      max: 'max-content',
      fit: 'fit-content',
      prose: '65ch',
      ...breakpoints(theme('screens')),
    }),
    minHeight: ({ theme }) => ({
      ...theme('spacing'),
      full: '100%',
      screen: '100vh',
      svh: '100svh',
      lvh: '100lvh',
      dvh: '100dvh',
      min: 'min-content',
      max: 'max-content',
      fit: 'fit-content',
    }),
    minWidth: ({ theme }) => ({
      ...theme('spacing'),
      full: '100%',
      min: 'min-content',
      max: 'max-content',
      fit: 'fit-content',
    }),
    objectPosition: {
      bottom: 'bottom',
      center: 'center',
      left: 'left',
      'left-bottom': 'left bottom',
      'left-top': 'left top',
      right: 'right',
      'right-bottom': 'right bottom',
      'right-top': 'right top',
      top: 'top',
    },
    opacity: {
      0: '0',
      5: '0.05',
      10: '0.1',
      15: '0.15',
      20: '0.2',
      25: '0.25',
      30: '0.3',
      35: '0.35',
      40: '0.4',
      45: '0.45',
      50: '0.5',
      55: '0.55',
      60: '0.6',
      65: '0.65',
      70: '0.7',
      75: '0.75',
      80: '0.8',
      85: '0.85',
      90: '0.9',
      95: '0.95',
      100: '1',
    },
    order: {
      first: '-9999',
      last: '9999',
      none: '0',
      1: '1',
      2: '2',
      3: '3',
      4: '4',
      5: '5',
      6: '6',
      7: '7',
      8: '8',
      9: '9',
      10: '10',
      11: '11',
      12: '12',
    },
    outlineColor: ({ theme }) => theme('colors'),
    outlineOffset: {
      0: '0px',
      1: '1px',
      2: '2px',
      4: '4px',
      8: '8px',
    },
    outlineWidth: {
      0: '0px',
      1: '1px',
      2: '2px',
      4: '4px',
      8: '8px',
    },
    padding: ({ theme }) => theme('spacing'),
    placeholderColor: ({ theme }) => theme('colors'),
    placeholderOpacity: ({ theme }) => theme('opacity'),
    ringColor: ({ theme }) => ({
      DEFAULT: theme('colors.blue.500', '#3b82f6'),
      ...theme('colors'),
    }),
    ringOffsetColor: ({ theme }) => theme('colors'),
    ringOffsetWidth: {
      0: '0px',
      1: '1px',
      2: '2px',
      4: '4px',
      8: '8px',
    },
    ringOpacity: ({ theme }) => ({
      DEFAULT: '0.5',
      ...theme('opacity'),
    }),
    ringWidth: {
      DEFAULT: '3px',
      0: '0px',
      1: '1px',
      2: '2px',
      4: '4px',
      8: '8px',
    },
    rotate: {
      0: '0deg',
      1: '1deg',
      2: '2deg',
      3: '3deg',
      6: '6deg',
      12: '12deg',
      45: '45deg',
      90: '90deg',
      180: '180deg',
    },
    saturate: {
      0: '0',
      50: '.5',
      100: '1',
      150: '1.5',
      200: '2',
    },
    scale: {
      0: '0',
      50: '.5',
      75: '.75',
      90: '.9',
      95: '.95',
      100: '1',
      105: '1.05',
      110: '1.1',
      125: '1.25',
      150: '1.5',
    },
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    scrollMargin: ({ theme }) => ({
      ...theme('spacing'),
    }),
    scrollPadding: ({ theme }) => theme('spacing'),
    sepia: {
      0: '0',
      DEFAULT: '100%',
    },
    skew: {
      0: '0deg',
      1: '1deg',
      2: '2deg',
      3: '3deg',
      6: '6deg',
      12: '12deg',
    },
    space: ({ theme }) => ({
      ...theme('spacing'),
    }),
    spacing: {
      px: '1px',
      0: '0px',
      0.5: '0.125rem',
      1: '0.25rem',
      1.5: '0.375rem',
      2: '0.5rem',
      2.5: '0.625rem',
      3: '0.75rem',
      3.5: '0.875rem',
      4: '1rem',
      5: '1.25rem',
      6: '1.5rem',
      7: '1.75rem',
      8: '2rem',
      9: '2.25rem',
      10: '2.5rem',
      11: '2.75rem',
      12: '3rem',
      14: '3.5rem',
      16: '4rem',
      20: '5rem',
      24: '6rem',
      28: '7rem',
      32: '8rem',
      36: '9rem',
      40: '10rem',
      44: '11rem',
      48: '12rem',
      52: '13rem',
      56: '14rem',
      60: '15rem',
      64: '16rem',
      72: '18rem',
      80: '20rem',
      96: '24rem',
    },
    stroke: ({ theme }) => ({
      none: 'none',
      ...theme('colors'),
    }),
    strokeWidth: {
      0: '0',
      1: '1',
      2: '2',
    },
    supports: {},
    data: {},
    textColor: ({ theme }) => theme('colors'),
    textDecorationColor: ({ theme }) => theme('colors'),
    textDecorationThickness: {
      auto: 'auto',
      'from-font': 'from-font',
      0: '0px',
      1: '1px',
      2: '2px',
      4: '4px',
      8: '8px',
    },
    textIndent: ({ theme }) => ({
      ...theme('spacing'),
    }),
    textOpacity: ({ theme }) => theme('opacity'),
    textUnderlineOffset: {
      auto: 'auto',
      0: '0px',
      1: '1px',
      2: '2px',
      4: '4px',
      8: '8px',
    },
    transformOrigin: {
      center: 'center',
      top: 'top',
      'top-right': 'top right',
      right: 'right',
      'bottom-right': 'bottom right',
      bottom: 'bottom',
      'bottom-left': 'bottom left',
      left: 'left',
      'top-left': 'top left',
    },
    transitionDelay: {
      0: '0s',
      75: '75ms',
      100: '100ms',
      150: '150ms',
      200: '200ms',
      300: '300ms',
      500: '500ms',
      700: '700ms',
      1000: '1000ms',
    },
    transitionDuration: {
      DEFAULT: '150ms',
      0: '0s',
      75: '75ms',
      100: '100ms',
      150: '150ms',
      200: '200ms',
      300: '300ms',
      500: '500ms',
      700: '700ms',
      1000: '1000ms',
    },
    transitionProperty: {
      none: 'none',
      all: 'all',
      DEFAULT:
        'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
      colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
      opacity: 'opacity',
      shadow: 'box-shadow',
      transform: 'transform',
    },
    transitionTimingFunction: {
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    translate: ({ theme }) => ({
      ...theme('spacing'),
      '1/2': '50%',
      '1/3': '33.333333%',
      '2/3': '66.666667%',
      '1/4': '25%',
      '2/4': '50%',
      '3/4': '75%',
      full: '100%',
    }),
    size: ({ theme }) => ({
      auto: 'auto',
      ...theme('spacing'),
      '1/2': '50%',
      '1/3': '33.333333%',
      '2/3': '66.666667%',
      '1/4': '25%',
      '2/4': '50%',
      '3/4': '75%',
      '1/5': '20%',
      '2/5': '40%',
      '3/5': '60%',
      '4/5': '80%',
      '1/6': '16.666667%',
      '2/6': '33.333333%',
      '3/6': '50%',
      '4/6': '66.666667%',
      '5/6': '83.333333%',
      '1/12': '8.333333%',
      '2/12': '16.666667%',
      '3/12': '25%',
      '4/12': '33.333333%',
      '5/12': '41.666667%',
      '6/12': '50%',
      '7/12': '58.333333%',
      '8/12': '66.666667%',
      '9/12': '75%',
      '10/12': '83.333333%',
      '11/12': '91.666667%',
      full: '100%',
      min: 'min-content',
      max: 'max-content',
      fit: 'fit-content',
    }),
    width: ({ theme }) => ({
      auto: 'auto',
      ...theme('spacing'),
      '1/2': '50%',
      '1/3': '33.333333%',
      '2/3': '66.666667%',
      '1/4': '25%',
      '2/4': '50%',
      '3/4': '75%',
      '1/5': '20%',
      '2/5': '40%',
      '3/5': '60%',
      '4/5': '80%',
      '1/6': '16.666667%',
      '2/6': '33.333333%',
      '3/6': '50%',
      '4/6': '66.666667%',
      '5/6': '83.333333%',
      '1/12': '8.333333%',
      '2/12': '16.666667%',
      '3/12': '25%',
      '4/12': '33.333333%',
      '5/12': '41.666667%',
      '6/12': '50%',
      '7/12': '58.333333%',
      '8/12': '66.666667%',
      '9/12': '75%',
      '10/12': '83.333333%',
      '11/12': '91.666667%',
      full: '100%',
      screen: '100vw',
      svw: '100svw',
      lvw: '100lvw',
      dvw: '100dvw',
      min: 'min-content',
      max: 'max-content',
      fit: 'fit-content',
    }),
    willChange: {
      auto: 'auto',
      scroll: 'scroll-position',
      contents: 'contents',
      transform: 'transform',
    },
    zIndex: {
      auto: 'auto',
      0: '0',
      10: '10',
      20: '20',
      30: '30',
      40: '40',
      50: '50',
    },
  },
  plugins: [],
};

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return getAllConfigs;
    }
});
const _configfull = /*#__PURE__*/ _interop_require_default(config_full);
const _featureFlags = featureFlags;
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function getAllConfigs(config) {
    var _config_presets;
    const configs = ((_config_presets = config === null || config === void 0 ? void 0 : config.presets) !== null && _config_presets !== void 0 ? _config_presets : [
        _configfull.default
    ]).slice().reverse().flatMap((preset)=>getAllConfigs(preset instanceof Function ? preset() : preset));
    const features = {
        // Add experimental configs here...
        respectDefaultRingColorOpacity: {
            theme: {
                ringColor: ({ theme  })=>({
                        DEFAULT: "#3b82f67f",
                        ...theme("colors")
                    })
            }
        },
        disableColorOpacityUtilitiesByDefault: {
            corePlugins: {
                backgroundOpacity: false,
                borderOpacity: false,
                divideOpacity: false,
                placeholderOpacity: false,
                ringOpacity: false,
                textOpacity: false
            }
        }
    };
    const experimentals = Object.keys(features).filter((feature)=>(0, _featureFlags.flagEnabled)(config, feature)).map((feature)=>features[feature]);
    return [
        config,
        ...experimentals,
        ...configs
    ];
}
}(getAllConfigs));

(function (exports) {
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return resolveConfig;
    }
});
const _resolveConfig = /*#__PURE__*/ _interop_require_default(resolveConfig$2);
const _getAllConfigs = /*#__PURE__*/ _interop_require_default(getAllConfigs);
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function resolveConfig(...configs) {
    let [, ...defaultConfigs] = (0, _getAllConfigs.default)(configs[0]);
    return (0, _resolveConfig.default)([
        ...configs,
        ...defaultConfigs
    ]);
}
}(resolveConfig$3));

let resolveConfig$1 = resolveConfig$3;
var resolveConfig_1 = (resolveConfig$1.__esModule ? resolveConfig$1 : { default: resolveConfig$1 }).default;

const tailwindConfig = {
    content: [],
    theme: {
        extend: {
            colors: {
                primary: {
                    '50': '#eefbfd',
                    '100': '#d4f5f9',
                    '200': '#aeeaf3',
                    '300': '#77d8e9',
                    '400': '#38bdd8',
                    '500': '#1ca0be',
                    '600': '#1a81a0',
                    '700': '#1c6882',
                    '800': '#1f566b',
                    '900': '#1a3e4e',
                    '950': '#0e2e3e',
                },
            },
        },
    },
};

const fullConfig = resolveConfig_1(tailwindConfig);
const primaryColor = fullConfig.theme.colors.primary['900'];
const white = fullConfig.theme.colors.white;
const StartButton = ({ onClick, isLoading, text, isOutlined, darkTheme, }) => {
    const classes = {
        // No disabled:opacity-50 here deliberately - this button is only ever
        // disabled while isLoading (there's no other disabled state), so the
        // spinner itself is already the loading signal; fading the whole
        // button desaturated the white avatar along with it, muddying the
        // logo right when it should read as "working", not "broken".
        // tracking-tight was tuned back when -apple-system was silently
        // falling back to Arial - Inter (now actually loading, see
        // registerInterFont()) already sits tighter by default, so that extra
        // negative tracking was stacking on top of it. Default tracking.
        // w-full so this always fills whatever container it's given - the
        // primary button sits directly in a grid cell (stretches on its own),
        // but the secondary one sits inside its own wrapper div one level in,
        // which needs the button itself told to fill it explicitly.
        default: 'relative w-full inline-flex items-center rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:hover:shadow-sm',
        // A modest min-width (not the old fixed-wide one) keeps the button from
        // visibly shrinking when its text is swapped for the loading spinner,
        // without leaving a slab of dead space next to short text. The avatar
        // sits at the leading edge, label gets the bulk of the padding on the
        // other side. Sized to land close to a normal ~40-44px button height
        // next to other UI (a consuming app's own "Log in" button, say) rather
        // than towering over it.
        //
        // pl MUST equal py here: on a rounded-full pill, the left cap is a
        // semicircle of radius (button height / 2) centred at (that radius,
        // half the height) - equal left/top padding puts the avatar's own
        // centre at that exact same point, so it's concentric with the cap and
        // clear of its curve on every side by construction, not by trial and
        // error. Unequal padding (what was here before) stays off-centre by
        // exactly that difference - invisible if the gap ends up wide enough
        // on every side, but visibly lopsided otherwise, which is what was
        // actually happening.
        withIcon: 'min-w-[12rem] pl-2 pr-5 py-2',
        // Same min-width as withIcon, and py-4 lands at the same ~52px total
        // height (py-2 + the 36px avatar there vs py-4 + text-sm's own 20px
        // line-height here) - same button, just without the avatar.
        textOnly: 'justify-center min-w-[12rem] px-5 py-4',
        // Matches the "light" variant below exactly (white bg, grey border,
        // same hover/active, same themeable accent text) - this is the same
        // button language, just without the avatar badge, not a different
        // style.
        outlinedLight: 'bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-[var(--jgroup-bankid-accent,#1a3e4e)] text-[var(--jgroup-bankid-accent,#1a3e4e)]',
        outlinedDark: 'bg-transparent focus-visible:bg-neutral-600 focus-visible:outline-neutral-500 hover:bg-neutral-700 active:border-neutral-400 active:bg-neutral-600 text-gray-200 border border-neutral-700',
        // Themeable via the --jgroup-bankid-accent custom property, set by a
        // consuming app on the element itself or an ancestor (crosses the
        // shadow boundary - custom properties are inherited CSS, unlike
        // ordinary selectors) - e.g. `jgroup-bank-id { --jgroup-bankid-accent:
        // #a16cf0 }`. Falls back to this package's own teal when unset, so
        // every existing consumer is unaffected. hover/active are derived with
        // color-mix() rather than needing three separate variables from the
        // consumer - only the avatar badge (BankID's own logo) stays fixed,
        // per BankID's brand guidelines, regardless of this.
        light: 'bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-[var(--jgroup-bankid-accent,#1a3e4e)] text-[var(--jgroup-bankid-accent,#1a3e4e)]',
        dark: 'bg-neutral-800 border border-neutral-700 active:border-neutral-400 hover:bg-neutral-700 active:bg-neutral-600 focus-visible:outline-neutral-500 focus-visible:bg-neutral-700 text-white',
    };
    return (index.h("button", { type: 'button', disabled: isLoading, onClick: onClick, "aria-label": text, "data-test-id": 'start-button', "data-test-loading": isLoading, 
        // A plain template string, not the {[classString]: condition} map
        // form - outlinedLight and light are now the same string (same
        // button language, badge or no badge), and that map form keys on
        // the class STRING itself, so two different conditions landing on
        // one identical string silently collide (the later object key wins,
        // dropping the earlier condition's class entirely - confirmed: this
        // is exactly how the outlined button lost its border).
        class: `${classes.default} ${isOutlined ? classes.textOnly : classes.withIcon} ${isOutlined
            ? darkTheme
                ? classes.outlinedDark
                : classes.outlinedLight
            : darkTheme
                ? classes.dark
                : classes.light}` },
        !isOutlined ? (index.h("span", { class: 'flex-shrink-0 h-9 w-9 rounded-full bg-white border border-black/10 shadow flex items-center justify-center' },
            index.h(BankIdLogo, { color: primaryColor, size: 26 }))) : (''),
        !isLoading ? (index.h("span", { class: 'flex-grow text-center' }, text)) : (index.h("span", { class: 'flex-grow flex items-center justify-center' },
            index.h(Spinner
            // Measured identical to the avatar's own 36px (h-9 w-9)
            // footprint, but still read visually heavier/bigger than it -
            // a thick solid ring with no surrounding circle just has more
            // visual mass than the avatar's thin logo lines inside a soft
            // white badge, even at the exact same bounding box. Sized down
            // to balance that, not to literally match the pixel count.
            , { 
                // Measured identical to the avatar's own 36px (h-9 w-9)
                // footprint, but still read visually heavier/bigger than it -
                // a thick solid ring with no surrounding circle just has more
                // visual mass than the avatar's thin logo lines inside a soft
                // white badge, even at the exact same bounding box. Sized down
                // to balance that, not to literally match the pixel count.
                classes: 'h-7 w-7', 
                // The non-outlined "light" variant is a white-bg bordered
                // button now (not a solid dark fill like before) - its own
                // background is only ever dark when darkTheme is on, same as
                // the outlined variants already were.
                color: darkTheme ? white : primaryColor })))));
};
const CancelButton = ({ onClick, text, isLoading, darkTheme, }) => {
    const classes = {
        // No hover:shadow or background fill - this is a plain text action, de-
        // emphasized below even the outlined secondary button, so a pill-shaped
        // grey box suddenly appearing (with a shadow under it, to boot) behind
        // the word on hover read as an odd disconnected shape popping in rather
        // than a natural hover state. A color + underline change instead.
        default: 'inline-flex items-center justify-center rounded-full disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium hover:underline transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        light: 'text-neutral-500 hover:text-neutral-700 active:text-neutral-800 focus-visible:outline-primary-700',
        dark: 'text-neutral-400 hover:text-neutral-200 active:text-neutral-100 focus-visible:outline-neutral-500',
    };
    return (index.h("button", { type: 'button', onClick: onClick, disabled: isLoading, "aria-label": text, "data-test-id": 'cancel-button', class: {
            [classes.default]: true,
            [classes.light]: !darkTheme,
            [classes.dark]: darkTheme,
        } }, isLoading ? (index.h(Spinner, { color: darkTheme ? white : primaryColor, classes: 'h-5 w-5' })) : (`${text}`)));
};
const Alert = ({ message, type, onTryAgainButtonClick, tryAgainButtonText, darkTheme, }) => {
    const alertClasses = {
        dark: 'bg-neutral-800 text-neutral-100',
        light: type === 'error'
            ? 'bg-red-50 text-red-800'
            : 'bg-primary-50 text-primary-800',
    };
    const badgeClasses = {
        dark: type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-primary-500/20 text-primary-300',
        light: type === 'error' ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-700',
    };
    const tryAgainButtonClasses = {
        default: 'rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150',
        dark: 'bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 text-white',
        light: 'bg-white hover:bg-red-100 active:bg-red-200 text-red-800 shadow-sm',
    };
    return (index.h("div", { "data-test-id": 'alert', "data-test-type": type, 
        // This message appears/changes as the BankID flow progresses
        // (a hint code updating, a failure occurring) without any focus
        // move - role='alert' (assertive, interrupting) for a real error,
        // the softer aria-live='polite' for a routine info-type status,
        // so a screen reader user hears either without needing to
        // rediscover this element themselves.
        role: type === 'error' ? 'alert' : undefined, "aria-live": type === 'error' ? 'assertive' : 'polite', class: {
            'rounded-xl p-4 mb-4 animate-fade flex items-start gap-3': true,
            [darkTheme ? alertClasses.dark : alertClasses.light]: true,
        } },
        index.h("div", { class: {
                'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center': true,
                [darkTheme ? badgeClasses.dark : badgeClasses.light]: true,
            } }, type === 'error' ? (index.h("svg", { class: 'h-5 w-5', viewBox: '0 0 20 20', fill: 'currentColor', "aria-hidden": 'true' },
            index.h("path", { "fill-rule": 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z', "clip-rule": 'evenodd' }))) : (index.h("svg", { class: 'h-5 w-5', viewBox: '0 0 20 20', fill: 'currentColor', "aria-hidden": 'true' },
            index.h("path", { "fill-rule": 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z', "clip-rule": 'evenodd' })))),
        index.h("div", { class: 'pt-2' },
            index.h("p", { class: 'text-sm leading-relaxed' }, message),
            type === 'error' ? (index.h("div", { class: 'mt-3' },
                index.h("button", { type: 'button', onClick: onTryAgainButtonClick, "data-test-id": 'try-again-button', class: {
                        [tryAgainButtonClasses.default]: true,
                        [tryAgainButtonClasses.light]: !darkTheme,
                        [tryAgainButtonClasses.dark]: darkTheme,
                    } }, tryAgainButtonText))) : (''))));
};
const Spinner = ({ color, classes, }) => (index.h("svg", { width: '32px', height: '32px', class: classes, fill: color, viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg', "aria-hidden": 'true' },
    index.h("path", { d: 'M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z', opacity: '.25' }),
    index.h("path", { d: 'M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z', class: 'spinner' })));
const BankIdLogo = ({ color, size = 32 }) => (index.h("svg", { width: `${size}px`, height: `${size}px`, viewBox: '0 0 39 39', xmlns: 'http://www.w3.org/2000/svg', "aria-hidden": 'true' },
    index.h("g", { stroke: 'none', "stroke-width": '1', fill: 'none', "fill-rule": 'evenodd' },
        index.h("rect", { fill: 'none', x: '0', y: '0', width: '39', height: '39' }),
        index.h("g", { transform: 'translate(5, 5)', fill: color },
            index.h("path", { d: 'M8.81437126,14.9123726 L10,6.95488054 C9.53293413,6.95488054 8.73353293,6.95488054 8.73353293,6.95488054 C8.14071856,6.95488054 7.37724551,6.60100169 7.15269461,5.95062974 C7.08083832,5.730651 6.91017964,4.97507182 7.88922156,4.23862124 C8.23952096,3.98038532 8.46407186,3.69345652 8.50898204,3.47347778 C8.55389222,3.24393474 8.5,3.04308458 8.34730539,2.89005588 C8.13173653,2.67007714 7.70958084,2.54574132 7.17065868,2.54574132 C6.26347305,2.54574132 5.6257485,3.10047034 5.56287425,3.50217066 C5.51796407,3.79866375 5.73353293,4.03777108 5.92215569,4.19079977 C6.48802395,4.64032156 6.62275449,5.2906935 6.27245509,5.90280827 C5.91317365,6.53405163 5.13173653,6.94531625 4.29640719,6.95488054 C4.29640719,6.95488054 3.47005988,6.95488054 3.00299401,6.95488054 C2.89520958,7.7295883 1.13473054,19.6084406 1,20.5457413 L8.01497006,20.5457413 C8.07784431,20.1249124 8.4011976,17.8773035 8.84131737,14.9123726 L8.81437126,14.9123726 Z', fill: color }),
            index.h("path", { d: 'M19.0401903,0.545741325 L11.9459047,0.545741325 L11,6.80620644 L12.20469,6.80620644 C12.8650386,6.80620644 13.4896927,6.48992737 13.7574016,6.03411342 C13.8466379,5.88527621 13.8823324,5.75504365 13.8823324,5.63411342 C13.8823324,5.3736483 13.7127834,5.17829946 13.5432344,5.04806691 C13.0792057,4.68527621 12.9810458,4.30388086 12.9810458,4.03411342 C12.9810458,3.97829946 12.9810458,3.93178784 12.9899694,3.88527621 C13.0881293,3.22481109 13.9447978,2.50853202 15.0780987,2.50853202 C15.7562946,2.50853202 16.2738651,2.67597388 16.5861921,2.98295063 C16.8628247,3.25271807 16.9699082,3.63411342 16.8895956,4.03411342 C16.7914356,4.50853202 16.3363305,4.8992297 16.0775453,5.09457853 C15.3904258,5.59690412 15.4796621,6.03411342 15.5242802,6.16434598 C15.6670583,6.55504365 16.2113997,6.80620644 16.6308103,6.80620644 L18.4601544,6.80620644 C18.4601544,6.80620644 18.4601544,6.80620644 18.4601544,6.81550877 C20.9587707,6.83411342 22.2973151,8.03411342 21.8779045,10.8248111 C21.4852648,13.4201599 19.5756081,14.536439 17.3000825,14.5550437 L16.3987959,20.5457413 L17.7284167,20.5457413 C23.3413798,20.5457413 27.9281254,16.7876018 28.829412,10.8527181 C29.9448657,3.48527621 25.4652036,0.545741325 19.0401903,0.545741325 Z', fill: color }),
            index.h("path", { d: 'M19.0401903,0.545741325 L11.9459047,0.545741325 L11,6.80620644 L12.20469,6.80620644 C12.8650386,6.80620644 13.4896927,6.48992737 13.7574016,6.03411342 C13.8466379,5.88527621 13.8823324,5.75504365 13.8823324,5.63411342 C13.8823324,5.3736483 13.7127834,5.17829946 13.5432344,5.04806691 C13.0792057,4.68527621 12.9810458,4.30388086 12.9810458,4.03411342 C12.9810458,3.97829946 12.9810458,3.93178784 12.9899694,3.88527621 C13.0881293,3.22481109 13.9447978,2.50853202 15.0780987,2.50853202 C15.7562946,2.50853202 16.2738651,2.67597388 16.5861921,2.98295063 C16.8628247,3.25271807 16.9699082,3.63411342 16.8895956,4.03411342 C16.7914356,4.50853202 16.3363305,4.8992297 16.0775453,5.09457853 C15.3904258,5.59690412 15.4796621,6.03411342 15.5242802,6.16434598 C15.6670583,6.55504365 16.2113997,6.80620644 16.6308103,6.80620644 L18.4601544,6.80620644 C18.4601544,6.80620644 18.4601544,6.80620644 18.4601544,6.81550877 C20.9587707,6.83411342 22.2973151,8.03411342 21.8779045,10.8248111 C21.4852648,13.4201599 19.5756081,14.536439 17.3000825,14.5550437 L16.3987959,20.5457413 L17.7284167,20.5457413 C23.3413798,20.5457413 27.9281254,16.7876018 28.829412,10.8527181 C29.9448657,3.48527621 25.4652036,0.545741325 19.0401903,0.545741325 Z', fill: color }),
            index.h("g", { transform: 'translate(0, 22.545741)', fill: color },
                index.h("path", { d: 'M0.790909091,0.0178571429 L3.69090909,0.0178571429 C4.92727273,0.0178571429 5.22727273,0.633928571 5.13636364,1.19642857 C5.06363636,1.65178571 4.74545455,1.99107143 4.2,2.21428571 C4.89090909,2.47321429 5.16363636,2.875 5.06363636,3.50892857 C4.93636364,4.30357143 4.23636364,4.89285714 3.31818182,4.89285714 L0.0181818182,4.89285714 L0.790909091,0.0178571429 Z M2.70909091,2.03571429 C3.27272727,2.03571429 3.53636364,1.74107143 3.59090909,1.39285714 C3.64545455,1.01785714 3.47272727,0.758928571 2.90909091,0.758928571 L2.40909091,0.758928571 L2.20909091,2.03571429 L2.70909091,2.03571429 L2.70909091,2.03571429 Z M2.4,4.14285714 C2.98181818,4.14285714 3.31818182,3.91071429 3.4,3.4375 C3.46363636,3.02678571 3.22727273,2.78571429 2.66363636,2.78571429 L2.09090909,2.78571429 L1.87272727,4.15178571 L2.4,4.15178571 L2.4,4.14285714 Z' }),
                index.h("path", { d: 'M9.12727273,4.92857143 C8.37272727,4.98214286 8.00909091,4.90178571 7.82727273,4.58035714 C7.42727273,4.82142857 6.98181818,4.94642857 6.50909091,4.94642857 C5.65454545,4.94642857 5.35454545,4.50892857 5.43636364,4.02678571 C5.47272727,3.79464286 5.60909091,3.57142857 5.82727273,3.38392857 C6.3,2.98214286 7.46363636,2.92857143 7.91818182,2.625 C7.95454545,2.28571429 7.81818182,2.16071429 7.39090909,2.16071429 C6.89090909,2.16071429 6.47272727,2.32142857 5.75454545,2.80357143 L5.92727273,1.69642857 C6.54545455,1.25892857 7.14545455,1.05357143 7.83636364,1.05357143 C8.71818182,1.05357143 9.5,1.41071429 9.35454545,2.35714286 L9.18181818,3.42857143 C9.11818182,3.80357143 9.13636364,3.91964286 9.56363636,3.92857143 L9.12727273,4.92857143 Z M7.81818182,3.25 C7.41818182,3.5 6.67272727,3.45535714 6.59090909,3.97321429 C6.55454545,4.21428571 6.70909091,4.39285714 6.95454545,4.39285714 C7.19090909,4.39285714 7.48181818,4.29464286 7.71818182,4.13392857 C7.7,4.04464286 7.70909091,3.95535714 7.73636364,3.78571429 L7.81818182,3.25 Z' }),
                index.h("path", { d: 'M10.5363636,1.11607143 L12.0454545,1.11607143 L11.9636364,1.60714286 C12.4454545,1.20535714 12.8090909,1.05357143 13.2818182,1.05357143 C14.1272727,1.05357143 14.5181818,1.5625 14.3818182,2.39285714 L13.9909091,4.88392857 L12.4818182,4.88392857 L12.8090909,2.82142857 C12.8727273,2.44642857 12.7545455,2.26785714 12.4636364,2.26785714 C12.2272727,2.26785714 12.0090909,2.39285714 11.8,2.66964286 L11.4545455,4.875 L9.94545455,4.875 L10.5363636,1.11607143 Z' }),
                index.h("polygon", { points: '15.5545455 0.0178571429 17.0636364 0.0178571429 16.6818182 2.41071429 18.1272727 1.11607143 19.9909091 1.11607143 18.1363636 2.72321429 19.6272727 4.88392857 17.7272727 4.88392857 16.5818182 3.14285714 16.5636364 3.14285714 16.2909091 4.88392857 14.7818182 4.88392857' })),
            index.h("g", { transform: 'translate(20, 22.545741)', fill: color },
                index.h("polygon", { points: '0.782417582 0.0181818182 2.46153846 0.0181818182 1.72307692 4.97272727 0.043956044 4.97272727' }),
                index.h("path", { d: 'M3.27912088,0.0181818182 L5.67912088,0.0181818182 C7.53406593,0.0181818182 8.07032967,1.40909091 7.89450549,2.56363636 C7.72747253,3.69090909 6.86593407,4.97272727 5.23956044,4.97272727 L2.53186813,4.97272727 L3.27912088,0.0181818182 Z M4.83516484,3.79090909 C5.65274725,3.79090909 6.1010989,3.37272727 6.23296703,2.49090909 C6.32967033,1.83636364 6.13626374,1.19090909 5.23076923,1.19090909 L4.78241758,1.19090909 L4.3956044,3.79090909 L4.83516484,3.79090909 L4.83516484,3.79090909 Z' }))))));

/**
 * Create a bound version of a function with a specified `this` context
 *
 * @param {Function} fn - The function to bind
 * @param {*} thisArg - The value to be passed as the `this` parameter
 * @returns {Function} A new function that will call the original function with the specified `this` context
 */
function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}

// utils is a library of generic helper functions non-specific to axios

const { toString } = Object.prototype;
const { getPrototypeOf } = Object;
const { iterator, toStringTag } = Symbol;

/* Creating a function that will check if an object has a property. */
const hasOwnProperty = (
  ({ hasOwnProperty }) =>
  (obj, prop) =>
    hasOwnProperty.call(obj, prop)
)(Object.prototype);

const isUnsafeObjectKey = (prop) =>
  typeof prop === 'string' &&
  (prop === '__proto__' || prop === 'constructor' || prop === 'prototype');

/**
 * Determine whether an inherited object must be treated as a shared-prototype
 * boundary. Cross-realm Object.prototype objects cannot be distinguished
 * reliably from application-created null-prototype objects because their
 * properties are mutable, so all inherited terminal prototypes are excluded
 * as a fail-closed boundary. A null-prototype source still keeps its own
 * properties, as produced by mergeConfig and other safe materialization paths.
 *
 * @param {*} obj The object to inspect
 * @param {*} prototype The object's prototype
 * @param {boolean} source Whether obj is the original traversal source
 *
 * @returns {boolean} True when obj is a safe prototype traversal boundary
 */
const isPrototypeBoundary = (obj, prototype, source) =>
  obj === Object.prototype || (!source && prototype === null);

/**
 * Determine whether an object can retain its identity through code paths that
 * add, replace, and remove config properties without bypassing unsafe-key
 * filtering. Immutable objects, unsafe-key-bearing objects, and objects with
 * accessor or restricted data properties must be materialized instead.
 *
 * @param {*} obj The object to inspect
 *
 * @returns {boolean} True when every own property is safe and fully mutable
 */
const isSafeAndFullyMutable = (obj) => {
  if (!Object.isExtensible(obj)) {
    return false;
  }

  const props = Object.getOwnPropertyNames(obj);

  if (Object.getOwnPropertySymbols) {
    props.push(...Object.getOwnPropertySymbols(obj));
  }

  return props.every((prop) => {
    if (isUnsafeObjectKey(prop)) {
      return false;
    }

    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);

    return !!descriptor && descriptor.configurable && descriptor.writable === true;
  });
};

/**
 * Walk the prototype chain (excluding the source realm's Object.prototype)
 * looking for an own `prop`. This distinguishes genuine own/inherited members
 * — including class accessors and template prototypes — from members injected
 * via Object.prototype pollution (e.g. `Object.prototype.username = '...'`),
 * which live on Object.prototype itself and are therefore never matched.
 *
 * @param {*} thing The value whose chain to inspect
 * @param {string|symbol} prop The property key to look for
 *
 * @returns {boolean} True when `prop` is owned below Object.prototype
 */
const hasOwnInPrototypeChain = (thing, prop) => {
  let obj = thing;
  const seen = [];

  while (obj != null) {
    if (seen.indexOf(obj) !== -1) {
      return false;
    }
    seen.push(obj);

    const prototype = getPrototypeOf(obj);

    if (isPrototypeBoundary(obj, prototype, obj === thing)) {
      return false;
    }

    if (hasOwnProperty(obj, prop)) {
      return true;
    }
    obj = prototype;
  }
  return false;
};

/**
 * Read `obj[prop]` only when it is safe from Object.prototype pollution. Own
 * properties and members inherited from a non-Object.prototype source (a class
 * instance or template object) are honored; a value reachable only through a
 * polluted Object.prototype is ignored and `undefined` is returned.
 *
 * @param {*} obj The source object
 * @param {string|symbol} prop The property key to read
 *
 * @returns {*} The resolved value, or undefined when unsafe/absent
 */
const getSafeProp = (obj, prop) =>
  obj != null && hasOwnInPrototypeChain(obj, prop) ? obj[prop] : undefined;

/**
 * Flatten an object and its application-defined prototype chain into a
 * null-prototype object. Members inherited only from the source realm's
 * Object.prototype are deliberately excluded, while class/template members
 * below that boundary are preserved.
 *
 * @param {*} thing The value to flatten
 *
 * @returns {*} A null-prototype copy, or the original value when it is already
 * structurally safe or is not an object
 */
const toSafeFlatObject = (thing) => {
  if (thing == null || (typeof thing !== 'object' && typeof thing !== 'function')) {
    return thing;
  }

  const sourcePrototype = getPrototypeOf(thing);

  if (sourcePrototype === null && isSafeAndFullyMutable(thing)) {
    return thing;
  }

  const result = Object.create(null);
  const merged = Object.create(null);
  const seen = [];
  let current = thing;

  while (current != null) {
    if (seen.indexOf(current) !== -1) {
      break;
    }

    seen.push(current);

    const prototype = current === thing ? sourcePrototype : getPrototypeOf(current);

    if (isPrototypeBoundary(current, prototype, current === thing)) {
      break;
    }

    const props = Object.getOwnPropertyNames(current);

    if (Object.getOwnPropertySymbols) {
      props.push(...Object.getOwnPropertySymbols(current));
    }

    for (const prop of props) {
      if (isUnsafeObjectKey(prop)) {
        continue;
      }

      if (!hasOwnProperty(merged, prop)) {
        result[prop] = thing[prop];
        merged[prop] = true;
      }
    }

    current = prototype;
  }

  return result;
};

const kindOf = ((cache) => (thing) => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(Object.create(null));

const kindOfTest = (type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type;
};

const typeOfTest = (type) => (thing) => typeof thing === type;

/**
 * Determine if a value is a non-null object
 *
 * @param {Object} val The value to test
 *
 * @returns {boolean} True if value is an Array, otherwise false
 */
const { isArray } = Array;

/**
 * Determine if a value is undefined
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if the value is undefined, otherwise false
 */
const isUndefined = typeOfTest('undefined');

/**
 * Determine if a value is a Buffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return (
    val !== null &&
    !isUndefined(val) &&
    val.constructor !== null &&
    !isUndefined(val.constructor) &&
    isFunction$1(val.constructor.isBuffer) &&
    val.constructor.isBuffer(val)
  );
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
const isArrayBuffer = kindOfTest('ArrayBuffer');

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a String, otherwise false
 */
const isString = typeOfTest('string');

/**
 * Determine if a value is a Function
 *
 * @param {*} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
const isFunction$1 = typeOfTest('function');

/**
 * Determine if a value is a Number
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Number, otherwise false
 */
const isNumber = typeOfTest('number');

/**
 * Determine if a value is an Object
 *
 * @param {*} thing The value to test
 *
 * @returns {boolean} True if value is an Object, otherwise false
 */
const isObject = (thing) => thing !== null && typeof thing === 'object';

/**
 * Determine if a value is a Boolean
 *
 * @param {*} thing The value to test
 * @returns {boolean} True if value is a Boolean, otherwise false
 */
const isBoolean = (thing) => thing === true || thing === false;

/**
 * Determine if a value is a plain Object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a plain Object, otherwise false
 */
const isPlainObject = (val) => {
  if (!isObject(val)) {
    return false;
  }

  const prototype = getPrototypeOf(val);
  return (
    (prototype === null || prototype === Object.prototype || getPrototypeOf(prototype) === null) &&
    // Treat safe own/inherited Symbol.toStringTag or Symbol.iterator members as
    // evidence the value is tagged/iterable, while ignoring members reachable
    // only through shared or terminal prototype boundaries.
    !hasOwnInPrototypeChain(val, toStringTag) &&
    !hasOwnInPrototypeChain(val, iterator)
  );
};

/**
 * Determine if a value is an empty object (safely handles Buffers)
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is an empty object, otherwise false
 */
const isEmptyObject = (val) => {
  // Early return for non-objects or Buffers to prevent RangeError
  if (!isObject(val) || isBuffer(val)) {
    return false;
  }

  try {
    return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
  } catch (e) {
    // Fallback for any other objects that might cause RangeError with Object.keys()
    return false;
  }
};

/**
 * Determine if a value is a Date
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Date, otherwise false
 */
const isDate = kindOfTest('Date');

/**
 * Determine if a value is a File
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a File, otherwise false
 */
const isFile = kindOfTest('File');

/**
 * Determine if a value is a React Native Blob
 * React Native "blob": an object with a `uri` attribute. Optionally, it can
 * also have a `name` and `type` attribute to specify filename and content type
 *
 * @see https://github.com/facebook/react-native/blob/26684cf3adf4094eb6c405d345a75bf8c7c0bf88/Libraries/Network/FormData.js#L68-L71
 *
 * @param {*} value The value to test
 *
 * @returns {boolean} True if value is a React Native Blob, otherwise false
 */
const isReactNativeBlob = (value) => {
  return !!(value && typeof value.uri !== 'undefined');
};

/**
 * Determine if environment is React Native
 * ReactNative `FormData` has a non-standard `getParts()` method
 *
 * @param {*} formData The formData to test
 *
 * @returns {boolean} True if environment is React Native, otherwise false
 */
const isReactNative = (formData) => formData && typeof formData.getParts !== 'undefined';

/**
 * Determine if a value is a Blob
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Blob, otherwise false
 */
const isBlob = kindOfTest('Blob');

/**
 * Determine if a value is a FileList
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a FileList, otherwise false
 */
const isFileList = kindOfTest('FileList');
const isSet = kindOfTest('Set');

/**
 * Determine if a value is a Stream
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Stream, otherwise false
 */
const isStream = (val) => isObject(val) && isFunction$1(val.pipe);

/**
 * Determine if a value is a FormData
 *
 * @param {*} thing The value to test
 *
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function getGlobal() {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  return {};
}

const G = getGlobal();
const FormDataCtor = typeof G.FormData !== 'undefined' ? G.FormData : undefined;

const isFormData = (thing) => {
  if (!thing) return false;
  if (FormDataCtor && thing instanceof FormDataCtor) return true;
  // Reject plain objects inheriting directly from Object.prototype so prototype-pollution gadgets can't spoof FormData.
  const proto = getPrototypeOf(thing);
  if (!proto || proto === Object.prototype) return false;
  if (!isFunction$1(thing.append)) return false;
  const kind = kindOf(thing);
  return (
    kind === 'formdata' ||
    // detect form-data instance
    (kind === 'object' && isFunction$1(thing.toString) && thing.toString() === '[object FormData]')
  );
};

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
const isURLSearchParams = kindOfTest('URLSearchParams');

const [isReadableStream, isRequest, isResponse, isHeaders] = [
  'ReadableStream',
  'Request',
  'Response',
  'Headers',
].map(kindOfTest);

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 *
 * @returns {String} The String freed of excess whitespace
 */
const trim = (str) => {
  return str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
};
/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array<unknown>} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 *
 * @param {Object} [options]
 * @param {Boolean} [options.allOwnKeys = false]
 * @returns {any}
 */
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  let i;
  let l;

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Buffer check
    if (isBuffer(obj)) {
      return;
    }

    // Iterate over object keys
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;

    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}

/**
 * Finds a key in an object, case-insensitive, returning the actual key name.
 * Returns null if the object is a Buffer or if no match is found.
 *
 * @param {Object} obj - The object to search.
 * @param {string} key - The key to find (case-insensitive).
 * @returns {?string} The actual key name if found, otherwise null.
 */
function findKey(obj, key) {
  if (isBuffer(obj)) {
    return null;
  }

  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}

const _global = (() => {
  /*eslint no-undef:0*/
  if (typeof globalThis !== 'undefined') return globalThis;
  return typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : global;
})();

const isContextDefined = (context) => !isUndefined(context) && context !== _global;

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * const result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 *
 * @returns {Object} Result of all merge properties
 */
function merge(...objs) {
  const { caseless, skipUndefined } = (isContextDefined(this) && this) || {};
  const result = {};
  const assignValue = (val, key) => {
    // Skip dangerous property names to prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return;
    }

    // findKey lowercases the key, so caseless lookup only applies to strings —
    // symbol keys are identity-matched.
    const targetKey = (caseless && typeof key === 'string' && findKey(result, key)) || key;
    // Read via own-prop only — a bare `result[targetKey]` walks the prototype
    // chain, so a polluted Object.prototype value could surface here and get
    // copied into the merged result.
    const existing = hasOwnProperty(result, targetKey) ? result[targetKey] : undefined;
    if (isPlainObject(existing) && isPlainObject(val)) {
      result[targetKey] = merge(existing, val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else if (!skipUndefined || !isUndefined(val)) {
      result[targetKey] = val;
    }
  };

  for (let i = 0, l = objs.length; i < l; i++) {
    const source = objs[i];
    if (!source || isBuffer(source)) {
      continue;
    }

    forEach(source, assignValue);

    if (typeof source !== 'object' || isArray(source)) {
      continue;
    }

    const symbols = Object.getOwnPropertySymbols(source);
    for (let j = 0; j < symbols.length; j++) {
      const symbol = symbols[j];
      if (propertyIsEnumerable.call(source, symbol)) {
        assignValue(source[symbol], symbol);
      }
    }
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 *
 * @param {Object} [options]
 * @param {Boolean} [options.allOwnKeys]
 * @returns {Object} The resulting value of object a
 */
const extend = (a, b, thisArg, { allOwnKeys } = {}) => {
  forEach(
    b,
    (val, key) => {
      if (thisArg && isFunction$1(val)) {
        Object.defineProperty(a, key, {
          // Null-proto descriptor so a polluted Object.prototype.get cannot
          // hijack defineProperty's accessor-vs-data resolution.
          __proto__: null,
          value: bind(val, thisArg),
          writable: true,
          enumerable: true,
          configurable: true,
        });
      } else {
        Object.defineProperty(a, key, {
          __proto__: null,
          value: val,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    },
    { allOwnKeys }
  );
  return a;
};

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 *
 * @returns {string} content value without BOM
 */
const stripBOM = (content) => {
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  return content;
};

/**
 * Inherit the prototype methods from one constructor into another
 * @param {function} constructor
 * @param {function} superConstructor
 * @param {object} [props]
 * @param {object} [descriptors]
 *
 * @returns {void}
 */
const inherits = (constructor, superConstructor, props, descriptors) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  Object.defineProperty(constructor.prototype, 'constructor', {
    __proto__: null,
    value: constructor,
    writable: true,
    enumerable: false,
    configurable: true,
  });
  Object.defineProperty(constructor, 'super', {
    __proto__: null,
    value: superConstructor.prototype,
  });
  props && Object.assign(constructor.prototype, props);
};

/**
 * Resolve object with deep prototype chain to a flat object
 * @param {Object} sourceObj source object
 * @param {Object} [destObj]
 * @param {Function|Boolean} [filter]
 * @param {Function} [propFilter]
 *
 * @returns {Object}
 */
const toFlatObject = (sourceObj, destObj, filter, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};

  destObj = destObj || {};
  // eslint-disable-next-line no-eq-null,eqeqeq
  if (sourceObj == null) return destObj;

  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

  return destObj;
};

/**
 * Determines whether a string ends with the characters of a specified string
 *
 * @param {String} str
 * @param {String} searchString
 * @param {Number} [position= 0]
 *
 * @returns {boolean}
 */
const endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === undefined || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};

/**
 * Returns new array from array like object or null if failed
 *
 * @param {*} [thing]
 *
 * @returns {?Array}
 */
const toArray = (thing) => {
  if (!thing) return null;
  if (isArray(thing)) return thing;
  let i = thing.length;
  if (!isNumber(i)) return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
};

/**
 * Checking if the Uint8Array exists and if it does, it returns a function that checks if the
 * thing passed in is an instance of Uint8Array
 *
 * @param {TypedArray}
 *
 * @returns {Array}
 */
// eslint-disable-next-line func-names
const isTypedArray = ((TypedArray) => {
  // eslint-disable-next-line func-names
  return (thing) => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== 'undefined' && getPrototypeOf(Uint8Array));

/**
 * For each entry in the object, call the function with the key and value.
 *
 * @param {Object<any, any>} obj - The object to iterate over.
 * @param {Function} fn - The function to call for each entry.
 *
 * @returns {void}
 */
const forEachEntry = (obj, fn) => {
  const generator = obj && obj[iterator];

  const _iterator = generator.call(obj);

  let result;

  while ((result = _iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};

/**
 * It takes a regular expression and a string, and returns an array of all the matches
 *
 * @param {string} regExp - The regular expression to match against.
 * @param {string} str - The string to search.
 *
 * @returns {Array<boolean>}
 */
const matchAll = (regExp, str) => {
  let matches;
  const arr = [];

  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }

  return arr;
};

/* Checking if the kindOfTest function returns true when passed an HTMLFormElement. */
const isHTMLForm = kindOfTest('HTMLFormElement');

const toCamelCase = (str) => {
  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
    return p1.toUpperCase() + p2;
  });
};

const { propertyIsEnumerable } = Object.prototype;

/**
 * Determine if a value is a RegExp object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a RegExp object, otherwise false
 */
const isRegExp = kindOfTest('RegExp');

const reduceDescriptors = (obj, reducer) => {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};

  forEach(descriptors, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) {
      reducedDescriptors[name] = ret || descriptor;
    }
  });

  Object.defineProperties(obj, reducedDescriptors);
};

/**
 * Makes all methods read-only
 * @param {Object} obj
 */

const freezeMethods = (obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    // skip restricted props in strict mode
    if (isFunction$1(obj) && ['arguments', 'caller', 'callee'].includes(name)) {
      return false;
    }

    const value = obj[name];

    if (!isFunction$1(value)) return;

    descriptor.enumerable = false;

    if ('writable' in descriptor) {
      descriptor.writable = false;
      return;
    }

    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error("Can not rewrite read-only method '" + name + "'");
      };
    }
  });
};

/**
 * Converts an array or a delimited string into an object set with values as keys and true as values.
 * Useful for fast membership checks.
 *
 * @param {Array|string} arrayOrString - The array or string to convert.
 * @param {string} delimiter - The delimiter to use if input is a string.
 * @returns {Object} An object with keys from the array or string, values set to true.
 */
const toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};

  const define = (arr) => {
    arr.forEach((value) => {
      obj[value] = true;
    });
  };

  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));

  return obj;
};

const noop = () => {};

const toFiniteNumber = (value, defaultValue) => {
  return value != null && Number.isFinite((value = +value)) ? value : defaultValue;
};

/**
 * If the thing is a FormData object, return true, otherwise return false.
 *
 * @param {unknown} thing - The thing to check.
 *
 * @returns {boolean}
 */
function isSpecCompliantForm(thing) {
  return !!(
    thing &&
    isFunction$1(thing.append) &&
    thing[toStringTag] === 'FormData' &&
    thing[iterator]
  );
}

/**
 * Recursively converts an object to a JSON-compatible object, handling circular references and Buffers.
 *
 * @param {Object} obj - The object to convert.
 * @returns {Object} The JSON-compatible object.
 */
const toJSONObject = (obj) => {
  const visited = new WeakSet();

  const visit = (source) => {
    if (isObject(source)) {
      if (visited.has(source)) {
        return;
      }

      //Buffer check
      if (isBuffer(source)) {
        return source;
      }

      if (!('toJSON' in source)) {
        // add-on descent / delete-on-ascent: preserves path semantics, so DAG nodes serialise at every occurrence (see #7230).
        visited.add(source);

        let target;

        if (isSet(source)) {
          target = [];
          for (const value of source) {
            const reducedValue = visit(value);
            !isUndefined(reducedValue) && target.push(reducedValue);
          }
        } else {
          target = isArray(source) ? [] : {};

          forEach(source, (value, key) => {
            const reducedValue = visit(value);
            !isUndefined(reducedValue) && (target[key] = reducedValue);
          });
        }

        visited.delete(source);

        return target;
      }
    }

    return source;
  };

  return visit(obj);
};

/**
 * Determines if a value is an async function.
 *
 * @param {*} thing - The value to test.
 * @returns {boolean} True if value is an async function, otherwise false.
 */
const isAsyncFn = kindOfTest('AsyncFunction');

/**
 * Determines if a value is thenable (has then and catch methods).
 *
 * @param {*} thing - The value to test.
 * @returns {boolean} True if value is thenable, otherwise false.
 */
const isThenable = (thing) =>
  thing &&
  (isObject(thing) || isFunction$1(thing)) &&
  isFunction$1(thing.then) &&
  isFunction$1(thing.catch);

// original code
// https://github.com/DigitalBrainJS/AxiosPromise/blob/16deab13710ec09779922131f3fa5954320f83ab/lib/utils.js#L11-L34

/**
 * Provides a cross-platform setImmediate implementation.
 * Uses native setImmediate if available, otherwise falls back to postMessage or setTimeout.
 *
 * @param {boolean} setImmediateSupported - Whether setImmediate is supported.
 * @param {boolean} postMessageSupported - Whether postMessage is supported.
 * @returns {Function} A function to schedule a callback asynchronously.
 */
const _setImmediate = ((setImmediateSupported, postMessageSupported) => {
  if (setImmediateSupported) {
    return setImmediate;
  }

  return postMessageSupported
    ? ((token, callbacks) => {
        _global.addEventListener(
          'message',
          ({ source, data }) => {
            if (source === _global && data === token) {
              callbacks.length && callbacks.shift()();
            }
          },
          false
        );

        return (cb) => {
          callbacks.push(cb);
          _global.postMessage(token, '*');
        };
      })(`axios@${Math.random()}`, [])
    : (cb) => setTimeout(cb);
})(typeof setImmediate === 'function', isFunction$1(_global.postMessage));

/**
 * Schedules a microtask or asynchronous callback as soon as possible.
 * Uses queueMicrotask if available, otherwise falls back to process.nextTick or _setImmediate.
 *
 * @type {Function}
 */
const asap =
  typeof queueMicrotask !== 'undefined'
    ? queueMicrotask.bind(_global)
    : (typeof process !== 'undefined' && process.nextTick) || _setImmediate;

// *********************

const isIterable = (thing) => thing != null && isFunction$1(thing[iterator]);

/**
 * Determine if a value is iterable via an iterator that is NOT sourced solely
 * from a polluted Object.prototype. Use this instead of `isIterable` whenever
 * the iterable comes from untrusted input (e.g. user-supplied header sources),
 * so `Object.prototype[Symbol.iterator] = ...` cannot turn an ordinary object
 * into an attacker-controlled entries iterator.
 *
 * @param {*} thing The value to test
 *
 * @returns {boolean} True if value has a non-polluted iterator
 */
const isSafeIterable = (thing) =>
  thing != null && hasOwnInPrototypeChain(thing, iterator) && isIterable(thing);

const utils$1 = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isEmptyObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isReactNativeBlob,
  isReactNative,
  isBlob,
  isRegExp,
  isFunction: isFunction$1,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty, // an alias to avoid ESLint no-prototype-builtins detection
  hasOwnInPrototypeChain,
  getSafeProp,
  toSafeFlatObject,
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable,
  setImmediate: _setImmediate,
  asap,
  isIterable,
  isSafeIterable,
};

// RawAxiosHeaders whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
const ignoreDuplicateOf = utils$1.toObjectSet([
  'age',
  'authorization',
  'content-length',
  'content-type',
  'etag',
  'expires',
  'from',
  'host',
  'if-modified-since',
  'if-unmodified-since',
  'last-modified',
  'location',
  'max-forwards',
  'proxy-authorization',
  'referer',
  'retry-after',
  'user-agent',
]);

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} rawHeaders Headers needing to be parsed
 *
 * @returns {Object} Headers parsed into an object
 */
const parseHeaders = (rawHeaders) => {
  const parsed = {};
  let key;
  let val;
  let i;

  rawHeaders &&
    rawHeaders.split('\n').forEach(function parser(line) {
      i = line.indexOf(':');
      key = line.substring(0, i).trim().toLowerCase();
      val = line.substring(i + 1).trim();

      const hasKey = utils$1.hasOwnProp(parsed, key);

      if (!key || (hasKey && utils$1.hasOwnProp(ignoreDuplicateOf, key))) {
        return;
      }

      if (key === 'set-cookie') {
        if (hasKey) {
          parsed[key].push(val);
        } else {
          parsed[key] = [val];
        }
      } else {
        parsed[key] = hasKey ? parsed[key] + ', ' + val : val;
      }
    });

  return parsed;
};

function trimSPorHTAB(str) {
  let start = 0;
  let end = str.length;

  while (start < end) {
    const code = str.charCodeAt(start);

    if (code !== 0x09 && code !== 0x20) {
      break;
    }

    start += 1;
  }

  while (end > start) {
    const code = str.charCodeAt(end - 1);

    if (code !== 0x09 && code !== 0x20) {
      break;
    }

    end -= 1;
  }

  return start === 0 && end === str.length ? str : str.slice(start, end);
}

// The control-code ranges are intentional: header sanitization strips C0/DEL bytes.
// eslint-disable-next-line no-control-regex
const INVALID_UNICODE_HEADER_VALUE_CHARS = new RegExp('[\\u0000-\\u0008\\u000a-\\u001f\\u007f]+', 'g');
// eslint-disable-next-line no-control-regex
const INVALID_BYTE_STRING_HEADER_VALUE_CHARS = new RegExp('[^\\u0009\\u0020-\\u007e\\u0080-\\u00ff]+', 'g');

function sanitizeValue(value, invalidChars) {
  if (utils$1.isArray(value)) {
    return value.map((item) => sanitizeValue(item, invalidChars));
  }

  return trimSPorHTAB(String(value).replace(invalidChars, ''));
}

const sanitizeHeaderValue = (value) =>
  sanitizeValue(value, INVALID_UNICODE_HEADER_VALUE_CHARS);

const sanitizeByteStringHeaderValue = (value) =>
  sanitizeValue(value, INVALID_BYTE_STRING_HEADER_VALUE_CHARS);

function toByteStringHeaderObject(headers) {
  const byteStringHeaders = Object.create(null);

  utils$1.forEach(headers.toJSON(), (value, header) => {
    byteStringHeaders[header] = sanitizeByteStringHeaderValue(value);
  });

  return byteStringHeaders;
}

const $internals$1 = Symbol('internals');

function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}

function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }

  return utils$1.isArray(value) ? value.map(normalizeValue) : sanitizeHeaderValue(String(value));
}

function parseTokens(str) {
  const tokens = Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;

  while ((match = tokensRE.exec(str))) {
    tokens[match[1]] = match[2];
  }

  return tokens;
}

const parameterNameRE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function trimOWS(value) {
  let start = 0;
  let end = value.length;

  while (start < end) {
    const code = value.charCodeAt(start);

    if (code !== 0x09 && code !== 0x20) {
      break;
    }

    start += 1;
  }

  while (end > start) {
    const code = value.charCodeAt(end - 1);

    if (code !== 0x09 && code !== 0x20) {
      break;
    }

    end -= 1;
  }

  return start === 0 && end === value.length ? value : value.slice(start, end);
}

function decodeQuotedString(value) {
  const last = value.length - 1;

  if (last < 1 || value.charCodeAt(0) !== 0x22 || value.charCodeAt(last) !== 0x22) {
    return value;
  }

  let decoded = '';

  for (let i = 1; i < last; i++) {
    const code = value.charCodeAt(i);

    if (code === 0x22) {
      return value;
    }

    if (code === 0x5c) {
      i += 1;

      if (i >= last) {
        return value;
      }
    }

    decoded += value[i];
  }

  return decoded;
}

function parseParameters(value) {
  const parameters = Object.create(null);
  const str = String(value);
  let start = 0;
  let quoted = false;
  let escaped = false;

  function parseParameter(end) {
    const part = trimOWS(str.slice(start, end));
    const equals = part.indexOf('=');

    if (equals < 1) {
      return;
    }

    const name = trimOWS(part.slice(0, equals));

    if (!parameterNameRE.test(name)) {
      return;
    }

    const normalizedName = name.toLowerCase();

    if (
      normalizedName === '__proto__' ||
      normalizedName === 'constructor' ||
      normalizedName === 'prototype'
    ) {
      return;
    }

    const parameterValue = trimOWS(part.slice(equals + 1));
    parameters[normalizedName] = decodeQuotedString(parameterValue);
  }

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);

    if (quoted) {
      if (escaped) {
        escaped = false;
      } else if (code === 0x5c) {
        escaped = true;
      } else if (code === 0x22) {
        quoted = false;
      }
    } else if (code === 0x22) {
      quoted = true;
    } else if (code === 0x2c || code === 0x3b) {
      parseParameter(i);
      start = i + 1;
    }
  }

  parseParameter(str.length);

  return parameters;
}

const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());

function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
  if (utils$1.isFunction(filter)) {
    return filter.call(this, value, header);
  }

  if (isHeaderNameFilter) {
    value = header;
  }

  if (!utils$1.isString(value)) return;

  if (utils$1.isString(filter)) {
    return value.indexOf(filter) !== -1;
  }

  if (utils$1.isRegExp(filter)) {
    return filter.test(value);
  }
}

function formatHeader(header) {
  return header
    .trim()
    .toLowerCase()
    .replace(/([a-z\d])(\w*)/g, (w, char, str) => {
      return char.toUpperCase() + str;
    });
}

function buildAccessors(obj, header) {
  const accessorName = utils$1.toCamelCase(' ' + header);

  ['get', 'set', 'has'].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      // Null-proto descriptor so a polluted Object.prototype.get cannot turn
      // this data descriptor into an accessor descriptor on the way in.
      __proto__: null,
      value: function (arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true,
    });
  });
}

class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }

  set(header, valueOrRewrite, rewrite) {
    const self = this;

    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);

      if (!lHeader) {
        return;
      }

      const key = utils$1.findKey(self, lHeader);

      if (
        !key ||
        self[key] === undefined ||
        _rewrite === true ||
        (_rewrite === undefined && self[key] !== false)
      ) {
        self[key || _header] = normalizeValue(_value);
      }
    }

    const setHeaders = (headers, _rewrite) =>
      utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));

    if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if (utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders(header), valueOrRewrite);
    } else if (utils$1.isObject(header) && utils$1.isSafeIterable(header)) {
      let obj = Object.create(null),
        dest,
        key;
      for (const entry of header) {
        if (!utils$1.isArray(entry)) {
          throw new TypeError('Object iterator must return a key-value pair');
        }

        key = entry[0];

        if (utils$1.hasOwnProp(obj, key)) {
          dest = obj[key];
          obj[key] = utils$1.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]];
        } else {
          obj[key] = entry[1];
        }
      }

      setHeaders(obj, valueOrRewrite);
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }

    return this;
  }

  get(header, parser) {
    header = normalizeHeader(header);

    if (header) {
      const key = utils$1.findKey(this, header);

      if (key) {
        const value = this[key];

        if (!parser) {
          return value;
        }

        if (parser === true) {
          return parseTokens(value);
        }

        if (utils$1.isFunction(parser)) {
          return parser.call(this, value, key);
        }

        if (utils$1.isRegExp(parser)) {
          return parser.exec(value);
        }

        throw new TypeError('parser must be boolean|regexp|function');
      }
    }
  }

  has(header, matcher) {
    header = normalizeHeader(header);

    if (header) {
      const key = utils$1.findKey(this, header);

      return !!(
        key &&
        this[key] !== undefined &&
        (!matcher || matchHeaderValue(this, this[key], key, matcher))
      );
    }

    return false;
  }

  delete(header, matcher) {
    const self = this;
    let deleted = false;

    function deleteHeader(_header) {
      _header = normalizeHeader(_header);

      if (_header) {
        const key = utils$1.findKey(self, _header);

        if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
          delete self[key];

          deleted = true;
        }
      }
    }

    if (utils$1.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }

    return deleted;
  }

  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;

    while (i--) {
      const key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }

    return deleted;
  }

  normalize(format) {
    const self = this;
    const headers = {};

    utils$1.forEach(this, (value, header) => {
      const key = utils$1.findKey(headers, header);

      if (key) {
        self[key] = normalizeValue(value);
        delete self[header];
        return;
      }

      const normalized = format ? formatHeader(header) : String(header).trim();

      if (normalized !== header) {
        delete self[header];
      }

      self[normalized] = normalizeValue(value);

      headers[normalized] = true;
    });

    return this;
  }

  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }

  toJSON(asStrings) {
    const obj = Object.create(null);

    utils$1.forEach(this, (value, header) => {
      value != null &&
        value !== false &&
        (obj[header] = asStrings && utils$1.isArray(value) ? value.join(', ') : value);
    });

    return obj;
  }

  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }

  toString() {
    return Object.entries(this.toJSON())
      .map(([header, value]) => header + ': ' + value)
      .join('\n');
  }

  getSetCookie() {
    const value = this.get('set-cookie');
    return utils$1.isArray(value) ? value : value == null || value === false ? [] : [value];
  }

  get [Symbol.toStringTag]() {
    return 'AxiosHeaders';
  }

  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }

  static parseParameters(value) {
    return parseParameters(value);
  }

  static concat(first, ...targets) {
    const computed = new this(first);

    targets.forEach((target) => computed.set(target));

    return computed;
  }

  static accessor(header) {
    const internals =
      (this[$internals$1] =
      this[$internals$1] =
        {
          accessors: {},
        });

    const accessors = internals.accessors;
    const prototype = this.prototype;

    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);

      if (!accessors[lHeader]) {
        buildAccessors(prototype, _header);
        accessors[lHeader] = true;
      }
    }

    utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);

    return this;
  }
}

AxiosHeaders.accessor([
  'Content-Type',
  'Content-Length',
  'Accept',
  'Accept-Encoding',
  'User-Agent',
  'Authorization',
]);

// reserved names hotfix
utils$1.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1); // map `set` => `Set`
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    },
  };
});

utils$1.freezeMethods(AxiosHeaders);

const AxiosHeaders$1 = AxiosHeaders;

const REDACTED = '[REDACTED ****]';

function hasOwnOrPrototypeToJSON(source) {
  if (utils$1.hasOwnProp(source, 'toJSON')) {
    return true;
  }

  let prototype = Object.getPrototypeOf(source);

  while (prototype && prototype !== Object.prototype) {
    if (utils$1.hasOwnProp(prototype, 'toJSON')) {
      return true;
    }

    prototype = Object.getPrototypeOf(prototype);
  }

  return false;
}

// Build a plain-object snapshot of `config` and replace the value of any key
// (case-insensitive) listed in `redactKeys` with REDACTED. Walks through arrays
// and AxiosHeaders, and short-circuits on circular references.
function redactConfig(config, redactKeys) {
  const lowerKeys = new Set(redactKeys.map((k) => String(k).toLowerCase()));
  const seen = [];

  const visit = (source) => {
    if (source === null || typeof source !== 'object') return source;
    if (utils$1.isBuffer(source)) return source;
    if (seen.indexOf(source) !== -1) return undefined;

    if (source instanceof AxiosHeaders$1) {
      source = source.toJSON();
    }

    seen.push(source);

    let result;
    if (utils$1.isArray(source)) {
      result = [];
      source.forEach((v, i) => {
        const reducedValue = visit(v);
        if (!utils$1.isUndefined(reducedValue)) {
          result[i] = reducedValue;
        }
      });
    } else {
      if (!utils$1.isPlainObject(source) && hasOwnOrPrototypeToJSON(source)) {
        seen.pop();
        return source;
      }

      result = Object.create(null);
      for (const [key, value] of Object.entries(source)) {
        const reducedValue = lowerKeys.has(key.toLowerCase()) ? REDACTED : visit(value);
        if (!utils$1.isUndefined(reducedValue)) {
          result[key] = reducedValue;
        }
      }
    }

    seen.pop();
    return result;
  };

  return visit(config);
}

function stringifySafely$1(value) {
  try {
    return String(value);
  } catch (err) {
    return '';
  }
}

function aggregateErrorMessage(error) {
  const message = error.errors
    .map((entry) => {
      try {
        return entry && entry.message ? stringifySafely$1(entry.message) : stringifySafely$1(entry);
      } catch (err) {
        return '';
      }
    })
    .filter(Boolean)
    .join('; ');

  return message || error.name || 'AggregateError';
}

class AxiosError extends Error {
  static from(error, code, config, request, response, customProps) {
    // `AggregateError` (thrown by Node on dual-stack/Happy-Eyeballs connection
    // failures) has an empty `message`; its detail lives in `errors[]`. Without
    // this, the wrapped error surfaces with a blank message (see #6721).
    let message = error.message;
    if (!message && utils$1.isArray(error.errors) && error.errors.length) {
      message = aggregateErrorMessage(error);
    }

    const axiosError = new AxiosError(message, code || error.code, config, request, response);
    // Match native `Error` `cause` semantics: non-enumerable. The wrapped
    // error often carries circular internals (sockets, requests, agents), so
    // an enumerable `cause` makes structured loggers (pino/winston) and any
    // own-property walk throw "Converting circular structure to JSON".
    // Regression from #6982; see #7205. `__proto__: null` mirrors the
    // `message` descriptor below (prototype-pollution-safe descriptor).
    Object.defineProperty(axiosError, 'cause', {
      __proto__: null,
      value: error,
      writable: true,
      enumerable: false,
      configurable: true,
    });
    axiosError.name = error.name;

    // Preserve status from the original error if not already set from response
    if (error.status != null && axiosError.status == null) {
      axiosError.status = error.status;
    }

    customProps && Object.assign(axiosError, customProps);
    return axiosError;
  }

  /**
   * Create an Error with the specified message, config, error code, request and response.
   *
   * @param {string} message The error message.
   * @param {string} [code] The error code (for example, 'ECONNABORTED').
   * @param {Object} [config] The config.
   * @param {Object} [request] The request.
   * @param {Object} [response] The response.
   *
   * @returns {Error} The created error.
   */
  constructor(message, code, config, request, response) {
    super(message);

    // Make message enumerable to maintain backward compatibility
    // The native Error constructor sets message as non-enumerable,
    // but axios < v1.13.3 had it as enumerable
    Object.defineProperty(this, 'message', {
      // Null-proto descriptor so a polluted Object.prototype.get cannot turn
      // this data descriptor into an accessor descriptor on the way in.
      __proto__: null,
      value: message,
      enumerable: true,
      writable: true,
      configurable: true,
    });

    this.name = 'AxiosError';
    this.isAxiosError = true;
    code && (this.code = code);
    config && (this.config = config);
    request && (this.request = request);
    if (response) {
      this.response = response;
      this.status = response.status;
    }
  }

  toJSON() {
    // Opt-in redaction: when the request config carries a `redact` array, the
    // value of any matching key (case-insensitive, at any depth) is replaced
    // with REDACTED in the serialized snapshot. Undefined or empty leaves the
    // existing serialization behavior unchanged.
    const config = this.config;
    const redactKeys = config && utils$1.hasOwnProp(config, 'redact') ? config.redact : undefined;
    const serializedConfig =
      utils$1.isArray(redactKeys) && redactKeys.length > 0
        ? redactConfig(config, redactKeys)
        : utils$1.toJSONObject(config);

    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: serializedConfig,
      code: this.code,
      status: this.status,
    };
  }
}

// This can be changed to static properties as soon as the parser options in .eslint.cjs are updated.
AxiosError.ERR_BAD_OPTION_VALUE = 'ERR_BAD_OPTION_VALUE';
AxiosError.ERR_BAD_OPTION = 'ERR_BAD_OPTION';
AxiosError.ECONNABORTED = 'ECONNABORTED';
AxiosError.ETIMEDOUT = 'ETIMEDOUT';
AxiosError.ECONNREFUSED = 'ECONNREFUSED';
AxiosError.ERR_NETWORK = 'ERR_NETWORK';
AxiosError.ERR_FR_TOO_MANY_REDIRECTS = 'ERR_FR_TOO_MANY_REDIRECTS';
AxiosError.ERR_DEPRECATED = 'ERR_DEPRECATED';
AxiosError.ERR_BAD_RESPONSE = 'ERR_BAD_RESPONSE';
AxiosError.ERR_BAD_REQUEST = 'ERR_BAD_REQUEST';
AxiosError.ERR_CANCELED = 'ERR_CANCELED';
AxiosError.ERR_NOT_SUPPORT = 'ERR_NOT_SUPPORT';
AxiosError.ERR_INVALID_URL = 'ERR_INVALID_URL';
AxiosError.ERR_FORM_DATA_DEPTH_EXCEEDED = 'ERR_FORM_DATA_DEPTH_EXCEEDED';

const AxiosError$1 = AxiosError;

// eslint-disable-next-line strict
const httpAdapter = null;

// Default nesting limit shared with the inverse transform (formDataToJSON) so
// the FormData <-> JSON round-trip stays symmetric.
const DEFAULT_FORM_DATA_MAX_DEPTH = 100;

/**
 * Determines if the given thing is a array or js object.
 *
 * @param {string} thing - The object or array to be visited.
 *
 * @returns {boolean}
 */
function isVisitable(thing) {
  return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
}

/**
 * It removes the brackets from the end of a string
 *
 * @param {string} key - The key of the parameter.
 *
 * @returns {string} the key without the brackets.
 */
function removeBrackets(key) {
  return utils$1.endsWith(key, '[]') ? key.slice(0, -2) : key;
}

/**
 * It takes a path, a key, and a boolean, and returns a string
 *
 * @param {string} path - The path to the current key.
 * @param {string} key - The key of the current object being iterated over.
 * @param {string} dots - If true, the key will be rendered with dots instead of brackets.
 *
 * @returns {string} The path to the current key.
 */
function renderKey(path, key, dots) {
  if (!path) return key;
  return path
    .concat(key)
    .map(function each(token, i) {
      // eslint-disable-next-line no-param-reassign
      token = removeBrackets(token);
      return !dots && i ? '[' + token + ']' : token;
    })
    .join(dots ? '.' : '');
}

/**
 * If the array is an array and none of its elements are visitable, then it's a flat array.
 *
 * @param {Array<any>} arr - The array to check
 *
 * @returns {boolean}
 */
function isFlatArray(arr) {
  return utils$1.isArray(arr) && !arr.some(isVisitable);
}

const predicates = utils$1.toFlatObject(utils$1, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});

/**
 * Convert a data object to FormData
 *
 * @param {Object} obj
 * @param {?Object} [formData]
 * @param {?Object} [options]
 * @param {Function} [options.visitor]
 * @param {Boolean} [options.metaTokens = true]
 * @param {Boolean} [options.dots = false]
 * @param {?Boolean} [options.indexes = false]
 *
 * @returns {Object}
 **/

/**
 * It converts an object into a FormData object
 *
 * @param {Object<any, any>} obj - The object to convert to form data.
 * @param {string} formData - The FormData object to append to.
 * @param {Object<string, any>} options
 *
 * @returns
 */
function toFormData(obj, formData, options) {
  if (!utils$1.isObject(obj)) {
    throw new TypeError('target must be an object');
  }

  // eslint-disable-next-line no-param-reassign
  formData = formData || new (FormData)();

  const option = (name, fallback) => {
    const value = utils$1.getSafeProp(options, name);
    return utils$1.isUndefined(value) ? fallback : value;
  };

  const metaTokens = option('metaTokens', true);
  // eslint-disable-next-line no-use-before-define
  const visitor = option('visitor') || defaultVisitor;
  const dots = option('dots', false);
  const indexes = option('indexes', false);
  const _Blob = option('Blob') || (typeof Blob !== 'undefined' && Blob);
  const maxDepth = option('maxDepth', DEFAULT_FORM_DATA_MAX_DEPTH);
  const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);
  const stack = [];

  if (!utils$1.isFunction(visitor)) {
    throw new TypeError('visitor must be a function');
  }

  function convertValue(value) {
    if (value === null) return '';

    if (utils$1.isDate(value)) {
      return value.toISOString();
    }

    if (utils$1.isBoolean(value)) {
      return value.toString();
    }

    if (!useBlob && utils$1.isBlob(value)) {
      throw new AxiosError$1('Blob is not supported. Use a Buffer instead.');
    }

    if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
      if (useBlob && typeof _Blob === 'function') {
        return new _Blob([value]);
      }
      throw new AxiosError$1(
        'Blob is not supported. Use a Buffer instead.',
        AxiosError$1.ERR_NOT_SUPPORT
      );
    }

    return value;
  }

  function throwIfMaxDepthExceeded(depth) {
    if (depth > maxDepth) {
      throw new AxiosError$1(
        'Object is too deeply nested (' + depth + ' levels). Max depth: ' + maxDepth,
        AxiosError$1.ERR_FORM_DATA_DEPTH_EXCEEDED
      );
    }
  }

  function stringifyWithDepthLimit(value, depth) {
    if (maxDepth === Infinity) {
      return JSON.stringify(value);
    }

    const ancestors = [];

    return JSON.stringify(value, function limitDepth(_key, currentValue) {
      if (!utils$1.isObject(currentValue)) {
        return currentValue;
      }

      while (ancestors.length && ancestors[ancestors.length - 1] !== this) {
        ancestors.pop();
      }

      ancestors.push(currentValue);
      throwIfMaxDepthExceeded(depth + ancestors.length - 1);

      return currentValue;
    });
  }

  /**
   * Default visitor.
   *
   * @param {*} value
   * @param {String|Number} key
   * @param {Array<String|Number>} path
   * @this {FormData}
   *
   * @returns {boolean} return true to visit the each prop of the value recursively
   */
  function defaultVisitor(value, key, path) {
    let arr = value;

    if (utils$1.isReactNative(formData) && utils$1.isReactNativeBlob(value)) {
      formData.append(renderKey(path, key, dots), convertValue(value));
      return false;
    }

    if (value && !path && typeof value === 'object') {
      if (utils$1.endsWith(key, '{}')) {
        // eslint-disable-next-line no-param-reassign
        key = metaTokens ? key : key.slice(0, -2);
        // eslint-disable-next-line no-param-reassign
        value = stringifyWithDepthLimit(value, 1);
      } else if (
        (utils$1.isArray(value) && isFlatArray(value)) ||
        ((utils$1.isFileList(value) || utils$1.endsWith(key, '[]')) && (arr = utils$1.toArray(value)))
      ) {
        // eslint-disable-next-line no-param-reassign
        key = removeBrackets(key);

        arr.forEach(function each(el, index) {
          !(utils$1.isUndefined(el) || el === null) &&
            formData.append(
              // eslint-disable-next-line no-nested-ternary
              indexes === true
                ? renderKey([key], index, dots)
                : indexes === null
                  ? key
                  : key + '[]',
              convertValue(el)
            );
        });
        return false;
      }
    }

    if (isVisitable(value)) {
      return true;
    }

    formData.append(renderKey(path, key, dots), convertValue(value));

    return false;
  }

  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable,
  });

  function build(value, path, depth = 0) {
    if (utils$1.isUndefined(value)) return;

    throwIfMaxDepthExceeded(depth);

    if (stack.indexOf(value) !== -1) {
      throw new Error('Circular reference detected in ' + path.join('.'));
    }

    stack.push(value);

    utils$1.forEach(value, function each(el, key) {
      const result =
        !(utils$1.isUndefined(el) || el === null) &&
        visitor.call(formData, el, utils$1.isString(key) ? key.trim() : key, path, exposedHelpers);

      if (result === true) {
        build(el, path ? path.concat(key) : [key], depth + 1);
      }
    });

    stack.pop();
  }

  if (!utils$1.isObject(obj)) {
    throw new TypeError('data must be an object');
  }

  build(obj);

  return formData;
}

/**
 * It encodes a string by replacing all characters that are not in the unreserved set with
 * their percent-encoded equivalents
 *
 * @param {string} str - The string to encode.
 *
 * @returns {string} The encoded string.
 */
function encode$1(str) {
  const charMap = {
    '!': '%21',
    "'": '%27',
    '(': '%28',
    ')': '%29',
    '~': '%7E',
    '%20': '+',
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20/g, function replacer(match) {
    return charMap[match];
  });
}

/**
 * It takes a params object and converts it to a FormData object
 *
 * @param {Object<string, any>} params - The parameters to be converted to a FormData object.
 * @param {Object<string, any>} options - The options object passed to the Axios constructor.
 *
 * @returns {void}
 */
function AxiosURLSearchParams(params, options) {
  this._pairs = [];

  params && toFormData(params, this, options);
}

const prototype = AxiosURLSearchParams.prototype;

prototype.append = function append(name, value) {
  this._pairs.push([name, value]);
};

prototype.toString = function toString(encoder) {
  const _encode = encoder
    ? (value) => encoder.call(this, value, encode$1)
    : encode$1;

  return this._pairs
    .map(function each(pair) {
      return _encode(pair[0]) + '=' + _encode(pair[1]);
    }, '')
    .join('&');
};

/**
 * It replaces URL-encoded forms of `:`, `$`, `,`, and spaces with
 * their plain counterparts (`:`, `$`, `,`, `+`).
 *
 * @param {string} val The value to be encoded.
 *
 * @returns {string} The encoded value.
 */
function encode(val) {
  return encodeURIComponent(val)
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '+');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @param {?(object|Function)} options
 *
 * @returns {string} The formatted url
 */
function buildURL(url, params, options) {
  if (!params) {
    return url;
  }
  url = url || '';

  const _options = utils$1.isFunction(options)
    ? {
        serialize: options,
      }
    : options;

  // Read serializer options pollution-safely: own properties and methods on a
  // class/template prototype are honored, but values injected onto a polluted
  // Object.prototype are ignored.
  const _encode = utils$1.getSafeProp(_options, 'encode') || encode;
  const serializeFn = utils$1.getSafeProp(_options, 'serialize');

  let serializedParams;

  if (serializeFn) {
    serializedParams = serializeFn(params, _options);
  } else {
    serializedParams = utils$1.isURLSearchParams(params)
      ? params.toString()
      : new AxiosURLSearchParams(params, _options).toString(_encode);
  }

  if (serializedParams) {
    const hashmarkIndex = url.indexOf('#');

    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
}

const $internals = Symbol('internals');

// `handlers` is public and may be replaced with a nullish value by user code;
// `clear()` has always tolerated that. Treat it as an empty stack rather than
// dereferencing it.
function countHandlers(handlers) {
  return handlers ? handlers.length : 0;
}

function trimHandlers(handlers) {
  if (!handlers) {
    return;
  }

  while (handlers.length && handlers[handlers.length - 1] === null) {
    handlers.pop();
  }
}

function syncHandlerEntries(manager, internals) {
  const handlers = manager.handlers;
  const length = countHandlers(handlers);

  if (handlers !== internals.handlersRef) {
    internals.handlersRef = handlers;
    internals.handlerEntries.clear();
  } else if (length !== internals.handlersLength) {
    if (!length) {
      internals.handlerEntries.clear();
    } else {
      internals.handlerEntries.forEach(function removeStaleEntry(entry, id) {
        if (handlers[entry.index] !== entry.handler) {
          internals.handlerEntries.delete(id);
        }
      });
    }
  }

  internals.handlersLength = length;
}

class InterceptorManager {
  constructor() {
    this.handlers = [];
    this[$internals] = {
      handlersRef: this.handlers,
      handlersLength: this.handlers.length,
      handlerEntries: new Map(),
      iterationDepth: 0,
      nextId: 0,
    };
  }

  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   * @param {Object} options The options for the interceptor, synchronous and runWhen
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(fulfilled, rejected, options) {
    const handler = {
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null,
    };
    const internals = this[$internals];

    if (this.handlers == null) {
      this.handlers = [];
    }

    syncHandlerEntries(this, internals);

    const id = internals.nextId++;

    this.handlers.push(handler);
    internals.handlerEntries.set(id, {
      handler,
      index: this.handlers.length - 1,
    });
    internals.handlersLength = this.handlers.length;

    return id;
  }

  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {void}
   */
  eject(id) {
    const internals = this[$internals];

    syncHandlerEntries(this, internals);

    const entry = internals.handlerEntries.get(id);

    if (entry) {
      internals.handlerEntries.delete(id);

      // Ignore IDs invalidated by clear or direct replacement of handlers.
      if (this.handlers[entry.index] !== entry.handler) {
        return;
      }

      this.handlers[entry.index] = null;

      // Do not reuse an index while forEach is walking its length snapshot.
      if (!internals.iterationDepth) {
        trimHandlers(this.handlers);
        internals.handlersLength = this.handlers.length;
      }
    }
  }

  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    if (this.handlers) {
      this.handlers = [];
      syncHandlerEntries(this, this[$internals]);
    }
  }

  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(fn) {
    const internals = this[$internals];

    syncHandlerEntries(this, internals);

    internals.iterationDepth++;

    try {
      utils$1.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    } finally {
      if (!--internals.iterationDepth) {
        syncHandlerEntries(this, internals);
        trimHandlers(this.handlers);
        internals.handlersLength = countHandlers(this.handlers);
      }
    }
  }
}

const InterceptorManager$1 = InterceptorManager;

const transitionalDefaults = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false,
  legacyInterceptorReqResOrdering: true,
  advertiseZstdAcceptEncoding: false,
  validateStatusUndefinedResolves: true,
};

const URLSearchParams$1 = typeof URLSearchParams !== 'undefined' ? URLSearchParams : AxiosURLSearchParams;

const FormData$1 = typeof FormData !== 'undefined' ? FormData : null;

const Blob$1 = typeof Blob !== 'undefined' ? Blob : null;

const platform$1 = {
  isBrowser: true,
  classes: {
    URLSearchParams: URLSearchParams$1,
    FormData: FormData$1,
    Blob: Blob$1,
  },
  protocols: ['http', 'https', 'file', 'blob', 'url', 'data'],
};

const hasBrowserEnv = typeof window !== 'undefined' && typeof document !== 'undefined';

const _navigator = (typeof navigator === 'object' && navigator) || undefined;

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 *
 * @returns {boolean}
 */
const hasStandardBrowserEnv =
  hasBrowserEnv &&
  (!_navigator || ['ReactNative', 'NativeScript', 'NS'].indexOf(_navigator.product) < 0);

/**
 * Determine if we're running in a standard browser webWorker environment
 *
 * Although the `isStandardBrowserEnv` method indicates that
 * `allows axios to run in a web worker`, the WebWorker will still be
 * filtered out due to its judgment standard
 * `typeof window !== 'undefined' && typeof document !== 'undefined'`.
 * This leads to a problem when axios post `FormData` in webWorker
 */
const hasStandardBrowserWebWorkerEnv = (() => {
  return (
    typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-undef
    self instanceof WorkerGlobalScope &&
    typeof self.importScripts === 'function'
  );
})();

const origin = (hasBrowserEnv && window.location.href) || 'http://localhost';

const utils = /*#__PURE__*/Object.freeze({
  __proto__: null,
  hasBrowserEnv: hasBrowserEnv,
  hasStandardBrowserWebWorkerEnv: hasStandardBrowserWebWorkerEnv,
  hasStandardBrowserEnv: hasStandardBrowserEnv,
  navigator: _navigator,
  origin: origin
});

const platform = {
  ...utils,
  ...platform$1,
};

function toURLEncodedForm(data, options) {
  return toFormData(data, new platform.classes.URLSearchParams(), {
    visitor: function (value, key, path, helpers) {
      if (platform.isNode && utils$1.isBuffer(value)) {
        this.append(key, value.toString('base64'));
        return false;
      }

      return helpers.defaultVisitor.apply(this, arguments);
    },
    ...options,
  });
}

const MAX_DEPTH = DEFAULT_FORM_DATA_MAX_DEPTH;

function throwIfDepthExceeded(index) {
  if (index > MAX_DEPTH) {
    throw new AxiosError$1(
      'FormData field is too deeply nested (' + index + ' levels). Max depth: ' + MAX_DEPTH,
      AxiosError$1.ERR_FORM_DATA_DEPTH_EXCEEDED
    );
  }
}

/**
 * It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
 *
 * @param {string} name - The name of the property to get.
 *
 * @returns An array of strings.
 */
function parsePropPath(name) {
  // foo[x][y][z] -> ['foo', 'x', 'y', 'z']
  // foo.x.y.z    -> ['foo', 'x', 'y', 'z']
  // A path is split on `.` and on `[...]` groups. A segment — whether written
  // in dot notation or captured inside brackets — may contain any character
  // except `.`, `[` and `]`, so a key like `user-name` or `user name` is kept
  // literal instead of being split (#5402). `.`, `[` and `]` keep their existing
  // meaning, e.g. `foo[bar.baz]` -> ['foo', 'bar', 'baz'] and `[]` is an array push.
  // Excluding `[` from the bracket group also makes the match fail fast at the
  // next `[`, so a malformed name cannot rescan to the end of the string from
  // every unmatched `[` — parsing stays linear in the length of the name.
  const path = [];
  const pattern = /[^.[\]]+|\[([^.[\]]*)]/g;
  let match;

  while ((match = pattern.exec(name)) !== null) {
    throwIfDepthExceeded(path.length);
    path.push(match[0] === '[]' ? '' : match[1] || match[0]);
  }

  return path;
}

/**
 * Convert an array to an object.
 *
 * @param {Array<any>} arr - The array to convert to an object.
 *
 * @returns An object with the same keys and values as the array.
 */
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}

/**
 * It takes a FormData object and returns a JavaScript object
 *
 * @param {string} formData The FormData object to convert to JSON.
 *
 * @returns {Object<string, any> | null} The converted object.
 */
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    throwIfDepthExceeded(index);

    let name = path[index++];

    if (name === '__proto__') return true;

    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && utils$1.isArray(target) ? target.length : name;

    if (isLast) {
      if (utils$1.hasOwnProp(target, name)) {
        target[name] = utils$1.isArray(target[name])
          ? target[name].concat(value)
          : [target[name], value];
      } else {
        target[name] = value;
      }

      return !isNumericKey;
    }

    if (!utils$1.hasOwnProp(target, name) || !utils$1.isObject(target[name])) {
      target[name] = [];
    }

    const result = buildPath(path, value, target[name], index);

    if (result && utils$1.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }

    return !isNumericKey;
  }

  if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
    const obj = {};

    utils$1.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });

    return obj;
  }

  return null;
}

const methodList = Object.freeze([
  'get',
  'delete',
  'head',
  'options',
  'post',
  'put',
  'patch',
  'purge',
  'link',
  'unlink',
  'query',
]);

const methodList$1 = methodList;

const own = (obj, key) => (obj != null && utils$1.hasOwnProp(obj, key) ? obj[key] : undefined);

/**
 * It takes a string, tries to parse it, and if it fails, it returns the stringified version
 * of the input
 *
 * @param {any} rawValue - The value to be stringified.
 * @param {Function} parser - A function that parses a string into a JavaScript object.
 * @param {Function} encoder - A function that takes a value and returns a string.
 *
 * @returns {string} A stringified version of the rawValue.
 */
function stringifySafely(rawValue, parser, encoder) {
  if (utils$1.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils$1.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

const defaults = {
  transitional: transitionalDefaults,

  adapter: ['xhr', 'http', 'fetch'],

  transformRequest: [
    function transformRequest(data, headers) {
      const contentType = headers.getContentType() || '';
      const hasJSONContentType = contentType.indexOf('application/json') > -1;
      const isObjectPayload = utils$1.isObject(data);

      if (isObjectPayload && utils$1.isHTMLForm(data)) {
        data = new FormData(data);
      }

      const isFormData = utils$1.isFormData(data);

      if (isFormData) {
        return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
      }

      if (
        utils$1.isArrayBuffer(data) ||
        utils$1.isBuffer(data) ||
        utils$1.isStream(data) ||
        utils$1.isFile(data) ||
        utils$1.isBlob(data) ||
        utils$1.isReadableStream(data)
      ) {
        return data;
      }
      if (utils$1.isArrayBufferView(data)) {
        return data.buffer;
      }
      if (utils$1.isURLSearchParams(data)) {
        headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
        return data.toString();
      }

      let isFileList;

      if (isObjectPayload) {
        const formSerializer = own(this, 'formSerializer');
        if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
          return toURLEncodedForm(data, formSerializer).toString();
        }

        if (
          (isFileList = utils$1.isFileList(data)) ||
          contentType.indexOf('multipart/form-data') > -1
        ) {
          const env = own(this, 'env');
          const _FormData = env && env.FormData;

          return toFormData(
            isFileList ? { 'files[]': data } : data,
            _FormData && new _FormData(),
            formSerializer
          );
        }
      }

      if (isObjectPayload || hasJSONContentType) {
        headers.setContentType('application/json', false);
        return stringifySafely(data);
      }

      return data;
    },
  ],

  transformResponse: [
    function transformResponse(data) {
      const transitional = own(this, 'transitional') || defaults.transitional;
      const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
      const responseType = own(this, 'responseType');
      const JSONRequested = responseType === 'json';

      if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
        return data;
      }

      if (
        data &&
        utils$1.isString(data) &&
        ((forcedJSONParsing && !responseType) || JSONRequested)
      ) {
        const silentJSONParsing = transitional && transitional.silentJSONParsing;
        const strictJSONParsing = !silentJSONParsing && JSONRequested;

        try {
          return JSON.parse(data, own(this, 'parseReviver'));
        } catch (e) {
          if (strictJSONParsing) {
            if (e.name === 'SyntaxError') {
              throw AxiosError$1.from(e, AxiosError$1.ERR_BAD_RESPONSE, this, null, own(this, 'response'));
            }
            throw e;
          }
        }
      }

      return data;
    },
  ],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  env: {
    FormData: platform.classes.FormData,
    Blob: platform.classes.Blob,
  },

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },

  headers: {
    common: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': undefined,
    },
  },
};

utils$1.forEach(methodList$1, (method) => {
  defaults.headers[method] = {};
});

const defaults$1 = defaults;

/**
 * Transform the data for a request or a response
 *
 * @param {Array|Function} fns A single function or Array of functions
 * @param {?Object} response The response object
 *
 * @returns {*} The resulting transformed data
 */
function transformData(fns, response) {
  const config = this || defaults$1;
  const context = response || config;
  const headers = AxiosHeaders$1.from(context.headers);
  let data = context.data;

  utils$1.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
  });

  headers.normalize();

  return data;
}

function isCancel(value) {
  return !!(value && value.__CANCEL__);
}

class CanceledError extends AxiosError$1 {
  /**
   * A `CanceledError` is an object that is thrown when an operation is canceled.
   *
   * @param {string=} message The message.
   * @param {Object=} config The config.
   * @param {Object=} request The request.
   *
   * @returns {CanceledError} The created error.
   */
  constructor(message, config, request) {
    super(message == null ? 'canceled' : message, AxiosError$1.ERR_CANCELED, config, request);
    this.name = 'CanceledError';
    this.__CANCEL__ = true;
  }
}

const CanceledError$1 = CanceledError;

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 *
 * @returns {object} The response.
 */
function settle(resolve, reject, response) {
  const validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError$1(
      'Request failed with status code ' + response.status,
      response.status >= 400 && response.status < 500 ? AxiosError$1.ERR_BAD_REQUEST : AxiosError$1.ERR_BAD_RESPONSE,
      response.config,
      response.request,
      response
    ));
  }
}

const urlParserControlCharacters = /[\t\n\r]/g;

/**
 * Match WHATWG URL preprocessing before checking a URL's protocol.
 *
 * @param {string} url
 *
 * @returns {string}
 */
function normalizeURLForProtocolCheck(url) {
  if (typeof url !== 'string') {
    return url;
  }

  let start = 0;

  while (start < url.length && url.charCodeAt(start) <= 0x20) {
    start++;
  }

  return url.slice(start).replace(urlParserControlCharacters, '');
}

function parseProtocol(url) {
  const match = /^([-+\w]{1,25}):(?:\/\/)?/.exec(url);
  return (match && match[1]) || '';
}

/**
 * Calculate data maxRate
 * @param {Number} [samplesCount= 10]
 * @param {Number} [min= 1000]
 * @returns {Function}
 */
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;

  min = min !== undefined ? min : 1000;

  return function push(chunkLength) {
    const now = Date.now();

    const startedAt = timestamps[tail];

    if (!firstSampleTS) {
      firstSampleTS = now;
    }

    bytes[head] = chunkLength;
    timestamps[head] = now;

    let i = tail;
    let bytesCount = 0;

    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }

    head = (head + 1) % samplesCount;

    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }

    if (now - firstSampleTS < min) {
      return;
    }

    const passed = startedAt && now - startedAt;

    return passed ? Math.round((bytesCount * 1000) / passed) : undefined;
  };
}

/**
 * Throttle decorator
 * @param {Function} fn
 * @param {Number} freq
 * @return {Array<Function>}
 */
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1000 / freq;
  let lastArgs;
  let timer;

  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(...args);
  };

  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };

  const flush = () => lastArgs && invoke(lastArgs);
  const flushWith = (...args) => invoke(args);

  return [throttled, flush, flushWith];
}

const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer(50, 250);

  return throttle((e) => {
    if (!e || !utils$1.isNumber(e.loaded)) {
      return;
    }
    const rawLoaded = e.loaded;
    const total = e.lengthComputable ? e.total : undefined;
    const loaded = Math.max(0, total != null ? Math.min(rawLoaded, total) : rawLoaded);
    const progressBytes = Math.max(0, loaded - bytesNotified);
    const rate = _speedometer(progressBytes);

    bytesNotified = Math.max(bytesNotified, loaded);

    const data = {
      loaded,
      total,
      progress: total ? loaded / total : undefined,
      bytes: progressBytes,
      rate: rate ? rate : undefined,
      estimated: rate && total ? (total - loaded) / rate : undefined,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? 'download' : 'upload']: true,
    };

    listener(data);
  }, freq);
};

const progressEventDecorator = (total, throttled) => {
  const lengthComputable = total != null;

  return [
    (loaded) =>
      throttled[0]({
        lengthComputable,
        total,
        loaded,
      }),
    throttled[1],
  ];
};

const asyncDecorator =
  (fn, scheduler = utils$1.asap) =>
  (...args) =>
    scheduler(() => fn(...args));

const isURLSameOrigin = platform.hasStandardBrowserEnv
  ? ((origin, isMSIE) => (url) => {
      url = new URL(url, platform.origin);

      return (
        origin.protocol === url.protocol &&
        origin.host === url.host &&
        (isMSIE || origin.port === url.port)
      );
    })(
      new URL(platform.origin),
      platform.navigator && /(msie|trident)/i.test(platform.navigator.userAgent)
    )
  : () => true;

const cookies = platform.hasStandardBrowserEnv
  ? // Standard browser envs support document.cookie
    {
      write(name, value, expires, path, domain, secure, sameSite) {
        if (typeof document === 'undefined') return;

        const cookie = [`${name}=${encodeURIComponent(value)}`];

        if (utils$1.isNumber(expires)) {
          cookie.push(`expires=${new Date(expires).toUTCString()}`);
        }
        if (utils$1.isString(path)) {
          cookie.push(`path=${path}`);
        }
        if (utils$1.isString(domain)) {
          cookie.push(`domain=${domain}`);
        }
        if (secure === true) {
          cookie.push('secure');
        }
        if (utils$1.isString(sameSite)) {
          cookie.push(`SameSite=${sameSite}`);
        }

        document.cookie = cookie.join('; ');
      },

      read(name) {
        if (typeof document === 'undefined') return null;
        // Match name=value by splitting on the semicolon separator instead of building a
        // RegExp from `name` — interpolating an unescaped string into a RegExp would let
        // metacharacters (e.g. `.+?` in an attacker-influenced cookie name) cause ReDoS or
        // match the wrong cookie. Browsers may serialize cookie pairs as either ";" or
        // "; ", so ignore optional whitespace before each cookie name.
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].replace(/^\s+/, '');
          const eq = cookie.indexOf('=');
          if (eq !== -1 && cookie.slice(0, eq) === name) {
            try {
              return decodeURIComponent(cookie.slice(eq + 1));
            } catch (e) {
              return cookie.slice(eq + 1);
            }
          }
        }
        return null;
      },

      remove(name) {
        this.write(name, '', Date.now() - 86400000, '/');
      },
    }
  : // Non-standard browser env (web workers, react-native) lack needed support.
    {
      write() {},
      read() {
        return null;
      },
      remove() {},
    };

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 *
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  if (typeof url !== 'string') {
    return false;
  }

  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 *
 * @returns {string} The combined URL
 */
function combineURLs(baseURL, relativeURL) {
  if (!relativeURL) {
    return baseURL;
  }

  let end = baseURL.length;

  while (end > 0 && baseURL.charCodeAt(end - 1) === 47) {
    end--;
  }

  return baseURL.slice(0, end) + '/' + relativeURL.replace(/^\/+/, '');
}

const malformedHttpProtocol = /^https?:(?!\/\/)/i;

// Redact the parts of a URL that can carry secrets before it is embedded in an
// error message. AxiosError.toJSON() serializes `message` verbatim and errors
// are commonly logged, while the opt-in `config.redact` model only cleans
// config keys — it cannot reach the message. Redact only the genuinely
// sensitive substrings — userinfo (credentials), query parameter values and
// fragment contents — with the same REDACTED marker the config redaction uses,
// while keeping the scheme, host, path and parameter names so the offending
// request stays accurately identifiable.
function redactFragment(fragment) {
  if (!fragment) {
    return fragment;
  }

  return fragment.replace(/(^|&)([^=&]*=)?[^&]+/g, (match, separator, parameterName = '') => {
    return `${separator}${parameterName}${REDACTED}`;
  });
}

function redactSensitiveURLParts(url) {
  const redactedURL = url.replace(/^(https?:\/{0,2})[^/?#]*@/i, `$1${REDACTED}@`);
  const fragmentIndex = redactedURL.indexOf('#');
  const urlWithoutFragment =
    fragmentIndex === -1 ? redactedURL : redactedURL.slice(0, fragmentIndex);
  const redactedURLWithoutFragment = urlWithoutFragment.replace(
    /([?&][^=&#]*=)[^&#]*/g,
    `$1${REDACTED}`
  );

  if (fragmentIndex === -1) {
    return redactedURLWithoutFragment;
  }

  return `${redactedURLWithoutFragment}#${redactFragment(redactedURL.slice(fragmentIndex + 1))}`;
}

function assertValidHttpProtocolURL(url, config) {
  if (typeof url === 'string') {
    const normalizedURL = normalizeURLForProtocolCheck(url);
    if (malformedHttpProtocol.test(normalizedURL)) {
      throw new AxiosError$1(
        `Invalid URL ${JSON.stringify(redactSensitiveURLParts(normalizedURL))}: missing "//" after protocol`,
        AxiosError$1.ERR_INVALID_URL,
        config
      );
    }
  }
}

/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 *
 * @returns {string} The combined full path
 */
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls, config) {
  assertValidHttpProtocolURL(requestedURL, config);
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls === false)) {
    assertValidHttpProtocolURL(baseURL, config);
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}

const headersToObject = (thing) => (thing instanceof AxiosHeaders$1 ? { ...thing } : thing);

const ownEnumerableKeys = (thing) => {
  if (Object.getOwnPropertySymbols && Object.getOwnPropertyDescriptor) {
    return Object.keys(thing).concat(
      Object.getOwnPropertySymbols(thing).filter(
        (symbol) => Object.getOwnPropertyDescriptor(thing, symbol).enumerable
      )
    );
  }
  return Object.keys(thing);
};

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 *
 * @returns {Object} New object resulting from merging config2 to config1
 */
function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config1 = config1 || {};
  config2 = config2 || {};

  // Use a null-prototype object so that downstream reads such as `config.auth`
  // or `config.baseURL` cannot inherit polluted values from Object.prototype.
  // `hasOwnProperty` is restored as a non-enumerable own slot to preserve
  // ergonomics for user code that relies on it.
  const config = Object.create(null);
  Object.defineProperty(config, 'hasOwnProperty', {
    // Null-proto descriptor so a polluted Object.prototype.get cannot turn
    // this data descriptor into an accessor descriptor on the way in.
    __proto__: null,
    value: Object.prototype.hasOwnProperty,
    enumerable: false,
    writable: true,
    configurable: true,
  });

  function getMergedValue(target, source, prop, caseless) {
    if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
      return utils$1.merge.call({ caseless }, target, source);
    } else if (utils$1.isPlainObject(source)) {
      return utils$1.merge({}, source);
    } else if (utils$1.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(a, b, prop, caseless);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(undefined, a, prop, caseless);
    }
  }

  // eslint-disable-next-line consistent-return
  function valueFromConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(undefined, b);
    }
  }

  // eslint-disable-next-line consistent-return
  function defaultToConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(undefined, b);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(undefined, a);
    }
  }

  function getMergedTransitionalOption(prop) {
    const transitional2 = utils$1.hasOwnProp(config2, 'transitional')
      ? config2.transitional
      : undefined;

    if (!utils$1.isUndefined(transitional2)) {
      if (utils$1.isPlainObject(transitional2)) {
        if (utils$1.hasOwnProp(transitional2, prop)) {
          return transitional2[prop];
        }
      } else {
        return undefined;
      }
    }

    const transitional1 = utils$1.hasOwnProp(config1, 'transitional')
      ? config1.transitional
      : undefined;

    if (utils$1.isPlainObject(transitional1) && utils$1.hasOwnProp(transitional1, prop)) {
      return transitional1[prop];
    }

    return undefined;
  }

  // eslint-disable-next-line consistent-return
  function mergeDirectKeys(a, b, prop) {
    if (utils$1.hasOwnProp(config2, prop)) {
      return getMergedValue(a, b);
    } else if (utils$1.hasOwnProp(config1, prop)) {
      return getMergedValue(undefined, a);
    }
  }

  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutErrorMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    allowedSocketPaths: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b, prop) =>
      mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true),
  };

  utils$1.forEach(ownEnumerableKeys({ ...config1, ...config2 }), function computeConfigValue(prop) {
    if (prop === '__proto__' || prop === 'constructor' || prop === 'prototype') return;
    const merge = utils$1.hasOwnProp(mergeMap, prop) ? mergeMap[prop] : mergeDeepProperties;
    const a = utils$1.hasOwnProp(config1, prop) ? config1[prop] : undefined;
    const b = utils$1.hasOwnProp(config2, prop) ? config2[prop] : undefined;
    const configValue = merge(a, b, prop);
    (utils$1.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
  });

  if (
    utils$1.hasOwnProp(config2, 'validateStatus') &&
    utils$1.isUndefined(config2.validateStatus) &&
    getMergedTransitionalOption('validateStatusUndefinedResolves') === false
  ) {
    if (utils$1.hasOwnProp(config1, 'validateStatus')) {
      config.validateStatus = getMergedValue(undefined, config1.validateStatus);
    } else {
      delete config.validateStatus;
    }
  }

  return config;
}

const FORM_DATA_CONTENT_HEADERS = ['content-type', 'content-length'];

/**
 * Apply the headers generated by a FormData implementation to the request headers,
 * honoring the `formDataHeaderPolicy` option: with 'content-only', copy only the
 * content-* headers; otherwise merge all of them.
 *
 * @param {AxiosHeaders} headers - the request headers to mutate
 * @param {Object | null | undefined} formHeaders - headers produced by the FormData implementation
 * @param {String} [policy] - the resolved `formDataHeaderPolicy` config value
 *
 * @returns {void}
 */
function setFormDataHeaders(headers, formHeaders, policy) {
  if (policy !== 'content-only') {
    headers.set(formHeaders);
    return;
  }

  Object.entries(formHeaders || {}).forEach(([key, val]) => {
    if (FORM_DATA_CONTENT_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, val);
    }
  });
}

/**
 * Encode a UTF-8 string to a Latin-1 byte string for use with btoa().
 * This is a modern replacement for the deprecated unescape(encodeURIComponent(str)) pattern.
 *
 * @param {string} str The string to encode
 *
 * @returns {string} UTF-8 bytes as a Latin-1 string
 */
const encodeUTF8$1 = (str) =>
  encodeURIComponent(str).replace(/%([0-9A-F]{2})/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

function resolveConfig(config) {
  const newConfig = mergeConfig({}, config);

  // Read only own properties to prevent prototype pollution gadgets
  // (e.g. Object.prototype.baseURL = 'https://evil.com').
  const own = (key) => (utils$1.hasOwnProp(newConfig, key) ? newConfig[key] : undefined);

  const data = own('data');
  let withXSRFToken = own('withXSRFToken');
  const xsrfHeaderName = own('xsrfHeaderName');
  const xsrfCookieName = own('xsrfCookieName');
  let headers = own('headers');
  const auth = own('auth');
  const baseURL = own('baseURL');
  const allowAbsoluteUrls = own('allowAbsoluteUrls');
  const url = own('url');

  newConfig.headers = headers = AxiosHeaders$1.from(headers);

  newConfig.url = buildURL(
    buildFullPath(baseURL, url, allowAbsoluteUrls, newConfig),
    own('params'),
    own('paramsSerializer')
  );

  // HTTP basic authentication
  if (auth) {
    const username = utils$1.getSafeProp(auth, 'username') || '';
    const password = utils$1.getSafeProp(auth, 'password') || '';

    try {
      headers.set(
        'Authorization',
        'Basic ' + btoa(username + ':' + (password ? encodeUTF8$1(password) : ''))
      );
    } catch (e) {
      throw AxiosError$1.from(e, AxiosError$1.ERR_BAD_OPTION_VALUE, config);
    }
  }

  if (utils$1.isFormData(data)) {
    const getHeaders = utils$1.getSafeProp(data, 'getHeaders');

    if (
      platform.hasStandardBrowserEnv ||
      platform.hasStandardBrowserWebWorkerEnv ||
      utils$1.isReactNative(data)
    ) {
      headers.setContentType(undefined); // browser/web worker/RN handles it
    } else if (utils$1.isFunction(getHeaders)) {
      // Node.js FormData (like form-data package)
      setFormDataHeaders(headers, getHeaders.call(data), own('formDataHeaderPolicy'));
    }
  }

  // Add xsrf header
  // This is only done if running in a standard browser environment.
  // Specifically not if we're in a web worker, or react-native.

  if (platform.hasStandardBrowserEnv) {
    if (utils$1.isFunction(withXSRFToken)) {
      withXSRFToken = withXSRFToken(newConfig);
    }

    // Strict boolean check — prevents proto-pollution gadgets (e.g. Object.prototype.withXSRFToken = 1)
    // and misconfigurations (e.g. "false") from short-circuiting the same-origin check and leaking
    // the XSRF token cross-origin.
    const shouldSendXSRF =
      withXSRFToken === true || (withXSRFToken == null && isURLSameOrigin(newConfig.url));

    if (shouldSendXSRF) {
      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);

      if (xsrfValue) {
        headers.set(xsrfHeaderName, xsrfValue);
      }
    }
  }

  return newConfig;
}

const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';

const xhrAdapter = isXHRAdapterSupported &&
  function (config) {
    return new Promise(function dispatchXhrRequest(resolve, reject) {
      const _config = resolveConfig(config);
      let requestData = _config.data;
      const requestHeaders = AxiosHeaders$1.from(_config.headers).normalize();
      let { responseType, onUploadProgress, onDownloadProgress } = _config;
      let onCanceled;
      let uploadThrottled, downloadThrottled;
      let flushUpload, flushDownload, flushDownloadWithEvent;

      function done() {
        flushUpload && flushUpload(); // flush events
        flushDownload && flushDownload(); // flush events

        _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);

        _config.signal && _config.signal.removeEventListener('abort', onCanceled);
      }

      let request = new XMLHttpRequest();

      request.open(_config.method.toUpperCase(), _config.url, true);

      // Set the request timeout in MS
      request.timeout = _config.timeout;

      function onloadend(event) {
        if (!request) {
          return;
        }

        // Status 0 means no response was received, which onerror and onabort normally
        // reject before this runs. Firefox 152 fires only readystatechange and loadend for
        // navigation-canceled requests (https://bugzilla.mozilla.org/show_bug.cgi?id=1505389),
        // leaving settle() to resolve them as an empty success. ECONNABORTED is the error
        // onabort raised on Firefox 151. Reads over file:, which some environments report as
        // status 0 on success, are excluded by the request URL's scheme after browser-style
        // preprocessing, by the page origin's scheme for relative URLs (which inherit it), or
        // by responseURL where implemented.
        if (
          request.status === 0 &&
          (parseProtocol(normalizeURLForProtocolCheck(_config.url)) ||
            parseProtocol(platform.origin)) !== 'file' &&
          !(request.responseURL && request.responseURL.startsWith('file:'))
        ) {
          reject(new AxiosError$1('Request aborted', AxiosError$1.ECONNABORTED, config, request));
          done();

          // Clean up request
          request = null;
          return;
        }

        // When loadend is still dispatching, flushing with it gives progress
        // listeners a final delivery whose event has a live target. The legacy
        // ready-state fallback has no event, so replay its pending progress.
        // A throwing listener must not block settlement; rethrow asynchronously,
        // matching how listener errors surface on the throttle timer path.
        try {
          if (event) {
            flushDownloadWithEvent && flushDownloadWithEvent(event);
          } else {
            flushDownload && flushDownload();
          }
        } catch (err) {
          setTimeout(() => {
            throw err;
          });
        }

        // A final progress callback can cancel the request synchronously.
        if (!request) {
          return;
        }

        // Prepare the response
        const responseHeaders = AxiosHeaders$1.from(
          'getAllResponseHeaders' in request && request.getAllResponseHeaders()
        );
        const responseData =
          !responseType || responseType === 'text' || responseType === 'json'
            ? request.responseText
            : request.response;
        const response = {
          data: responseData,
          status: request.status,
          statusText: request.statusText,
          headers: responseHeaders,
          config,
          request,
        };

        settle(
          function _resolve(value) {
            resolve(value);
            done();
          },
          function _reject(err) {
            reject(err);
            done();
          },
          response
        );

        // Clean up request
        request = null;
      }

      if ('onloadend' in request) {
        // Use onloadend if available
        request.onloadend = onloadend;
      } else {
        // Listen for ready state to emulate onloadend
        request.onreadystatechange = function handleLoad() {
          if (!request || request.readyState !== 4) {
            return;
          }

          // The request errored out and we didn't get a response, this will be
          // handled by onerror instead
          // With one exception: request that using file: protocol, most browsers
          // will return status as 0 even though it's a successful request
          if (
            request.status === 0 &&
            !(request.responseURL && request.responseURL.startsWith('file:'))
          ) {
            return;
          }
          // readystate handler is calling before onerror or ontimeout handlers,
          // so we should call onloadend on the next 'tick'
          setTimeout(onloadend);
        };
      }

      // Handle browser request cancellation (as opposed to a manual cancellation)
      request.onabort = function handleAbort() {
        if (!request) {
          return;
        }

        reject(new AxiosError$1('Request aborted', AxiosError$1.ECONNABORTED, config, request));
        done();

        // Clean up request
        request = null;
      };

      // Handle low level network errors
      request.onerror = function handleError(event) {
        // Browsers deliver a ProgressEvent in XHR onerror
        // (message may be empty; when present, surface it)
        // See https://developer.mozilla.org/docs/Web/API/XMLHttpRequest/error_event
        const msg = event && event.message ? event.message : 'Network Error';
        const err = new AxiosError$1(msg, AxiosError$1.ERR_NETWORK, config, request);
        // attach the underlying event for consumers who want details
        err.event = event || null;
        reject(err);
        done();
        request = null;
      };

      // Handle timeout
      request.ontimeout = function handleTimeout() {
        let timeoutErrorMessage = _config.timeout
          ? 'timeout of ' + _config.timeout + 'ms exceeded'
          : 'timeout exceeded';
        const transitional = _config.transitional || transitionalDefaults;
        if (_config.timeoutErrorMessage) {
          timeoutErrorMessage = _config.timeoutErrorMessage;
        }
        reject(
          new AxiosError$1(
            timeoutErrorMessage,
            transitional.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED,
            config,
            request
          )
        );
        done();

        // Clean up request
        request = null;
      };

      // Remove Content-Type if data is undefined
      requestData === undefined && requestHeaders.setContentType(null);

      // Add headers to the request
      if ('setRequestHeader' in request) {
        utils$1.forEach(toByteStringHeaderObject(requestHeaders), function setRequestHeader(val, key) {
          request.setRequestHeader(key, val);
        });
      }

      // Add withCredentials to request if needed
      if (!utils$1.isUndefined(_config.withCredentials)) {
        request.withCredentials = !!_config.withCredentials;
      }

      // Add responseType to request if needed
      if (responseType && responseType !== 'json') {
        request.responseType = _config.responseType;
      }

      // Handle progress if needed
      if (onDownloadProgress) {
        [downloadThrottled, flushDownload, flushDownloadWithEvent] = progressEventReducer(
          onDownloadProgress,
          true
        );
        request.addEventListener('progress', downloadThrottled);
      }

      // Not all browsers support upload events
      if (onUploadProgress && request.upload) {
        [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);

        request.upload.addEventListener('progress', uploadThrottled);

        request.upload.addEventListener('loadend', flushUpload);
      }

      if (_config.cancelToken || _config.signal) {
        // Handle cancellation
        // eslint-disable-next-line func-names
        onCanceled = (cancel) => {
          if (!request) {
            return;
          }
          reject(!cancel || cancel.type ? new CanceledError$1(null, config, request) : cancel);
          request.abort();
          done();
          request = null;
        };

        _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
        if (_config.signal) {
          _config.signal.aborted
            ? onCanceled()
            : _config.signal.addEventListener('abort', onCanceled);
        }
      }

      const protocol = parseProtocol(_config.url);

      if (protocol && !platform.protocols.includes(protocol)) {
        reject(
          new AxiosError$1(
            'Unsupported protocol ' + protocol + ':',
            AxiosError$1.ERR_BAD_REQUEST,
            config
          )
        );
        done();
        return;
      }

      // Send the request
      request.send(requestData || null);
    });
  };

const composeSignals = (signals, timeout) => {
  signals = signals ? signals.filter(Boolean) : [];

  if (!timeout && !signals.length) {
    return;
  }

  const controller = new AbortController();

  let aborted = false;

  const onabort = function (reason) {
    if (!aborted) {
      aborted = true;
      unsubscribe();
      const err = reason instanceof Error ? reason : this.reason;
      controller.abort(
        err instanceof AxiosError$1
          ? err
          : new CanceledError$1(err instanceof Error ? err.message : err)
      );
    }
  };

  let timer =
    timeout &&
    setTimeout(() => {
      timer = null;
      onabort(new AxiosError$1(`timeout of ${timeout}ms exceeded`, AxiosError$1.ETIMEDOUT));
    }, timeout);

  const unsubscribe = () => {
    if (!signals) { return; }
    timer && clearTimeout(timer);
    timer = null;
    signals.forEach((signal) => {
      signal.unsubscribe
        ? signal.unsubscribe(onabort)
        : signal.removeEventListener('abort', onabort);
    });
    signals = null;
  };

  signals.forEach((signal) => {
    if (aborted) {
      return;
    }

    if (signal.aborted) {
      onabort.call(signal);
      return;
    }

    signal.addEventListener('abort', onabort, { once: true });
  });

  const { signal } = controller;

  signal.unsubscribe = () => utils$1.asap(unsubscribe);

  return signal;
};

const composeSignals$1 = composeSignals;

const streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;

  if (!chunkSize || len < chunkSize) {
    yield chunk;
    return;
  }

  let pos = 0;
  let end;

  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};

const readBytes = async function* (iterable, chunkSize) {
  for await (const chunk of readStream(iterable)) {
    yield* streamChunk(chunk, chunkSize);
  }
};

const readStream = async function* (stream) {
  if (stream[Symbol.asyncIterator]) {
    yield* stream;
    return;
  }

  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    await reader.cancel();
  }
};

const trackStream = (stream, chunkSize, onProgress, onFinish) => {
  const iterator = readBytes(stream, chunkSize);

  let bytes = 0;
  let done;
  let _onFinish = (e) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  };

  return new ReadableStream(
    {
      async pull(controller) {
        try {
          const { done, value } = await iterator.next();

          if (done) {
            _onFinish();
            controller.close();
            return;
          }

          let len = value.byteLength;
          if (onProgress) {
            let loadedBytes = (bytes += len);
            onProgress(loadedBytes);
          }
          controller.enqueue(new Uint8Array(value));
        } catch (err) {
          _onFinish(err);
          throw err;
        }
      },
      cancel(reason) {
        _onFinish(reason);
        return iterator.return();
      },
    },
    {
      highWaterMark: 2,
    }
  );
};

/**
 * Estimate data: URL byte lengths *without* allocating large buffers.
 * - Fetch percent-decodes a base64 body before decoding it.
 * - Node's Buffer.from(body, 'base64') sizes its backing allocation from the
 *   raw body, including ignored characters and content after padding.
 * - Non-base64 data is percent-decoded and then encoded as UTF-8.
 */
const isHexDigit = (charCode) =>
  (charCode >= 48 && charCode <= 57) ||
  (charCode >= 65 && charCode <= 70) ||
  (charCode >= 97 && charCode <= 102);

const isPercentEncodedByte = (str, i, len) =>
  i + 2 < len && isHexDigit(str.charCodeAt(i + 1)) && isHexDigit(str.charCodeAt(i + 2));

const hexValue = (charCode) => (charCode <= 57 ? charCode - 48 : (charCode & 0xdf) - 55);

const isBase64Char = (charCode) =>
  (charCode >= 65 && charCode <= 90) || // A-Z
  (charCode >= 97 && charCode <= 122) || // a-z
  (charCode >= 48 && charCode <= 57) || // 0-9
  charCode === 43 || // +
  charCode === 47 || // /
  charCode === 45 || // - (base64url)
  charCode === 95; // _ (base64url)

const isBase64Whitespace = (charCode) =>
  charCode === 9 || charCode === 10 || charCode === 12 || charCode === 13 || charCode === 32;

const base64Bytes = (significant) => {
  const groups = Math.floor(significant / 4);
  const remainder = significant % 4;
  return groups * 3 + (remainder === 2 ? 1 : remainder === 3 ? 2 : 0);
};

// Buffer.byteLength(body, 'base64') uses the raw string length as an allocation
// upper bound even when Buffer.from later ignores characters or stops at '='.
const estimateBase64BufferAllocation = (body) => {
  const len = body.length;
  let padding = 0;

  if (len > 0 && body.charCodeAt(len - 1) === 61 /* '=' */) {
    padding++;

    if (len > 1 && body.charCodeAt(len - 2) === 61 /* '=' */) {
      padding++;
    }
  }

  return Math.floor(((len - padding) * 3) / 4);
};

const estimatePercentDecodedBase64Bytes = (body) => {
  const len = body.length;
  let significant = 0;
  let padding = 0;
  let invalid = false;

  for (let i = 0; i < len; i++) {
    let code = body.charCodeAt(i);

    if (code === 37 /* '%' */ && isPercentEncodedByte(body, i, len)) {
      code = hexValue(body.charCodeAt(i + 1)) * 16 + hexValue(body.charCodeAt(i + 2));
      i += 2;
    }

    if (isBase64Whitespace(code)) {
      continue;
    }

    if (code === 61 /* '=' */) {
      padding++;
      continue;
    }

    if (!isBase64Char(code) || padding > 0) {
      invalid = true;
      continue;
    }

    significant++;
  }

  // Fetch rejects malformed forgiving-base64 input. Returning the raw-size
  // allocation bound keeps that invalid input from becoming a pre-check bypass.
  if (
    invalid ||
    padding > 2 ||
    (padding > 0 && (significant + padding) % 4 !== 0) ||
    significant % 4 === 1
  ) {
    return estimateBase64BufferAllocation(body);
  }

  return base64Bytes(significant);
};

const estimateDataURLBytes = (url, estimateBase64) => {
  if (!url || typeof url !== 'string') return 0;
  if (!url.startsWith('data:')) return 0;

  const comma = url.indexOf(',');
  if (comma < 0) return 0;

  const meta = url.slice(5, comma);
  const body = url.slice(comma + 1);
  const isBase64 = /;base64/i.test(meta);

  if (isBase64) {
    return estimateBase64(body);
  }

  // Compute UTF-8 byte length directly from UTF-16 code units without allocating
  // a byte buffer (TextEncoder.encode would defeat the DoS guard on large bodies).
  // Valid %XX triplets count as one decoded byte; this matches the bytes that
  // decodeURIComponent(body) would produce before Buffer re-encodes the string.
  let bytes = 0;
  for (let i = 0, len = body.length; i < len; i++) {
    const c = body.charCodeAt(i);
    if (c === 37 /* '%' */ && isPercentEncodedByte(body, i, len)) {
      bytes += 1;
      i += 2;
    } else if (c < 0x80) {
      bytes += 1;
    } else if (c < 0x800) {
      bytes += 2;
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < len) {
      const next = body.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
};

/**
 * Estimate the percent-decoded payload size used by Fetch data: URLs.
 *
 * @param {string} url
 * @returns {number}
 */
function estimateDataURLDecodedBytes(url) {
  // Fetch removes URL fragments before processing a data: URL.
  const fragmentIndex = typeof url === 'string' ? url.indexOf('#') : -1;

  return estimateDataURLBytes(
    fragmentIndex === -1 ? url : url.slice(0, fragmentIndex),
    estimatePercentDecodedBase64Bytes
  );
}

const VERSION = "1.20.0";

const DEFAULT_CHUNK_SIZE = 64 * 1024;

const DEFAULT_REQUEST_OPTIONS = {
  cache: 'default',
  redirect: 'follow',
  referrer: 'about:client',
  referrerPolicy: '',
  mode: 'cors',
  integrity: '',
  keepalive: false,
  priority: 'auto',
  window: null,
};

const { isFunction } = utils$1;

/**
 * Encode a UTF-8 string to a Latin-1 byte string for use with btoa().
 * This is a modern replacement for the deprecated unescape(encodeURIComponent(str)) pattern.
 *
 * @param {string} str The string to encode
 *
 * @returns {string} UTF-8 bytes as a Latin-1 string
 */
const encodeUTF8 = (str) =>
  encodeURIComponent(str).replace(/%([0-9A-F]{2})/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

// Node's WHATWG URL parser returns `username` and `password` percent-encoded.
// Decode before composing the `auth` option so credentials such as
// `my%40email.com:pass` are sent as `my@email.com:pass`. Falls back to the
// original value for malformed input so a bad encoding never throws.
const decodeURIComponentSafe = (value) => {
  if (!utils$1.isString(value)) {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
};

const test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false;
  }
};

const maybeWithAuthCredentials = (url) => {
  const protocolIndex = url.indexOf('://');
  let urlToCheck = url;
  if (protocolIndex !== -1) {
    urlToCheck = urlToCheck.slice(protocolIndex + 3);
  }
  return urlToCheck.includes('@') || urlToCheck.includes(':');
};

const factory = (env) => {
  const globalObject =
    utils$1.global !== undefined && utils$1.global !== null ? utils$1.global : globalThis;
  const { ReadableStream, TextEncoder } = globalObject;

  env = utils$1.merge.call(
    {
      skipUndefined: true,
    },
    {
      Request: globalObject.Request,
      Response: globalObject.Response,
    },
    env
  );

  const { fetch: envFetch, Request, Response } = env;
  const isFetchSupported = envFetch ? isFunction(envFetch) : typeof fetch === 'function';
  const isRequestSupported = isFunction(Request);
  const isResponseSupported = isFunction(Response);

  if (!isFetchSupported) {
    return false;
  }

  const isReadableStreamSupported = isFetchSupported && isFunction(ReadableStream);

  const encodeText =
    isFetchSupported &&
    (typeof TextEncoder === 'function'
      ? (
          (encoder) => (str) =>
            encoder.encode(str)
        )(new TextEncoder())
      : async (str) => new Uint8Array(await new Request(str).arrayBuffer()));

  const supportsRequestStream =
    isRequestSupported &&
    isReadableStreamSupported &&
    test(() => {
      let duplexAccessed = false;

      const request = new Request(platform.origin, {
        body: new ReadableStream(),
        method: 'POST',
        get duplex() {
          duplexAccessed = true;
          return 'half';
        },
      });

      const hasContentType = request.headers.has('Content-Type');

      if (request.body != null) {
        request.body.cancel();
      }

      return duplexAccessed && !hasContentType;
    });

  const supportsResponseStream =
    isResponseSupported &&
    isReadableStreamSupported &&
    test(() => utils$1.isReadableStream(new Response('').body));

  const resolvers = {
    stream: supportsResponseStream && ((res) => res.body),
  };

  isFetchSupported &&
    (() => {
      ['text', 'arrayBuffer', 'blob', 'formData', 'stream'].forEach((type) => {
        !resolvers[type] &&
          (resolvers[type] = (res, config) => {
            let method = res && res[type];

            if (method) {
              return method.call(res);
            }

            throw new AxiosError$1(
              `Response type '${type}' is not supported`,
              AxiosError$1.ERR_NOT_SUPPORT,
              config
            );
          });
      });
    })();

  const getBodyLength = async (body) => {
    if (body == null) {
      return 0;
    }

    if (utils$1.isBlob(body)) {
      return body.size;
    }

    if (utils$1.isSpecCompliantForm(body)) {
      const _request = new Request(platform.origin, {
        method: 'POST',
        body,
      });
      return (await _request.arrayBuffer()).byteLength;
    }

    if (utils$1.isArrayBufferView(body) || utils$1.isArrayBuffer(body)) {
      return body.byteLength;
    }

    if (utils$1.isURLSearchParams(body)) {
      body = body + '';
    }

    if (utils$1.isString(body)) {
      return (await encodeText(body)).byteLength;
    }
  };

  const resolveBodyLength = async (headers, body) => {
    const length = utils$1.toFiniteNumber(headers.getContentLength());

    return length == null ? getBodyLength(body) : length;
  };

  return async (config) => {
    let {
      url,
      method,
      data,
      signal,
      cancelToken,
      timeout,
      onDownloadProgress,
      onUploadProgress,
      responseType,
      headers,
      withCredentials = 'same-origin',
      fetchOptions,
      maxContentLength,
      maxBodyLength,
      maxRedirects,
    } = resolveConfig(config);

    const hasMaxContentLength = utils$1.isNumber(maxContentLength) && maxContentLength > -1;
    const hasMaxBodyLength = utils$1.isNumber(maxBodyLength) && maxBodyLength > -1;
    const own = (key) => (utils$1.hasOwnProp(config, key) ? config[key] : undefined);

    let _fetch = envFetch || fetch;

    responseType = responseType ? (responseType + '').toLowerCase() : 'text';

    let composedSignal = composeSignals$1(
      [signal, cancelToken && cancelToken.toAbortSignal()],
      timeout
    );

    let request = null;

    const unsubscribe =
      composedSignal &&
      composedSignal.unsubscribe &&
      (() => {
        composedSignal.unsubscribe();
      });

    let requestContentLength;

    // AxiosError we raise while the request body is being streamed. Captured
    // by identity so the catch block can surface it directly, regardless of
    // how the runtime wraps the resulting fetch rejection (undici exposes it
    // as `err.cause`; some browsers drop the original error entirely).
    let pendingBodyError = null;

    const maxBodyLengthError = () =>
      new AxiosError$1(
        'Request body larger than maxBodyLength limit',
        AxiosError$1.ERR_BAD_REQUEST,
        config,
        request
      );

    try {
      // HTTP basic authentication
      let auth = undefined;
      const configAuth = own('auth');

      if (configAuth) {
        const username = utils$1.getSafeProp(configAuth, 'username') || '';
        const password = utils$1.getSafeProp(configAuth, 'password') || '';
        auth = {
          username,
          password,
        };
      }

      if (maybeWithAuthCredentials(url)) {
        const parsedURL = new URL(url, platform.origin);

        if (!auth && (parsedURL.username || parsedURL.password)) {
          const urlUsername = decodeURIComponentSafe(parsedURL.username);
          const urlPassword = decodeURIComponentSafe(parsedURL.password);
          auth = {
            username: urlUsername,
            password: urlPassword,
          };
        }

        if (parsedURL.username || parsedURL.password) {
          parsedURL.username = '';
          parsedURL.password = '';
          url = parsedURL.href;
        }
      }

      if (auth) {
        headers.delete('authorization');
        headers.set(
          'Authorization',
          'Basic ' + btoa(encodeUTF8((auth.username || '') + ':' + (auth.password || '')))
        );
      }

      // Enforce maxContentLength for data: URLs up-front so we never materialize
      // an oversized payload. The HTTP adapter applies the same check (see http.js
      // "if (protocol === 'data:')" branch).
      if (hasMaxContentLength && typeof url === 'string' && url.startsWith('data:')) {
        const estimated = estimateDataURLDecodedBytes(url);
        if (estimated > maxContentLength) {
          throw new AxiosError$1(
            'maxContentLength size of ' + maxContentLength + ' exceeded',
            AxiosError$1.ERR_BAD_RESPONSE,
            config,
            request
          );
        }
      }

      // Enforce maxBodyLength against known-size bodies before dispatch using
      // the body's *actual* size — never a caller-declared Content-Length,
      // which could under-report to slip an oversized body past the check.
      // Unknown-size streams return undefined here and are counted per-chunk
      // below as fetch consumes them.
      if (hasMaxBodyLength && method !== 'get' && method !== 'head') {
        const outboundLength = await getBodyLength(data);
        if (typeof outboundLength === 'number' && isFinite(outboundLength)) {
          requestContentLength = outboundLength;
          if (outboundLength > maxBodyLength) {
            throw maxBodyLengthError();
          }
        }
      }

      // A streamed body under maxBodyLength must be counted as fetch consumes
      // it; its size is never trusted from a caller-declared Content-Length.
      const mustEnforceStreamBody =
        hasMaxBodyLength && (utils$1.isReadableStream(data) || utils$1.isStream(data));

      const trackRequestStream = (stream, onProgress, flush) =>
        trackStream(
          stream,
          DEFAULT_CHUNK_SIZE,
          (loadedBytes) => {
            if (hasMaxBodyLength && loadedBytes > maxBodyLength) {
              throw (pendingBodyError = maxBodyLengthError());
            }
            onProgress && onProgress(loadedBytes);
          },
          flush
        );

      if (
        supportsRequestStream &&
        method !== 'get' &&
        method !== 'head' &&
        (onUploadProgress || mustEnforceStreamBody)
      ) {
        requestContentLength =
          requestContentLength == null
            ? await resolveBodyLength(headers, data)
            : requestContentLength;

        // A declared length of 0 is only trusted to skip the wrap when we are
        // not enforcing a stream limit (which must not rely on that header).
        if (requestContentLength !== 0 || mustEnforceStreamBody) {
          let _request = new Request(url, {
            method: 'POST',
            body: data,
            duplex: 'half',
          });

          let contentTypeHeader;

          if (
            utils$1.isFormData(data) &&
            (contentTypeHeader = _request.headers.get('content-type'))
          ) {
            headers.setContentType(contentTypeHeader);
          }

          if (_request.body) {
            const [onProgress, flush] =
              (onUploadProgress &&
                progressEventDecorator(
                  requestContentLength,
                  progressEventReducer(asyncDecorator(onUploadProgress))
                )) ||
              [];

            data = trackRequestStream(_request.body, onProgress, flush);
          }
        }
      } else if (
        mustEnforceStreamBody &&
        !isRequestSupported &&
        isReadableStreamSupported &&
        method !== 'get' &&
        method !== 'head'
      ) {
        data = trackRequestStream(data);
      } else if (
        mustEnforceStreamBody &&
        isRequestSupported &&
        !supportsRequestStream &&
        method !== 'get' &&
        method !== 'head'
      ) {
        throw new AxiosError$1(
          'Stream request bodies are not supported by the current fetch implementation',
          AxiosError$1.ERR_NOT_SUPPORT,
          config,
          request
        );
      }

      if (!utils$1.isString(withCredentials)) {
        withCredentials = withCredentials ? 'include' : 'omit';
      }

      // Cloudflare Workers throws when credentials are defined
      // see https://github.com/cloudflare/workerd/issues/902
      const isCredentialsSupported = isRequestSupported && 'credentials' in Request.prototype;

      // If data is FormData and Content-Type is multipart/form-data without boundary,
      // delete it so fetch can set it correctly with the boundary
      if (utils$1.isFormData(data)) {
        const contentType = headers.getContentType();
        if (
          contentType &&
          /^multipart\/form-data/i.test(contentType) &&
          !/boundary=/i.test(contentType)
        ) {
          headers.delete('content-type');
        }
      }

      // Set User-Agent header if not already set (fetch defaults to 'node' in Node.js)
      headers.set('User-Agent', 'axios/' + VERSION, false);

      const safeFetchOptions =
        fetchOptions == null ? fetchOptions : Object.assign(Object.create(null), fetchOptions);

      if (safeFetchOptions) {
        // These options are owned by Axios and are already reflected in the
        // resolved Request passed to fetch.
        delete safeFetchOptions.body;
        delete safeFetchOptions.headers;
        delete safeFetchOptions.method;
        delete safeFetchOptions.signal;
        delete safeFetchOptions.duplex;
        delete safeFetchOptions.credentials;
      }

      const resolvedOptions = Object.assign(Object.create(null), safeFetchOptions, {
        signal: composedSignal,
        method: method.toUpperCase(),
        headers: toByteStringHeaderObject(headers.normalize()),
        body: data,
        duplex: 'half',
        credentials: isCredentialsSupported ? withCredentials : undefined,
      });

      if (isRequestSupported) {
        utils$1.forEach(DEFAULT_REQUEST_OPTIONS, (value, key) => {
          if (resolvedOptions[key] === undefined) {
            resolvedOptions[key] = value;
          }
        });

        if (resolvedOptions.signal === undefined) {
          resolvedOptions.signal = null;
        }

        if (resolvedOptions.body === undefined) {
          resolvedOptions.body = null;
        }
      }

      if (maxRedirects === 0) {
        resolvedOptions.redirect = 'manual';

        if (safeFetchOptions) {
          safeFetchOptions.redirect = 'manual';
        }
      }

      request = isRequestSupported && new Request(url, resolvedOptions);

      let response = await (isRequestSupported
        ? _fetch(request, safeFetchOptions)
        : _fetch(url, resolvedOptions));

      const responseHeaders = AxiosHeaders$1.from(response.headers);

      // Cheap pre-check: if the server honestly declares a content-length that
      // already exceeds the cap, reject before we start streaming.
      if (hasMaxContentLength) {
        const declaredLength = utils$1.toFiniteNumber(responseHeaders.getContentLength());
        if (declaredLength != null && declaredLength > maxContentLength) {
          throw new AxiosError$1(
            'maxContentLength size of ' + maxContentLength + ' exceeded',
            AxiosError$1.ERR_BAD_RESPONSE,
            config,
            request
          );
        }
      }

      const isStreamResponse =
        supportsResponseStream && (responseType === 'stream' || responseType === 'response');

      if (
        supportsResponseStream &&
        response.body &&
        (onDownloadProgress || hasMaxContentLength || (isStreamResponse && unsubscribe))
      ) {
        const options = {};

        ['status', 'statusText', 'headers'].forEach((prop) => {
          options[prop] = response[prop];
        });

        const responseContentLength = utils$1.toFiniteNumber(responseHeaders.getContentLength());

        const [onProgress, flush] =
          (onDownloadProgress &&
            progressEventDecorator(
              responseContentLength,
              progressEventReducer(asyncDecorator(onDownloadProgress), true)
            )) ||
          [];

        let bytesRead = 0;
        const onChunkProgress = (loadedBytes) => {
          if (hasMaxContentLength) {
            bytesRead = loadedBytes;
            if (bytesRead > maxContentLength) {
              throw new AxiosError$1(
                'maxContentLength size of ' + maxContentLength + ' exceeded',
                AxiosError$1.ERR_BAD_RESPONSE,
                config,
                request
              );
            }
          }
          onProgress && onProgress(loadedBytes);
        };

        response = new Response(
          trackStream(response.body, DEFAULT_CHUNK_SIZE, onChunkProgress, () => {
            flush && flush();
            unsubscribe && unsubscribe();
          }),
          options
        );
      }

      responseType = responseType || 'text';

      let responseData = await resolvers[utils$1.findKey(resolvers, responseType) || 'text'](
        response,
        config
      );

      // Fallback enforcement for environments without ReadableStream support
      // (legacy runtimes). Detect materialized size from typed output; skip
      // streams/Response passthrough since the user will read those themselves.
      if (hasMaxContentLength && !supportsResponseStream && !isStreamResponse) {
        let materializedSize;
        if (responseData != null) {
          if (typeof responseData.byteLength === 'number') {
            materializedSize = responseData.byteLength;
          } else if (typeof responseData.size === 'number') {
            materializedSize = responseData.size;
          } else if (typeof responseData === 'string') {
            materializedSize =
              typeof TextEncoder === 'function'
                ? new TextEncoder().encode(responseData).byteLength
                : responseData.length;
          }
        }
        if (typeof materializedSize === 'number' && materializedSize > maxContentLength) {
          throw new AxiosError$1(
            'maxContentLength size of ' + maxContentLength + ' exceeded',
            AxiosError$1.ERR_BAD_RESPONSE,
            config,
            request
          );
        }
      }

      !isStreamResponse && unsubscribe && unsubscribe();

      return await new Promise((resolve, reject) => {
        settle(resolve, reject, {
          data: responseData,
          headers: AxiosHeaders$1.from(response.headers),
          status: response.status,
          statusText: response.statusText,
          config,
          request,
        });
      });
    } catch (err) {
      unsubscribe && unsubscribe();

      // Safari can surface fetch aborts as a DOMException-like object whose
      // branded getters throw. Prefer our composed signal reason before reading
      // the caught error, preserving timeout vs cancellation semantics.
      if (composedSignal && composedSignal.aborted && composedSignal.reason instanceof AxiosError$1) {
        const canceledError = composedSignal.reason;
        canceledError.config = config;
        request && (canceledError.request = request);
        if (err !== canceledError) {
          // Non-enumerable to match native Error `cause` semantics so loggers
          // don't recurse into circular fetch internals (see #7205).
          Object.defineProperty(canceledError, 'cause', {
            __proto__: null,
            value: err,
            writable: true,
            enumerable: false,
            configurable: true,
          });
        }
        throw canceledError;
      }

      // Surface a maxBodyLength violation we raised while the request body was
      // being streamed. Matching by identity (rather than reading
      // `err.cause.isAxiosError`) keeps the error deterministic across runtimes
      // and avoids both prototype-pollution reads and mis-attributing a foreign
      // AxiosError that merely happened to land in `err.cause`.
      if (pendingBodyError) {
        request && !pendingBodyError.request && (pendingBodyError.request = request);
        throw pendingBodyError;
      }

      // Re-throw AxiosErrors we raised synchronously (data: URL / content-length
      // pre-checks, response size enforcement) without re-wrapping them.
      if (err instanceof AxiosError$1) {
        request && !err.request && (err.request = request);
        throw err;
      }

      if (err && err.name === 'TypeError' && /Load failed|fetch/i.test(err.message)) {
        const networkError = new AxiosError$1(
          'Network Error',
          AxiosError$1.ERR_NETWORK,
          config,
          request,
          err && err.response
        );
        // Non-enumerable to match native Error `cause` semantics so loggers
        // don't recurse into circular fetch internals (see #7205).
        Object.defineProperty(networkError, 'cause', {
          __proto__: null,
          value: err.cause || err,
          writable: true,
          enumerable: false,
          configurable: true,
        });
        throw networkError;
      }

      throw AxiosError$1.from(err, err && err.code, config, request, err && err.response);
    }
  };
};

const seedCache = new Map();

const getFetch = (config) => {
  let env = (config && config.env) || {};
  const { fetch, Request, Response } = env;
  const seeds = [Request, Response, fetch];

  let len = seeds.length,
    i = len,
    seed,
    target,
    map = seedCache;

  while (i--) {
    seed = seeds[i];
    target = map.get(seed);

    target === undefined && map.set(seed, (target = i ? new Map() : factory(env)));

    map = target;
  }

  return target;
};

getFetch();

/**
 * Known adapters mapping.
 * Provides environment-specific adapters for Axios:
 * - `http` for Node.js
 * - `xhr` for browsers
 * - `fetch` for fetch API-based requests
 *
 * @type {Object<string, Function|Object>}
 */
const knownAdapters = {
  http: httpAdapter,
  xhr: xhrAdapter,
  fetch: {
    get: getFetch,
  },
};

// Assign adapter names for easier debugging and identification
utils$1.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      // Null-proto descriptors so a polluted Object.prototype.get cannot turn
      // these data descriptors into accessor descriptors on the way in.
      Object.defineProperty(fn, 'name', { __proto__: null, value });
    } catch (e) {
      // eslint-disable-next-line no-empty
    }
    Object.defineProperty(fn, 'adapterName', { __proto__: null, value });
  }
});

/**
 * Render a rejection reason string for unknown or unsupported adapters
 *
 * @param {string} reason
 * @returns {string}
 */
const renderReason = (reason) => `- ${reason}`;

/**
 * Check if the adapter is resolved (function, null, or false)
 *
 * @param {Function|null|false} adapter
 * @returns {boolean}
 */
const isResolvedHandle = (adapter) =>
  utils$1.isFunction(adapter) || adapter === null || adapter === false;

/**
 * Get the first suitable adapter from the provided list.
 * Tries each adapter in order until a supported one is found.
 * Throws an AxiosError if no adapter is suitable.
 *
 * @param {Array<string|Function>|string|Function} adapters - Adapter(s) by name or function.
 * @param {Object} config - Axios request configuration
 * @throws {AxiosError} If no suitable adapter is available
 * @returns {Function} The resolved adapter function
 */
function getAdapter(adapters, config) {
  adapters = utils$1.isArray(adapters) ? adapters : [adapters];

  const { length } = adapters;
  let nameOrAdapter;
  let adapter;

  const rejectedReasons = {};

  for (let i = 0; i < length; i++) {
    nameOrAdapter = adapters[i];
    let id;

    adapter = nameOrAdapter;

    if (!isResolvedHandle(nameOrAdapter)) {
      adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];

      if (adapter === undefined) {
        throw new AxiosError$1(`Unknown adapter '${id}'`);
      }
    }

    if (adapter && (utils$1.isFunction(adapter) || (adapter = adapter.get(config)))) {
      break;
    }

    rejectedReasons[id || '#' + i] = adapter;
  }

  if (!adapter) {
    const reasons = Object.entries(rejectedReasons).map(
      ([id, state]) =>
        `adapter ${id} ` +
        (state === false ? 'is not supported by the environment' : 'is not available in the build')
    );

    let s = length
      ? reasons.length > 1
        ? 'since :\n' + reasons.map(renderReason).join('\n')
        : ' ' + renderReason(reasons[0])
      : 'as no adapter specified';

    throw new AxiosError$1(
      `There is no suitable adapter to dispatch the request ` + s,
      AxiosError$1.ERR_NOT_SUPPORT
    );
  }

  return adapter;
}

/**
 * Exports Axios adapters and utility to resolve an adapter
 */
const adapters = {
  /**
   * Resolve an adapter from a list of adapter names or functions.
   * @type {Function}
   */
  getAdapter,

  /**
   * Exposes all known adapters
   * @type {Object<string, Function|Object>}
   */
  adapters: knownAdapters,
};

/**
 * Throws a `CanceledError` if cancellation has been requested.
 *
 * @param {Object} config The config that is to be used for the request
 *
 * @returns {void}
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError$1(null, config);
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 *
 * @returns {Promise} The Promise to be fulfilled
 */
function dispatchRequest(_config) {
  // Interceptors may replace the merged config with an ordinary object. Flatten
  // it at the dispatch boundary so shared prototype members cannot become
  // request behavior, while preserving intentional template/class members.
  const config = utils$1.toSafeFlatObject(_config);

  throwIfCancellationRequested(config);

  config.headers = AxiosHeaders$1.from(utils$1.getSafeProp(config, 'headers'));

  // Transform request data
  config.data = transformData.call(config, config.transformRequest);

  if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
    config.headers.setContentType('application/x-www-form-urlencoded', false);
  }

  const adapter = adapters.getAdapter(config.adapter || defaults$1.adapter, config);

  return adapter(config).then(
    function onAdapterResolution(response) {
      throwIfCancellationRequested(config);

      // Expose the current response on config so that transformResponse can
      // attach it to any AxiosError it throws (e.g. on JSON parse failure).
      // We clean it up afterwards to avoid polluting the config object.
      config.response = response;
      try {
        response.data = transformData.call(config, config.transformResponse, response);
      } finally {
        delete config.response;
      }

      response.headers = AxiosHeaders$1.from(response.headers);

      return response;
    },
    function onAdapterRejection(reason) {
      if (!isCancel(reason)) {
        throwIfCancellationRequested(config);

        // Transform response data
        if (reason && reason.response) {
          config.response = reason.response;
          try {
            reason.response.data = transformData.call(
              config,
              config.transformResponse,
              reason.response
            );
          } finally {
            delete config.response;
          }
          reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
        }
      }

      return Promise.reject(reason);
    }
  );
}

const validators$1 = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach((type, i) => {
  validators$1[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

const deprecatedWarnings = {};

/**
 * Transitional option validator
 *
 * @param {function|boolean?} validator - set to false if the transitional option has been removed
 * @param {string?} version - deprecated version / removed since version
 * @param {string?} message - some message with additional info
 *
 * @returns {function}
 */
validators$1.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return (
      '[Axios v' +
      VERSION +
      "] Transitional option '" +
      opt +
      "'" +
      desc +
      (message ? '. ' + message : '')
    );
  }

  // eslint-disable-next-line func-names
  return (value, opt, opts) => {
    if (validator === false) {
      throw new AxiosError$1(
        formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
        AxiosError$1.ERR_DEPRECATED
      );
    }

    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      );
    }

    return validator ? validator(value, opt, opts) : true;
  };
};

validators$1.spelling = function spelling(correctSpelling) {
  return (value, opt) => {
    // eslint-disable-next-line no-console
    console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
    return true;
  };
};

/**
 * Assert object's properties type
 *
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 *
 * @returns {object}
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object' || options === null) {
    throw new AxiosError$1('options must be an object', AxiosError$1.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    // Use hasOwnProperty so a polluted Object.prototype.<opt> cannot supply
    // a non-function validator and cause a TypeError.
    const validator = Object.prototype.hasOwnProperty.call(schema, opt) ? schema[opt] : undefined;
    if (validator) {
      const value = options[opt];
      const result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new AxiosError$1(
          'option ' + opt + ' must be ' + result,
          AxiosError$1.ERR_BAD_OPTION_VALUE
        );
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError$1('Unknown option ' + opt, AxiosError$1.ERR_BAD_OPTION);
    }
  }
}

const validator = {
  assertOptions,
  validators: validators$1,
};

const validators = validator.validators;

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 *
 * @return {Axios} A new instance of Axios
 */
class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig || {};
    this.interceptors = {
      request: new InterceptorManager$1(),
      response: new InterceptorManager$1(),
    };
  }

  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        try {
          let dummy = {};

          Error.captureStackTrace ? Error.captureStackTrace(dummy) : (dummy = new Error());

          const dummyStack = dummy.stack;
          let stack = '';

          // slice off the Error: ... line
          if (typeof dummyStack === 'string') {
            const firstNewlineIndex = dummyStack.indexOf('\n');

            stack = firstNewlineIndex === -1 ? '' : dummyStack.slice(firstNewlineIndex + 1);
          }

          if (!err.stack) {
            err.stack = stack;
            // match without the 2 top stack lines
          } else if (stack) {
            const firstNewlineIndex = stack.indexOf('\n');
            const secondNewlineIndex =
              firstNewlineIndex === -1 ? -1 : stack.indexOf('\n', firstNewlineIndex + 1);
            const stackWithoutTwoTopLines =
              secondNewlineIndex === -1 ? '' : stack.slice(secondNewlineIndex + 1);

            if (!String(err.stack).endsWith(stackWithoutTwoTopLines)) {
              err.stack += '\n' + stack;
            }
          }
        } catch (e) {
          // Ignore failures from custom stack hooks or un-writable stack properties.
        }
      }

      throw err;
    }
  }

  _request(configOrUrl, config) {
    /*eslint no-param-reassign:0*/
    // Allow for axios('example/url'[, config]) a la fetch API
    if (typeof configOrUrl === 'string') {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }

    config = mergeConfig(this.defaults, config);

    const { transitional, paramsSerializer, headers } = config;

    if (transitional !== undefined) {
      validator.assertOptions(
        transitional,
        {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean),
          legacyInterceptorReqResOrdering: validators.transitional(validators.boolean),
          advertiseZstdAcceptEncoding: validators.transitional(validators.boolean),
          validateStatusUndefinedResolves: validators.transitional(validators.boolean),
        },
        false
      );
    }

    if (paramsSerializer != null) {
      if (utils$1.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer,
        };
      } else {
        validator.assertOptions(
          paramsSerializer,
          {
            encode: validators.function,
            serialize: validators.function,
          },
          true
        );
      }
    }

    // Set config.allowAbsoluteUrls
    if (config.allowAbsoluteUrls !== undefined) ; else if (this.defaults.allowAbsoluteUrls !== undefined) {
      config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    } else {
      config.allowAbsoluteUrls = true;
    }

    validator.assertOptions(
      config,
      {
        baseUrl: validators.spelling('baseURL'),
        withXsrfToken: validators.spelling('withXSRFToken'),
      },
      true
    );

    // Set config.method
    config.method = (
      utils$1.getSafeProp(config, 'method') ||
      utils$1.getSafeProp(this.defaults, 'method') ||
      'get'
    ).toLowerCase();

    // Flatten headers
    let contextHeaders = headers && utils$1.merge(headers.common, headers[config.method]);

    headers &&
      utils$1.forEach(methodList$1.concat('common'), (method) => {
        delete headers[method];
      });

    config.headers = AxiosHeaders$1.concat(contextHeaders, headers);

    // filter out skipped interceptors
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
        return;
      }

      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

      const transitional = config.transitional || transitionalDefaults;
      const legacyInterceptorReqResOrdering =
        transitional && transitional.legacyInterceptorReqResOrdering;

      if (legacyInterceptorReqResOrdering) {
        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
      } else {
        requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
      }
    });

    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });

    let promise;
    let i = 0;
    let len;

    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), undefined];
      chain.unshift(...requestInterceptorChain);
      chain.push(...responseInterceptorChain);
      len = chain.length;

      promise = Promise.resolve(config);

      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }

      return promise;
    }

    len = requestInterceptorChain.length;

    let newConfig = config;

    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled ? onFulfilled(newConfig) : newConfig;
      } catch (error) {
        if (!onRejected) {
          promise = Promise.reject(error);
          break;
        }

        try {
          const rejectedResult = onRejected.call(this, error);

          if (utils$1.isThenable(rejectedResult)) {
            promise = Promise.resolve(rejectedResult).then(() =>
              dispatchRequest.call(this, newConfig)
            );
          }
        } catch (rejectedError) {
          promise = Promise.reject(rejectedError);
        }

        break;
      }
    }

    if (!promise) {
      try {
        promise = dispatchRequest.call(this, newConfig);
      } catch (error) {
        promise = Promise.reject(error);
      }
    }

    i = 0;
    len = responseInterceptorChain.length;

    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }

    return promise;
  }

  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls, config);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
}

// Provide aliases for supported request methods
utils$1.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function (url, config) {
    return this.request(
      mergeConfig(config || {}, {
        method,
        url,
        data: config && utils$1.hasOwnProp(config, 'data') ? config.data : undefined,
      })
    );
  };
});

utils$1.forEach(['post', 'put', 'patch', 'query'], function forEachMethodWithData(method) {
  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(
        mergeConfig(config || {}, {
          method,
          headers: isForm
            ? {
                'Content-Type': 'multipart/form-data',
              }
            : {},
          url,
          data,
        })
      );
    };
  }

  Axios.prototype[method] = generateHTTPMethod();

  // QUERY is a safe/idempotent read method; multipart form bodies don't fit
  // its semantics, so no queryForm shorthand is generated.
  if (method !== 'query') {
    Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
  }
});

const Axios$1 = Axios;

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @param {Function} executor The executor function.
 *
 * @returns {CancelToken}
 */
class CancelToken {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.');
    }

    let resolvePromise;

    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });

    const token = this;

    // eslint-disable-next-line func-names
    this.promise.then((cancel) => {
      if (!token._listeners) return;

      let i = token._listeners.length;

      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });

    // eslint-disable-next-line func-names
    this.promise.then = (onfulfilled) => {
      let _resolve;
      // eslint-disable-next-line func-names
      const promise = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);

      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };

      return promise;
    };

    executor(function cancel(message, config, request) {
      if (token.reason) {
        // Cancellation has already been requested
        return;
      }

      token.reason = new CanceledError$1(message, config, request);
      resolvePromise(token.reason);
    });
  }

  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }

  /**
   * Subscribe to the cancel signal
   */

  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }

    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }

  /**
   * Unsubscribe from the cancel signal
   */

  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }

  toAbortSignal() {
    const controller = new AbortController();

    const abort = (err) => {
      controller.abort(err);
    };

    this.subscribe(abort);

    controller.signal.unsubscribe = () => this.unsubscribe(abort);

    return controller.signal;
  }

  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel,
    };
  }
}

const CancelToken$1 = CancelToken;

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  const args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 *
 * @returns {Function}
 */
function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}

/**
 * Determines whether the payload is an error thrown by Axios
 *
 * @param {*} payload The value to test
 *
 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
 */
function isAxiosError(payload) {
  return utils$1.isObject(payload) && payload.isAxiosError === true;
}

const HttpStatusCode = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  /**
   * @deprecated Use `ContentTooLarge` instead.
   */
  PayloadTooLarge: 413,
  ContentTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  /**
   * @deprecated Use `UnprocessableContent` instead.
   */
  UnprocessableEntity: 422,
  UnprocessableContent: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerReturnsAnUnknownError: 520,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526,
};

Object.entries(HttpStatusCode).forEach(([key, value]) => {
  if (HttpStatusCode[value] === undefined) {
    HttpStatusCode[value] = key;
  }
});

const HttpStatusCode$1 = HttpStatusCode;

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 *
 * @returns {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  const context = new Axios$1(defaultConfig);
  const instance = bind(Axios$1.prototype.request, context);

  // Copy axios.prototype to instance
  utils$1.extend(instance, Axios$1.prototype, context, { allOwnKeys: true });

  // Copy context to instance
  utils$1.extend(instance, context, null, { allOwnKeys: true });

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
const axios = createInstance(defaults$1);

// Expose Axios class to allow class inheritance
axios.Axios = Axios$1;

// Expose Cancel & CancelToken
axios.CanceledError = CanceledError$1;
axios.CancelToken = CancelToken$1;
axios.isCancel = isCancel;
axios.VERSION = VERSION;
axios.toFormData = toFormData;

// Expose AxiosError class
axios.AxiosError = AxiosError$1;

// alias for CanceledError for backward compatibility
axios.Cancel = axios.CanceledError;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};

axios.spread = spread;

// Expose isAxiosError
axios.isAxiosError = isAxiosError;

// Expose mergeConfig
axios.mergeConfig = mergeConfig;

axios.AxiosHeaders = AxiosHeaders$1;

axios.formToJSON = (thing) => formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);

axios.getAdapter = adapters.getAdapter;

axios.HttpStatusCode = HttpStatusCode$1;

axios.default = axios;

// this module should only have a default export
const axios$1 = axios;

const jgroupBankIdCss = "*,:after,:before{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-scroll-snap-strictness:proximity;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;border:0 solid #e5e7eb;box-sizing:border-box}::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-scroll-snap-strictness:proximity;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;}/*! tailwindcss v3.4.19 | MIT License | https://tailwindcss.com*/:after,:before{--tw-content:\"\"}:host,html{-webkit-text-size-adjust:100%;font-feature-settings:normal;-webkit-tap-highlight-color:transparent;font-family:ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;font-variation-settings:normal;line-height:1.5;-moz-tab-size:4;tab-size:4}body{line-height:inherit;margin:0}hr{border-top-width:1px;color:inherit;height:0}abbr:where([title]){text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,pre,samp{font-feature-settings:normal;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-size:1em;font-variation-settings:normal}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{border-collapse:collapse;border-color:inherit;text-indent:0}button,input,optgroup,select,textarea{font-feature-settings:inherit;color:inherit;font-family:inherit;font-size:100%;font-variation-settings:inherit;font-weight:inherit;letter-spacing:inherit;line-height:inherit;margin:0;padding:0}button,select{text-transform:none}button,input:where([type=button]),input:where([type=reset]),input:where([type=submit]){-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dd,dl,fieldset,figure,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0}fieldset,legend{padding:0}menu,ol,ul{list-style:none;margin:0;padding:0}dialog{padding:0}textarea{resize:vertical}input::placeholder,textarea::placeholder{color:#9ca3af;opacity:1}[role=button],button{cursor:pointer}:disabled{cursor:default}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{height:auto;max-width:100%}[hidden]:where(:not([hidden=until-found])){display:none}.block{display:block}.transform{transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.shadow{--tw-shadow:0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px -1px rgba(0,0,0,.1);--tw-shadow-colored:0 1px 3px 0 var(--tw-shadow-color),0 1px 2px -1px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}:host{display:block;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif}.animate-fade{animation:fadeIn .8s}@keyframes fadeIn{0%{opacity:0}to{opacity:1}}.spinner{animation:spin .75s linear infinite;transform-origin:center}@keyframes spin{to{transform:rotate(1turn)}}.static{position:static}.mx-auto{margin-left:auto;margin-right:auto}.mb-4{margin-bottom:1rem}.mt-4{margin-top:1rem}.flex{display:flex}.grid{display:grid}.hidden{display:none}.w-fit{width:fit-content}.justify-center{justify-content:center}.rounded-lg{border-radius:.5rem}.rounded-xl{border-radius:.75rem}.border{border-width:1px}.border-gray-200{--tw-border-opacity:1;border-color:rgb(229 231 235/var(--tw-border-opacity,1))}.border-neutral-700{--tw-border-opacity:1;border-color:rgb(64 64 64/var(--tw-border-opacity,1))}.bg-neutral-800{--tw-bg-opacity:1;background-color:rgb(38 38 38/var(--tw-bg-opacity,1))}.bg-white{--tw-bg-opacity:1;background-color:rgb(255 255 255/var(--tw-bg-opacity,1))}.p-3{padding:.75rem}.text-center{text-align:center}.transition{transition-duration:.15s;transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter;transition-timing-function:cubic-bezier(.4,0,.2,1)}.container{width:100%}@media (min-width:640px){.container{max-width:640px}}@media (min-width:768px){.container{max-width:768px}}@media (min-width:1024px){.container{max-width:1024px}}@media (min-width:1280px){.container{max-width:1280px}}@media (min-width:1536px){.container{max-width:1536px}}.invisible{visibility:hidden}.fixed{position:fixed}.relative{position:relative}.mt-3{margin-top:.75rem}.inline-flex{display:inline-flex}.h-10{height:2.5rem}.h-5{height:1.25rem}.h-7{height:1.75rem}.h-9{height:2.25rem}.w-10{width:2.5rem}.w-5{width:1.25rem}.w-7{width:1.75rem}.w-9{width:2.25rem}.w-full{width:100%}.min-w-\\[12rem\\]{min-width:12rem}.flex-shrink-0{flex-shrink:0}.flex-grow{flex-grow:1}.items-start{align-items:flex-start}.items-center{align-items:center}.gap-3{gap:.75rem}.rounded-full{border-radius:9999px}.border-black\\/10{border-color:rgba(0,0,0,.1)}.border-gray-300{--tw-border-opacity:1;border-color:rgb(209 213 219/var(--tw-border-opacity,1))}.bg-neutral-700{--tw-bg-opacity:1;background-color:rgb(64 64 64/var(--tw-bg-opacity,1))}.bg-primary-100{--tw-bg-opacity:1;background-color:rgb(212 245 249/var(--tw-bg-opacity,1))}.bg-primary-50{--tw-bg-opacity:1;background-color:rgb(238 251 253/var(--tw-bg-opacity,1))}.bg-primary-500\\/20{background-color:rgba(28,160,190,.2)}.bg-red-100{--tw-bg-opacity:1;background-color:rgb(254 226 226/var(--tw-bg-opacity,1))}.bg-red-50{--tw-bg-opacity:1;background-color:rgb(254 242 242/var(--tw-bg-opacity,1))}.bg-red-500\\/20{background-color:rgba(239,68,68,.2)}.bg-transparent{background-color:transparent}.p-4{padding:1rem}.px-3\\.5{padding-left:.875rem;padding-right:.875rem}.px-4{padding-left:1rem;padding-right:1rem}.px-5{padding-left:1.25rem;padding-right:1.25rem}.py-2{padding-bottom:.5rem;padding-top:.5rem}.py-4{padding-bottom:1rem;padding-top:1rem}.pl-2{padding-left:.5rem}.pr-5{padding-right:1.25rem}.pt-2{padding-top:.5rem}.text-sm{font-size:.875rem;line-height:1.25rem}.font-medium{font-weight:500}.font-semibold{font-weight:600}.leading-relaxed{line-height:1.625}.tracking-tight{letter-spacing:-.025em}.text-\\[var\\(--jgroup-bankid-accent\\2c \\#1a3e4e\\)\\]{color:var(--jgroup-bankid-accent,#1a3e4e)}.text-gray-200{--tw-text-opacity:1;color:rgb(229 231 235/var(--tw-text-opacity,1))}.text-neutral-100{--tw-text-opacity:1;color:rgb(245 245 245/var(--tw-text-opacity,1))}.text-neutral-400{--tw-text-opacity:1;color:rgb(163 163 163/var(--tw-text-opacity,1))}.text-neutral-500{--tw-text-opacity:1;color:rgb(115 115 115/var(--tw-text-opacity,1))}.text-primary-300{--tw-text-opacity:1;color:rgb(119 216 233/var(--tw-text-opacity,1))}.text-primary-700{--tw-text-opacity:1;color:rgb(28 104 130/var(--tw-text-opacity,1))}.text-primary-800{--tw-text-opacity:1;color:rgb(31 86 107/var(--tw-text-opacity,1))}.text-red-400{--tw-text-opacity:1;color:rgb(248 113 113/var(--tw-text-opacity,1))}.text-red-600{--tw-text-opacity:1;color:rgb(220 38 38/var(--tw-text-opacity,1))}.text-red-800{--tw-text-opacity:1;color:rgb(153 27 27/var(--tw-text-opacity,1))}.text-white{--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity,1))}.underline{text-decoration-line:underline}.shadow,.shadow-sm{box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-sm{--tw-shadow:0 1px 2px 0 rgba(0,0,0,.05);--tw-shadow-colored:0 1px 2px 0 var(--tw-shadow-color)}.ring{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(3px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.transition-colors{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1)}.duration-150,.transition-colors{transition-duration:.15s}.hover\\:bg-gray-50:hover{--tw-bg-opacity:1;background-color:rgb(249 250 251/var(--tw-bg-opacity,1))}.hover\\:bg-neutral-600:hover{--tw-bg-opacity:1;background-color:rgb(82 82 82/var(--tw-bg-opacity,1))}.hover\\:bg-neutral-700:hover{--tw-bg-opacity:1;background-color:rgb(64 64 64/var(--tw-bg-opacity,1))}.hover\\:bg-red-100:hover{--tw-bg-opacity:1;background-color:rgb(254 226 226/var(--tw-bg-opacity,1))}.hover\\:text-neutral-200:hover{--tw-text-opacity:1;color:rgb(229 229 229/var(--tw-text-opacity,1))}.hover\\:text-neutral-700:hover{--tw-text-opacity:1;color:rgb(64 64 64/var(--tw-text-opacity,1))}.hover\\:underline:hover{text-decoration-line:underline}.hover\\:shadow:hover{--tw-shadow:0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px -1px rgba(0,0,0,.1);--tw-shadow-colored:0 1px 3px 0 var(--tw-shadow-color),0 1px 2px -1px var(--tw-shadow-color)}.hover\\:shadow-md:hover,.hover\\:shadow:hover{box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.hover\\:shadow-md:hover{--tw-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color)}.focus-visible\\:bg-neutral-600:focus-visible{--tw-bg-opacity:1;background-color:rgb(82 82 82/var(--tw-bg-opacity,1))}.focus-visible\\:bg-neutral-700:focus-visible{--tw-bg-opacity:1;background-color:rgb(64 64 64/var(--tw-bg-opacity,1))}.focus-visible\\:outline:focus-visible{outline-style:solid}.focus-visible\\:outline-2:focus-visible{outline-width:2px}.focus-visible\\:outline-offset-2:focus-visible{outline-offset:2px}.focus-visible\\:outline-\\[var\\(--jgroup-bankid-accent\\2c \\#1a3e4e\\)\\]:focus-visible{outline-color:var(--jgroup-bankid-accent,#1a3e4e)}.focus-visible\\:outline-neutral-500:focus-visible{outline-color:#737373}.focus-visible\\:outline-primary-700:focus-visible{outline-color:#1c6882}.active\\:border-neutral-400:active{--tw-border-opacity:1;border-color:rgb(163 163 163/var(--tw-border-opacity,1))}.active\\:bg-gray-100:active{--tw-bg-opacity:1;background-color:rgb(243 244 246/var(--tw-bg-opacity,1))}.active\\:bg-neutral-500:active{--tw-bg-opacity:1;background-color:rgb(115 115 115/var(--tw-bg-opacity,1))}.active\\:bg-neutral-600:active{--tw-bg-opacity:1;background-color:rgb(82 82 82/var(--tw-bg-opacity,1))}.active\\:bg-red-200:active{--tw-bg-opacity:1;background-color:rgb(254 202 202/var(--tw-bg-opacity,1))}.active\\:text-neutral-100:active{--tw-text-opacity:1;color:rgb(245 245 245/var(--tw-text-opacity,1))}.active\\:text-neutral-800:active{--tw-text-opacity:1;color:rgb(38 38 38/var(--tw-text-opacity,1))}.disabled\\:cursor-not-allowed:disabled{cursor:not-allowed}.disabled\\:opacity-50:disabled{opacity:.5}.disabled\\:hover\\:shadow-sm:hover:disabled{--tw-shadow:0 1px 2px 0 rgba(0,0,0,.05);--tw-shadow-colored:0 1px 2px 0 var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}";
const JgroupBankIdStyle0 = jgroupBankIdCss;

const JgroupBankId = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
        this.cancelled = index.createEvent(this, "cancelled", 7);
        this.completed = index.createEvent(this, "completed", 7);
        this.started = index.createEvent(this, "started", 7);
        /** Internal */
        this.axios = axios$1.create({ withCredentials: true, withXSRFToken: true });
        this.TAG = '[jgroup-bank-id]';
        this.propsValid = true;
        this.propsValidationErrorMessage = null;
        this.translate = createTranslateFunction(this.language);
        this.isPolling = false;
        this.currentTransactionId = null;
        this.type = undefined;
        this.signUrl = undefined;
        this.authUrl = undefined;
        this.collectUrl = undefined;
        this.cancelUrl = undefined;
        this.autoStartSingleOption = false;
        this.darkTheme = false;
        this.language = 'sv';
        this.flowType = undefined;
        this.isMobileOrTablet = false;
        this.isStarting = false;
        this.isStartingOnAnotherDevice = false;
        this.isInProgress = false;
        this.isCancelling = false;
        this.statusHintCode = null;
        this.status = null;
        this.qrCodeImageUrl = null;
    }
    /** Watchers for prop validation */
    validateType(newValue) {
        if (!['auth', 'sign'].includes(newValue)) {
            this.throwError('The `type` attribute is required and must be either `auth` or `sign`.');
        }
    }
    validateSignUrl(newValue) {
        if (this.type === 'sign' && newValue === undefined) {
            this.throwError('The `sign-url` attribute is required when `type` is set to `sign`.');
        }
    }
    validateAuthUrl(newValue) {
        if (this.type === 'auth' && newValue === undefined) {
            this.throwError('The `auth-url` attribute is required when `type` is set to `auth`.');
        }
    }
    validateCollectUrl(newValue) {
        if (newValue === undefined) {
            this.throwError('The `collect-url` attribute is required.');
        }
    }
    validateCancelUrl(newValue) {
        if (newValue === undefined) {
            this.throwError('The `cancel-url` attribute is required.');
        }
    }
    /** Visibility change listener */
    handleVisibilityChange() {
        var _a;
        if (document.visibilityState === 'hidden')
            return;
        const hashParams = getHashParams(location.hash);
        const userStarted = ((_a = window.history.state) === null || _a === void 0 ? void 0 : _a.triggeredByUser) === true;
        const flowInitiated = hashParams.initiated !== undefined;
        // Only resume polling if the flow was genuinely started
        if (this.isInProgress &&
            !this.isPolling &&
            this.currentTransactionId &&
            (flowInitiated || userStarted)) {
            this.pollCollect(this.currentTransactionId);
        }
    }
    /** Lifecycle */
    componentWillLoad() {
        registerInterFont();
        this.validateProps();
        window.history.replaceState({}, '', null);
        this.init = this.init.bind(this);
        this.startOnAnotherDevice = this.startOnAnotherDevice.bind(this);
        this.pollCollect = this.pollCollect.bind(this);
        this.reset = this.reset.bind(this);
        this.cancel = this.cancel.bind(this);
        this.setFlowTypeBasedOnDevice();
        if (this.autoStartSingleOption &&
            !this.isMobileOrTablet &&
            this.flowType === 'qr') {
            setTimeout(() => this.init(), 0);
        }
    }
    /** UI Rendering */
    render() {
        var _a;
        if (!this.propsValid) {
            return (index.h("p", { role: 'alert' }, this.propsValidationErrorMessage));
        }
        return (index.h(index.Host, null, this.shouldRenderStartButtons && (
        // A grid, not flex - a grid's single implicit column auto-sizes
        // to its widest row (justify-items defaults to stretch), so both
        // buttons match the wider one's own natural content width
        // exactly, whichever that is - robust across languages/
        // translations rather than a number tuned for one piece of text.
        index.h("div", { class: 'grid justify-center' }, index.h(StartButton, { isOutlined: false, darkTheme: this.darkTheme, onClick: this.init, isLoading: this.isStarting && !this.isStartingOnAnotherDevice, text: this.flowType === 'qr' && !this.isStartingOnAnotherDevice
                ? this.translate('start-qr')
                : this.translate('start-app') }), this.isMobileOrTablet && (index.h("div", { class: 'mt-4' }, index.h(StartButton, { isOutlined: true, darkTheme: this.darkTheme, onClick: this.startOnAnotherDevice, isLoading: this.isStarting && this.isStartingOnAnotherDevice, text: this.translate('start-qr-another-device') }))))), this.shouldRenderStatusHint && (index.h(Alert, { message: this.translate(`hintcode-${this.flowType}-${this.statusHintCode || 'unknown'}`, `hintcode-${this.statusHintCode || 'unknown'}`), type: this.status === 'failed' ? 'error' : 'info', tryAgainButtonText: this.translate('try-again'), onTryAgainButtonClick: this.reset, darkTheme: this.darkTheme })), this.shouldRenderQrImage && (index.h("div", { class: {
                'w-fit mx-auto mb-4 p-3 rounded-xl animate-fade': true,
                'bg-white border border-gray-200': !this.darkTheme,
                'bg-neutral-800 border border-neutral-700': this.darkTheme,
            } }, index.h("img", { src: (_a = this.qrCodeImageUrl) !== null && _a !== void 0 ? _a : undefined, alt: this.translate('qr-code-alt'), class: 'block rounded-lg' }))), this.shouldRenderAppInProgressMessage && (index.h("p", { "data-test-id": 'app-in-progress-message', "aria-live": 'polite', class: 'text-center animate-fade' }, this.translate('app-in-progress'))), this.shouldRenderCancelButton && (index.h("p", { class: 'text-center animate-fade' }, index.h(CancelButton, { onClick: this.cancel, text: this.translate('cancel'), isLoading: this.isCancelling, darkTheme: this.darkTheme })))));
    }
    /** Computed */
    get shouldRenderCancelButton() {
        return this.flowType === 'qr' && (this.isInProgress || this.isCancelling);
    }
    get shouldRenderQrImage() {
        return (this.isInProgress &&
            this.flowType === 'qr' &&
            this.qrCodeImageUrl !== null);
    }
    // The app flow never polls collect-url until the visitor returns from
    // the native app (see handleVisibilityChange), so statusHintCode - the
    // only other thing that renders anything for the app flow, via the
    // Alert below - stays null the entire time the visitor is away. Without
    // this, the widget renders nothing at all for that whole stretch.
    get shouldRenderAppInProgressMessage() {
        return (this.isInProgress &&
            this.flowType === 'app' &&
            this.statusHintCode === null);
    }
    get shouldRenderStatusHint() {
        return this.statusHintCode !== null && this.isInProgress !== null;
    }
    get shouldRenderStartButtons() {
        return (!this.isInProgress &&
            this.status !== 'complete' &&
            this.statusHintCode === null);
    }
    /** Actions */
    startOnAnotherDevice() {
        this.isStartingOnAnotherDevice = true;
        this.flowType = 'qr';
        this.init();
    }
    setFlowTypeBasedOnDevice() {
        const { isMobileOrTablet } = useDevice();
        this.isMobileOrTablet = isMobileOrTablet;
        this.flowType = isMobileOrTablet ? 'app' : 'qr';
    }
    validateProps() {
        try {
            this.validateType(this.type);
            this.validateSignUrl(this.signUrl);
            this.validateAuthUrl(this.authUrl);
            this.validateCollectUrl(this.collectUrl);
            this.validateCancelUrl(this.cancelUrl);
        }
        catch (error) {
            this.propsValid = false;
            this.propsValidationErrorMessage = error.message;
            console.error(error);
        }
    }
    throwError(message) {
        throw new Error(`${this.TAG} ${message}`);
    }
    async init() {
        const url = this.type === 'auth' ? this.authUrl : this.signUrl;
        this.isStarting = true;
        const transaction = await this.post(url);
        if (!transaction) {
            console.error(`${this.TAG} Failed starting '${this.type}' transaction`);
            await this.reset();
            return;
        }
        this.started.emit({ flowType: this.flowType });
        window.history.pushState({ triggeredByUser: true }, '', null);
        await this.handleInitComplete(transaction);
    }
    async handleInitComplete({ autoStartToken, transactionId, }) {
        this.currentTransactionId = transactionId;
        this.isInProgress = true;
        if (this.flowType === 'qr') {
            this.isStarting = false;
            await this.pollCollect(transactionId);
        }
        else if (this.flowType === 'app') {
            const returnUrl = this.createReturnUrl();
            window.location.href = `https://app.bankid.com/?autostarttoken=${autoStartToken}&redirect=${returnUrl}`;
        }
    }
    async pollCollect(transactionId = null) {
        if (this.isPolling || !this.isInProgress)
            return;
        this.isPolling = true;
        while (this.isPolling && !this.isCancelling) {
            const response = await this.post(this.collectUrl);
            if (!response) {
                console.warn(`${this.TAG} pollCollect returned null`);
                this.isPolling = false;
                await this.reset();
                break;
            }
            if (transactionId && response.transactionId !== transactionId) {
                console.error(`${this.TAG} transactionId mismatch`);
                this.isPolling = false;
                await this.reset();
                break;
            }
            if (this.flowType === 'qr') {
                this.qrCodeImageUrl = await getQrCodeImageUrl(response.qrCode);
            }
            this.statusHintCode = response.hintCode;
            this.status = response.status;
            switch (response.status) {
                case 'pending':
                    await this.delay(1000);
                    break;
                case 'failed':
                    this.isPolling = false;
                    this.isInProgress = false;
                    this.isStarting = false;
                    break;
                case 'complete':
                    this.isPolling = false;
                    this.isInProgress = false;
                    this.isStarting = false;
                    this.status = null;
                    this.statusHintCode = null;
                    window.location.hash = '';
                    this.completed.emit(response);
                    break;
                default:
                    console.warn(`${this.TAG} pollCollect returned unknown status '${response.status}'`);
                    this.isPolling = false;
                    break;
            }
        }
    }
    async cancel() {
        if (this.isCancelling || !this.isInProgress)
            return;
        this.isCancelling = true;
        this.isPolling = false;
        try {
            await this.post(this.cancelUrl);
        }
        finally {
            this.isCancelling = false;
            await this.reset(true); // skip the cancel request inside reset
        }
    }
    async reset(skipCancel = false) {
        if (this.isInProgress && !skipCancel) {
            this.isCancelling = true;
            await this.post(this.cancelUrl);
        }
        window.history.pushState({}, '', null);
        this.isInProgress = false;
        this.isStarting = false;
        this.isStartingOnAnotherDevice = false;
        this.isCancelling = false;
        this.statusHintCode = null;
        this.status = null;
        this.qrCodeImageUrl = null;
        this.setFlowTypeBasedOnDevice();
        this.isPolling = false;
        // Every caller of reset() - the explicit cancel button, the Alert's
        // own "try again" after a failure, a dropped/mismatched poll response
        // - represents the same observable transition back to idle. Emitting
        // it here once, rather than only from cancel() as before, means a
        // consuming app's own "is a BankID attempt in progress" state (e.g.
        // hiding an alternate login form while this widget is active) gets a
        // signal to reset too, regardless of which path got the widget back
        // to idle. Previously only the explicit cancel button fired this -
        // "try again" silently reset the widget's own state with no signal at
        // all, leaving a consuming app's "ongoing" flag stuck true forever.
        this.cancelled.emit();
    }
    createReturnUrl() {
        const device = useDevice();
        const { protocol, host, pathname, search } = window.location;
        // Rebuild URL without any hash
        const baseUrl = `${protocol}//${host}${pathname}${search}`;
        // Device-specific deep links
        if (device.isChromeOnAppleDevice || device.isChromeOnAndroidMobile)
            return encodeURIComponent('googlechrome://');
        if (device.isFirefoxOnAppleDevice)
            return encodeURIComponent('firefox://');
        if (device.isOperaTouchOnAppleDevice)
            return encodeURIComponent(`${baseUrl.replace('http', 'touch-http')}#initiated=true`);
        // Default return URL with clean hash
        return encodeURIComponent(`${baseUrl}#initiated=true`);
    }
    async post(url) {
        try {
            const response = await this.axios.post(url);
            return response.data;
        }
        catch (error) {
            console.error(`${this.TAG} request failed`, error);
            return null;
        }
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    static get assetsDirs() { return ["./../assets"]; }
    static get watchers() { return {
        "type": ["validateType"],
        "signUrl": ["validateSignUrl"],
        "authUrl": ["validateAuthUrl"],
        "collectUrl": ["validateCollectUrl"],
        "cancelUrl": ["validateCancelUrl"]
    }; }
};
JgroupBankId.style = JgroupBankIdStyle0;

exports.jgroup_bank_id = JgroupBankId;

//# sourceMappingURL=jgroup-bank-id.cjs.entry.js.map