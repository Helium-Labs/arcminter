# Gradian Arcminter

Gradian Arcminter is a utility for minting and configuring ARC 3, 19, and 69 compliant non-fungible digital assets (NFTs) on the Algorand blockchain with support for a wide range of media types. The IPFS pinning service is dependency injected, and is generic. So far IPFS pinning clients are available for NFTStorage and Pinata. It's primarily for browser use, however is also compatible with Node through polyfilling shims. ESM and CJS modules are provided in the built version. 

⭐ Stars ⭐ and contributions are highly appreciated.

## Installation

```bash
npm install @gradian/arcminter
```

## Features

- Mint and configure ARC 3, 19, and 69 compliant NFTs and register them on the Algorand blockchain's public ledger.
- Utilizes IPFS for decentralized file storage. Provides clients for Pinata and NFTStorage IPFS pinning services.
- Transactions are signed with WalletConnect. Eventually the signer will be abstracted into a generic class to permit a wider range of signing options.

## Usage

Example given below shows the process of minting an ARC3 digital asset, which should be similar for other types of asset. The code is thoroughly documented and typed for ease of use, and should be intuitive to follow.

```typescript
import AssetMinter from "@gradian/arcminter";
import { PinataPinOptions, PinataIPFSClient } from "@gradian/arcminter/api/types";

// Values is an object, for example representing form fields
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

// Create an instance of your preferred pinning service
const pinata = new PinataIPFSClient("your_jwt");

// inject the pinning service as a dependency into the arc minter
// walletConnectConnector is a connector object from Wallet Connect, which is used for signing transactions
const assetMinter = new AssetMinter(this.algoClient, pinata, walletConnectConnector)
// Create options that are specific to the pinning service, and provide to the pinned file when minting
const pinataOptions: PinataPinOptions = {
    pinataOptions: {
    cidVersion: 1,
    },
    pinataMetadata: {
    name: "Untitled",
    },
};

// Mint the asset, with the index returned if successful. The provided walletConnect connector is the creator and is used for signing the asset creation transaction.
const mintedAssetIndex = await assetMinter.minterCreateArc3Asset(
    createAssetConfig,
    options,
    file,
    pinataOptions
)
```

## ARC3, ARC19, and ARC69 Algorand Request for Comment Standards

ARC, short for Algorand Request for Comments, establishes standards outlining the characteristics of assets and operations on the Algorand blockchain. These standards provide developers with a uniform approach to develop on the Algorand blockchain. For a comprehensive understanding of each parameter provided to the ARC minter, kindly refer to the respective standards for each type of Non-Fungible Digital Asset:

- [ARC3 Digital Assets](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md)
- [ARC19 Digital Assets](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0019.md)
- [ARC69 Digital Assets](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0069.md)

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.


This `README.md` provides a comprehensive overview of the `@gradian/arcminter` package, showcasing its capabilities and features in an organized manner. The actual `README.md` might be extended with more examples, a detailed API reference, or a contribution guide.

## Disclaimer

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

By using this software, you acknowledge and agree that the authors and contributors of this software are not responsible or liable, directly or indirectly, for any damage or loss caused, or alleged to be caused, by or in connection with the use of or reliance on this software. This includes, but is not limited to, any bugs, errors, defects, failures, or omissions in the software or its documentation. Additionally, the authors are not responsible for any security vulnerabilities or potential breaches that may arise from the use of this software.

You are solely responsible for the risks associated with using this software and should take any necessary precautions before utilizing it in any production or critical systems. It's strongly recommended to review the software thoroughly and test its functionalities in a controlled environment before any broader application.
