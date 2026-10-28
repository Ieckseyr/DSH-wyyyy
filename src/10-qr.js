/**
 * Minimal QR encoder (byte mode, error-correction level M, versions 1-10).
 *
 * The QR login flow needs the code generated in the page: the unikey is minted per
 * visit, and no image host is reachable from the browser. This is the classic
 * Reed-Solomon + mask construction — deliberately fixed to mask 0, which is a legal
 * code (the format information encodes the mask actually used) and removes the
 * penalty-scoring heuristic that would otherwise be the only heuristic part.
 */
(function (NT) {
  'use strict';

  var PAD0 = 0xec;
  var PAD1 = 0x11;
  var ECL_M = 0; // Arase's numbering: L=1, M=0, Q=3, H=2

  var EXP = new Array(256);
  var LOG = new Array(256);
  (function () {
    var i;
    for (i = 0; i < 8; i++) EXP[i] = 1 << i;
    for (i = 8; i < 256; i++) EXP[i] = EXP[i - 4] ^ EXP[i - 5] ^ EXP[i - 6] ^ EXP[i - 8];
    for (i = 0; i < 255; i++) LOG[EXP[i]] = i;
  })();

  function gexp(n) {
    while (n < 0) n += 255;
    while (n >= 256) n -= 255;
    return EXP[n];
  }
  function glog(n) {
    if (n < 1) throw new Error('glog(' + n + ')');
    return LOG[n];
  }

  /** [totalCount, dataCount] pairs per block group, level M, versions 1-10. */
  var RS_BLOCKS_M = {
    1: [[1, 26, 16]],
    2: [[1, 44, 28]],
    3: [[1, 70, 44]],
    4: [[2, 50, 32]],
    5: [[2, 67, 43]],
    6: [[4, 43, 27]],
    7: [[4, 49, 31]],
    8: [[2, 60, 38], [2, 61, 39]],
    9: [[3, 58, 36], [2, 59, 37]],
    10: [[4, 69, 43], [1, 70, 44]],
  };

  var ALIGN_POS = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
    9: [6, 26, 46],
    10: [6, 28, 50],
  };

  var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | 1;
  var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | 1;
  var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

  function bchDigit(data) {
    var digit = 0;
    while (data !== 0) {
      digit += 1;
      data >>>= 1;
    }
    return digit;
  }
  function bchTypeInfo(data) {
    var d = data << 10;
    while (bchDigit(d) - bchDigit(G15) >= 0) d ^= G15 << (bchDigit(d) - bchDigit(G15));
    return ((data << 10) | d) ^ G15_MASK;
  }
  function bchTypeNumber(data) {
    var d = data << 12;
    while (bchDigit(d) - bchDigit(G18) >= 0) d ^= G18 << (bchDigit(d) - bchDigit(G18));
    return (data << 12) | d;
  }

  function Poly(num, shift) {
    var offset = 0;
    while (offset < num.length && num[offset] === 0) offset += 1;
    this.num = new Array(num.length - offset + shift);
    for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
    for (var j = num.length - offset; j < this.num.length; j++) this.num[j] = 0;
  }
  Poly.prototype.get = function (index) {
    return this.num[index];
  };
  Poly.prototype.getLength = function () {
    return this.num.length;
  };
  Poly.prototype.multiply = function (e) {
    var num = new Array(this.getLength() + e.getLength() - 1);
    for (var i = 0; i < num.length; i++) num[i] = 0;
    for (var i2 = 0; i2 < this.getLength(); i2++) {
      for (var j = 0; j < e.getLength(); j++) {
        num[i2 + j] ^= gexp(glog(this.get(i2)) + glog(e.get(j)));
      }
    }
    return new Poly(num, 0);
  };
  Poly.prototype.mod = function (e) {
    if (this.getLength() - e.getLength() < 0) return this;
    var ratio = glog(this.get(0)) - glog(e.get(0));
    var num = this.num.slice();
    for (var i = 0; i < e.getLength(); i++) num[i] ^= gexp(glog(e.get(i)) + ratio);
    return new Poly(num, 0).mod(e);
  };

  function errorCorrectPolynomial(ecLength) {
    var a = new Poly([1], 0);
    for (var i = 0; i < ecLength; i++) a = a.multiply(new Poly([1, gexp(i)], 0));
    return a;
  }

  function blocksFor(type) {
    var groups = RS_BLOCKS_M[type];
    var out = [];
    for (var g = 0; g < groups.length; g++) {
      var count = groups[g][0];
      var total = groups[g][1];
      var data = groups[g][2];
      for (var c = 0; c < count; c++) out.push({ totalCount: total, dataCount: data });
    }
    return out;
  }

  function dataCapacityBytes(type) {
    var blocks = blocksFor(type);
    var dataCount = 0;
    for (var i = 0; i < blocks.length; i++) dataCount += blocks[i].dataCount;
    var lengthBits = type < 10 ? 8 : 16;
    return Math.floor((dataCount * 8 - 4 - lengthBits) / 8);
  }

  function BitBuffer() {
    this.buffer = [];
    this.length = 0;
  }
  BitBuffer.prototype.putBit = function (bit) {
    var byteIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= byteIndex) this.buffer.push(0);
    if (bit) this.buffer[byteIndex] |= 0x80 >>> this.length % 8;
    this.length += 1;
  };
  BitBuffer.prototype.put = function (num, length) {
    for (var i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1);
  };
  BitBuffer.prototype.getLengthInBits = function () {
    return this.length;
  };

  function utf8(text) {
    if (typeof TextEncoder === 'function') return Array.from(new TextEncoder().encode(text));
    var out = [];
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return out;
  }

  function createBytes(buffer, rsBlocks) {
    var offset = 0;
    var maxDcCount = 0;
    var maxEcCount = 0;
    var dcdata = new Array(rsBlocks.length);
    var ecdata = new Array(rsBlocks.length);

    for (var r = 0; r < rsBlocks.length; r++) {
      var dcCount = rsBlocks[r].dataCount;
      var ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      dcdata[r] = new Array(dcCount);
      for (var i = 0; i < dcCount; i++) dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      offset += dcCount;

      var rsPoly = errorCorrectPolynomial(ecCount);
      var rawPoly = new Poly(dcdata[r], rsPoly.getLength() - 1);
      var modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (var j = 0; j < ecdata[r].length; j++) {
        var modIndex = j + modPoly.getLength() - ecdata[r].length;
        ecdata[r][j] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }

    var totalCodeCount = 0;
    for (var t = 0; t < rsBlocks.length; t++) totalCodeCount += rsBlocks[t].totalCount;

    var data = new Array(totalCodeCount);
    var index = 0;
    for (var d = 0; d < maxDcCount; d++) {
      for (var rr = 0; rr < rsBlocks.length; rr++) {
        if (d < dcdata[rr].length) data[index++] = dcdata[rr][d];
      }
    }
    for (var e = 0; e < maxEcCount; e++) {
      for (var r2 = 0; r2 < rsBlocks.length; r2++) {
        if (e < ecdata[r2].length) data[index++] = ecdata[r2][e];
      }
    }
    return data;
  }

  function createData(type, bytes) {
    var rsBlocks = blocksFor(type);
    var buffer = new BitBuffer();
    var totalDataCount = 0;
    for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;

    buffer.put(4, 4); // byte mode
    buffer.put(bytes.length, type < 10 ? 8 : 16);
    for (var b = 0; b < bytes.length; b++) buffer.put(bytes[b], 8);

    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error('QR payload does not fit version ' + type);
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(PAD1, 8);
    }
    return createBytes(buffer, rsBlocks);
  }

  function mask(row, col) {
    return (row + col) % 2 === 0;
  }

  function build(type, data, maskPattern) {
    var size = type * 4 + 17;
    var modules = new Array(size);
    for (var i = 0; i < size; i++) {
      modules[i] = new Array(size);
      for (var j = 0; j < size; j++) modules[i][j] = null;
    }

    function probe(row, col) {
      for (var r = -1; r <= 7; r++) {
        if (row + r <= -1 || size <= row + r) continue;
        for (var c = -1; c <= 7; c++) {
          if (col + c <= -1 || size <= col + c) continue;
          var on =
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          modules[row + r][col + c] = on;
        }
      }
    }
    probe(0, 0);
    probe(size - 7, 0);
    probe(0, size - 7);

    var pos = ALIGN_POS[type];
    for (var pi = 0; pi < pos.length; pi++) {
      for (var pj = 0; pj < pos.length; pj++) {
        var arow = pos[pi];
        var acol = pos[pj];
        if (modules[arow][acol] !== null) continue;
        for (var ar = -2; ar <= 2; ar++) {
          for (var ac = -2; ac <= 2; ac++) {
            modules[arow + ar][acol + ac] =
              ar === -2 || ar === 2 || ac === -2 || ac === 2 || (ar === 0 && ac === 0);
          }
        }
      }
    }

    for (var tr = 8; tr < size - 8; tr++) if (modules[tr][6] === null) modules[tr][6] = tr % 2 === 0;
    for (var tc = 8; tc < size - 8; tc++) if (modules[6][tc] === null) modules[6][tc] = tc % 2 === 0;

    var bits = bchTypeInfo((ECL_M << 3) | maskPattern);
    for (var i2 = 0; i2 < 15; i2++) {
      var mod = ((bits >> i2) & 1) === 1;
      if (i2 < 6) modules[i2][8] = mod;
      else if (i2 < 8) modules[i2 + 1][8] = mod;
      else modules[size - 15 + i2][8] = mod;
    }
    for (var i3 = 0; i3 < 15; i3++) {
      var mod2 = ((bits >> i3) & 1) === 1;
      if (i3 < 8) modules[8][size - i3 - 1] = mod2;
      else if (i3 < 9) modules[8][15 - i3 - 1 + 1] = mod2;
      else modules[8][15 - i3 - 1] = mod2;
    }
    modules[size - 8][8] = true;

    if (type >= 7) {
      var vbits = bchTypeNumber(type);
      for (var v = 0; v < 18; v++) {
        var vm = ((vbits >> v) & 1) === 1;
        modules[Math.floor(v / 3)][(v % 3) + size - 8 - 3] = vm;
        modules[(v % 3) + size - 8 - 3][Math.floor(v / 3)] = vm;
      }
    }

    var inc = -1;
    var row = size - 1;
    var bitIndex = 7;
    var byteIndex = 0;
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;
      while (true) {
        for (var c2 = 0; c2 < 2; c2++) {
          if (modules[row][col - c2] === null) {
            var dark = false;
            if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            if (mask(row, col - c2)) dark = !dark;
            modules[row][col - c2] = dark;
            bitIndex -= 1;
            if (bitIndex === -1) {
              byteIndex += 1;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || size <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }

    return { type: type, size: size, modules: modules, mask: maskPattern };
  }

  /**
   * Encode `text` as a QR symbol.
   * @param {string} text
   * @returns {{type:number,size:number,modules:boolean[][],mask:number}}
   */
  NT.qrEncode = function (text) {
    var bytes = utf8(String(text));
    var type = 0;
    for (var t = 1; t <= 10; t++) {
      if (bytes.length <= dataCapacityBytes(t)) {
        type = t;
        break;
      }
    }
    if (!type) throw new Error('QR payload too long: ' + bytes.length + ' bytes');
    return build(type, createData(type, bytes), 0);
  };
})(typeof NT !== 'undefined' && NT ? NT : (globalThis.__NTM_QR__ = globalThis.__NTM_QR__ || {}));
