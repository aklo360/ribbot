export function solscanTransactionUrl(
    signature?: string | null
): string | undefined {
    const normalized = signature?.trim();
    return normalized
        ? `https://solscan.io/tx/${encodeURIComponent(normalized)}`
        : undefined;
}

export function solscanTransactionLine(
    signature?: string | null,
    label = "Solscan"
): string | undefined {
    const url = solscanTransactionUrl(signature);
    return url ? `${label}: ${url}` : undefined;
}

export function solscanTransactionLines(
    signatures: Array<string | null | undefined>
): string[] {
    const unique = [
        ...new Set(
            signatures
                .map((signature) => signature?.trim())
                .filter((signature): signature is string => Boolean(signature))
        ),
    ];
    return unique.map(
        (signature, index) =>
            solscanTransactionLine(
                signature,
                unique.length > 1 ? `Solscan ${index + 1}` : "Solscan"
            ) as string
    );
}
