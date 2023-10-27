import { expect, test } from 'vitest'
import { decode, encode } from './index'

const buf = new ArrayBuffer(1 << 16);

test('small numbers', () => {
  for (let i = -300; i < 300; i++)
    expect(decode(encode(buf, i))).toBe(i);
})

test('numbers', () => {
  for (let e = 0; e < 53; e++) {
    const j = Number(BigInt(1) << BigInt(e));
    expect(decode(encode(buf, j))).toBe(j);
    expect(decode(encode(buf, -j))).toBe(-j);
  }
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
  expect(data.length).toBe(91);
  expect(decode(data)).toStrictEqual(msg);
})
