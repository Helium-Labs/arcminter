import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import algosdk, { Algodv2 } from "algosdk";
import { CID } from "multiformats/cid";
import { ConfigAsset, CreateAssetTransactionConfig } from "./types.js";
import crypto from "crypto";

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

/**
 * Get sha-256 checksum of image using crypto module for Node
 * @param {Buffer} imageBuffer
 * @returns {Promise<string>}
 */
export async function getSHA256Checksum(imageBuffer: Buffer): Promise<string> {
  return crypto.createHash("sha256").update(imageBuffer).digest("base64");
}

export function getTypeFromMimeType(filetype: string): string {
  const [type, _] = filetype.split("/");
  return type;
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

async function sendRawTransaction(
  signedTxn: any,
  algoClient: Algodv2
): Promise<Record<string, any>> {
  const { txId } = await algoClient.sendRawTransaction(signedTxn).do();

  await awaitForConfirmation(txId, algoClient);

  const txResponse = await algoClient.pendingTransactionInformation(txId).do();

  return txResponse;
}

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
