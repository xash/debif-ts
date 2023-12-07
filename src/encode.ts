'use strict';

export function encode(buf: Uint8Array, value: any): Uint8Array {
  const i = encodeRec(buf, buf.length, value);
  if (i < 0) throw RangeError;
  return new Uint8Array(buf.buffer, buf.byteOffset + i, buf.length - i);
}

function writeHeader(buf: Uint8Array, i: number, kind: number, length: number) {
  if (length < 16) {
    buf[--i] = (kind << 5) | length;
  } else if (length < 65536 && !(length & (length - 1))) { // power of two
    buf[--i] = (kind << 5) | (Math.log2(length) + 12);
  } else if ((length -= 16) < 256) {
    buf[--i] = length;
    buf[--i] = (kind << 5) | 28;
  } else if ((length -= 256) < 65536) {
    buf[--i] = length >>> 8;
    buf[--i] = length;
    buf[--i] = (kind << 5) | 29;
  } else if ((length -= 65536) < 4294967296) {
    buf[--i] = length >>> 24;
    buf[--i] = length >>> 16;
    buf[--i] = length >>> 8;
    buf[--i] = length;
    buf[--i] = (kind << 5) | 30;
  } else {
    i -= 8;
    new DataView(buf.buffer, buf.byteOffset + i, 8).setBigInt64(0, BigInt(length) - BigInt(4294967296), true);
    buf[--i] = (kind << 5) | 31;
  }
  return i;
}

const utf8Encoder = new TextEncoder();
function encodeRec(buf: Uint8Array, i: number, v: any) {
  switch (typeof v) {
    case 'number': {
      if (v >= Number.MIN_SAFE_INTEGER && v <= Number.MAX_SAFE_INTEGER && Number.isInteger(v)) {
        if (v >= 0) i = writeHeader(buf, i, 0, v);
        else i = writeHeader(buf, i, 1, -v - 1);
      } else
        throw new Error(`not implemented: ${v}`);
      break;
    }
    case 'string': {
      const textArray = utf8Encoder.encode(v);
      i -= textArray.length;
      buf.set(textArray, i);
      i = writeHeader(buf, i, 3, textArray.length);
      break;
    }
    case 'object': {
      if (v instanceof Uint8Array) {
        i -= v.length;
        buf.set(v, i);
        i = writeHeader(buf, i, 2, v.length);
      } else if (v instanceof ArrayBuffer) {
        const w = new Uint8Array(v);
        i -= w.byteLength;
        buf.set(w, i);
        i = writeHeader(buf, i, 2, w.byteLength);
      } else if (v instanceof Array) {
        const start = i;
        for (let j = v.length - 1; j >= 0; j--) i = encodeRec(buf, i, v[j]);
        i = writeHeader(buf, i, 4, start - i);
      } else {
        const start = i;
        for (const key of Object.keys(v).sort().reverse()) {
          i = encodeRec(buf, i, v[key]);
          const textArray = utf8Encoder.encode(key);
          i -= textArray.length;
          buf.set(textArray, i);
          i = writeHeader(buf, i, 3, textArray.length);
        }
        i = writeHeader(buf, i, 5, start - i);
      }
      break;
    }
    default:
      throw new Error(`unsupported value: ${v}`);
  }
  return i;
}
