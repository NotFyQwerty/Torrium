import type { BencodeValue } from "./types.js";

export function encode(value: BencodeValue): Buffer {
  switch (value.type) {
    case "integer":
      return Buffer.from(`i${value.value}e`);

    case "string":
      return encodeBytes(value.value);

    case "list":
      return Buffer.concat([
        Buffer.from("l"),
        ...value.value.map(encode),
        Buffer.from("e"),
      ]);

    case "dict": {
      const parts: Buffer[] = [Buffer.from("d")];
      for (const [key, val] of value.value) {
        parts.push(encodeBytes(Buffer.from(key)), encode(val));
      }
      parts.push(Buffer.from("e"));
      return Buffer.concat(parts);
    }
  }
}

function encodeBytes(bytes: Buffer): Buffer {
  return Buffer.concat([Buffer.from(`${bytes.length}:`), bytes]);
}
