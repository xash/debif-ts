const offset = 32 - 4;

type Encoder = {
  buf: ArrayBuffer,
  view: Uint8Array,
  i: number,
  maxSize: number,
};

export function encode(buf: ArrayBuffer, value: any) {
  const view = new Uint8Array(buf);
  const enc = {
    buf: buf,
    view: view,
    maxSize: view.length,
    i: view.length,
  };
  encodeRec(enc, value);
  return enc.buf.slice(enc.i, enc.maxSize);
}

function writeHeader(enc: Encoder, kind: number, length: number | bigint) {
  if (enc.i - 9 < 0) throw RangeError;

  if (length < offset) {
    enc.view[--enc.i] = (kind << 5) | Number(length);
  } else if (length < (1 << 8)) {
    enc.i -= 1;
    new DataView(enc.buf, enc.i, 1).setInt8(0, Number(length));
    enc.view[--enc.i] = (kind << 5) | offset;
  } else if (length < (1 << 16)) {
    enc.i -= 2;
    new DataView(enc.buf, enc.i, 2).setInt16(0, Number(length), true);
    enc.view[--enc.i] = (kind << 5) | (offset + 1);
  } else if (length < (1 << 32)) {
    enc.i -= 4;
    new DataView(enc.buf, enc.i, 4).setInt32(0, Number(length), true);
    enc.view[--enc.i] = (kind << 5) | (offset + 2);
  } else {
    enc.i -= 8;
    new DataView(enc.buf, enc.i, 8).setBigInt64(0, BigInt(length), true);
    enc.view[--enc.i] = (kind << 5) | (offset + 3);
  }
}

function encodeRec(enc: Encoder, v: any) {
  const type = typeof (v);
  switch (type) {
    case 'number': {
      if (v % 1 == 0 && v > -(1 << 53) && v < (1 << 53)) {
        const i = BigInt(v);
        const zigzag = (i >> BigInt(52)) ^ (i << BigInt(1));
        writeHeader(enc, 0, zigzag);
      } else {
        throw new Error("not implemented");
      }
      break;
    }
    case 'string': {
      let utf8Encode = new TextEncoder();
      const array = utf8Encode.encode(v);
      enc.i -= array.length;
      if (enc.i < 0) throw RangeError;
      enc.view.set(array, enc.i);
      writeHeader(enc, 3, array.length);
      break;
    }
    case 'object': {
      if (v instanceof Array) {
        const start = enc.i;
        for (const value of v) encodeRec(enc, value);
        writeHeader(enc, 5, start - enc.i);
      } else if (v instanceof Uint8Array) {
        enc.i -= v.length;
        if (enc.i < 0) throw RangeError;
        enc.view.set(v, enc.i);
        writeHeader(enc, 2, v.length);
      } else {
        const keys = [];
        for (const key in v) keys.push(key);

        const start = enc.i;
        for (const key of keys.sort().reverse()) {
          encodeRec(enc, v[key]);
          encodeRec(enc, key);
        }
        writeHeader(enc, 5, start - enc.i);
      }
      break;
    }
  }
}
