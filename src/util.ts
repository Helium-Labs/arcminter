import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import algosdk, { Algodv2 } from "algosdk";
import axios from "axios";
import * as mfsha2 from "multiformats/hashes/sha2";

import { CID, CIDVersion } from "multiformats/cid";
import * as digest from "multiformats/hashes/digest";
import {
  ARC3_NAME,
  ARC3_NAME_SUFFIX,
  ARC3_URL_SUFFIX,
  IPFSProxyPath,
} from "./constants.js";
import {
  Arc3Arc19Metadata,
  Arc69Metadata,
  Arc69MetadataZod,
  ARCStandard,
  ConfigAsset,
  CreateAssetTransactionConfig,
  GenericNFTData,
  UniversalARCNFTMetadata,
  ValidationResult,
} from "./types.js";
import { ZodError } from "zod";

import crypto from "crypto";
import { Readable } from "stream";

/**
 * Waits for Confirmation of the client
 * @param {*} client Algorand client
 * @param {*} txId Transaction id to wait for confirmation
 */
async function awaitForConfirmation(txId: any, algoClient: Algodv2) {
  const status = await algoClient.status().do();
  let lastRound = status["last-round"];
  while (true) {
    const pendingInfo = await algoClient
      .pendingTransactionInformation(txId)
      .do();
    if (
      pendingInfo["confirmed-round"] !== null &&
      pendingInfo["confirmed-round"] > 0
    ) {
      // Got the completed Transaction
      break;
    }
    lastRound++;
    await algoClient.statusAfterBlock(lastRound).do();
  }
}

async function sendRawTransaction(
  signedTxn: any,
  algoClient: Algodv2
): Promise<Record<string, any>> {
  const { txId } = await algoClient.sendRawTransaction(signedTxn).do();

  await awaitForConfirmation(txId, algoClient);

  const txResponse = await algoClient.pendingTransactionInformation(txId).do();

  return txResponse;
}

export async function getSignedB64Txns(connector: any, txnsToSign: any[]) {
  // txnsToSign
  const validParams = ["signers", "txn", "message"];
  const requestTxnsToSign = txnsToSign.map((e) => {
    const cleaned: any = {};
    for (const key of Object.keys(e)) {
      if (validParams.includes(key)) {
        cleaned[key] = e[key];
      }
    }
    return cleaned;
  });

  const requestParams = [requestTxnsToSign];

  const request = formatJsonRpcRequest("algo_signTxn", requestParams);
  // array of base64 encoded signed transactions
  const b64EncodedResult = await connector.sendCustomRequest(request);

  // merge partially signed array with signed transactions
  for (let i = 0; i < b64EncodedResult.length; i++) {
    if (!b64EncodedResult[i]) {
      b64EncodedResult[i] = txnsToSign[i].stxn;
    }
  }

  return b64EncodedResult;
}

// given [txn,isSigned] return signed transactions. Per signing with Wallet Connect.
export async function signArray(
  connector: any,
  txnsToSign: any[],
  algoClient: Algodv2
): Promise<Record<string, any>> {
  const b64EncodedResult = await getSignedB64Txns(connector, txnsToSign);

  // array of uint8 transactions
  const stxns = b64EncodedResult.map((element: any) => {
    return element ? new Uint8Array(Buffer.from(element, "base64")) : null;
  });

  const txResponse = await sendRawTransaction(stxns, algoClient);

  return txResponse;
}

export function flattenArray(arr: any[]): any[] {
  return arr.reduce((acc, val) => acc.concat(val), []);
}

/**
 * Returns the wallet info for the given wallet address
 * @param wallet_addr
 * @returns WalletInfo for given address
 */
export async function getWalletInfo(walletAddr: string, algoClient: Algodv2) {
  let accountInfo = await algoClient.accountInformation(walletAddr).do();
  return accountInfo;
}

export async function getAppInfoInUserContext(
  walletAddr: string,
  appIndex: number,
  algoClient: Algodv2
) {
  const info = await getWalletInfo(walletAddr, algoClient);
  const localState = info["apps-local-state"];

  const appInfo = localState
    .filter((obj: any) => {
      return obj.id === appIndex;
    })
    .pop();

  return appInfo;
}

/**
 * Check whether the user has opted in to the app
 * @param wallet_address
 * @param appId
 * @returns whether the user has opted in to the app
 */
export async function hasOptedIn(
  walletAddr: string,
  appIndex: number,
  algoClient: Algodv2
): Promise<boolean> {
  const appInfo = await getAppInfoInUserContext(
    walletAddr,
    appIndex,
    algoClient
  );
  return appInfo !== undefined;
}

/**
 * Return whether the user has opted into the asset with the given asset index
 * @param algoClient
 * @param walletAddr
 * @param assetIndex
 * @returns whether the user has opted into the asset with the given asset index
 */
export async function userHasOptedIntoAsset(
  walletAddr: string,
  assetIndex: number,
  algoClient: Algodv2
): Promise<boolean> {
  const walletInfo = await getWalletInfo(walletAddr, algoClient);
  const assets = walletInfo && walletInfo.assets;
  if (!assets) {
    return false;
  }
  const asset = assets
    .filter((obj: any) => {
      return obj["asset-id"] === assetIndex;
    })
    .pop();
  return asset !== undefined;
}

/**
 * Returns the asset info for the given asset index
 * @param assetIndex
 * @returns AssetInfo for given asset index
 * @throws Error if asset index is not found
 */
export async function getAssetInfo(assetIndex: number, algoClient: Algodv2) {
  let assetInfo = await algoClient.getAssetByID(assetIndex).do();
  return assetInfo;
}

/**
 * Reserve address to IPFS hash, useable with Algorand Standard Assets
 * @param reserverAddress
 * @returns IPFS hash
 */
export async function getIPFSMetadataFromReserveAddress(
  reserverAddress: string,
  ipfsProxyUrl: string
) {
  const arc19url = arcResolveProtocol(ipfsProxyUrl, reserverAddress);
  const response = await axios.get(arc19url);
  const ipfsData = response.data;

  return ipfsData;
}

export function convertPotentialIpfsToHttps(url: string | undefined) {
  if (!url) {
    return undefined;
  }
  if (url.startsWith("ipfs://")) {
    return `${IPFSProxyPath}${url.split("ipfs://")[1]}`;
  } else if (url.startsWith("https://")) {
    return url;
  }
  return undefined;
}

// URL points to metadata, and starts with ipfs:// or https://. Assume cross origin is supported.
async function getARC3Metadata(assetInfo: any): Promise<GenericNFTData> {
  if (!assetInfo.params) {
    throw new Error("Missing params field.");
  }

  const url: string = assetInfo.params.url;

  const httpsUrl = convertPotentialIpfsToHttps(url) as string;

  // fetch metadata
  const response = await axios.get(httpsUrl);
  let metadata: any = {};
  let httpsImageUrl: string | undefined = "";
  let httpsAnimationUrl: string | undefined = "";
  if (response.headers["content-type"] === "application/json") {
    // extract the image -- assume it's the image field
    metadata = response.data;
    httpsAnimationUrl = convertPotentialIpfsToHttps(metadata?.animation_url);
    httpsImageUrl = convertPotentialIpfsToHttps(metadata?.image);
  } else {
    // assume it's an image
    httpsImageUrl = httpsUrl;
  }

  return { httpsImageUrl, httpsAnimationUrl, metadata };
}

// returns undefined if it's not an arc69 asset (has no metadata)
async function getARC69MetadataJSON(
  assetId: number,
  isMainNet: boolean = true
): Promise<Arc69Metadata | undefined> {
  // Fetch `acfg`
  let url = `https://mainnet-idx.algonode.cloud/v2/assets/${assetId}/transactions?tx-type=acfg`;
  if (!isMainNet) {
    url = `https://testnet-idx.algonode.cloud/v2/assets/${assetId}/transactions?tx-type=acfg`;
  }
  let transactions;
  try {
    //transactions = (await axios.get(url).then((res) => res.json())).transactions;
    const response = await axios.get(url);
    transactions = response.data.transactions;
  } catch (err) {
    console.error(err);
    return undefined;
  }

  // Sort the most recent `acfg` transactions first.
  transactions.sort((a: any, b: any) => b["round-time"] - a["round-time"]);

  // Attempt to parse each `acf` transaction's note for ARC69 metadata.
  for (const transaction of transactions) {
    try {
      const noteBase64 = transaction.note;
      // atob alternative
      const noteString = Buffer.from(noteBase64, "base64").toString("ascii");
      const noteStringFiltered = noteString.trim().replace(/[^ -~]+/g, "");
      const noteObject = JSON.parse(noteStringFiltered);
      if (noteObject.standard === "arc69") {
        return noteObject;
      }
    } catch (err) {
      // Oh well... Not valid JSON.
    }
  }
  return undefined;
}

// assume url points directly to metadata, which contains a link to an image
async function getARC19Metadata(assetInfo: any): Promise<GenericNFTData> {
  if (!assetInfo.params) {
    throw new Error("Missing params field.");
  }

  const url = assetInfo.params.url;
  const reserve = assetInfo.params.reserve;
  if (!url || !reserve) {
    throw new Error("Missing url or reserve field.");
  }

  const metadataUrl = await arcResolveProtocol(url, reserve);

  const response = await axios.get(metadataUrl);
  const metadata: Arc3Arc19Metadata = response.data;

  const imageIPFSUrl = metadata.image;
  const httpsImageUrl = convertPotentialIpfsToHttps(imageIPFSUrl);
  const animationIPFSUrl = metadata.animation_url;
  const httpsAnimationUrl = convertPotentialIpfsToHttps(animationIPFSUrl);

  return { httpsImageUrl, httpsAnimationUrl, metadata };
}

/**
 * Extract NFT image from IPFS metadata, with https://ipfs.io/ipfs/ prefix to make it usable without cross-origin issues
 * Understands the different cases that are possible, like ARC3, ARC19, and ARC69. Assumes only an image is present.
 * ARC3 points to JSON with an image link, ARC19 points to JSON with an image link, ARC69 points directly to the image.
 * Also returns the metadata.
 *
 * @param {any} assetInfo
 * @returns {UniversalARCNFTMetadata}
 */
export async function extractNFTMetadata(
  assetInfo: any,
  isMainNet: boolean
): Promise<UniversalARCNFTMetadata> {
  if (!assetInfo) {
    throw new Error("Missing assetInfo");
  }

  const standards: ARCStandard[] = [];
  if (getIsARC3Asset(assetInfo)) {
    standards.push(ARCStandard.ARC3);
  }
  if (getIsARC19Asset(assetInfo)) {
    standards.push(ARCStandard.ARC19);
  }

  let arc69Metadata = await getARC69MetadataJSON(assetInfo.index, isMainNet);
  if (arc69Metadata) {
    standards.push(ARCStandard.ARC69);
  }

  if (standards.length === 0) {
    // it's a custom standard
    standards.push(ARCStandard.CUSTOM);
  }

  let arc3Metadata: Arc3Arc19Metadata | undefined = undefined;
  let arc19Metadata: Arc3Arc19Metadata | undefined = undefined;
  let httpsAnimationUrl: string | undefined = undefined;
  let httpsImageUrl: string | undefined = undefined;

  if (standards.includes(ARCStandard.ARC19)) {
    const arc19Data = await getARC19Metadata(assetInfo);
    httpsAnimationUrl = arc19Data.httpsAnimationUrl;
    httpsImageUrl = arc19Data.httpsImageUrl;
    arc19Metadata = arc19Data.metadata;
  }
  if (standards.includes(ARCStandard.ARC3)) {
    const arc3Data = await getARC3Metadata(assetInfo);
    httpsAnimationUrl = httpsAnimationUrl || arc3Data.httpsAnimationUrl;
    httpsImageUrl = httpsImageUrl || arc3Data.httpsImageUrl;
    arc3Metadata = arc3Data.metadata;
  }
  if (standards.includes(ARCStandard.ARC69)) {
    const url = assetInfo.params.url;
    httpsImageUrl = httpsImageUrl || convertPotentialIpfsToHttps(url);
  }

  let customMetadata: any;
  if (standards.includes(ARCStandard.CUSTOM)) {
    // go through all methods until we find one that returns an image and metadata
    try {
      const arc19Data = await getARC19Metadata(assetInfo);
      httpsAnimationUrl = arc19Data.httpsAnimationUrl;
      httpsImageUrl = arc19Data.httpsImageUrl;
      customMetadata = arc19Data.metadata;
    } catch (err) {
      console.error(err);
    }
    try {
      const arc3Data = await getARC3Metadata(assetInfo);
      httpsAnimationUrl = httpsAnimationUrl || arc3Data.httpsAnimationUrl;
      httpsImageUrl = httpsImageUrl || arc3Data.httpsImageUrl;
      customMetadata = {
        ...customMetadata,
        ...arc3Data.metadata,
      };
    } catch (err) {
      console.error(err);
    }
    const url = assetInfo.params.url;
    httpsAnimationUrl = httpsAnimationUrl || convertPotentialIpfsToHttps(url);
  }

  // keep metadata fields separate for each standard in the json response, but have one imageUrl field
  const universalARCMetadata: any = {
    standards,
    httpsAnimationUrl,
    httpsImageUrl,
    arc3Metadata,
    arc19Metadata,
    arc69Metadata,
    customMetadata,
  };

  // prune undefined fields
  for (const key in universalARCMetadata) {
    if (universalARCMetadata[key] === undefined) {
      delete universalARCMetadata[key];
    }
  }
  const universalARCData: UniversalARCNFTMetadata = universalARCMetadata;

  return universalARCData;
}

export function arcResolveProtocol(url: string, reserveAddr: string): string {
  if (url.endsWith(ARC3_URL_SUFFIX))
    url = url.slice(0, url.length - ARC3_URL_SUFFIX.length);

  let chunks = url.split("://");
  // Check if prefix is template-ipfs and if {ipfscid:..} is where CID would normally be
  if (chunks[0] === "template-ipfs" && chunks[1].startsWith("{ipfscid:")) {
    // Look for something like: template:ipfs://{ipfscid:1:raw:reserve:sha2-256} and parse into components
    chunks[0] = "ipfs";
    const cidComponents = chunks[1].split(":");
    if (cidComponents.length !== 5) {
      // give up
      console.log("unknown ipfscid format");
      return url;
    }
    const [, cidVersion, cidCodec, asaField, cidHash] = cidComponents;

    // const cidVersionInt = parseInt(cidVersion) as CIDVersion
    if (cidHash.split("}")[0] !== "sha2-256") {
      console.log("unsupported hash:", cidHash);
      return url;
    }
    if (cidCodec !== "raw" && cidCodec !== "dag-pb") {
      console.log("unsupported codec:", cidCodec);
      return url;
    }
    if (asaField !== "reserve") {
      console.log("unsupported asa field:", asaField);
      return url;
    }
    let cidCodecCode;
    if (cidCodec === "raw") {
      cidCodecCode = 0x55;
    } else if (cidCodec === "dag-pb") {
      cidCodecCode = 0x70;
    }

    if (!cidCodecCode) {
      throw new Error("unknown codec");
    }

    // get 32 bytes Uint8Array reserve address - treating it as 32-byte sha2-256 hash
    const addr = algosdk.decodeAddress(reserveAddr);
    const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey);
    const version = parseInt(cidVersion) as CIDVersion;

    const cid = CID.create(version, cidCodecCode, mhdigest);
    chunks[1] = cid.toString() + "/" + chunks[1].split("/").slice(1).join("/");
  }

  //Switch on the protocol
  switch (chunks[0]) {
    case "ipfs": {
      return IPFSProxyPath + chunks[1];
    }
    case "https": //Its already http, just return it
      return url;
    // TODO: Future options may include arweave or algorand
  }

  return url;
}

export function getIsARC3Asset(assetInfo: any): boolean {
  if (!assetInfo || !assetInfo.params) {
    return false;
  }

  const assetName = assetInfo.params.name;
  const assetUrl = assetInfo.params.url;

  const isArc3ByName =
    assetName === ARC3_NAME || assetName.endsWith(ARC3_NAME_SUFFIX);
  const isArc3ByUrl = assetUrl && assetUrl.endsWith(ARC3_URL_SUFFIX);

  return isArc3ByName || isArc3ByUrl;
}

export function getIsARC19Asset(assetInfo: any): boolean {
  const assetUrl: string = assetInfo.params.url;

  const followsTemplateIPFSArc19Spec = assetUrl.startsWith(
    "template-ipfs://{ipfscid"
  );
  const containsReserveKeyword = assetUrl.includes("reserve");
  const isARC19 = followsTemplateIPFSArc19Spec && containsReserveKeyword;

  return isARC19;
}

export async function getIsARC69Asset(assetInfo: any): Promise<boolean> {
  // no definitive way to identify ARC69 assets except not ARC3 or ARC19, and url starts with ipfs:// or https://
  const assetUrl: string = assetInfo.params.url;
  const startsWithIPFS = assetUrl.startsWith("ipfs://");
  const startsWithHTTPS = assetUrl.startsWith("https://");
  const isNotARC3 = !getIsARC3Asset(assetInfo);
  const isNotARC19 = !getIsARC19Asset(assetInfo);

  const isARC69 =
    (startsWithIPFS || startsWithHTTPS) && isNotARC3 && isNotARC19;

  return isARC69;
}

export function getTypeFromMimeType(filetype: string): string {
  const [type, _] = filetype.split("/");
  return type;
}

function formatZodErrorForUser(error: ZodError): string {
  const issues = error.issues.map((issue, index) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "Value";
    const message = issue.message;
    return `${index + 1}. ${path}: ${message}`;
  });

  return `Validation failed:\n${issues.join("\n")}`;
}

// validate input json against ARC69 metadata schema with zod
export function validateArc69Metadata(metadata: any): ValidationResult {
  const result = Arc69MetadataZod.safeParse(metadata);
  if (result.success) {
    return { isValid: true };
  } else {
    const friendlyErrorMessage = formatZodErrorForUser(result.error);
    // Display the errorMessage in a notification popup
    return { isValid: false, friendlyErrorMessage };
  }
}

export function setEmptyFieldsAsUndefined(
  obj: ConfigAsset | CreateAssetTransactionConfig | any
) {
  if (!obj) return obj;
  const addressFieldKeys = ["freeze", "clawback", "manager", "reserve"];
  Object.keys(obj).forEach((key: string) => {
    if (
      addressFieldKeys.includes(key) &&
      (obj[key] === "" || obj[key] === undefined)
    ) {
      delete obj[key];
    }
  });
  return obj;
}

/**
 * Get sha-256 checksum of image using crypto module for Node
 * @param {Buffer} imageBuffer
 * @returns {Promise<string>}
 */
export async function getSHA256Checksum(imageBuffer: Buffer): Promise<string> {
  return crypto.createHash("sha256").update(imageBuffer).digest("base64");
}

/**
 * Convert Readable Stream to Buffer
 * @param {Readable} stream
 * @returns {Promise<Buffer>} The buffer of the stream
 */
export async function stream2buffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const _buf = Array<any>();
    if (stream.readableEnded) {
      resolve(stream.read());
    }
    stream.on("data", (chunk) => _buf.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(_buf)));
    stream.on("error", (err) => reject(`error converting stream - ${err}`));
  });
}

/**
 * @param binary Buffer
 * @returns {Readable} readableInstanceStream Readable
 */
export function buffer2stream(buffer: Buffer): Readable {
  return new Readable({
    read(_size) {
      this.push(buffer);
      this.push(null); // Signal the end of the stream
    },
  });
}

type IPFSHashProperties = {
  version: number;
  codec: string | undefined;
  CIDBase64HashDigest: string; //multihash digest
};
export function deriveIPFSHashProperties(
  pinataMetadataIPFSHash: string
): IPFSHashProperties {
  // Decode the metadata CID to derive the Reserve Address and URL
  const decodedCID = CID.parse(pinataMetadataIPFSHash);

  // Derive the URL
  const getCodec = (code: number) => {
    // As per multiformats table
    // https://github.com/multiformats/multicodec/blob/master/table.csv#L9
    switch (code.toString(16)) {
      case "55":
        return "raw";
      case "70":
        return "dag-pb";
    }
  };

  const version = decodedCID.version;
  const code = decodedCID.code;
  const codec = getCodec(code);

  // Derive the Reserve Address
  const CIDBase64HashDigest = algosdk.encodeAddress(
    Uint8Array.from(Buffer.from(decodedCID.multihash.digest))
  );

  return { CIDBase64HashDigest, codec, version };
}
