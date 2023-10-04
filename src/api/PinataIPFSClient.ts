import { PinataPinOptions, PinataPinResponse } from "../types";
import axios from "axios";
import { pinataFilePinUrl, pinataJSONPinUrl } from "../constants";
import FormData from "form-data";
import { File } from "buffer";

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

/**
 * Receive the file from the client, and upload it to IPFS. Return the hash of the file, and its IPFS URL.
 * @param {ReadableStream} nftFile
 * @param {PinataPinOptions | undefined} options
 * @returns {Promise<PinataPinResponse>}
 */
export async function pinFileToIPFS(
  file: File,
  options: PinataPinOptions,
  JWT: string
): Promise<PinataPinResponse> {
  const ipfs = await uploadFile(file, options, JWT);
  return ipfs;
}

/**
 * Pin JSON metadata to IPFS
 * @param {any} json
 * @param {PinataPinOptions | undefined} options
 * @returns {Promise<PinataPinResponse>}
 */
export async function pinJSONToIPFS(
  json: any,
  options: PinataPinOptions,
  JWT: string
): Promise<PinataPinResponse> {
  const result = await uploadJSON(json, options, JWT);
  return result;
}
