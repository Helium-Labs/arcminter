# Arcminter

Arcminter is a utility for creating and configuring ARC 3, 19, and 69 compliant digital assets stored on Algorand, with support for a wide range of media types. Multiple signing and IPFS pinning options are available.

## Installation

```bash
npm install @gradian/arcminter
```

## Features

- Create and configure ARC 3, 19, and 69 compliant digital assets stored on Algorand.
- Supports Pinata and NFTStorage IPFS pinning services.
- Authenticate transactions with WalletConnect, or X25519 keys.

## Usage

```typescript
import { NFTAssetMinter } from "@gradian/arcminter";
import { PinataPinOptions, PinataIPFSClient } from "@gradian/arcminter/api/types";
import { Signer } from '@gradian/util';

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

// Create a WalletConnectSigner, for signing transactions using the specified WalletConnect connector instance (connected wallet) with the 'sign' function.
// 'algoClient' is an algorand client (AlgodV2 instance)
const walletConnectSigner: Signer.WalletConnectSigner = new Signer.WalletConnectSigner(algoClient, walletConnect.connector)

// inject the pinning service and signer as dependencies into the minter
const nftAssetMinter = new NFTAssetMinter(algoClient, pinata, walletConnectSigner)

// Create options that are specific to the pinning service, and provide to the pinned file when minting
const pinataOptions: PinataPinOptions = {
    pinataOptions: {
    cidVersion: 1,
    },
    pinataMetadata: {
    name: "Untitled",
    },
};

// Mint the asset
const mintedAssetIndex = await nftAssetMinter.minterCreateArc3Asset(
    createAssetConfig,
    options,
    file,
    pinataOptions
)
```

## ARC3, ARC19, and ARC69 Algorand Request for Comment Standards

- [ARC3 Digital Assets](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md)
- [ARC19 Digital Assets](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0019.md)
- [ARC69 Digital Assets](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0069.md)

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Disclaimer

This software is intended for educational purposes, and is not intended to faciliate any illegal activity. You assume all responsibility in using the open source software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

By using this software, you acknowledge and agree that the authors and contributors of this software are not responsible or liable, directly or indirectly, for any damage or loss caused, or alleged to be caused, by or in connection with the use of or reliance on this software. This includes, but is not limited to, any bugs, errors, defects, failures, or omissions in the software or its documentation. Additionally, the authors are not responsible for any security vulnerabilities or potential breaches that may arise from the use of this software.

You are solely responsible for the risks associated with using this software and should take any necessary precautions before utilizing it in any production or critical systems. It's strongly recommended to review the software thoroughly and test its functionalities in a controlled environment before any broader application.
