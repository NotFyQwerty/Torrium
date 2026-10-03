import { randomBytes } from "node:crypto";
import { decode } from "./bencode/decode.js";
import type { Torrent } from "./torrent.js";

export type Peer = { ip: string; port: number };

export const PEER_ID = Buffer.concat([
  Buffer.from("-TR0001-"),
  randomBytes(12),
]);

function percentEncode(bytes: Buffer): string {
  return [...bytes].map((b) => "%" + b.toString(16).padStart(2, "0")).join("");
}

export async function announce(torrent: Torrent, port = 6881): Promise<Peer[]> {
  const query = [
    `info_hash=${percentEncode(torrent.infoHash)}`,
    `peer_id=${percentEncode(PEER_ID)}`,
    `port=${port}`,
    "uploaded=0",
    "downloaded=0",
    `left=${torrent.length}`,
    "compact=1",
  ].join("&");

  const res = await fetch(`${torrent.announce}?${query}`);
  if (!res.ok) throw new Error(`Tracker: HTTP ${res.status}`);

  const root = decode(Buffer.from(await res.arrayBuffer()));
  if (root.type !== "dict") throw new Error("Tracker: bad response");

  const failure = root.value.get("failure reason");
  if (failure?.type === "string") {
    throw new Error(`Tracker: ${failure.value.toString("utf-8")}`);
  }

  const peers = root.value.get("peers");
  if (peers?.type !== "string") throw new Error("Tracker: no compact peers");

  return parsePeers(peers.value);
}

function parsePeers(buf: Buffer): Peer[] {
  const peers: Peer[] = [];
  for (let i = 0; i + 6 <= buf.length; i += 6) {
    const ip = `${buf[i]}.${buf[i + 1]}.${buf[i + 2]}.${buf[i + 3]}`;
    peers.push({ ip, port: buf.readUInt16BE(i + 4) });
  }
  return peers;
}
