import sharp from "sharp";

export const FROG_CONTACT_SHEET_PAGE_SIZE = 12;

const GRID_WIDTH = 900;
const GRID_HEIGHT = 1200;
const GRID_COLUMNS = 3;
const GRID_PADDING_X = 20;
const GRID_PADDING_Y = 25;
const TILE_GAP = 10;
const TILE_SIZE = 280;
const LABEL_HEIGHT = 44;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 8_000;

export type FrogContactSheetItem = {
    label: string;
    image?: string | null;
};

export async function buildFrogContactSheet(
    items: FrogContactSheetItem[]
): Promise<Buffer> {
    const visibleItems = items.slice(0, FROG_CONTACT_SHEET_PAGE_SIZE);
    const tiles = await Promise.all(
        visibleItems.map(async (item, index) => {
            const column = index % GRID_COLUMNS;
            const row = Math.floor(index / GRID_COLUMNS);
            const left = GRID_PADDING_X + column * (TILE_SIZE + TILE_GAP);
            const top = GRID_PADDING_Y + row * (TILE_SIZE + TILE_GAP);
            const image = item.image
                ? await renderFrogImage(item.image).catch(() => undefined)
                : undefined;

            return [
                ...(image ? [{ input: image, left, top }] : []),
                {
                    input: labelOverlay(item.label),
                    left,
                    top: top + TILE_SIZE - LABEL_HEIGHT,
                },
            ];
        })
    );

    return sharp({
        create: {
            width: GRID_WIDTH,
            height: GRID_HEIGHT,
            channels: 4,
            background: "#0c1713",
        },
    })
        .composite([
            ...visibleItems.map((_, index) => {
                const column = index % GRID_COLUMNS;
                const row = Math.floor(index / GRID_COLUMNS);
                return {
                    input: {
                        create: {
                            width: TILE_SIZE,
                            height: TILE_SIZE,
                            channels: 4 as const,
                            background: "#183128",
                        },
                    },
                    left: GRID_PADDING_X + column * (TILE_SIZE + TILE_GAP),
                    top: GRID_PADDING_Y + row * (TILE_SIZE + TILE_GAP),
                };
            }),
            ...tiles.flat(),
        ])
        .png({ compressionLevel: 9, palette: true, quality: 90 })
        .toBuffer();
}

async function renderFrogImage(imageUrl: string): Promise<Buffer> {
    const url = new URL(imageUrl);
    if (url.protocol !== "https:") {
        throw new Error("Unsupported Frog image protocol");
    }

    const response = await fetch(url, {
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
        headers: { Accept: "image/*" },
    });
    if (!response.ok) {
        throw new Error(`Frog image request failed (${response.status})`);
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
        throw new Error("Frog image is too large");
    }

    const input = await readBoundedResponse(response, MAX_IMAGE_BYTES);
    return sharp(input, { limitInputPixels: 25_000_000 })
        .resize(TILE_SIZE, TILE_SIZE - LABEL_HEIGHT, {
            fit: "cover",
            kernel: sharp.kernel.nearest,
        })
        .png()
        .toBuffer();
}

async function readBoundedResponse(
    response: Response,
    maximumBytes: number
): Promise<Buffer> {
    if (!response.body) throw new Error("Frog image response was empty");

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maximumBytes) {
            await reader.cancel();
            throw new Error("Frog image is too large");
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks, totalBytes);
}

function labelOverlay(label: string): Buffer {
    const safeLabel = label.replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&apos;",
        };
        return entities[character];
    });
    return Buffer.from(`
        <svg width="${TILE_SIZE}" height="${LABEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#0c1713" fill-opacity="0.94"/>
            <text x="50%" y="30" text-anchor="middle" fill="#f4f7f5" font-family="Arial, sans-serif" font-size="26" font-weight="700">${safeLabel}</text>
        </svg>
    `);
}
