import { readFile } from "node:fs/promises";
import { parseTorrent } from "./torrent.js";
import { announce } from "./tracker.js";

const torrent = parseTorrent(await readFile("fixtures/testFile.torrent"));

console.log("name:", torrent.name);
console.log("info_hash:", torrent.infoHash.toString("hex"));

const peers = await announce(torrent);
console.log("peers:", peers.length);
console.log(peers.slice(0, 5));
