import { createHash } from "node:crypto";
import net from "node:net";
import { PEER_ID, type Peer } from "./tracker.js";
import type { Torrent } from "./torrent.js";

const PROTOCOL = Buffer.from("BitTorrent protocol");
const HANDSHAKE_LENGTH = 68;
const BLOCK_SIZE = 16384;

function buildHandshake(infoHash: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from([PROTOCOL.length]),
    PROTOCOL,
    Buffer.alloc(8),
    infoHash,
    PEER_ID,
  ]);
}

function pieceSize(torrent: Torrent, index: number): number {
  const total = torrent.pieces.length / 20;
  if (index < total - 1) return torrent.pieceLength;
  return torrent.length - torrent.pieceLength * (total - 1);
}

function buildRequest(index: number, begin: number, length: number): Buffer {
  const msg = Buffer.alloc(17);
  msg.writeUInt32BE(13, 0);
  msg[4] = 6;
  msg.writeUInt32BE(index, 5);
  msg.writeUInt32BE(begin, 9);
  msg.writeUInt32BE(length, 13);
  return msg;
}

export function connectToPeer(
  peer: Peer,
  torrent: Torrent,
  targetPiece: number,
): void {
  const label = `${peer.ip}:${peer.port}`;
  const socket = net.connect({ host: peer.ip, port: peer.port });
  socket.setTimeout(10_000);

  let buffer: Buffer = Buffer.alloc(0);
  let handshakeDone = false;

  let choked = true;
  const have = new Set<number>();
  let requested = false;

  const size = pieceSize(torrent, targetPiece);
  const pieceData = Buffer.alloc(size);
  let received = 0;

  function tryRequest(): void {
    if (requested || choked) return;
    requested = true;

    for (let begin = 0; begin < size; begin += BLOCK_SIZE) {
      const length = Math.min(BLOCK_SIZE, size - begin);
      socket.write(buildRequest(targetPiece, begin, length));
    }
    console.log(`[${label}] requested piece ${targetPiece} (${size} bytes)`);
  }

  function handleMessage(msg: Buffer): void {
    const id = msg[0];
    const payload = msg.subarray(1);

    switch (id) {
      case 0:
        choked = true;
        console.log(`[${label}] choke`);
        break;
      case 1:
        choked = false;
        console.log(`[${label}] unchoke`);
        tryRequest();
        break;
      case 4:
        have.add(payload.readUInt32BE(0));
        tryRequest();
        break;
      case 5:
        for (let i = 0; i < payload.length * 8; i++) {
          if ((payload[i >> 3]! >> (7 - (i & 7))) & 1) have.add(i);
        }
        console.log(`[${label}] bitfield: ${have.size} pieces`);
        tryRequest();
        break;
      case 7:
        handleBlock(payload);
        break;
      default:
        console.log(`[${label}] message id ${id}`);
    }
  }

  function handleBlock(payload: Buffer): void {
    const index = payload.readUInt32BE(0);
    const begin = payload.readUInt32BE(4);
    const block = payload.subarray(8);

    if (index !== targetPiece || begin + block.length > size) {
      throw new Error("unexpected block");
    }

    block.copy(pieceData, begin);
    received += block.length;

    if (received < size) return;

    const expected = torrent.pieces.subarray(
      targetPiece * 20,
      targetPiece * 20 + 20,
    );
    const actual = createHash("sha1").update(pieceData).digest();
    console.log(
      actual.equals(expected)
        ? `[${label}] piece ${targetPiece} OK, hash matches`
        : `[${label}] piece ${targetPiece} CORRUPTED, hash mismatch`,
    );
    socket.end();
  }

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

      if (length > 0) {
        try {
          handleMessage(buffer.subarray(4, 4 + length));
        } catch (err) {
          console.log(`[${label}] protocol error: ${(err as Error).message}`);
          socket.destroy();
          return;
        }
      }
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
