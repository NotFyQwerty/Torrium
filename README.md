# Torrium

A BitTorrent client written from scratch in TypeScript. Planned as a desktop app (Electron + React), built core-first.

## Status

Work in progress.

- [x] Bencode decoder
- [x] Bencode encoder
- [x] .torrent parsing and info_hash
- [ ] Tracker announce
- [ ] Peer wire protocol
- [ ] Piece download and verification
- [ ] HTTP/WebSocket API
- [ ] Desktop UI

## Development

Requires Node.js and pnpm.

```bash
pnpm install
pnpm dev        # run src/index.ts
pnpm typecheck  # type check without emitting files
```

## License

MIT
