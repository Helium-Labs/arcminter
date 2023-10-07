import { NFTStorageIPFSService } from "./NFTStorageIPFSClient";
import { describe, expect, beforeEach, it } from "@jest/globals";
require("dotenv").config();

describe("NFTStorageIPFSClient", () => {
  let client: NFTStorageIPFSService;
  beforeEach(() => {
    const JWT: string = process.env.NFTSTORAGE_TEST_JWT!;
    client = new NFTStorageIPFSService(JWT);
  });

  it("should upload a file to IPFS", async () => {
    const cid = await client.pinJSONToIPFS({ test: "test" });
    console.log(cid);
    expect(cid).toBeDefined();
  }, 10000);
});
