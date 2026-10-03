import { readFile } from "node:fs/promises";
import { parseTorrent } from "./torrent.js";

const torrent = parseTorrent(await readFile("fixtures/ubuntu-26.04.1-desktop-amd64.iso.torrent"));

console.log("name:", torrent.name);
console.log("tracker:", torrent.announce);
console.log("size (bytes):", torrent.length);
console.log("piece length:", torrent.pieceLength);
console.log("pieces:", torrent.pieces.length / 20);
console.log("info_hash:", torrent.infoHash.toString("hex"));
