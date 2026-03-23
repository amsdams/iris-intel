# Ingress UI Colour Theme Reference

> Reference document for AI-assisted development of Ingress-themed interfaces.
> All hex values are community-documented approximations. In-app rendering includes glow/bloom effects on a near-black map background.

---

## 1. Faction Colours

The four primary faction/portal ownership states. Used for portals, links, control fields, resonators, and all faction-identifying UI elements.

| Faction | Hex | RGB | Notes |
|---|---|---|---|
| Enlightened | `#03DC03` | rgb(3, 220, 3) | Vivid lime green |
| Resistance | `#0088FF` | rgb(0, 136, 255) | Bright blue; alt `#0078B5` in some assets |
| Machina | `#FF1010` | rgb(255, 16, 16) | Bright red (NPC faction) |
| Neutral | `#C0C0C0` | rgb(192, 192, 192) | Uncaptured portals |

---

## 2. Resonator & Agent Level Colours

Levels 1–8 define the resonator colour palette. The same spectrum is reused for agent levels 1–8 and again for 9–16 (second cycle). Also applies to XMP Bursters and Ultra Strikes of the same level.

| Level | Hex | Colour name |
|---|---|---|
| L1 / L9 | `#FECE5A` | Yellow |
| L2 / L10 | `#FFA630` | Orange |
| L3 / L11 | `#FF7315` | Dark orange |
| L4 / L12 | `#E80000` | Red |
| L5 / L13 | `#FF0099` | Hot pink |
| L6 / L14 | `#EE26CD` | Magenta |
| L7 / L15 | `#C124E0` | Purple |
| L8 / L16 | `#9627F4` | Dark violet |

> The resonator body and its connecting beam to the portal both render in the level colour.

---

## 3. Mod Rarity Colours

Every mod (portal shield, heat sink, multi-hack, link amp, force amp, turret) displays a rarity indicator: three diagonal slashes where lit slashes indicate rarity tier.

| Rarity | Hex | Slashes lit | Notes |
|---|---|---|---|
| Common | `#565656` | 1 | Dark grey |
| Rare | `#1566E6` | 2 | Blue |
| Very Rare | `#EF7B03` | 3 | Orange |
| Aegis (special) | `#00D4AA` | — | Cyan-green; Aegis Shield only |

---

## 4. Mod Type Icon Colours

Each mod type uses a distinct background tint on its icon in the portal mod slots. Rarity slash colour overlays the type colour — type is read from icon shape, rarity from slash colour.

| Mod type | Hex | Notes |
|---|---|---|
| Portal Shield | `#0099CC` | Cyan-blue |
| Force Amp | `#FF3300` | Red-orange |
| Turret | `#FFCC00` | Gold |
| Heat Sink | `#FF6600` | Orange |
| Multi-Hack | `#33CC33` | Green |
| Link Amp | `#0099CC` | Similar to Shield; distinguished by shape |
| SoftBank Ultra Link | `#003399` | Dark blue |

---

## 5. Links and Control Fields

Links and fields inherit the owning faction's primary colour but are rendered at reduced opacity over the dark map.

| Element | Base colour | Opacity | Notes |
|---|---|---|---|
| Enlightened link | `#03DC03` | ~100% stroke, ~15% fill | Thin line between portals |
| Resistance link | `#0088FF` | ~100% stroke, ~15% fill | |
| Machina link | `#FF1010` | ~100% stroke, ~15% fill | |
| Control field (any faction) | Faction colour | ~25% fill | Filled triangle over the map |

---

## 6. Medal / Badge Tier Colours

Used on achievement medal borders and the level-up progress ring in the agent profile.

| Tier | Hex | Required for levels |
|---|---|---|
| Bronze | `#CD7F32` | Not required for level-ups |
| Silver | `#C0C0C0` | L9–L10 |
| Gold | `#FFD700` | L11–L13 |
| Platinum | `#E5E4E2` | L14–L16 |
| Onyx (Black) | `#1A1A1A` | L16 (highest tier) |

---

## 7. Scanner UI & Map Colours

General UI elements in the Ingress Prime scanner.

| Element | Hex | Notes |
|---|---|---|
| Map background | `#1A1A1A` | Near-black; all other colours glow against this |
| XM particles | `#FFFF00` | Bright yellow dots on the map floor |
| Agent avatar / action ring | `#FFD700` | Gold ring around the player dot |
| AP bar | `#00BFFF` | Deep sky blue progress bar |
| Health / XM bar (full) | `#00FF88` | Bright teal-green |
| Health / XM bar (low) | `#FF4400` | Orange-red warning state |

---

## 8. Portal Overlay Marker Colours

Visible when scanner overlay layers are toggled. Appear as coloured rings around portal icons.

| Marker | Hex | Trigger |
|---|---|---|
| Visited | `#9B59B6` | Purple ring — portal hacked recently |
| Captured | `#E74C3C` | Red ring — portal captured by you |
| Scout Controlled | `#E67E22` | Orange ring — scout control active |
| Keys accessible | `#00BCD4` | Cyan ring — portal key in inventory |

---

## 9. Usage Notes for Developers

- **Background context**: All Ingress colours are designed to glow on `#1A1A1A`. If replicating the in-game aesthetic, use a near-black background and apply `text-shadow` or `box-shadow` glow in the faction/level colour.
- **Faction theming**: When building per-faction UI, use the faction primary colour for borders, accents, and active states. Enlightened = green, Resistance = blue.
- **Level theming**: The 8-colour level ramp (yellow → violet) is used pervasively. Consider it a semantic palette: low levels = warm (yellow/orange/red), high levels = cool (pink/magenta/purple/violet).
- **Rarity vs type**: When rendering mod icons, layer two colour signals — the icon background tint identifies mod type, the slash indicator colour identifies rarity. Don't conflate the two.
- **Opacity layers**: Links and fields should never be fully opaque — they need to be transparent enough to show the underlying map and other portals. ~15% fill opacity for links, ~25% for fields is a good starting point.
- **Glow effects**: The scanner renderer applies additive blending/bloom. For web recreation, `filter: drop-shadow(0 0 6px <colour>)` or a CSS `box-shadow` with 0 spread and a large blur radius in the relevant colour approximates this well.
