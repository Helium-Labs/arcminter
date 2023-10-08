import { z } from "zod";
import { File } from "buffer";

// The base interface for IPFS pinning services.
export interface AssetMinter<TOptions> {
  pinFileToIPFS(file: File, options?: TOptions): Promise<string>;
  pinJSONToIPFS(json: any, options?: TOptions): Promise<string>;
}

export type image_mimetype =
  | "image/apng"
  | "image/avif"
  | "image/gif"
  | "image/jpeg"
  | "image/png"
  | "image/svg+xml"
  | "image/webp";

export type animation_url_mimetype =
  | "model/gltf-binary"
  | "model/gltf+json"
  | "video/webm"
  | "video/mp4"
  | "video/m4v"
  | "video/ogg"
  | "video/ogv"
  | "audio/mpeg"
  | "audio/mp3"
  | "audio/wav"
  | "audio/ogg"
  | "audio/oga"
  | "application/pdf"
  | "text/html";

export type ImageMediaFields = {
  image: string; // URI pointing to an image file representing the asset
  image_integrity: string; // SHA-256 digest of the image file
  image_mimetype: image_mimetype; // MIME type of the image file
};

export type AnimationMediaFields = {
  animation_url: string; // URI pointing to a multi-media file representing the asset
  animation_url_integrity: string; // SHA-256 digest of the animation_url file
  animation_url_mimetype: animation_url_mimetype; // MIME type of the animation_url file
};

export type Arc69Metadata = {
  // (Required) Describes the standard used.
  standard: "arc69";
  // Describes the asset to which this token represents.
  description?: string;
  // A URI pointing to an external website.
  external_url?: string;
  // A URI pointing to a high resolution version of the asset's media.
  media_url?: string;
  // Properties following the EIP-1155 'simple properties' format.
  properties?: {
    [key: string]: any;
  };
  // Describes the MIME type of the ASA's URL (`au` field).
  mime_type?: image_mimetype | animation_url_mimetype;
  // Media integrity check, which isn't required by the standard but is recommended.
  media_integrity?: string;
  // (Deprecated) Array of attributes, use `properties` instead. Don't use this.
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
    max_value?: number;
    probability?: number;
  }>;
  [key: string]: any;
};

export type Arc3Arc19Metadata = {
  name?: string; // Identifies the asset this token represents
  decimals?: number; // Number of decimal places for the token amount's user representation
  description?: string; // Describes the asset this token represents
  image?: string; // URI pointing to an image file representing the asset
  image_integrity?: string; // SHA-256 digest of the image file
  image_mimetype?: image_mimetype; // MIME type of the image file
  background_color?: string; // Background color to display the asset (hexadecimal without #)
  external_url?: string; // URI pointing to an external website presenting the asset
  external_url_integrity?: string; // SHA-256 digest of the external_url file
  external_url_mimetype?: string; // MIME type of the external_url file (usually 'text/html')
  animation_url?: string; // URI pointing to a multi-media file representing the asset
  animation_url_integrity?: string; // SHA-256 digest of the animation_url file
  animation_url_mimetype?: animation_url_mimetype; // MIME type of the animation_url file
  properties?: {
    [key: string]: string | number | object | any[]; // Arbitrary properties (attributes) of the asset
  };
  extra_metadata?: string; // Extra metadata in base64 format
  localization?: {
    uri: string; // URI pattern to fetch localized data from
    default: string; // Locale of the default data within the base JSON
    locales: string[]; // List of locales for which data is available
    integrity?: {
      [key: string]: string; // SHA-256 digests of localized JSON files (except default one)
    };
  };
  [key: string]: any;
};

export type CreateAssetTransactionConfig = {
  manager: string;
  total: number;
  decimals: number;
  defaultFrozen: boolean;
  unitName: string;
  assetName: string;
  freeze: string;
  clawback: string;
  reserve?: string;
};

export type ConfigAsset = {
  from: string;
  note?: Uint8Array | undefined;
  manager?: string | undefined;
  reserve?: string | undefined;
  freeze?: string | undefined;
  clawback?: string | undefined;
  rekeyTo?: string | undefined;
  assetIndex: number;
  strictEmptyAddressChecking: boolean;
};

export type validJSONKey = string | number | symbol;

export type UniversalARCNFTMetadata = {
  standards: ARCStandard[];
  httpsAnimationUrl?: string;
  httpsImageUrl?: string;
  arc3Metadata?: Arc3Arc19Metadata;
  arc19Metadata?: Arc3Arc19Metadata;
  arc69Metadata?: Arc69Metadata;
  customMetadata?: any;
};

export type GenericNFTMetadata = {
  [key: validJSONKey]: any;
};
export type GenericNFTData = {
  httpsImageUrl?: string;
  httpsAnimationUrl?: string;
  metadata: Arc3Arc19Metadata | ARC69NFTMetadata | any;
};
export type ARC69NFTMetadata = {
  imageUrl: string;
  metadata: any;
};

export enum ARCStandard {
  ARC3 = "ARC3",
  ARC19 = "ARC19",
  ARC69 = "ARC69",
  CUSTOM = "CUSTOM",
}

export type ValidationResult = {
  friendlyErrorMessage?: string;
  isValid: boolean;
};

export const image_mimetypeZod = z.union([
  z.literal("image/apng"),
  z.literal("image/avif"),
  z.literal("image/gif"),
  z.literal("image/jpeg"),
  z.literal("image/png"),
  z.literal("image/svg+xml"),
  z.literal("image/webp"),
]);

export const animation_url_mimetypeZod = z.union([
  z.literal("model/gltf-binary"),
  z.literal("model/gltf+json"),
  z.literal("video/webm"),
  z.literal("video/mp4"),
  z.literal("video/m4v"),
  z.literal("video/ogg"),
  z.literal("video/ogv"),
  z.literal("audio/mpeg"),
  z.literal("audio/mp3"),
  z.literal("audio/wav"),
  z.literal("audio/ogg"),
  z.literal("audio/oga"),
  z.literal("application/pdf"),
  z.literal("text/html"),
]);

export const Arc69MetadataZod = z
  .object({
    standard: z.literal("arc69"),
    description: z.string().optional(),
    external_url: z.string().optional(),
    media_url: z.string().optional(),
    properties: z.record(z.string(), z.any()).optional(),
    mime_type: z
      .union([image_mimetypeZod, animation_url_mimetypeZod])
      .optional(),
    media_integrity: z.string().optional(),
    attributes: z
      .array(
        z.object({
          trait_type: z.string(),
          value: z.union([z.string(), z.number()]),
          display_type: z.string().optional(),
          max_value: z.number().optional(),
          probability: z.number().optional(),
        })
      )
      .optional(),
  })
  .catchall(z.unknown());
