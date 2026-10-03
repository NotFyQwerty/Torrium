console.log("torrium");
import { decode } from "./bencode/decode.js";

const sample = Buffer.from("d3:bar4:spam3:fooi42e4:listli1ei2eee");
console.dir(decode(sample), { depth: null });
