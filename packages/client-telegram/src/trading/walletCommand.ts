const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type WalletCommandIntent = {
    kind: "wallet";
    address?: string;
    selection?: number;
};

export function parseWalletCommand(args: string[]): WalletCommandIntent {
    const selection =
        args[0]?.toLowerCase() === "select" ? Number(args[1]) : NaN;
    return {
        kind: "wallet",
        address: args.find((value) => SOLANA_ADDRESS_PATTERN.test(value)),
        selection:
            Number.isInteger(selection) && selection > 0
                ? selection
                : undefined,
    };
}
