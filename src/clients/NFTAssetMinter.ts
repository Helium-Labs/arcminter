import { ARC3_URL_SUFFIX } from "../constants";
import {
  Arc3Arc19Metadata,
  ConfigAsset,
  CreateAssetTransactionConfig,
  image_mimetype,
  AnimationMediaFields,
  ImageMediaFields,
  animation_url_mimetype,
  Arc69Metadata,
} from "../types";
import {
  deriveIPFSHashProperties,
  getSHA256Checksum,
  getTypeFromMimeType,
  setEmptyFieldsAsUndefined,
} from "../util";
import { File } from "buffer";

import algosdk, { Algodv2 } from "algosdk";
import { IPFSPinningService } from "../api/types";
import { SignTxnRequest } from "@gradian/util/dist/src/types";
import { Signer } from "@gradian/util/dist/src/signer/types";
import { AlgorandUtil } from "@gradian/util";

export default class AssetMinter<TOptions> {
  signer: Signer;
  algoClient: Algodv2;
  pinningService: IPFSPinningService<TOptions>;

  /**
   * Initialise the Asset Minter
   * @param {Algodv2} algoClient Algorand Client
   * @param {any} walletConnectConnector WalletConnect Connector
   **/
  constructor(
    algoClient: Algodv2,
    pinningService: IPFSPinningService<TOptions>,
    transactionSigner: Signer
  ) {
    this.signer = transactionSigner;
    this.algoClient = algoClient;
    this.pinningService = pinningService;
  }

  async getARC3ARC19MediaFields({
    file,
    pinningOptions,
  }: {
    file: File;
    pinningOptions: TOptions;
  }): Promise<ImageMediaFields | AnimationMediaFields> {
    // check if image
    const mediaArrayBuffer = await file.arrayBuffer();
    const mediaChecksum: string = await getSHA256Checksum(
      Buffer.from(mediaArrayBuffer)
    );

    // create readable stream compatible with pinata, and pin to ipfs using pinata
    const mediaCID: string = await this.pinningService.pinFileToIPFS(
      file,
      pinningOptions
    );

    const mediaType = getTypeFromMimeType(file.type);
    if (mediaType === "image") {
      // image
      const imageFields: ImageMediaFields = {
        image: "ipfs://" + mediaCID,
        image_integrity: "sha256-" + mediaChecksum,
        image_mimetype: file.type as image_mimetype,
      };
      return imageFields;
    } else {
      // "animation", including video and audio
      const animationFields: AnimationMediaFields = {
        animation_url: "ipfs://" + mediaCID,
        animation_url_integrity: "sha256-" + mediaChecksum,
        animation_url_mimetype: file.type as animation_url_mimetype,
      };
      return animationFields;
    }
  }

  /**
   * Get the IPFS hash of the metadata JSON file, which is the metadata for the ARC3 ARC19 NFT.
   * @param options
   * @param file
   * @param pinataJWT
   * @returns
   */
  async getIPFSARC3ARC19MetadataHash(
    options: Arc3Arc19Metadata,
    file: File,
    pinningOptions: TOptions
  ): Promise<string> {
    const mediaFields: AnimationMediaFields | ImageMediaFields =
      await this.getARC3ARC19MediaFields({ file, pinningOptions });

    const metadata: Arc3Arc19Metadata = {
      name: options.name,
      description: options.description,
      ...mediaFields,
      external_url: options.external_url,
      properties: options.properties || {},
    };

    // Pin metadata JSON to IPFS and get CID
    const metadataCID: string = await this.pinningService.pinJSONToIPFS(
      metadata,
      pinningOptions
    );

    return metadataCID;
  }

  /**
   * Mints an ARC69 compliant NFT Asset, and returns its asset index if successful
   * @param {CreateAssetTransactionConfig} createAssetConfig Create Asset Configuration
   * @param {Arc69Metadata} options ARC69 Metadata (JSON to be pinned to IPFS)
   * @param {File} file File to be pinned to IPFS
   * @param {string} pinataJWT Pinata JWT
   * @returns {Promise<number>} The minted asset index
   */
  async minterCreateArc69Asset({
    createAssetConfig,
    options,
    file,
    pinningOptions,
  }: {
    createAssetConfig: CreateAssetTransactionConfig;
    options: Arc69Metadata;
    file: File;
    pinningOptions: TOptions;
  }): Promise<number> {
    const walletId = this.signer.getWalletAddress();
    if (!walletId) {
      throw new Error("Wallet not given");
    }

    // check if image
    const mediaArrayBuffer = await file.arrayBuffer();
    const mediaChecksum: string = await getSHA256Checksum(
      Buffer.from(mediaArrayBuffer)
    );

    // create readable stream compatible with pinata, and pin to ipfs using pinata
    const mediaCID: string = await this.pinningService.pinFileToIPFS(
      file,
      pinningOptions
    );

    // prefil media integrity and media mimetype
    options.media_integrity = "sha256-" + mediaChecksum;
    options.mime_type = (file.type || "image/png") as
      | image_mimetype
      | animation_url_mimetype;
    createAssetConfig = setEmptyFieldsAsUndefined(createAssetConfig);
    
    const algoUtil = new AlgorandUtil(this.algoClient);
    const arc69Mimetype = algoUtil.getARC69MimetypeFromMediaMimeType(
      options.mime_type
    );
    const url = `ipfs://${mediaCID}${arc69Mimetype}`;

    let note: Uint8Array | undefined = undefined;
    try {
      const noteString = JSON.stringify(options);
      note = new Uint8Array(Buffer.from(noteString));
    } catch (e) {
      console.log("error", e);
    }
    const creatorWallet = algoUtil.makeWallet(walletId);
    const suggestedParams = await this.algoClient.getTransactionParams().do();
    // manager must be set for updates to metadata to be allowed
    const transaction = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject(
      {
        from: creatorWallet.addr,
        assetName: createAssetConfig.assetName,
        unitName: createAssetConfig.unitName,
        assetURL: url,
        manager: createAssetConfig.manager,
        reserve: createAssetConfig.reserve,
        freeze: createAssetConfig.freeze,
        clawback: createAssetConfig.clawback,
        decimals: createAssetConfig.decimals,
        total: createAssetConfig.total,
        suggestedParams,
        note,
        defaultFrozen: createAssetConfig.defaultFrozen,
      }
    );
    const txns: SignTxnRequest[] =
      await algoUtil.generateGroupTransactionSigningRequest(
        [transaction],
        [creatorWallet]
      );

    const stxOrStxs = await this.signer.sign(txns);
    const txResponse = await algoUtil.sendRawTransaction(stxOrStxs);
    return txResponse["asset-index"];
  }

  /**
   * Mints an ARC19 compliant NFT Asset, and returns its asset index if successful
   * @param {CreateAssetTransactionConfig} createAssetConfig Create Asset Configuration
   * @param {Arc3Arc19Metadata} options ARC19 Metadata (JSON to be pinned to IPFS)
   * @param {File} file File to be pinned to IPFS
   * @param {string} pinataJWT Pinata JWT
   * @returns {Promise<number>} The minted asset index
   */
  async minterCreateArc19Asset({
    createAssetConfig,
    options,
    file,
    pinningOptions,
  }: {
    createAssetConfig: CreateAssetTransactionConfig;
    options: Arc3Arc19Metadata;
    file: File;
    pinningOptions: TOptions;
  }): Promise<number> {
    const walletId = this.signer.getWalletAddress();
    if (!walletId) {
      throw new Error("Wallet not given");
    }

    const pinataMetadataIPFSHash = await this.getIPFSARC3ARC19MetadataHash(
      options,
      file,
      pinningOptions
    );
    createAssetConfig = setEmptyFieldsAsUndefined(createAssetConfig);
    const algoUtil = new AlgorandUtil(this.algoClient);
    const creatorWallet = algoUtil.makeWallet(walletId);

    const ipfsHashProperties = deriveIPFSHashProperties(pinataMetadataIPFSHash);

    const url = `template-ipfs://{ipfscid:${ipfsHashProperties.version}:${ipfsHashProperties.codec}:reserve:sha2-256}`;

    const suggestedParams = await this.algoClient.getTransactionParams().do();

    // manager must be set for updates to metadata to be allowed
    const transaction = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject(
      {
        from: creatorWallet.addr,
        assetName: createAssetConfig.assetName,
        unitName: createAssetConfig.unitName,
        assetURL: url,
        manager: createAssetConfig.manager,
        reserve: ipfsHashProperties.CIDBase64HashDigest,
        freeze: createAssetConfig.freeze,
        clawback: createAssetConfig.clawback,
        decimals: createAssetConfig.decimals,
        total: createAssetConfig.total,
        suggestedParams,
        defaultFrozen: createAssetConfig.defaultFrozen,
      }
    );
    const txns: SignTxnRequest[] =
      await algoUtil.generateGroupTransactionSigningRequest(
        [transaction],
        [creatorWallet]
      );
    const stxOrStxs = await this.signer.sign(txns);
    const txResponse = await algoUtil.sendRawTransaction(stxOrStxs);

    return txResponse["asset-index"];
  }

  /**
   * Mints an ARC3 compliant NFT Asset, and returns its asset index if successful
   * @param {CreateAssetTransactionConfig} createAssetConfig Create Asset Configuration
   * @param {Arc3Arc19Metadata} options ARC3 Metadata (JSON to be pinned to IPFS)
   * @param {File} file File to be pinned to IPFS
   * @param {string} pinataJWT Pinata JWT
   * @returns {Promise<number>} The minted asset index
   */
  async minterCreateArc3Asset({
    createAssetConfig,
    options,
    file,
    pinningOptions,
  }: {
    createAssetConfig: CreateAssetTransactionConfig;
    options: Arc3Arc19Metadata;
    file: File;
    pinningOptions: TOptions;
  }): Promise<number> {
    const walletId = this.signer.getWalletAddress();
    if (!walletId) {
      throw new Error("Wallet not given");
    }

    const pinataMetadataIPFSHash = await this.getIPFSARC3ARC19MetadataHash(
      options,
      file,
      pinningOptions
    );

    createAssetConfig = setEmptyFieldsAsUndefined(createAssetConfig);

    const url = `ipfs://${pinataMetadataIPFSHash}${ARC3_URL_SUFFIX}`;
    const algoUtil = new AlgorandUtil(this.algoClient);
    const creatorWallet = algoUtil.makeWallet(walletId);
    const suggestedParams = await this.algoClient.getTransactionParams().do();
    // manager must be set for updates to metadata to be allowed
    const transaction = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject(
      {
        from: creatorWallet.addr,
        assetName: createAssetConfig.assetName,
        unitName: createAssetConfig.unitName,
        assetURL: url,
        manager: createAssetConfig.manager,
        reserve: createAssetConfig.reserve,
        freeze: createAssetConfig.freeze,
        clawback: createAssetConfig.clawback,
        decimals: createAssetConfig.decimals,
        total: createAssetConfig.total,
        suggestedParams,
        defaultFrozen: createAssetConfig.defaultFrozen,
      }
    );
    const txns: SignTxnRequest[] =
      await algoUtil.generateGroupTransactionSigningRequest(
        [transaction],
        [creatorWallet]
      );
    const stxOrStxs = await this.signer.sign(txns);
    const txResponse = await algoUtil.sendRawTransaction(stxOrStxs);

    return txResponse["asset-index"];
  }

  /**
   * Configures an existing ARC19 compliant NFT Asset
   * @param {ConfigAsset} assetConfig Config Asset Options (e.g. new name, manager, etc.)
   * @param {Arc3Arc19Metadata} options new ARC19 Metadata (JSON to be pinned to IPFS)
   * @param {File} file File to be pinned to IPFS
   * @param {string} pinataJWT Pinata JWT
   * @returns {Promise<void>}
   */
  async minterConfigArc19Asset({
    assetConfig,
    options,
    file,
    pinningOptions,
  }: {
    assetConfig: ConfigAsset;
    options: Arc3Arc19Metadata;
    file: File;
    pinningOptions: TOptions;
  }) {
    const walletId = this.signer.getWalletAddress();
    if (!walletId) {
      throw new Error("Wallet not given");
    }

    const pinataMetadataIPFSHash = await this.getIPFSARC3ARC19MetadataHash(
      options,
      file,
      pinningOptions
    );

    assetConfig = setEmptyFieldsAsUndefined(assetConfig);

    const suggestedParams: algosdk.SuggestedParams = await this.algoClient
      .getTransactionParams()
      .do();
    const algoUtil = new AlgorandUtil(this.algoClient);
    const creatorWallet = algoUtil.makeWallet(walletId);
    let configObj = {
      suggestedParams,
      ...assetConfig,
    };

    if (pinataMetadataIPFSHash) {
      const ipfsHashProperties = deriveIPFSHashProperties(
        pinataMetadataIPFSHash
      );

      configObj = {
        ...configObj,
        reserve: ipfsHashProperties.CIDBase64HashDigest,
        strictEmptyAddressChecking: false,
      };
    }

    const transaction =
      algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject(configObj);
    const txns: SignTxnRequest[] =
      await algoUtil.generateGroupTransactionSigningRequest(
        [transaction],
        [creatorWallet]
      );

    const stxOrStxs = await this.signer.sign(txns);
    await algoUtil.sendRawTransaction(stxOrStxs);
  }

  /**
   * Configures an existing ARC3 compliant NFT Asset
   * @param {ConfigAsset} assetConfig Config Asset Options (e.g. new name, manager, etc.)
   * @returns {Promise<void>}
   */
  async minterConfigArc3Asset({ assetConfig }: { assetConfig: ConfigAsset }) {
    const walletId = this.signer.getWalletAddress();
    if (!walletId) {
      throw new Error("Wallet not given");
    }

    assetConfig = setEmptyFieldsAsUndefined(assetConfig);
    const suggestedParams: algosdk.SuggestedParams = await this.algoClient
      .getTransactionParams()
      .do();
    let configObj = {
      suggestedParams,
      ...assetConfig,
      strictEmptyAddressChecking: false,
    };
    const algoUtil = new AlgorandUtil(this.algoClient);
    const creatorWallet = algoUtil.makeWallet(walletId);
    const transaction =
      algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject(configObj);
    const txns: SignTxnRequest[] =
      await algoUtil.generateGroupTransactionSigningRequest(
        [transaction],
        [creatorWallet]
      );

    const stxOrStxs = await this.signer.sign(txns);
    await algoUtil.sendRawTransaction(stxOrStxs);
  }

  /**
   * Configures an existing ARC69 compliant NFT Asset
   * @param {ConfigAsset} assetConfig Config Asset Options (e.g. new name, manager, etc.)
   * @param {Arc69Metadata} options new ARC69 Metadata (JSON to be pinned to IPFS)
   * @returns {Promise<void>}
   */
  async minterConfigArc69Asset({
    assetConfig,
    options,
  }: {
    assetConfig: ConfigAsset;
    options: Arc69Metadata;
  }) {
    const walletId = this.signer.getWalletAddress();
    if (!walletId) {
      throw new Error("Wallet not given");
    }

    assetConfig = setEmptyFieldsAsUndefined(assetConfig);
    const algoUtil = new AlgorandUtil(this.algoClient);
    const creatorWallet = algoUtil.makeWallet(walletId);

    const suggestedParams: algosdk.SuggestedParams = await this.algoClient
      .getTransactionParams()
      .do();
    let note: Uint8Array | undefined = undefined;
    try {
      const noteString = JSON.stringify(options);
      note = new Uint8Array(Buffer.from(noteString));
    } catch (e) {
      console.log("error", e);
    }

    let configObj = {
      suggestedParams,
      ...assetConfig,
      note,
      strictEmptyAddressChecking: false,
    };

    const transaction =
      algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject(configObj);
    const txns: SignTxnRequest[] =
      await algoUtil.generateGroupTransactionSigningRequest(
        [transaction],
        [creatorWallet]
      );

    const stxOrStxs = await this.signer.sign(txns);
    await algoUtil.sendRawTransaction(stxOrStxs);
  }
}
