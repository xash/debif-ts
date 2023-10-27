# Deterministic Binary Format DeBiF

Subject to change, don't use this.

A type-length-value binary format that can express most of JSON.
Basically [CBOR](https://cbor.io/) but stricter and with an emphasis on
the reader. The exact differences:

* field names must be ordered (so once we read the wanted entries, we can skip the rest)
* arrays/dicts have their size in bytes, not number of elements (so we can skip the whole array/dict without parsing)
* no indefinite lengths
* every value must use the most compact packing
* no integers are allowed that won't fit into a float64

# Format

A value is encoded as:
* 3 bits as type:
0. positive int
1. negative int
2. binary blob
3. UTF-8 text string
4. array of elements
5. dictionary, alternating key and value
6. float and special values (boolean)
* 5 bits as small length
* 1, 2, 4, or 8 bytes of extended length in little endian if small length is 28, 29, 30 or 31
* the length is the extended length if present, otherwise the small length
* the value:
  * if type is 0, 1, or 6 its value is the length
  * otherwise its value is the next n bytes, where n is the length
