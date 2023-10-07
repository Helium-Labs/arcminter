import {
  IPFSPinningService,
} from "./types";
import axios from "axios";
import { pinataFilePinUrl, pinataJSONPinUrl } from "../constants";
import FormData from "form-data";
import { File } from "buffer";

interface PinataMetadata {
  [key: string]: string | number | null;
}

interface PinataPinPolicyItem {
  id: string;
  desiredReplicationCount: number;
}

interface PinataOptions {
  hostNodes?: string[] | undefined;
  cidVersion?: 0 | 1;
  wrapWithDirectory?: boolean;
  customPinPolicy?: {
    regions: PinataPinPolicyItem[];
  };
}

interface PinataPinResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

interface PinataPinOptions {
  pinataMetadata?: PinataMetadata;
  pinataOptions?: PinataOptions | undefined;
}

async function uploadJSON(
  obj: any,
  options: PinataPinOptions,
  jwt: string
): Promise<PinataPinResponse> {
  const data = JSON.stringify({
    pinataOptions: options.pinataOptions,
    pinataMetadata: options.pinataMetadata,
    pinataContent: obj,
  });

  const config = {
    method: "post",
    url: pinataJSONPinUrl,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    data,
  };

  const res = await axios(config);

  return res.data;
}

async function uploadFile(
  file: File,
  options: PinataPinOptions,
  jwt: string
): Promise<PinataPinResponse> {
  const formData = new FormData();

  formData.append("file", file);

  const pinataMetadata = JSON.stringify(options.pinataMetadata);
  formData.append("pinataMetadata", pinataMetadata);

  const pinataOptions = JSON.stringify(options.pinataOptions);
  formData.append("pinataOptions", pinataOptions);

  const res = await axios.post(pinataFilePinUrl, formData, {
    maxBodyLength: Infinity,
    headers: {
      // @ts-ignore
      "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
      Authorization: `Bearer ${jwt}`,
    },
  });

  return res.data;
}

export class PinataIPFSClient implements IPFSPinningService<PinataPinOptions> {
  JWT: string;
  constructor(JWT: string) {
    this.JWT = JWT;
  }

  /**
   * Receive the file from the client, and upload it to IPFS. Return the hash of the file, and its IPFS URL.
   * @param {ReadableStream} nftFile
   * @param {PinataPinOptions | undefined} options
   * @returns {Promise<string>} IPFS Hash Content Identifier (CID)
   */
  async pinFileToIPFS(file: File, options?: PinataPinOptions): Promise<string> {
    if (!options) {
      throw new Error("Pinata options are required");
    }
    const ipfs = await uploadFile(file, options, this.JWT);
    return ipfs.IpfsHash;
  }

  /**
   * Pin JSON metadata to IPFS
   * @param {any} json
   * @param {PinataPinOptions | undefined} options
   * @returns {Promise<string>} IPFS Hash Content Identifier (CID)
   */
  async pinJSONToIPFS(json: any, options?: PinataPinOptions): Promise<string> {
    if (!options) {
      throw new Error("Pinata options are required");
    }
    const result = await uploadJSON(json, options, this.JWT);
    return result.IpfsHash;
  }
}
