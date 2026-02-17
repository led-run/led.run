/**
 * QR Code Generator Library
 * Based on Nayuki QR Code generator (MIT License)
 * https://www.nayuki.io/page/qr-code-generator-library
 *
 * Implements QR Code Model 2: versions 1-40, ECC levels L/M/Q/H,
 * encoding modes NUMERIC/ALPHANUMERIC/BYTE/ECI.
 */
;(function(global) {
  'use strict';

  // ---- QrCode ----

  class QrCode {

    static encodeText(text, ecl) {
      var segs = QrSegment.makeSegments(text);
      return QrCode.encodeSegments(segs, ecl);
    }

    static encodeBinary(data, ecl) {
      return QrCode.encodeSegments([QrSegment.makeBytes(data)], ecl);
    }

    static encodeSegments(segs, ecl, minVersion, maxVersion, mask, boostEcl) {
      if (minVersion === undefined) minVersion = 1;
      if (maxVersion === undefined) maxVersion = 40;
      if (mask === undefined) mask = -1;
      if (boostEcl === undefined) boostEcl = true;

      if (!(1 <= minVersion && minVersion <= maxVersion && maxVersion <= 40) || mask < -1 || mask > 7)
        throw new RangeError('Invalid value');

      // Find the minimal version that fits the data
      var version, dataUsedBits;
      for (version = minVersion; ; version++) {
        var dataCapacityBits = getNumDataCodewords(version, ecl) * 8;
        dataUsedBits = QrSegment.getTotalBits(segs, version);
        if (dataUsedBits !== -1 && dataUsedBits <= dataCapacityBits) break;
        if (version >= maxVersion)
          throw new RangeError('Data too long');
      }

      // Boost ECC level if data still fits
      if (boostEcl) {
        for (var newEcl of [QrCode.Ecc.MEDIUM, QrCode.Ecc.QUARTILE, QrCode.Ecc.HIGH]) {
          if (newEcl.ordinal > ecl.ordinal && dataUsedBits <= getNumDataCodewords(version, newEcl) * 8)
            ecl = newEcl;
        }
      }

      // Build the data bit stream
      var bb = [];
      for (var seg of segs) {
        appendBits(seg.mode.modeBits, 4, bb);
        appendBits(seg.numChars, seg.mode.numCharCountBits(version), bb);
        for (var bit of seg._data)
          bb.push(bit);
      }

      // Add terminator and pad to byte boundary
      var dataCapacityBits = getNumDataCodewords(version, ecl) * 8;
      appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
      appendBits(0, (8 - bb.length % 8) % 8, bb);

      // Pad with alternating bytes
      for (var padByte = 0xEC; bb.length < dataCapacityBits; padByte ^= (0xEC ^ 0x11))
        appendBits(padByte, 8, bb);

      // Convert bit array to byte array
      var dataCodewords = new Uint8Array(bb.length / 8);
      for (var i = 0; i < bb.length; i++)
        dataCodewords[i >>> 3] |= bb[i] << (7 - (i & 7));

      return new QrCode(version, ecl, dataCodewords, mask);
    }

    constructor(version, ecl, dataCodewords, msk) {
      this.version = version;
      this.errorCorrectionLevel = ecl;
      this.size = version * 4 + 17;

      // Initialize module grid
      this._modules = [];
      this._isFunction = [];
      for (var i = 0; i < this.size; i++) {
        this._modules.push(new Array(this.size).fill(false));
        this._isFunction.push(new Array(this.size).fill(false));
      }

      // Draw function patterns
      this._drawFunctionPatterns();

      // Compute ECC and interleave
      var allCodewords = this._addEccAndInterleave(dataCodewords);

      // Draw data codewords
      this._drawCodewords(allCodewords);

      // Apply mask
      if (msk === -1) {
        var minPenalty = Infinity;
        for (var i = 0; i < 8; i++) {
          this._applyMask(i);
          this._drawFormatBits(i);
          var penalty = this._getPenaltyScore();
          if (penalty < minPenalty) {
            msk = i;
            minPenalty = penalty;
          }
          this._applyMask(i); // undo
        }
      }

      this.mask = msk;
      this._applyMask(msk);
      this._drawFormatBits(msk);
      this._isFunction = null; // no longer needed
    }

    getModule(x, y) {
      return 0 <= x && x < this.size && 0 <= y && y < this.size && this._modules[y][x];
    }

    _drawFunctionPatterns() {
      // Finder patterns + separators
      for (var i = 0; i < this.size; i++) {
        this._setFunctionModule(6, i, i % 2 === 0);
        this._setFunctionModule(i, 6, i % 2 === 0);
      }
      this._drawFinderPattern(3, 3);
      this._drawFinderPattern(this.size - 4, 3);
      this._drawFinderPattern(3, this.size - 4);

      // Alignment patterns
      var alignPatPos = this._getAlignmentPatternPositions();
      var numAlign = alignPatPos.length;
      for (var i = 0; i < numAlign; i++) {
        for (var j = 0; j < numAlign; j++) {
          if ((i === 0 && j === 0) || (i === 0 && j === numAlign - 1) || (i === numAlign - 1 && j === 0))
            continue;
          this._drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
        }
      }

      // Format and version info areas
      this._drawFormatBits(0);
      this._drawVersion();
    }

    _drawFormatBits(mask) {
      var data = this.errorCorrectionLevel.formatBits << 3 | mask;
      var rem = data;
      for (var i = 0; i < 10; i++)
        rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var bits = (data << 10 | rem) ^ 0x5412;

      // Draw around top-left finder
      for (var i = 0; i <= 5; i++)
        this._setFunctionModule(8, i, getBit(bits, i));
      this._setFunctionModule(8, 7, getBit(bits, 6));
      this._setFunctionModule(8, 8, getBit(bits, 7));
      this._setFunctionModule(7, 8, getBit(bits, 8));
      for (var i = 9; i < 15; i++)
        this._setFunctionModule(14 - i, 8, getBit(bits, i));

      // Draw around other finders
      for (var i = 0; i < 8; i++)
        this._setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
      for (var i = 8; i < 15; i++)
        this._setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
      this._setFunctionModule(8, this.size - 8, true); // always dark
    }

    _drawVersion() {
      if (this.version < 7) return;
      var rem = this.version;
      for (var i = 0; i < 12; i++)
        rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var bits = this.version << 12 | rem;

      for (var i = 0; i < 18; i++) {
        var bit = getBit(bits, i);
        var a = this.size - 11 + i % 3;
        var b = Math.floor(i / 3);
        this._setFunctionModule(a, b, bit);
        this._setFunctionModule(b, a, bit);
      }
    }

    _drawFinderPattern(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) {
        for (var dx = -4; dx <= 4; dx++) {
          var dist = Math.max(Math.abs(dx), Math.abs(dy));
          var xx = cx + dx, yy = cy + dy;
          if (0 <= xx && xx < this.size && 0 <= yy && yy < this.size)
            this._setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }

    _drawAlignmentPattern(cx, cy) {
      for (var dy = -2; dy <= 2; dy++) {
        for (var dx = -2; dx <= 2; dx++) {
          this._setFunctionModule(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }

    _setFunctionModule(x, y, isDark) {
      this._modules[y][x] = isDark;
      this._isFunction[y][x] = true;
    }

    _addEccAndInterleave(data) {
      var ver = this.version, ecl = this.errorCorrectionLevel;
      var numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
      var blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
      var rawCodewords = Math.floor(getNumRawDataModules(ver) / 8);
      var numShortBlocks = numBlocks - rawCodewords % numBlocks;
      var shortBlockLen = Math.floor(rawCodewords / numBlocks);

      // Split data into blocks
      var blocks = [];
      var rsDiv = reedSolomonComputeDivisor(blockEccLen);
      var off = 0;
      for (var i = 0; i < numBlocks; i++) {
        var datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
        var dat = data.slice(off, off + datLen);
        off += datLen;
        var ecc = reedSolomonComputeRemainder(dat, rsDiv);
        if (i < numShortBlocks)
          dat = appendUint8Array(dat, new Uint8Array([0])); // pad short blocks
        blocks.push(appendUint8Array(dat, ecc));
      }

      // Interleave
      var result = new Uint8Array(rawCodewords);
      var pos = 0;
      for (var i = 0; i <= shortBlockLen; i++) {
        for (var j = 0; j < numBlocks; j++) {
          if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
            result[pos] = blocks[j][i];
            pos++;
          }
        }
      }
      return result;
    }

    _drawCodewords(data) {
      var i = 0;
      // Traverse right to left, bottom to top in 2-column zigzag
      for (var right = this.size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5; // skip vertical timing pattern
        for (var vert = 0; vert < this.size; vert++) {
          for (var j = 0; j < 2; j++) {
            var x = right - j;
            var upward = ((right + 1) & 2) === 0;
            var y = upward ? this.size - 1 - vert : vert;
            if (!this._isFunction[y][x] && i < data.length * 8) {
              this._modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
              i++;
            }
          }
        }
      }
    }

    _applyMask(mask) {
      for (var y = 0; y < this.size; y++) {
        for (var x = 0; x < this.size; x++) {
          var invert;
          switch (mask) {
            case 0: invert = (x + y) % 2 === 0; break;
            case 1: invert = y % 2 === 0; break;
            case 2: invert = x % 3 === 0; break;
            case 3: invert = (x + y) % 3 === 0; break;
            case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
            case 5: invert = x * y % 2 + x * y % 3 === 0; break;
            case 6: invert = (x * y % 2 + x * y % 3) % 2 === 0; break;
            case 7: invert = ((x + y) % 2 + x * y % 3) % 2 === 0; break;
            default: throw new Error('Invalid mask');
          }
          if (!this._isFunction[y][x] && invert)
            this._modules[y][x] = !this._modules[y][x];
        }
      }
    }

    _getPenaltyScore() {
      var result = 0;
      var size = this.size;
      var modules = this._modules;

      // Rule 1: runs of same color in rows and columns
      for (var y = 0; y < size; y++) {
        var runColor = false, runLen = 0;
        for (var x = 0; x < size; x++) {
          if (x === 0 || modules[y][x] !== runColor) {
            runColor = modules[y][x];
            runLen = 1;
          } else {
            runLen++;
            if (runLen === 5) result += 3;
            else if (runLen > 5) result++;
          }
        }
      }
      for (var x = 0; x < size; x++) {
        var runColor = false, runLen = 0;
        for (var y = 0; y < size; y++) {
          if (y === 0 || modules[y][x] !== runColor) {
            runColor = modules[y][x];
            runLen = 1;
          } else {
            runLen++;
            if (runLen === 5) result += 3;
            else if (runLen > 5) result++;
          }
        }
      }

      // Rule 2: 2x2 blocks of same color
      for (var y = 0; y < size - 1; y++) {
        for (var x = 0; x < size - 1; x++) {
          var c = modules[y][x];
          if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1])
            result += 3;
        }
      }

      // Rule 3: finder-like patterns
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          if (x + 6 < size &&
              modules[y][x] && !modules[y][x+1] && modules[y][x+2] && modules[y][x+3] && modules[y][x+4] && !modules[y][x+5] && modules[y][x+6]) {
            // Check 4 white before or after
            var before = true, after = true;
            for (var k = 1; k <= 4; k++) {
              if (x - k < 0 || modules[y][x - k]) { before = false; break; }
            }
            for (var k = 7; k <= 10; k++) {
              if (x + k >= size || modules[y][x + k - 6]) { after = false; break; }
            }
            if (before || after) result += 40;
          }
          if (y + 6 < size &&
              modules[y][x] && !modules[y+1][x] && modules[y+2][x] && modules[y+3][x] && modules[y+4][x] && !modules[y+5][x] && modules[y+6][x]) {
            var before = true, after = true;
            for (var k = 1; k <= 4; k++) {
              if (y - k < 0 || modules[y - k][x]) { before = false; break; }
            }
            for (var k = 7; k <= 10; k++) {
              if (y + k - 6 >= size || modules[y + k - 6][x]) { after = false; break; }
            }
            if (before || after) result += 40;
          }
        }
      }

      // Rule 4: dark module proportion
      var dark = 0;
      for (var y = 0; y < size; y++)
        for (var x = 0; x < size; x++)
          if (modules[y][x]) dark++;
      var total = size * size;
      var k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
      result += k * 10;

      return result;
    }

    _getAlignmentPatternPositions() {
      if (this.version === 1) return [];
      var numAlign = Math.floor(this.version / 7) + 2;
      var step = (this.version === 32) ? 26 :
        Math.ceil((this.version * 4 + 4) / (numAlign * 2 - 2)) * 2;
      var result = [6];
      for (var pos = this.version * 4 + 10; result.length < numAlign; pos -= step)
        result.splice(1, 0, pos);
      return result;
    }
  }

  // Error correction level
  class Ecc {
    constructor(ordinal, formatBits) {
      this.ordinal = ordinal;
      this.formatBits = formatBits;
      Object.freeze(this);
    }
  }

  QrCode.Ecc = {
    LOW:      new Ecc(0, 1),
    MEDIUM:   new Ecc(1, 0),
    QUARTILE: new Ecc(2, 3),
    HIGH:     new Ecc(3, 2),
  };
  Object.freeze(QrCode.Ecc);


  // ---- QrSegment ----

  class QrSegment {

    constructor(mode, numChars, bitData) {
      this.mode = mode;
      this.numChars = numChars;
      this._data = bitData.slice();
      Object.freeze(this);
    }

    static makeBytes(data) {
      var bb = [];
      for (var b of data)
        appendBits(b, 8, bb);
      return new QrSegment(QrSegment.Mode.BYTE, data.length, bb);
    }

    static makeNumeric(digits) {
      if (!/^[0-9]*$/.test(digits))
        throw new RangeError('String contains non-numeric characters');
      var bb = [];
      for (var i = 0; i < digits.length; ) {
        var n = Math.min(digits.length - i, 3);
        appendBits(parseInt(digits.substring(i, i + n), 10), n * 3 + 1, bb);
        i += n;
      }
      return new QrSegment(QrSegment.Mode.NUMERIC, digits.length, bb);
    }

    static makeAlphanumeric(text) {
      if (!/^[A-Z0-9 $%*+\-./:]*$/.test(text))
        throw new RangeError('String contains unencodable characters in alphanumeric mode');
      var bb = [];
      var i;
      for (i = 0; i + 2 <= text.length; i += 2) {
        var temp = ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)) * 45;
        temp += ALPHANUMERIC_CHARSET.indexOf(text.charAt(i + 1));
        appendBits(temp, 11, bb);
      }
      if (i < text.length)
        appendBits(ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)), 6, bb);
      return new QrSegment(QrSegment.Mode.ALPHANUMERIC, text.length, bb);
    }

    static makeSegments(text) {
      if (text === '') return [];
      if (/^[0-9]*$/.test(text)) return [QrSegment.makeNumeric(text)];
      if (/^[A-Z0-9 $%*+\-./:]*$/.test(text)) return [QrSegment.makeAlphanumeric(text)];
      return [QrSegment.makeBytes(textToUtf8ByteArray(text))];
    }

    static makeEci(assignVal) {
      var bb = [];
      if (assignVal < 0)
        throw new RangeError('ECI assignment value out of range');
      else if (assignVal < (1 << 7))
        appendBits(assignVal, 8, bb);
      else if (assignVal < (1 << 14)) {
        appendBits(2, 2, bb);
        appendBits(assignVal, 14, bb);
      } else if (assignVal < 1000000) {
        appendBits(6, 3, bb);
        appendBits(assignVal, 21, bb);
      } else
        throw new RangeError('ECI assignment value out of range');
      return new QrSegment(QrSegment.Mode.ECI, 0, bb);
    }

    static getTotalBits(segs, version) {
      var result = 0;
      for (var seg of segs) {
        var ccBits = seg.mode.numCharCountBits(version);
        if (seg.numChars >= (1 << ccBits)) return -1;
        result += 4 + ccBits + seg._data.length;
      }
      return result;
    }
  }

  // Encoding modes
  class Mode {
    constructor(modeBits, charCountBits) {
      this.modeBits = modeBits;
      this._charCountBits = charCountBits;
      Object.freeze(this);
    }
    numCharCountBits(ver) {
      return this._charCountBits[Math.floor((ver + 7) / 17)];
    }
  }

  QrSegment.Mode = {
    NUMERIC:      new Mode(0x1, [10, 12, 14]),
    ALPHANUMERIC: new Mode(0x2, [ 9, 11, 13]),
    BYTE:         new Mode(0x4, [ 8, 16, 16]),
    KANJI:        new Mode(0x8, [ 8, 10, 12]),
    ECI:          new Mode(0x7, [ 0,  0,  0]),
  };
  Object.freeze(QrSegment.Mode);


  // ---- Lookup tables ----

  // ECC_CODEWORDS_PER_BLOCK[ecl][version], index 0 unused
  var ECC_CODEWORDS_PER_BLOCK = [
    // L
    [-1,  7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    // M
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    // Q
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    // H
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  ];

  // NUM_ERROR_CORRECTION_BLOCKS[ecl][version], index 0 unused
  var NUM_ERROR_CORRECTION_BLOCKS = [
    // L
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    // M
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    // Q
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    // H
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
  ];

  var ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';


  // ---- Helper functions ----

  function getNumRawDataModules(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }

  function getNumDataCodewords(ver, ecl) {
    return Math.floor(getNumRawDataModules(ver) / 8) -
      ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] * NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
  }

  // Reed-Solomon: compute divisor polynomial for given degree
  function reedSolomonComputeDivisor(degree) {
    var result = new Uint8Array(degree);
    result[degree - 1] = 1;
    var root = 1;
    for (var i = 0; i < degree; i++) {
      for (var j = 0; j < result.length; j++) {
        result[j] = reedSolomonMultiply(result[j], root);
        if (j + 1 < result.length)
          result[j] ^= result[j + 1];
      }
      root = reedSolomonMultiply(root, 0x02);
    }
    return result;
  }

  // Reed-Solomon: compute remainder of data divided by divisor
  function reedSolomonComputeRemainder(data, divisor) {
    var result = new Uint8Array(divisor.length);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ result[0];
      result.copyWithin(0, 1);
      result[result.length - 1] = 0;
      for (var j = 0; j < result.length; j++)
        result[j] ^= reedSolomonMultiply(divisor[j], factor);
    }
    return result;
  }

  // Multiply two GF(2^8) values with reduction polynomial 0x11D
  function reedSolomonMultiply(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  function appendBits(val, len, bb) {
    for (var i = len - 1; i >= 0; i--)
      bb.push((val >>> i) & 1);
  }

  function getBit(x, i) {
    return ((x >>> i) & 1) !== 0;
  }

  function appendUint8Array(a, b) {
    var result = new Uint8Array(a.length + b.length);
    result.set(a);
    result.set(b, a.length);
    return result;
  }

  function textToUtf8ByteArray(str) {
    var utf8 = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.codePointAt(i);
      if (code < 0x80) {
        utf8.push(code);
      } else if (code < 0x800) {
        utf8.push(0xC0 | (code >> 6));
        utf8.push(0x80 | (code & 0x3F));
      } else if (code < 0x10000) {
        utf8.push(0xE0 | (code >> 12));
        utf8.push(0x80 | ((code >> 6) & 0x3F));
        utf8.push(0x80 | (code & 0x3F));
      } else {
        utf8.push(0xF0 | (code >> 18));
        utf8.push(0x80 | ((code >> 12) & 0x3F));
        utf8.push(0x80 | ((code >> 6) & 0x3F));
        utf8.push(0x80 | (code & 0x3F));
        i++; // skip surrogate pair
      }
    }
    return utf8;
  }


  // ---- Export ----

  global.QrCode = QrCode;
  global.QrSegment = QrSegment;

})(typeof window !== 'undefined' ? window : this);
