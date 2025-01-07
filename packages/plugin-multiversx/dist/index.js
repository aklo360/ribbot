var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../node_modules/@jspm/core/nodelibs/browser/process.js
var process_exports = {};
__export(process_exports, {
  _debugEnd: () => _debugEnd,
  _debugProcess: () => _debugProcess,
  _events: () => _events,
  _eventsCount: () => _eventsCount,
  _exiting: () => _exiting,
  _fatalExceptions: () => _fatalExceptions,
  _getActiveHandles: () => _getActiveHandles,
  _getActiveRequests: () => _getActiveRequests,
  _kill: () => _kill,
  _linkedBinding: () => _linkedBinding,
  _maxListeners: () => _maxListeners,
  _preload_modules: () => _preload_modules,
  _rawDebug: () => _rawDebug,
  _startProfilerIdleNotifier: () => _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier: () => _stopProfilerIdleNotifier,
  _tickCallback: () => _tickCallback,
  abort: () => abort,
  addListener: () => addListener,
  allowedNodeEnvironmentFlags: () => allowedNodeEnvironmentFlags,
  arch: () => arch,
  argv: () => argv,
  argv0: () => argv0,
  assert: () => assert,
  binding: () => binding,
  browser: () => browser,
  chdir: () => chdir,
  config: () => config,
  cpuUsage: () => cpuUsage,
  cwd: () => cwd,
  debugPort: () => debugPort,
  default: () => process,
  dlopen: () => dlopen,
  domain: () => domain,
  emit: () => emit,
  emitWarning: () => emitWarning,
  env: () => env,
  execArgv: () => execArgv,
  execPath: () => execPath,
  exit: () => exit,
  features: () => features,
  hasUncaughtExceptionCaptureCallback: () => hasUncaughtExceptionCaptureCallback,
  hrtime: () => hrtime,
  kill: () => kill,
  listeners: () => listeners,
  memoryUsage: () => memoryUsage,
  moduleLoadList: () => moduleLoadList,
  nextTick: () => nextTick,
  off: () => off,
  on: () => on,
  once: () => once,
  openStdin: () => openStdin,
  pid: () => pid,
  platform: () => platform,
  ppid: () => ppid,
  prependListener: () => prependListener,
  prependOnceListener: () => prependOnceListener,
  reallyExit: () => reallyExit,
  release: () => release,
  removeAllListeners: () => removeAllListeners,
  removeListener: () => removeListener,
  resourceUsage: () => resourceUsage,
  setSourceMapsEnabled: () => setSourceMapsEnabled,
  setUncaughtExceptionCaptureCallback: () => setUncaughtExceptionCaptureCallback,
  stderr: () => stderr,
  stdin: () => stdin,
  stdout: () => stdout,
  title: () => title,
  umask: () => umask,
  uptime: () => uptime,
  version: () => version,
  versions: () => versions
});
function unimplemented(name) {
  throw new Error("Node.js process " + name + " is not supported by JSPM core outside of Node.js");
}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;
function cleanUpNextTick() {
  if (!draining || !currentQueue)
    return;
  draining = false;
  if (currentQueue.length) {
    queue = currentQueue.concat(queue);
  } else {
    queueIndex = -1;
  }
  if (queue.length)
    drainQueue();
}
function drainQueue() {
  if (draining)
    return;
  var timeout = setTimeout(cleanUpNextTick, 0);
  draining = true;
  var len = queue.length;
  while (len) {
    currentQueue = queue;
    queue = [];
    while (++queueIndex < len) {
      if (currentQueue)
        currentQueue[queueIndex].run();
    }
    queueIndex = -1;
    len = queue.length;
  }
  currentQueue = null;
  draining = false;
  clearTimeout(timeout);
}
function nextTick(fun) {
  var args = new Array(arguments.length - 1);
  if (arguments.length > 1) {
    for (var i = 1; i < arguments.length; i++)
      args[i - 1] = arguments[i];
  }
  queue.push(new Item(fun, args));
  if (queue.length === 1 && !draining)
    setTimeout(drainQueue, 0);
}
function Item(fun, array) {
  this.fun = fun;
  this.array = array;
}
Item.prototype.run = function() {
  this.fun.apply(null, this.array);
};
var title = "browser";
var arch = "x64";
var platform = "browser";
var env = {
  PATH: "/usr/bin",
  LANG: typeof navigator !== "undefined" ? navigator.language + ".UTF-8" : void 0,
  PWD: "/",
  HOME: "/home",
  TMP: "/tmp"
};
var argv = ["/usr/bin/node"];
var execArgv = [];
var version = "v16.8.0";
var versions = {};
var emitWarning = function(message, type) {
  console.warn((type ? type + ": " : "") + message);
};
var binding = function(name) {
  unimplemented("binding");
};
var umask = function(mask) {
  return 0;
};
var cwd = function() {
  return "/";
};
var chdir = function(dir) {
};
var release = {
  name: "node",
  sourceUrl: "",
  headersUrl: "",
  libUrl: ""
};
function noop() {
}
var browser = true;
var _rawDebug = noop;
var moduleLoadList = [];
function _linkedBinding(name) {
  unimplemented("_linkedBinding");
}
var domain = {};
var _exiting = false;
var config = {};
function dlopen(name) {
  unimplemented("dlopen");
}
function _getActiveRequests() {
  return [];
}
function _getActiveHandles() {
  return [];
}
var reallyExit = noop;
var _kill = noop;
var cpuUsage = function() {
  return {};
};
var resourceUsage = cpuUsage;
var memoryUsage = cpuUsage;
var kill = noop;
var exit = noop;
var openStdin = noop;
var allowedNodeEnvironmentFlags = {};
function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion error");
}
var features = {
  inspector: false,
  debug: false,
  uv: false,
  ipv6: false,
  tls_alpn: false,
  tls_sni: false,
  tls_ocsp: false,
  tls: false,
  cached_builtins: true
};
var _fatalExceptions = noop;
var setUncaughtExceptionCaptureCallback = noop;
function hasUncaughtExceptionCaptureCallback() {
  return false;
}
var _tickCallback = noop;
var _debugProcess = noop;
var _debugEnd = noop;
var _startProfilerIdleNotifier = noop;
var _stopProfilerIdleNotifier = noop;
var stdout = void 0;
var stderr = void 0;
var stdin = void 0;
var abort = noop;
var pid = 2;
var ppid = 1;
var execPath = "/bin/usr/node";
var debugPort = 9229;
var argv0 = "node";
var _preload_modules = [];
var setSourceMapsEnabled = noop;
var _performance = {
  now: typeof performance !== "undefined" ? performance.now.bind(performance) : void 0,
  timing: typeof performance !== "undefined" ? performance.timing : void 0
};
if (_performance.now === void 0) {
  nowOffset = Date.now();
  if (_performance.timing && _performance.timing.navigationStart) {
    nowOffset = _performance.timing.navigationStart;
  }
  _performance.now = () => Date.now() - nowOffset;
}
var nowOffset;
function uptime() {
  return _performance.now() / 1e3;
}
var nanoPerSec = 1e9;
function hrtime(previousTimestamp) {
  var baseNow = Math.floor((Date.now() - _performance.now()) * 1e-3);
  var clocktime = _performance.now() * 1e-3;
  var seconds = Math.floor(clocktime) + baseNow;
  var nanoseconds = Math.floor(clocktime % 1 * 1e9);
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds < 0) {
      seconds--;
      nanoseconds += nanoPerSec;
    }
  }
  return [seconds, nanoseconds];
}
hrtime.bigint = function(time) {
  var diff = hrtime(time);
  if (typeof BigInt === "undefined") {
    return diff[0] * nanoPerSec + diff[1];
  }
  return BigInt(diff[0] * nanoPerSec) + BigInt(diff[1]);
};
var _maxListeners = 10;
var _events = {};
var _eventsCount = 0;
function on() {
  return process;
}
var addListener = on;
var once = on;
var off = on;
var removeListener = on;
var removeAllListeners = on;
var emit = noop;
var prependListener = on;
var prependOnceListener = on;
function listeners(name) {
  return [];
}
var process = {
  version,
  versions,
  arch,
  platform,
  browser,
  release,
  _rawDebug,
  moduleLoadList,
  binding,
  _linkedBinding,
  _events,
  _eventsCount,
  _maxListeners,
  on,
  addListener,
  once,
  off,
  removeListener,
  removeAllListeners,
  emit,
  prependListener,
  prependOnceListener,
  listeners,
  domain,
  _exiting,
  config,
  dlopen,
  uptime,
  _getActiveRequests,
  _getActiveHandles,
  reallyExit,
  _kill,
  cpuUsage,
  resourceUsage,
  memoryUsage,
  kill,
  exit,
  openStdin,
  allowedNodeEnvironmentFlags,
  assert,
  features,
  _fatalExceptions,
  setUncaughtExceptionCaptureCallback,
  hasUncaughtExceptionCaptureCallback,
  emitWarning,
  nextTick,
  _tickCallback,
  _debugProcess,
  _debugEnd,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  stdout,
  stdin,
  stderr,
  abort,
  umask,
  chdir,
  cwd,
  env,
  title,
  argv,
  execArgv,
  pid,
  ppid,
  execPath,
  debugPort,
  hrtime,
  argv0,
  _preload_modules,
  setSourceMapsEnabled
};

// src/actions/transfer.ts
import {
  elizaLogger as elizaLogger2,
  ModelClass,
  composeContext,
  generateObject
} from "@elizaos/core";

// src/providers/wallet.ts
import { elizaLogger } from "@elizaos/core";
import {
  UserSigner,
  Address,
  TransactionComputer,
  ApiNetworkProvider,
  UserSecretKey,
  TokenTransfer,
  TransferTransactionsFactory,
  TransactionsFactoryConfig,
  Token,
  TokenManagementTransactionsFactory
} from "@multiversx/sdk-core";

// src/utils/amount.ts
import BigNumber from "bignumber.js";
BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_FLOOR });
var denominateAmount = ({ amount, decimals }) => {
  return new BigNumber(amount).shiftedBy(decimals).decimalPlaces(0).toFixed(0);
};

// src/providers/wallet.ts
var MVX_NETWORK_CONFIG = {
  mainnet: {
    chainID: "1",
    // Mainnet chain ID
    apiURL: "https://api.multiversx.com",
    // Mainnet API URL
    explorerURL: "https://explorer.multiversx.com"
  },
  devnet: {
    chainID: "D",
    // Devnet chain ID
    apiURL: "https://devnet-api.multiversx.com",
    // Devnet API URL,
    explorerURL: "https://devnet-explorer.multiversx.com"
  },
  testnet: {
    chainID: "T",
    // Testnet chain ID
    apiURL: "https://testnet-api.multiversx.com",
    // Testnet API URL
    explorerURL: "https://testnet-explorer.multiversx.com"
  }
};
var WalletProvider = class {
  signer;
  // Handles cryptographic signing
  apiNetworkProvider;
  // Interacts with the MultiversX network
  chainID;
  // Current network chain ID
  explorerURL;
  // Current network explorer URL
  /**
   * Constructor to initialize WalletProvider with a private key and network configuration
   * @param privateKey - User's private key for signing transactions
   * @param network - Target network (mainnet, devnet, or testnet)
   */
  constructor(privateKey, network) {
    if (!MVX_NETWORK_CONFIG[network]) {
      throw new Error(`Unsupported network: ${network}`);
    }
    const networkConfig = MVX_NETWORK_CONFIG[network];
    this.chainID = networkConfig.chainID;
    this.explorerURL = networkConfig.explorerURL;
    const secretKey = UserSecretKey.fromString(privateKey);
    this.signer = new UserSigner(secretKey);
    this.apiNetworkProvider = new ApiNetworkProvider(networkConfig.apiURL, {
      clientName: "eliza-mvx"
    });
  }
  /**
   * Retrieve the wallet address derived from the private key
   * @returns Address object
   */
  getAddress() {
    return this.signer.getAddress();
  }
  /**
   * Fetch the wallet's current EGLD balance
   * @returns Promise resolving to the wallet's balance as a string
   */
  async getBalance() {
    const address = new Address(this.getAddress());
    const account = await this.apiNetworkProvider.getAccount(address);
    return account.balance.toString();
  }
  /**
   * Sign a transaction using the wallet's private key
   * @param transaction - The transaction object to sign
   * @returns The transaction signature as a string
   */
  async signTransaction(transaction) {
    const computer = new TransactionComputer();
    const serializedTx = computer.computeBytesForSigning(transaction);
    const signature = await this.signer.sign(serializedTx);
    return signature;
  }
  /**
   * Send EGLD tokens to another wallet
   * @param receiverAddress - Recipient's wallet address
   * @param amount - Amount of EGLD to send
   * @returns Transaction hash as a string
   */
  async sendEGLD({
    receiverAddress,
    amount
  }) {
    try {
      const receiver = new Address(receiverAddress);
      const value = denominateAmount({ amount, decimals: 18 });
      const senderAddress = this.getAddress();
      const factoryConfig = new TransactionsFactoryConfig({
        chainID: this.chainID
      });
      const factory = new TransferTransactionsFactory({
        config: factoryConfig
      });
      const transaction = factory.createTransactionForNativeTokenTransfer(
        {
          sender: this.getAddress(),
          receiver,
          nativeAmount: BigInt(value)
        }
      );
      const account = await this.apiNetworkProvider.getAccount(senderAddress);
      transaction.nonce = BigInt(account.nonce);
      const signature = await this.signTransaction(transaction);
      transaction.signature = signature;
      const txHash = await this.apiNetworkProvider.sendTransaction(transaction);
      elizaLogger.log(`TxHash: ${txHash}`);
      elizaLogger.log(
        `Transaction URL: ${this.explorerURL}/transactions/${txHash}`
      );
      return txHash;
    } catch (error) {
      console.error("Error sending EGLD transaction:", error);
      throw new Error(
        `Failed to send EGLD: ${error.message || "Unknown error"}`
      );
    }
  }
  /**
   * Send ESDT (eStandard Digital Token) tokens to another wallet
   * @param receiverAddress - Recipient's wallet address
   * @param amount - Amount of ESDT to send
   * @param identifier - ESDT token identifier (e.g., PEPE-3eca7c)
   * @returns Transaction hash as a string
   */
  async sendESDT({
    receiverAddress,
    amount,
    identifier
  }) {
    try {
      const address = this.getAddress();
      const config2 = new TransactionsFactoryConfig({
        chainID: this.chainID
      });
      const factory = new TransferTransactionsFactory({ config: config2 });
      const token = await this.apiNetworkProvider.getFungibleTokenOfAccount(
        address,
        identifier
      );
      const value = denominateAmount({
        amount,
        decimals: token.rawResponse.decimals
      });
      const transaction = factory.createTransactionForESDTTokenTransfer({
        sender: this.getAddress(),
        receiver: new Address(receiverAddress),
        tokenTransfers: [
          new TokenTransfer({
            token: new Token({ identifier }),
            amount: BigInt(value)
          })
        ]
      });
      const account = await this.apiNetworkProvider.getAccount(address);
      transaction.nonce = BigInt(account.nonce);
      const signature = await this.signTransaction(transaction);
      transaction.signature = signature;
      const txHash = await this.apiNetworkProvider.sendTransaction(transaction);
      elizaLogger.log(`TxHash: ${txHash}`);
      elizaLogger.log(
        `Transaction URL: ${this.explorerURL}/transactions/${txHash}`
      );
      return txHash;
    } catch (error) {
      console.error("Error sending ESDT transaction:", error);
      throw new Error(
        `Failed to send ESDT: ${error.message || "Unknown error"}`
      );
    }
  }
  /**
   * Create a new eStandard Digital Token (ESDT).
   * @param tokenName - The name of the token to be created.
   * @param tokenTicker - The ticker symbol for the token.
   * @param amount - The initial supply of the token.
   * @param decimals - The number of decimal places for the token.
   * @returns The transaction hash of the created ESDT.
   */
  async createESDT({
    tokenName,
    tokenTicker,
    amount,
    decimals
  }) {
    try {
      const address = this.getAddress();
      const factoryConfig = new TransactionsFactoryConfig({
        chainID: this.chainID
        // Set the chain ID for the transaction factory
      });
      const factory = new TokenManagementTransactionsFactory({
        config: factoryConfig
        // Initialize the factory with the configuration
      });
      const totalSupply = denominateAmount({ amount, decimals });
      const transaction = factory.createTransactionForIssuingFungible({
        sender: new Address(address),
        // Specify the sender's address
        tokenName,
        // Name of the token
        tokenTicker: tokenTicker.toUpperCase(),
        // Token ticker in uppercase
        initialSupply: BigInt(totalSupply),
        // Initial supply as a BigInt
        numDecimals: BigInt(decimals),
        // Number of decimals as a BigInt
        canFreeze: false,
        // Token cannot be frozen
        canWipe: false,
        // Token cannot be wiped
        canPause: false,
        // Token cannot be paused
        canChangeOwner: true,
        // Ownership can be changed
        canUpgrade: true,
        // Token can be upgraded
        canAddSpecialRoles: true
        // Special roles can be added
      });
      const account = await this.apiNetworkProvider.getAccount(address);
      transaction.nonce = BigInt(account.nonce);
      const signature = await this.signTransaction(transaction);
      transaction.signature = signature;
      const txHash = await this.apiNetworkProvider.sendTransaction(transaction);
      elizaLogger.log(`TxHash: ${txHash}`);
      elizaLogger.log(
        `Transaction URL: ${this.explorerURL}/transactions/${txHash}`
      );
      return txHash;
    } catch (error) {
      console.error("Error creating ESDT:", error);
      throw new Error(
        `Failed to create ESDT: ${error.message || "Unknown error"}`
      );
    }
  }
};

// src/enviroment.ts
import { z } from "zod";
var multiversxEnvSchema = z.object({
  MVX_PRIVATE_KEY: z.string().min(1, "MultiversX wallet private key is required"),
  MVX_NETWORK: z.enum(["mainnet", "devnet", "testnet"])
});
async function validateMultiversxConfig(runtime) {
  try {
    const config2 = {
      MVX_PRIVATE_KEY: runtime.getSetting("MVX_PRIVATE_KEY") || process_exports.env.MVX_PRIVATE_KEY,
      MVX_NETWORK: runtime.getSetting("MVX_NETWORK") || process_exports.env.MVX_NETWORK
    };
    return multiversxEnvSchema.parse(config2);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n");
      throw new Error(
        `MultiversX configuration validation failed:
${errorMessages}`
      );
    }
    throw error;
  }
}

// src/actions/transfer.ts
function isTransferContent(_runtime, content) {
  console.log("Content for transfer", content);
  return typeof content.tokenAddress === "string" && typeof content.amount === "string";
}
var transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tokenAddress": "erd12r22hx2q4jjt8e0gukxt5shxqjp9ys5nwdtz0gpds25zf8qwtjdqyzfgzm",
    "amount": "1",
    "tokenIdentifier": "PEPE-3eca7c"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Token address
- Amount to transfer
- Token identifier

Respond with a JSON markdown block containing only the extracted values.`;
var transfer_default = {
  name: "SEND_TOKEN",
  similes: [
    "TRANSFER_TOKEN",
    "TRANSFER_TOKENS",
    "SEND_TOKENS",
    "SEND_EGLD",
    "PAY"
  ],
  validate: async (runtime, message) => {
    console.log("Validating config for user:", message.userId);
    await validateMultiversxConfig(runtime);
    return true;
  },
  description: "Transfer tokens from the agent wallet to another address",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger2.log("Starting SEND_TOKEN handler...");
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const transferContext = composeContext({
      state,
      template: transferTemplate
    });
    const content = await generateObject({
      runtime,
      context: transferContext,
      modelClass: ModelClass.SMALL
    });
    if (!isTransferContent(runtime, content)) {
      console.error("Invalid content for TRANSFER_TOKEN action.");
      if (callback) {
        callback({
          text: "Unable to process transfer request. Invalid content provided.",
          content: { error: "Invalid transfer content" }
        });
      }
      return false;
    }
    try {
      const privateKey = runtime.getSetting("MVX_PRIVATE_KEY");
      const network = runtime.getSetting("MVX_NETWORK");
      const walletProvider = new WalletProvider(privateKey, network);
      if (content.tokenIdentifier && content.tokenIdentifier.toLowerCase() !== "egld") {
        await walletProvider.sendESDT({
          receiverAddress: content.tokenAddress,
          amount: content.amount,
          identifier: content.tokenIdentifier
        });
        return true;
      }
      await walletProvider.sendEGLD({
        receiverAddress: content.tokenAddress,
        amount: content.amount
      });
      return true;
    } catch (error) {
      console.error("Error during token transfer:", error);
      if (callback) {
        callback({
          text: `Error transferring tokens: ${error.message}`,
          content: { error: error.message }
        });
      }
      return "";
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send 1 EGLD to erd12r22hx2q4jjt8e0gukxt5shxqjp9ys5nwdtz0gpds25zf8qwtjdqyzfgzm"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll send 1 EGLD tokens now...",
          action: "SEND_TOKEN"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send 1 TST-a8b23d to erd12r22hx2q4jjt8e0gukxt5shxqjp9ys5nwdtz0gpds25zf8qwtjdqyzfgzm"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll send 1 TST-a8b23d tokens now...",
          action: "SEND_TOKEN"
        }
      }
    ]
  ]
};

// src/actions/createToken.ts
import {
  elizaLogger as elizaLogger3,
  ModelClass as ModelClass2,
  generateObject as generateObject2,
  composeContext as composeContext2
} from "@elizaos/core";
function isCreateTokenContent(runtime, content) {
  console.log("Content for create token", content);
  return content.tokenName && content.tokenTicker && content.amount;
}
var createTokenTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tokenName": "TEST",
    "tokenTicker": "TST",
    "amount: 100,
    "decimals": 18
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token creation:
- Token name
- Token ticker
- Amount
- Decimals

Respond with a JSON markdown block containing only the extracted values.`;
var createToken_default = {
  name: "CREATE_TOKEN",
  similes: ["DEPLOY_TOKEN"],
  validate: async (runtime, message) => {
    console.log("Validating config for user:", message.userId);
    await validateMultiversxConfig(runtime);
    return true;
  },
  description: "Create a new token.",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger3.log("Starting CREATE_TOKEN handler...");
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const transferContext = composeContext2({
      state,
      template: createTokenTemplate
    });
    const content = await generateObject2({
      runtime,
      context: transferContext,
      modelClass: ModelClass2.SMALL
    });
    if (!isCreateTokenContent(runtime, content)) {
      console.error("Invalid content for TRANSFER_TOKEN action.");
      if (callback) {
        callback({
          text: "Unable to process transfer request. Invalid content provided.",
          content: { error: "Invalid transfer content" }
        });
      }
      return false;
    }
    try {
      const privateKey = runtime.getSetting("MVX_PRIVATE_KEY");
      const network = runtime.getSetting("MVX_NETWORK");
      const walletProvider = new WalletProvider(privateKey, network);
      await walletProvider.createESDT({
        tokenName: content.tokenName,
        amount: content.amount,
        decimals: Number(content.decimals) || 18,
        tokenTicker: content.tokenTicker
      });
      return true;
    } catch (error) {
      console.error("Error during creating token:", error);
      if (callback) {
        callback({
          text: `Error creating token: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Create a token XTREME with ticker XTR and supply of 10000",
          action: "CREATE_TOKEN"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Succesfully created token."
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Create a token TEST with ticker TST, 18 decimals and supply of 10000",
          action: "CREATE_TOKEN"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Succesfully created token."
        }
      }
    ]
  ]
};

// src/index.ts
var multiversxPlugin = {
  name: "multiversx",
  description: "MultiversX Plugin for Eliza",
  actions: [transfer_default, createToken_default],
  evaluators: [],
  providers: []
};
var index_default = multiversxPlugin;
export {
  index_default as default,
  multiversxPlugin
};
//# sourceMappingURL=index.js.map