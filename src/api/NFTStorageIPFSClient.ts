import { IPFSPinningService } from "./types";
import axios from "axios";
import FormData from "form-data";
import { File } from "buffer";
import { nftStorageUploadUrl } from "../constants";

// Define an interface for the NFTStorage response based on the provided schema.
type NFTStorageResponse = {
  ok: boolean;
  value: {
    cid: string;
    size: number;
    created: string;
    type: string;
  };
};

type NFTStorageOptions = {};

export class NFTStorageIPFSService
  implements IPFSPinningService<NFTStorageOptions>
{
  private JWT: string;

  constructor(JWT: string) {
    this.JWT = JWT;
  }

  /**
   * Receive the file from the client, and upload it to IPFS. Return the hash of the file, and its IPFS URL.
   * @param {ReadableStream} nftFile
   * @returns {Promise<string>} IPFS Hash Content Identifier (CID)
   */
  async pinFileToIPFS(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const config = {
      method: "post",
      url: nftStorageUploadUrl,
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${this.JWT}`,
      },
      data: formData,
    };

    const response = await axios(config);
    const data: NFTStorageResponse = response.data;

    return data.value.cid;
  }

  /**
   * Pin JSON metadata to IPFS
   * @param {any} json
   * @returns {Promise<string>} IPFS Hash Content Identifier (CID)
   */
  async pinJSONToIPFS(json: any): Promise<string> {
    const config = {
      method: "post",
      url: nftStorageUploadUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.JWT}`,
      },
      data: json,
    };

    const response = await axios(config);
    const data: NFTStorageResponse = response.data;

    return data.value.cid;
  }
}
