'use strict';

type Decoder = {
  i: number,
  buf: Uint8Array,
  view: DataView,
};

function decodeHeader(dec: Decoder) {
  const buf = dec.buf;
  const len = buf[dec.i++] & 0b11111;
  if (len < 16) return len;
  if (len < 28) return (1 << (len - 12)) >>> 0;
  if (dec.i + (1 << (len - 28)) > buf.length) throw RangeError;
  switch (len) {
    case 28:
      return buf[dec.i++] + 16;
    case 29: {
      let ext = buf[dec.i++];
      ext += buf[dec.i++] << 8;
      return ext + 272;
    }
    case 30: {
      let ext = buf[dec.i++];
      ext += buf[dec.i++] << 8;
      ext += (buf[dec.i++] << 16) >>> 0;
      ext += (buf[dec.i++] << 24) >>> 0;
      return ext + 65808;
    }
    default: {
      let ext = new DataView(dec.buf.buffer, dec.buf.byteOffset + dec.i, 8).getBigUint64(0, true);
      ext += BigInt(4295033104)
      if (ext > BigInt(Number.MAX_SAFE_INTEGER)) throw RangeError;
      dec.i += 8;
      return Number(ext);
    }
  }
}

const utf8Decoder = new TextDecoder();
function decodeRec(dec: Decoder): any {
  const buf = dec.buf;
  if (dec.i >= buf.length) throw RangeError;
  const kind = (buf[dec.i] >> 5) & 0b111;
  const len = decodeHeader(dec);
  switch (kind) {
    case 0: {
      return len;
    }
    case 1: {
      return -len - 1;
    }
    case 2: {
      if (dec.i + len > buf.length) throw RangeError;
      dec.i += len;
      return buf.subarray(dec.i - len, dec.i);
    }
    case 3: {
      if (dec.i + len > buf.length) throw RangeError;
      dec.i += len;
      return utf8Decoder.decode(buf.subarray(dec.i - len, dec.i));
    }
    case 4: {
      const ret = [];
      const start = dec.i;
      if (dec.i + len > buf.length) throw RangeError;
      while (dec.i < start + len)
        ret.push(decodeRec(dec));
      if (dec.i != start + len) throw RangeError;
      return ret;
    }
    case 5: {
      const ret = {};
      const start = dec.i;
      if (dec.i + len > buf.length) throw RangeError;
      var prevName = null;
      while (dec.i < start + len) {
        const key = decodeRec(dec);
        if (typeof key != 'string') throw RangeError;
        if (prevName && key <= prevName) throw RangeError;
        ret[key] = decodeRec(dec);
      }
      if (dec.i != start + len) throw RangeError;
      return ret;
    }
    default: throw new Error("unsupported kind");
  }
  throw RangeError;
}

export function decode(buf: Uint8Array): any {
  return decodeRec(<Decoder>{
    i: 0,
    buf: buf,
    view: new DataView(buf.buffer),
  });
}
