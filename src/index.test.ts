import { expect, test } from 'vitest'
import { decode, encode } from './index'

const buf = new Uint8Array(1 << 12);

test('small numbers', () => {
  for (let i = -3000; i < 3000; i++)
    expect(decode(encode(buf, i))).toBe(i);
})

test('numbers', () => {
  for (let e = 0; e < 53; e++) {
    for (let o = 0; o < 1; o++) {
      const j = Number(BigInt(1) << BigInt(e));
      expect(decode(encode(buf, j - o))).toBe(j - o);
      expect(decode(encode(buf, -j + o))).toBe(-j + o);
    }
  }
})

test('text', () => {
  for (let str of ['z', 'foo', 'bazbaz', 'foobarbazbazbazbaz'])
    expect(decode(encode(buf, str))).toBe(str);
})

test('complex', () => {
  const msg = {
    a: 100,
    b: 10000,
    c: 1000000,
    d: 10000000000,
    e: [1, 2, 3],
    f: { a: 10, b: 20 },
    g: "test",
    h: new Uint8Array(32).fill(1),
  }
  const data = encode(buf, msg);
  expect(data.length).toBe(87);
  expect(decode(data)).toStrictEqual(msg);
})
