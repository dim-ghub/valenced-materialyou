# dim's Valenced plugins

| Plugin | What it does |
| --- | --- |
| [Material You](#material-you) | Colors Discord with your Android Material You palette |
| [Material You Expressive](#material-you-expressive) | Restyles Discord's components after Material 3 Expressive |
| [TapTap](#taptap) | Double tap your own message to edit it, or someone else's to reply |

## Material You Expressive

Restyles Discord's own design components after Material 3 Expressive, on top of whatever color
theme is active. Pair it with the Material You theme and the System font pack.

- Rounder corners everywhere Discord uses its shared corner sizes
- Pill buttons
- Settings and action sheet lists split into segments with large outer and small inner corners
- M3 switches and radio buttons
- Section titles in the accent color
- Row icons in tonal circles, red for destructive rows
- M3 Expressive slider with a tall handle and a stop at the end

Restart Discord after turning it on or off.

## TapTap

A port of Aliucord's TapTap. Double tap one of your messages to start editing it, or anyone else's
to reply to them. Ephemeral and system messages are skipped.

The native half (`plugins/taptap/src`) watches touches on Discord's message views and spots double
taps; the JS half starts the edit or the reply with Discord's own actions.

# Material You

A [Valenced](https://github.com/Valenced/valenced) theme that colors Discord with your Android
**Material You** palette, the one generated from your wallpaper or picked in *Wallpaper & style*.

It's automatic: change your wallpaper or system colors, come back to Discord, and the theme follows.

## Themes

Both appear under **Material You** in Valenced's theme picker:

| Theme | Surfaces |
| --- | --- |
| **Material You** | Neutral surfaces, accent colors from your palette (closest to stock Material 3) |
| **Material You (Tinted)** | Surfaces tinted with your accent, like Android's own settings app |

It also comes with packs you pick separately, all under **Material You**:

| Pack | What it does |
| --- | --- |
| **System** emoji | Swaps Discord's emoji for your phone's own emoji font |
| **System** font | Swaps gg sans for your phone's font |
| **Material Symbols** icons | Swaps Discord's icons for the closest [Material Symbols](https://fonts.google.com/icons) (Rounded) |

Each theme works with every Discord appearance: **Light**, **Dark**, **Darker** and **Midnight** (AMOLED black).

Requires **Android 12 or later**. Older versions have no system palette, so the theme keeps Discord's colors.

## How it works

The theme has two halves:

- **Native** (`themes/material-you/src/main`): a small Kotlin plugin registers
  `dim.material-you.getPalettes`, which reads the five system tonal palettes
  (`system_accent1/2/3_*`, `system_neutral1/2_*`) from Android's resources.
- **JS** (`themes/material-you/js/index.ts`): registers the themes with the Themes API and builds colors:
  - Discord's raw palette is **re-toned**: every `PRIMARY_*`/`NEUTRAL_*` color is replaced by the system
    neutral color of the same lightness, and every `BRAND_*` color by the system accent of the same
    lightness. Anything derived from them follows along.
  - Backgrounds come entirely from that re-toning, so they keep Discord's own light/dark levels and
    anything that matches in stock Discord still matches.
  - Text, icons, borders, buttons, links and mentions are set to
    [Material 3 color roles](https://m3.material.io/styles/color/roles) for each Discord appearance.
  - When Discord returns to the foreground, the palettes are read again. If they changed, the theme
    re-applies itself.

## Install

1. Build the ZIP (see below), or download it from the **Build** workflow's artifacts.
2. Copy `build/dist/dim.material-you@<version>.zip` to your phone and install it in
   **Settings > Valenced > Plugins**, or serve it with `bun run serve` and add it as a repository.
3. Make sure **Themes API** and **Themes** are enabled, then pick **Material You** in the theme picker.

## Build

This repository is based on the [Valenced plugin template](https://github.com/Valenced/valenced-plugin-template),
so the same prerequisites apply: JDK 25+, the Android SDK (platform 36 and build-tools), Bun or Node,
and a GitHub token with `read:packages` in `~/.gradle/gradle.properties`:

```properties
GitHubPackagesUsername=YOUR_GITHUB_USERNAME
GitHubPackagesPassword=YOUR_PERSONAL_ACCESS_TOKEN
```

```sh
bun install
./gradlew packageMaterialYou   # -> build/dist/dim.material-you@1.0.0.zip
```

For CI, add the same token as the `READ_PACKAGES_TOKEN` repository secret.

## Icons

`themes/material-you/icons.json` maps Discord icon names to Material Symbols names: a symbol name,
`{"symbol": ..., "fill": 1, "color": "#rrggbb"}` for the filled style or an icon Discord
doesn't tint, or `null` for an empty image. Names Discord
doesn't have are ignored. After editing it, re-render the PNGs (needs Pillow):

```sh
python3 scripts/render-icons.py "path/to/MaterialSymbolsRounded[FILL,GRAD,opsz,wght].ttf"
```

The font and its `.codepoints` file are in
[google/material-design-icons](https://github.com/google/material-design-icons/tree/master/variablefont).
Material Symbols are licensed under Apache 2.0, see `themes/material-you/assets/icons/LICENSE`.

## Tweaking

The token-to-role mapping lives in `SemanticRoles` in `js/index.ts`. Token names that don't exist in your Discord version are ignored, so
adding names is safe.
