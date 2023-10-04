import { Algodv2 } from "algosdk";
import { NFTAsset, UniversalARCNFTMetadata } from "../types";
import { extractNFTMetadata, getAssetInfo } from "../util";

/**
 * Generic transaction utilities such as Opting Users into Assets
 */
export default class NFTAssetUtil {
  algoClient: Algodv2;
  constructor(algoClient: Algodv2) {
    this.algoClient = algoClient;
  }

  /**
   * Get all data for a given asset including the original file for reuploading if necessary, and the metadata
   * @param {number} assetId the asset id of the asset to get data for
   * @returns {NFTAsset} the asset data
   */
  async getAssetMetadata(
    assetId: number,
    isMainNet: boolean
  ): Promise<NFTAsset> {
    const asa = await getAssetInfo(assetId, this.algoClient);
    const params = asa.params;
    const arcMetadata: UniversalARCNFTMetadata = await extractNFTMetadata(
      asa,
      isMainNet
    );

    const nftAsset: NFTAsset = {
      index: assetId,
      arcMetadata,
      params: params,
    };

    return nftAsset;
  }
}
