# Gradian Arcminter

Gradian Arcminter is a utility designed to mint ARC 3, 19, and 69 compliant non-fungible digital assets (commonly referred to as NFTs) on the Algorand blockchain, accommodating a variety of media types. While it is primarily tailored for browsers and supports the ESM module, it can also compile to CJS and is compatible with Node.

⭐ Stars ⭐ and contributions are highly appreciated.

## Installation

```bash
npm install @gradian/arcminter
```

## Features

- Capability to create ARC 3, 19, and 69 compliant NFTs and register them on the Algorand blockchain's public ledger.
- Utilizes IPFS for decentralized file storage and currently depends on Pinata, a service dedicated to pinning files to IPFS. Subsequent versions may offer the use of a general IPFS pinning service, ensuring pinning service idempotence.
- Seamless wallet integration for transaction signatures via WalletConnect, supplied as an injected dependency during ARC Minter instantiation.
- Offers utility functions designed for extracting and managing NFT metadata.

## Usage

Below is a demonstration for minting an ARC3 digital asset. However, the procedure for ARC19 and ARC69 is analogous. The code is thoroughly documented for clarity.

```typescript
// Instantiate the Minter, providing both algoClient and WalletConnect connector.
const assetCreator = new NFTAssetMinter(algoClient, walletConnect.connector)

// 'values' represents an object, possibly corresponding to form fields.
const createAssetConfig: CreateAssetTransactionConfig = {
    assetName: values.assetName,
    unitName: values.unitName,
    total: values.quantity,
    decimals: values.decimals,
    defaultFrozen: values.defaultFrozen,
    manager: values.managerAddress,
    freeze: values.freezeAddress,
    clawback: values.clawbackAddress,
    reserve: values.reserveAddress
}
const file: File = values.files[0]

// JSON metadata set to be pinned to IPFS (through Pinata), aiming for idempotence in future versions.
const options: Arc3Arc19Metadata = {
    description: values.description,
    name: values.assetName,
    external_url: 'https://test',
    properties: JSON.parse(values.metadataJson),
    network: 'testnet' as 'testnet' | 'mainnet'
}

// Mint the asset. If successful, the index is returned. The provided walletConnect connector acts as the creator and is utilized for the asset creation transaction signature.
const mintedAssetIndex = await assetCreator.minterCreateArc3Asset({
    createAssetConfig,
    options,
    file,
    pinataJWT,
    isMainnet: network.getIsMainnet()
})
```

## ARC3, ARC19, and ARC69 Algorand Request for Comment Standards

ARC, short for Algorand Request for Comments, establishes standards outlining the characteristics of assets and operations on the Algorand blockchain. These standards provide developers with a uniform approach to develop on the Algorand blockchain. For a comprehensive understanding of each parameter provided to the ARC minter, kindly refer to the respective standards for each type of Non-Fungible Digital Asset:

- [ARC3 Digital Assets](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md)
- [ARC19 Digital Assets](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0019.md)
- [ARC69 Digital Assets](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0069.md)

## Disclaimer

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

By using this software, you acknowledge and agree that the authors and contributors of this software are not responsible or liable, directly or indirectly, for any damage or loss caused, or alleged to be caused, by or in connection with the use of or reliance on this software. This includes, but is not limited to, any bugs, errors, defects, failures, or omissions in the software or its documentation. Additionally, the authors are not responsible for any security vulnerabilities or potential breaches that may arise from the use of this software.

You are solely responsible for the risks associated with using this software and should take any necessary precautions before utilizing it in any production or critical systems. It's strongly recommended to review the software thoroughly and test its functionalities in a controlled environment before any broader application.
