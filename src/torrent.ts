import { createHash } from "node:crypto";
import { decode } from "./bencode/decode.js";
import { encode } from "./bencode/encode.js";
import type { BencodeValue } from "./bencode/types.js";

export type Torrent = {
  announce: string;
  name: string;
  pieceLength: number;
  pieces: Buffer;
  length: number;
  infoHash: Buffer;
};

type Dict = Map<string, BencodeValue>;

function asDict(v: BencodeValue, what: string): Dict {
  if (v.type !== "dict") throw new Error(`Torrent: ${what} must be a dict`);
  return v.value;
}

function field(dict: Dict, key: string): BencodeValue {
  const v = dict.get(key);
  if (!v) throw new Error(`Torrent: missing "${key}"`);
  return v;
}

function getBytes(dict: Dict, key: string): Buffer {
  const v = field(dict, key);
  if (v.type !== "string")
    throw new Error(`Torrent: "${key}" must be a string`);
  return v.value;
}

function getInt(dict: Dict, key: string): number {
  const v = field(dict, key);
  if (v.type !== "integer")
    throw new Error(`Torrent: "${key}" must be an integer`);
  return v.value;
}

export function parseTorrent(buf: Buffer): Torrent {
  const root = asDict(decode(buf), "root");
  const infoValue = field(root, "info");
  const info = asDict(infoValue, "info");

  if (!info.has("length"))
    throw new Error("Torrent: multi-file is not supported yet");

  const pieces = getBytes(info, "pieces");
  if (pieces.length % 20 !== 0) throw new Error("Torrent: bad pieces length");

  const infoHash = createHash("sha1").update(encode(infoValue)).digest();

  return {
    announce: getBytes(root, "announce").toString("utf-8"),
    name: getBytes(info, "name").toString("utf-8"),
    pieceLength: getInt(info, "piece length"),
    pieces,
    length: getInt(info, "length"),
    infoHash,
  };
}
