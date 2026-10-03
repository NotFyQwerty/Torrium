import { decode } from "./bencode/decode.js";
import { encode } from "./bencode/encode.js";

const original = Buffer.from("d3:bar4:spam3:fooi42e4:listli1ei2eee");
console.log(encode(decode(original)).equals(original));