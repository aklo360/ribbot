import { ICacheManager, IAgentRuntime, Memory, State, HandlerCallback, Plugin } from '@elizaos/core';
import { WalletContractV4, TonClient } from '@ton/ton';
import { KeyPair } from '@ton/crypto';

interface Prices {
    nativeToken: {
        usd: string;
    };
}
declare class WalletProvider {
    private endpoint;
    private cacheManager;
    keypair: KeyPair;
    wallet: WalletContractV4;
    private cache;
    private cacheKey;
    constructor(keypair: KeyPair, endpoint: string, cacheManager: ICacheManager);
    private readFromCache;
    private writeToCache;
    private getCachedData;
    private setCachedData;
    private fetchPricesWithRetry;
    fetchPrices(): Promise<Prices>;
    private formatPortfolio;
    private fetchPortfolioValue;
    getFormattedPortfolio(runtime: IAgentRuntime): Promise<string>;
    getAddress(): string;
    getWalletClient(): TonClient;
    getWalletBalance(): Promise<bigint | null>;
}

declare const _default: {
    name: string;
    similes: string[];
    description: string;
    handler: (runtime: IAgentRuntime, message: Memory, state: State, options: any, callback?: HandlerCallback) => Promise<boolean>;
    template: string;
    validate: (runtime: IAgentRuntime) => Promise<boolean>;
    examples: ({
        user: string;
        content: {
            text: string;
            action: string;
        };
    } | {
        user: string;
        content: {
            text: string;
            action?: undefined;
        };
    })[][];
};

declare const tonPlugin: Plugin;

export { _default as TransferTonToken, WalletProvider, tonPlugin as default, tonPlugin };
