import { readFile } from "node:fs/promises";
import { parseTorrent } from "./torrent.js";
import { announce } from "./tracker.js";

const torrent = parseTorrent(
  await readFile("fixtures/ubuntu-26.04.1-desktop-amd64.iso.torrent"),
);

console.log("name:", torrent.name);
console.log("info_hash:", torrent.infoHash.toString("hex"));

const peers = await announce(torrent);
console.log("peers:", peers.length);
console.log(peers.slice(0, 5));

import { connectToPeer } from "./peer.js";

const first = peers[0];
if (!first) throw new Error("No peers from tracker");

connectToPeer(first, torrent, 13468);
