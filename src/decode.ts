const offset = 32 - 4;

type Decoder = {
  i: number,
  buf: Uint8Array,
  view: Uint8Array,
};

function decodeHeader(dec: Decoder) {
  if (dec.i == dec.view.length) throw RangeError;
  const byte = dec.view[dec.i++];
  const kind = (byte >> 5) & 0b111;
  const len = byte & 0b11111;
  if (len < offset) return [kind, len, len];
  var ext = undefined;
  if (len == offset) {
    if (dec.i + 1 > dec.view.length) throw RangeError;
    ext = new DataView(dec.buf.buffer, dec.buf.byteOffset + dec.i, 1).getUint8(0),
      dec.i += 1;
  } else if (len == offset + 1) {
    if (dec.i + 2 > dec.view.length) throw RangeError;
    ext = new DataView(dec.buf.buffer, dec.buf.byteOffset + dec.i, 2).getUint16(0, true);
    dec.i += 2;
  } else if (len == offset + 2) {
    if (dec.i + 4 > dec.view.length) throw RangeError;
    ext = new DataView(dec.buf.buffer, dec.buf.byteOffset + dec.i, 4).getUint32(0, true);
    dec.i += 4;
  } else {
    if (dec.i + 8 > dec.view.length) throw RangeError;
    ext = new DataView(dec.buf.buffer, dec.buf.byteOffset + dec.i, 8).getBigUint64(0, true);
    if (ext < -(1 << 53) && ext > (1 << 53)) throw RangeError;
    ext = Number(ext);
    dec.i += 8;
  }
  return [kind, len, ext];
}

function decodeRec(dec: Decoder) {
  const [kind, lenBits, len] = decodeHeader(dec);
  switch (kind) {
    case 0: {
      return len;
    }
    case 1: {
      return -len - 1;
    }
    case 2: {
      if (dec.i + len > dec.view.length) throw RangeError;
      const buf = dec.view.slice(dec.i, dec.i + len);
      dec.i += len;
      return buf;
    }
    case 3: {
      if (dec.i + len > dec.view.length) throw RangeError;
      const view = dec.view.slice(dec.i, dec.i + len);
      dec.i += len;
      return new TextDecoder().decode(view);
    }
    case 4: {
      const ret = [];
      const start = dec.i;
      if (dec.i + len > dec.view.length) throw RangeError;
      while (dec.i < start + len)
        ret.push(decodeRec(dec));
      if (dec.i != start + len) throw RangeError;
      return ret;
    }
    case 5: {
      const ret = {};
      const start = dec.i;
      if (dec.i + len > dec.view.length) throw RangeError;
      var prevName = null;
      while (dec.i < start + len) {
        const key = decodeRec(dec);
        if (typeof key != 'string') throw RangeError;
        if (prevName && key <= prevName) throw RangeError;
        const value = decodeRec(dec);
        ret[<string>key] = value;
      }
      if (dec.i != start + len) throw RangeError;
      return ret;
    }
  }
  throw RangeError;
}

export function decode(buf: ArrayBuffer) {
  return decodeRec(<Decoder>{
    i: 0,
    buf: buf,
    view: new Uint8Array(buf),
  });
}
