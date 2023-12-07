# Deterministic Binary Format DeBiF

Subject to change, don't use this.

A schemaless, type-length-value binary format that can express most
of JSON.  Basically [CBOR](https://cbor.io/) but stricter and with an
emphasis on the reader. The exact differences:

* field names must be ordered (so reader can stop early if needed field is missing)
* arrays/dicts have their size in bytes, not number of elements (so reader can easily skip the whole array/dict)
* no indefinite lengths
* every value must use the most compact packing
* no integers are allowed that won't fit into a float64, i.e. `-(1^53 - 1) … (1^53 - 1)`
* compact integer format for powers of two

# TODO

* Allow only specific types as key? Implement a special key type?
* There is still a type free (7), maybe padded buffers
* Really worth adding the offsets for numbers? (main reason: reader doesn't have to check for compactness)
* Think on a equivalent float compactness scheme
* Define proper order of map keys
* Make this more formal

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
* 5 bits as length `l`
  * when < 16: `l`
  * when < 28: `l` is 2^(`l` - 12), i.e. 16, 32, 64, …, 32768
  * when = 28: `l` is next 1 byte + 16
  * when = 29: `l` is next 2 LE bytes + 16 + 2^8
  * when = 30: `l` is next 4 LE bytes + 16 + 2^8 + 2^16
  * when = 31: `l` is next 8 LE bytes + 16 + 2^8 + 2^16 + 2^32
* the value:
  * if type is 0, 1, or 6 its value is the length
  * otherwise its value is the next n bytes, where n is the length
