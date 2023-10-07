import { File } from "buffer";

// The base interface for IPFS pinning services.
export interface IPFSPinningService<TOptions> {
  pinFileToIPFS(file: File, options?: TOptions): Promise<string>;
  pinJSONToIPFS(json: any, options?: TOptions): Promise<string>;
}
