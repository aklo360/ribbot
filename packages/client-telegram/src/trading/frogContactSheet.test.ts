import sharp from "sharp";
import { afterEach, expect, it, vi } from "vitest";

import {
    buildFrogContactSheet,
    FROG_CONTACT_SHEET_PAGE_SIZE,
} from "./frogContactSheet.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
});

it("renders a bounded 3 by 4 Frog contact sheet", async () => {
    const sourceImage = await sharp({
        create: {
            width: 4,
            height: 4,
            channels: 3,
            background: "#00ff00",
        },
    })
        .png()
        .toBuffer();
    globalThis.fetch = vi.fn(
        async () =>
            new Response(sourceImage, {
                status: 200,
                headers: {
                    "content-type": "image/png",
                    "content-length": String(sourceImage.byteLength),
                },
            })
    );

    const contactSheet = await buildFrogContactSheet([
        { label: "#3960", image: "https://images.example/frog.png" },
        ...Array.from(
            { length: FROG_CONTACT_SHEET_PAGE_SIZE - 1 },
            (_, index) => ({ label: `#${index + 4000}`, image: null })
        ),
    ]);
    const metadata = await sharp(contactSheet).metadata();
    const { data, info } = await sharp(contactSheet)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const pixelOffset = (100 * info.width + 100) * info.channels;

    expect(metadata).toMatchObject({
        format: "png",
        width: 900,
        height: 1200,
    });
    expect([...data.subarray(pixelOffset, pixelOffset + 3)]).toEqual([
        0, 255, 0,
    ]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});

it("uses a placeholder when an NFT image cannot be loaded", async () => {
    globalThis.fetch = vi.fn(async () => {
        throw new Error("network unavailable");
    });

    await expect(
        buildFrogContactSheet([
            { label: "#3960", image: "https://images.example/missing.png" },
        ])
    ).resolves.toBeInstanceOf(Buffer);
});
