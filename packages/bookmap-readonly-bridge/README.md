# Ribbot Bookmap Read-Only Bridge

This Bookmap Layer 1 Simplified API add-on writes a bounded market snapshot to one local JSON file. It has no order, position, balance, wallet, signer, HTTP, or socket interface.

## Output

Default file:

```text
~/Library/Application Support/Bookmap/Exports/ribbot-bridge/snapshot.json
```

The file is replaced atomically every 250 ms. It contains:

- instrument metadata and Bookmap event time;
- best bid and ask, midpoint, and spread;
- 25 price levels per side, top-level depth totals, and imbalance;
- full-book liquidity aggregated into adaptive price bands within 10% of midpoint;
- the 10 strongest bid and ask bands, distance, side share, and continuous persistence;
- last trade and aggressor side;
- 60-second buy and sell volume, flow delta, and session CVD.

Set the `ribbot.bookmap.exportDir` Java property or `RIBBOT_BOOKMAP_EXPORT_DIR` environment variable before Bookmap starts to use another directory.

## Build and test

The compiler is JDK 21 because the installed Bookmap 7.8.0 API jars use Java 21 bytecode. The add-on output still targets Java 17 for Bookmap entry-point compatibility.

```bash
env JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH \
  ./gradlew clean check jar
```

Output:

```text
build/libs/ribbot-bookmap-read-only-bridge.jar
```

## Load

1. In Bookmap, open **Settings → Configure add-ons**.
2. Select **Add** and choose the built JAR.
3. Enable **Ribbot Bookmap Read-Only Bridge**.
4. Open a live crypto instrument. The free Bookmap crypto feed is sufficient.

The add-on is not marked for unrestricted paid-market data export. This is intentional.

## API contract

- `DepthDataListener`: absolute depth size updates.
- `BboListener`: current best bid and ask.
- `TradeDataListener`: executed trade and aggressor side.
- `TimeListener`: exchange event timestamp in nanoseconds.
- Bookmap real price: price level multiplied by `pips`.
- Bookmap real size: size level divided by `sizeMultiplier`.

The JAR targets Java 17 bytecode and compiles offline against `/Applications/Bookmap.app/Contents/app/lib`.

Official references:

- https://github.com/BookmapAPI/DemoStrategies
- https://github.com/BookmapAPI/addon-development-guide
- https://javadoc.bookmap.com/maven2/releases/com/bookmap/api/api-simplified/7.8.0.13/index.html
