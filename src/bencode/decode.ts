import type {
  BencodeDict,
  BencodeInteger,
  BencodeList,
  BencodeString,
  BencodeValue,
} from "./types.js";

export function decode(buf: Buffer): BencodeValue {
  let pos = 0;

  function readValue(): BencodeValue {
    if (pos >= buf.length) throw new Error("Bencode: unexpected end of data");

    const char = String.fromCharCode(buf[pos]!);
    if (char === "i") return readInteger();
    if (char === "l") return readList();
    if (char === "d") return readDict();
    return readString();
  }

  function readInteger(): BencodeInteger {
    const end = buf.indexOf("e", pos);
    if (end === -1) throw new Error(`Bencode: unterminated integer at ${pos}`);

    const value = Number(buf.toString("ascii", pos + 1, end));
    if (Number.isNaN(value)) throw new Error(`Bencode: bad integer at ${pos}`);

    pos = end + 1;
    return { type: "integer", value };
  }

  function readString(): BencodeString {
    const colon = buf.indexOf(":", pos);
    if (colon === -1) throw new Error(`Bencode: bad string at ${pos}`);

    const length = Number(buf.toString("ascii", pos, colon));
    const start = colon + 1;
    if (Number.isNaN(length) || start + length > buf.length) {
      throw new Error(`Bencode: bad string length at ${pos}`);
    }

    pos = start + length;
    return { type: "string", value: buf.subarray(start, pos) };
  }

  function readList(): BencodeList {
    pos++;
    const value: BencodeValue[] = [];
    while (buf[pos] !== 0x65) value.push(readValue());
    pos++;
    return { type: "list", value };
  }

  function readDict(): BencodeDict {
    pos++;
    const value = new Map<string, BencodeValue>();
    while (buf[pos] !== 0x65) {
      const key = readString().value.toString("utf-8");
      value.set(key, readValue());
    }
    pos++;
    return { type: "dict", value };
  }

  return readValue();
}
