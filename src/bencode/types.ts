export type BencodeInteger = { type: "integer"; value: number };

export type BencodeString = { type: "string"; value: Buffer };

export type BencodeList = { type: "list"; value: BencodeValue[] };

    export type BencodeDict = { type: "dict"; value: Map<string, BencodeValue> };

export type BencodeValue =
  | BencodeInteger
  | BencodeString
  | BencodeList
  | BencodeDict;
