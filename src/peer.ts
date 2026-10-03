import net from "node:net";
import { PEER_ID, type Peer } from "./tracker.js";
import type { Torrent } from "./torrent.js";

const PROTOCOL = Buffer.from("BitTorrent protocol");
const HANDSHAKE_LENGTH = 68;

function buildHandshake(infoHash: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from([PROTOCOL.length]),
    PROTOCOL,
    Buffer.alloc(8),
    infoHash,
    PEER_ID,
  ]);
}

export function connectToPeer(peer: Peer, torrent: Torrent): void {
  const label = `${peer.ip}:${peer.port}`;
  const socket = net.connect({ host: peer.ip, port: peer.port });
  socket.setTimeout(10_000);

  let buffer: Buffer = Buffer.alloc(0);
  let handshakeDone = false;

  socket.on("connect", () => {
    console.log(`[${label}] connected`);
    socket.write(buildHandshake(torrent.infoHash));
  });

  socket.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    if (!handshakeDone) {
      if (buffer.length < HANDSHAKE_LENGTH) return;

      const theirHash = buffer.subarray(28, 48);
      if (
        buffer[0] !== PROTOCOL.length ||
        !theirHash.equals(torrent.infoHash)
      ) {
        console.log(`[${label}] bad handshake, closing`);
        socket.destroy();
        return;
      }

      handshakeDone = true;
      buffer = buffer.subarray(HANDSHAKE_LENGTH);
      console.log(`[${label}] handshake ok`);

      socket.write(Buffer.from([0, 0, 0, 1, 2]));
    }

    while (buffer.length >= 4) {
      const length = buffer.readUInt32BE(0);
      if (buffer.length < 4 + length) break;

      if (length > 0)
        handleMessage(label, torrent, buffer.subarray(4, 4 + length));
      buffer = buffer.subarray(4 + length);
    }
  });

  socket.on("error", (err) => console.log(`[${label}] error: ${err.message}`));
  socket.on("timeout", () => {
    console.log(`[${label}] timeout`);
    socket.destroy();
  });
  socket.on("close", () => console.log(`[${label}] closed`));
}

function handleMessage(label: string, torrent: Torrent, msg: Buffer): void {
  const id = msg[0];
  const payload = msg.subarray(1);

  switch (id) {
    case 0:
      console.log(`[${label}] choke`);
      break;
    case 1:
      console.log(`[${label}] unchoke`);
      break;
    case 4:
      console.log(`[${label}] have piece ${payload.readUInt32BE(0)}`);
      break;
    case 5: {
      let have = 0;
      for (const byte of payload) {
        for (let b = byte; b > 0; b >>= 1) have += b & 1;
      }
      console.log(
        `[${label}] bitfield: ${have}/${torrent.pieces.length / 20} pieces`,
      );
      break;
    }
    default:
      console.log(`[${label}] message id ${id}`);
  }
}
