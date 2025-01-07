// src/index.ts
import {
  elizaLogger as elizaLogger4
} from "@elizaos/core";

// src/handlers/createCollection.ts
import {
  composeContext,
  elizaLogger as elizaLogger2,
  generateImage,
  getEmbeddingZeroVector,
  ServiceType,
  stringToUuid
} from "@elizaos/core";
import {
  saveBase64Image,
  saveHeuristImage
} from "@elizaos/plugin-image-generation";
import { PublicKey as PublicKey2 } from "@solana/web3.js";

// src/provider/wallet/walletSolana.ts
import NodeCache from "node-cache";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  createNft,
  findMetadataPda,
  mplTokenMetadata,
  updateV1,
  verifyCollectionV1
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey,
  TransactionBuilder
} from "@metaplex-foundation/umi";
import { getExplorerLink } from "@solana-developers/helpers";
import bs58 from "bs58";
import { elizaLogger } from "@elizaos/core";
var WalletSolana = class {
  constructor(walletPublicKey, walletPrivateKeyKey, connection) {
    this.walletPublicKey = walletPublicKey;
    this.walletPrivateKeyKey = walletPrivateKeyKey;
    this.connection = connection;
    this.cache = new NodeCache({ stdTTL: 300 });
    if (!connection) {
      this.cluster = process.env.SOLANA_CLUSTER || "devnet";
      this.connection = new Connection(clusterApiUrl(this.cluster), {
        commitment: "finalized"
      });
    }
    const umi = createUmi(this.connection.rpcEndpoint);
    umi.use(mplTokenMetadata());
    const umiUser = umi.eddsa.createKeypairFromSecretKey(
      this.privateKeyUint8Array
    );
    umi.use(keypairIdentity(umiUser));
    this.umi = umi;
  }
  cache;
  umi;
  cluster;
  async getBalance() {
    const balance = await this.connection.getBalance(this.walletPublicKey);
    return {
      value: balance,
      formater: `${balance / LAMPORTS_PER_SOL} SOL`
    };
  }
  get privateKeyUint8Array() {
    return bs58.decode(this.walletPrivateKeyKey);
  }
  async createCollection({
    name,
    symbol,
    adminPublicKey,
    uri,
    fee
  }) {
    try {
      const collectionMint = generateSigner(this.umi);
      let transaction = new TransactionBuilder();
      const info = {
        name,
        symbol,
        uri
      };
      transaction = transaction.add(
        createNft(this.umi, {
          ...info,
          mint: collectionMint,
          sellerFeeBasisPoints: percentAmount(fee),
          isCollection: true
        })
      );
      transaction = transaction.add(
        updateV1(this.umi, {
          mint: collectionMint.publicKey,
          newUpdateAuthority: publicKey(adminPublicKey)
          // updateAuthority's public key
        })
      );
      await transaction.sendAndConfirm(this.umi, {
        confirm: {}
      });
      const address = collectionMint.publicKey;
      return {
        success: true,
        link: getExplorerLink("address", address, this.cluster),
        address,
        error: null
      };
    } catch (e) {
      return {
        success: false,
        link: "",
        address: "",
        error: e.message
      };
    }
  }
  async mintNFT({
    collectionAddress,
    adminPublicKey,
    name,
    symbol,
    uri,
    fee
  }) {
    try {
      const umi = this.umi;
      const mint = generateSigner(umi);
      let transaction = new TransactionBuilder();
      elizaLogger.log("collection address", collectionAddress);
      const collectionAddressKey = publicKey(collectionAddress);
      const info = {
        name,
        uri,
        symbol
      };
      transaction = transaction.add(
        createNft(umi, {
          mint,
          ...info,
          sellerFeeBasisPoints: percentAmount(fee),
          collection: {
            key: collectionAddressKey,
            verified: false
          }
        })
      );
      transaction = transaction.add(
        updateV1(umi, {
          mint: mint.publicKey,
          newUpdateAuthority: publicKey(adminPublicKey)
          // updateAuthority's public key
        })
      );
      await transaction.sendAndConfirm(umi);
      const address = mint.publicKey;
      return {
        success: true,
        link: getExplorerLink("address", address, this.cluster),
        address,
        error: null
      };
    } catch (e) {
      return {
        success: false,
        link: "",
        address: "",
        error: e.message
      };
    }
  }
  async verifyNft({
    collectionAddress,
    nftAddress
  }) {
    try {
      const umi = this.umi;
      const collectionAddressKey = publicKey(collectionAddress);
      const nftAddressKey = publicKey(nftAddress);
      let transaction = new TransactionBuilder();
      transaction = transaction.add(
        verifyCollectionV1(umi, {
          metadata: findMetadataPda(umi, { mint: nftAddressKey }),
          collectionMint: collectionAddressKey,
          authority: umi.identity
        })
      );
      await transaction.sendAndConfirm(umi);
      elizaLogger.log(
        `\u2705 NFT ${nftAddress} verified as member of collection ${collectionAddress}! See Explorer at ${getExplorerLink(
          "address",
          nftAddress,
          this.cluster
        )}`
      );
      return {
        isVerified: true,
        error: null
      };
    } catch (e) {
      return {
        isVerified: false,
        error: e.message
      };
    }
  }
};
var walletSolana_default = WalletSolana;

// src/handlers/createCollection.ts
var collectionImageTemplate = `
Generate a logo with the text "{{collectionName}}", using orange as the main color, with a sci-fi and mysterious background theme
`;
async function createCollection({
  runtime,
  collectionName,
  fee
}) {
  const userId = runtime.agentId;
  elizaLogger2.log("User ID:", userId);
  const awsS3Service = runtime.getService(ServiceType.AWS_S3);
  const agentName = runtime.character.name;
  const roomId = stringToUuid("nft_generate_room-" + agentName);
  const memory = {
    agentId: userId,
    userId,
    roomId,
    content: {
      text: "",
      source: "nft-generator"
    },
    createdAt: Date.now(),
    embedding: getEmbeddingZeroVector()
  };
  const state = await runtime.composeState(memory, {
    collectionName
  });
  const prompt = composeContext({
    state,
    template: collectionImageTemplate
  });
  const images = await generateImage(
    {
      prompt,
      width: 300,
      height: 300
    },
    runtime
  );
  if (images.success && images.data && images.data.length > 0) {
    const image = images.data[0];
    const filename = `collection-image`;
    if (image.startsWith("http")) {
      elizaLogger2.log("Generating image url:", image);
    }
    const filepath = image.startsWith("http") ? await saveHeuristImage(image, filename) : saveBase64Image(image, filename);
    const logoPath = await awsS3Service.uploadFile(
      filepath,
      `/${collectionName}`,
      false
    );
    const publicKey2 = runtime.getSetting("SOLANA_PUBLIC_KEY");
    const privateKey = runtime.getSetting("SOLANA_PRIVATE_KEY");
    const adminPublicKey = runtime.getSetting("SOLANA_ADMIN_PUBLIC_KEY");
    const collectionInfo = {
      name: `${collectionName}`,
      symbol: `${collectionName.toUpperCase()[0]}`,
      adminPublicKey,
      fee: fee || 0,
      uri: ""
    };
    const jsonFilePath = await awsS3Service.uploadJson(
      {
        name: collectionInfo.name,
        description: `${collectionInfo.name}`,
        image: logoPath.url
      },
      "metadata.json",
      `${collectionName}`
    );
    collectionInfo.uri = jsonFilePath.url;
    const wallet = new walletSolana_default(new PublicKey2(publicKey2), privateKey);
    const collectionAddressRes = await wallet.createCollection({
      ...collectionInfo
    });
    return {
      network: "solana",
      address: collectionAddressRes.address,
      link: collectionAddressRes.link,
      collectionInfo
    };
  }
  return;
}

// src/handlers/createNFT.ts
import {
  composeContext as composeContext2,
  elizaLogger as elizaLogger3,
  generateImage as generateImage2,
  generateText,
  getEmbeddingZeroVector as getEmbeddingZeroVector2,
  ModelClass,
  ServiceType as ServiceType2,
  stringToUuid as stringToUuid2
} from "@elizaos/core";
import {
  saveBase64Image as saveBase64Image2,
  saveHeuristImage as saveHeuristImage2
} from "@elizaos/plugin-image-generation";
import { PublicKey as PublicKey3 } from "@solana/web3.js";
var nftTemplate = `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}
# Task: Generate an image to Prompt the  {{agentName}}'s appearance, with the total character count MUST be less than 280.
`;
async function createNFTMetadata({
  runtime,
  collectionName,
  collectionAdminPublicKey,
  collectionFee,
  tokenId
}) {
  const userId = runtime.agentId;
  elizaLogger3.log("User ID:", userId);
  const awsS3Service = runtime.getService(ServiceType2.AWS_S3);
  const agentName = runtime.character.name;
  const roomId = stringToUuid2("nft_generate_room-" + agentName);
  const memory = {
    agentId: userId,
    userId,
    roomId,
    content: {
      text: "",
      source: "nft-generator"
    },
    createdAt: Date.now(),
    embedding: getEmbeddingZeroVector2()
  };
  const state = await runtime.composeState(memory, {
    collectionName
  });
  const context = composeContext2({
    state,
    template: nftTemplate
  });
  let nftPrompt = await generateText({
    runtime,
    context,
    modelClass: ModelClass.MEDIUM
  });
  nftPrompt += runtime.character?.nft?.prompt || "";
  nftPrompt += "The image should only feature one person.";
  const images = await generateImage2(
    {
      prompt: nftPrompt,
      width: 1024,
      height: 1024
    },
    runtime
  );
  elizaLogger3.log("NFT Prompt:", nftPrompt);
  if (images.success && images.data && images.data.length > 0) {
    const image = images.data[0];
    const filename = `${tokenId}`;
    if (image.startsWith("http")) {
      elizaLogger3.log("Generating image url:", image);
    }
    const filepath = image.startsWith("http") ? await saveHeuristImage2(image, filename) : saveBase64Image2(image, filename);
    const nftImage = await awsS3Service.uploadFile(
      filepath,
      `/${collectionName}/items/${tokenId}`,
      false
    );
    const nftInfo = {
      name: `${collectionName} #${tokenId}`,
      description: `${collectionName} #${tokenId}`,
      symbol: `#${tokenId}`,
      adminPublicKey: collectionAdminPublicKey,
      fee: collectionFee,
      uri: ""
    };
    const jsonFilePath = await awsS3Service.uploadJson(
      {
        name: nftInfo.name,
        description: nftInfo.description,
        image: nftImage.url
      },
      "metadata.json",
      `/${collectionName}/items/${tokenId}`
    );
    nftInfo.uri = jsonFilePath.url;
    return {
      ...nftInfo,
      imageUri: nftImage.url
    };
  }
  return null;
}
async function createNFT({
  runtime,
  collectionName,
  collectionAddress,
  collectionAdminPublicKey,
  collectionFee,
  tokenId
}) {
  const nftInfo = await createNFTMetadata({
    runtime,
    collectionName,
    collectionAdminPublicKey,
    collectionFee,
    tokenId
  });
  if (nftInfo) {
    const publicKey2 = runtime.getSetting("SOLANA_PUBLIC_KEY");
    const privateKey = runtime.getSetting("SOLANA_PRIVATE_KEY");
    const wallet = new walletSolana_default(new PublicKey3(publicKey2), privateKey);
    const nftAddressRes = await wallet.mintNFT({
      name: nftInfo.name,
      uri: nftInfo.uri,
      symbol: nftInfo.symbol,
      collectionAddress,
      adminPublicKey: collectionAdminPublicKey,
      fee: collectionFee
    });
    elizaLogger3.log("NFT ID:", nftAddressRes.address);
    return {
      network: "solana",
      address: nftAddressRes.address,
      link: nftAddressRes.link,
      nftInfo
    };
  }
  return;
}

// src/handlers/verifyNFT.ts
import { PublicKey as PublicKey4 } from "@solana/web3.js";
async function verifyNFT({
  runtime,
  collectionAddress,
  NFTAddress
}) {
  const adminPublicKey = runtime.getSetting("SOLANA_ADMIN_PUBLIC_KEY");
  const adminPrivateKey = runtime.getSetting("SOLANA_ADMIN_PRIVATE_KEY");
  const adminWallet = new walletSolana_default(
    new PublicKey4(adminPublicKey),
    adminPrivateKey
  );
  await adminWallet.verifyNft({
    collectionAddress,
    nftAddress: NFTAddress
  });
  return {
    success: true
  };
}

// src/api.ts
import express from "express";
function createNFTApiRouter(agents) {
  const router = express.Router();
  router.post(
    "/api/nft-generation/create-collection",
    async (req, res) => {
      const agentId = req.body.agentId;
      const fee = req.body.fee || 0;
      const runtime = agents.get(agentId);
      if (!runtime) {
        res.status(404).send("Agent not found");
        return;
      }
      try {
        const collectionAddressRes = await createCollection({
          runtime,
          collectionName: runtime.character.name,
          fee
        });
        res.json({
          success: true,
          data: collectionAddressRes
        });
      } catch (e) {
        console.log(e);
        res.json({
          success: false,
          data: JSON.stringify(e)
        });
      }
    }
  );
  router.post(
    "/api/nft-generation/create-nft-metadata",
    async (req, res) => {
      const agentId = req.body.agentId;
      const collectionName = req.body.collectionName;
      const collectionAddress = req.body.collectionAddress;
      const collectionAdminPublicKey = req.body.collectionAdminPublicKey;
      const collectionFee = req.body.collectionFee;
      const tokenId = req.body.tokenId;
      const runtime = agents.get(agentId);
      if (!runtime) {
        res.status(404).send("Agent not found");
        return;
      }
      try {
        const nftInfo = await createNFTMetadata({
          runtime,
          collectionName,
          collectionAdminPublicKey,
          collectionFee,
          tokenId
        });
        res.json({
          success: true,
          data: {
            ...nftInfo,
            collectionAddress
          }
        });
      } catch (e) {
        console.log(e);
        res.json({
          success: false,
          data: JSON.stringify(e)
        });
      }
    }
  );
  router.post(
    "/api/nft-generation/create-nft",
    async (req, res) => {
      const agentId = req.body.agentId;
      const collectionName = req.body.collectionName;
      const collectionAddress = req.body.collectionAddress;
      const collectionAdminPublicKey = req.body.collectionAdminPublicKey;
      const collectionFee = req.body.collectionFee;
      const tokenId = req.body.tokenId;
      const runtime = agents.get(agentId);
      if (!runtime) {
        res.status(404).send("Agent not found");
        return;
      }
      try {
        const nftRes = await createNFT({
          runtime,
          collectionName,
          collectionAddress,
          collectionAdminPublicKey,
          collectionFee,
          tokenId
        });
        res.json({
          success: true,
          data: nftRes
        });
      } catch (e) {
        console.log(e);
        res.json({
          success: false,
          data: JSON.stringify(e)
        });
      }
    }
  );
  router.post(
    "/api/nft-generation/verify-nft",
    async (req, res) => {
      const agentId = req.body.agentId;
      const collectionAddress = req.body.collectionAddress;
      const NFTAddress = req.body.nftAddress;
      const token = req.body.token;
      const runtime = agents.get(agentId);
      if (!runtime) {
        res.status(404).send("Agent not found");
        return;
      }
      const verifyToken = runtime.getSetting("SOLANA_VERIFY_TOKEN");
      if (token !== verifyToken) {
        res.status(401).send(" Access denied for translation");
        return;
      }
      try {
        const { success } = await verifyNFT({
          runtime,
          collectionAddress,
          NFTAddress
        });
        res.json({
          success: true,
          data: success ? "verified" : "unverified"
        });
      } catch (e) {
        console.log(e);
        res.json({
          success: false,
          data: JSON.stringify(e)
        });
      }
    }
  );
  return router;
}

// src/index.ts
async function sleep(ms = 3e3) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
var nftCollectionGeneration = {
  name: "GENERATE_COLLECTION",
  similes: [
    "COLLECTION_GENERATION",
    "COLLECTION_GEN",
    "CREATE_COLLECTION",
    "MAKE_COLLECTION",
    "GENERATE_COLLECTION"
  ],
  description: "Generate an NFT collection for the message",
  validate: async (runtime, _message) => {
    const AwsAccessKeyIdOk = !!runtime.getSetting("AWS_ACCESS_KEY_ID");
    const AwsSecretAccessKeyOk = !!runtime.getSetting(
      "AWS_SECRET_ACCESS_KEY"
    );
    const AwsRegionOk = !!runtime.getSetting("AWS_REGION");
    const AwsS3BucketOk = !!runtime.getSetting("AWS_S3_BUCKET");
    return AwsAccessKeyIdOk || AwsSecretAccessKeyOk || AwsRegionOk || AwsS3BucketOk;
  },
  handler: async (runtime, message, state, options, callback) => {
    try {
      elizaLogger4.log("Composing state for message:", message);
      const userId = runtime.agentId;
      elizaLogger4.log("User ID:", userId);
      const collectionAddressRes = await createCollection({
        runtime,
        collectionName: runtime.character.name
      });
      const collectionInfo = collectionAddressRes.collectionInfo;
      elizaLogger4.log("Collection Address:", collectionAddressRes);
      const nftRes = await createNFT({
        runtime,
        collectionName: collectionInfo.name,
        collectionAddress: collectionAddressRes.address,
        collectionAdminPublicKey: collectionInfo.adminPublicKey,
        collectionFee: collectionInfo.fee,
        tokenId: 1
      });
      elizaLogger4.log("NFT Address:", nftRes);
      callback({
        text: `Congratulations to you! \u{1F389}\u{1F389}\u{1F389} 
Collection : ${collectionAddressRes.link}
 NFT: ${nftRes.link}`,
        //caption.description,
        attachments: []
      });
      await sleep(15e3);
      await verifyNFT({
        runtime,
        collectionAddress: collectionAddressRes.address,
        NFTAddress: nftRes.address
      });
      return [];
    } catch (e) {
      console.log(e);
    }
  },
  examples: [
    // TODO: We want to generate images in more abstract ways, not just when asked to generate an image
    [
      {
        user: "{{user1}}",
        content: { text: "Generate a collection" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here's the collection you requested.",
          action: "GENERATE_COLLECTION"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Generate a collection using {{agentName}}" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "We've successfully created a collection.",
          action: "GENERATE_COLLECTION"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Create a collection using {{agentName}}" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here's the collection you requested.",
          action: "GENERATE_COLLECTION"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Build a Collection" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "The collection has been successfully built.",
          action: "GENERATE_COLLECTION"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Assemble a collection with {{agentName}}" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "The collection has been assembled",
          action: "GENERATE_COLLECTION"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Make a collection" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "The collection has been produced successfully.",
          action: "GENERATE_COLLECTION"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Compile a collection" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "The collection has been compiled.",
          action: "GENERATE_COLLECTION"
        }
      }
    ]
  ]
};
var nftGenerationPlugin = {
  name: "nftCollectionGeneration",
  description: "Generate NFT Collections",
  actions: [nftCollectionGeneration],
  evaluators: [],
  providers: []
};
export {
  WalletSolana,
  createNFTApiRouter,
  nftGenerationPlugin,
  sleep
};
//# sourceMappingURL=index.js.map