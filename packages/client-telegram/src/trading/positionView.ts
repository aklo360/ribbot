export const POSITION_PAGE_SIZE = 5;

export type PositionPage<T> = {
    items: T[];
    page: number;
    totalPages: number;
    totalItems: number;
    startIndex: number;
};

export function buildPositionPage<
    T extends { amount: string; hidden: boolean },
>(
    tokens: T[],
    requestedPage = 0,
    pageSize = POSITION_PAGE_SIZE
): PositionPage<T> {
    const safePageSize = Math.max(1, Math.floor(pageSize));
    const visible = tokens.filter(
        (token) => !token.hidden && isPositiveIntegerString(token.amount)
    );
    const totalPages = Math.max(1, Math.ceil(visible.length / safePageSize));
    const page = Math.min(
        Math.max(
            0,
            Math.floor(Number.isFinite(requestedPage) ? requestedPage : 0)
        ),
        totalPages - 1
    );
    const startIndex = page * safePageSize;

    return {
        items: visible.slice(startIndex, startIndex + safePageSize),
        page,
        totalPages,
        totalItems: visible.length,
        startIndex,
    };
}

export function parsePositionPageIndex(value?: string): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function positionCallbackData(mint: string, page: number): string {
    return `ribbot:position:${mint}:${Math.max(0, Math.floor(page))}`;
}

export function positionVisibilityCallbackData(
    mint: string,
    page: number,
    visibility: "hide" | "show"
): string {
    return `ribbot:pv:${mint}:${Math.max(0, Math.floor(page))}:${visibility}`;
}

function isPositiveIntegerString(value: string): boolean {
    if (!/^\d+$/.test(value)) return false;
    try {
        return BigInt(value) > 0n;
    } catch {
        return false;
    }
}
