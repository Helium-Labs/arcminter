import { File } from "buffer";

// The base interface for IPFS pinning services.
export interface IPFSPinningService<TOptions> {
  pinFileToIPFS(file: File, options?: TOptions): Promise<string>;
  pinJSONToIPFS(json: any, options?: TOptions): Promise<string>;
}

// Pinata Client Options.
export interface PinataMetadata {
  [key: string]: string | number | null;
}

export interface PinataPinPolicyItem {
  id: string;
  desiredReplicationCount: number;
}

export interface PinataOptions {
  hostNodes?: string[] | undefined;
  cidVersion?: 0 | 1;
  wrapWithDirectory?: boolean;
  customPinPolicy?: {
    regions: PinataPinPolicyItem[];
  };
}

export interface PinataPinResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export interface PinataPinOptions {
  pinataMetadata?: PinataMetadata;
  pinataOptions?: PinataOptions | undefined;
}

export type PinataHTTPResponse = {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
};
