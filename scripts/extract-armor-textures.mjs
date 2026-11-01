// One-off helper that copies the armor, armor-trim and item textures used by
// the skin viewer's armor stand out of an unpacked Minecraft client jar into
// public/assets/mc/. Unzip the jar's assets/minecraft/textures/ somewhere,
// then `node scripts/extract-armor-textures.mjs <path-to-unzipped-jar>`.
// Leather item icons are greyscale in the jar (the game dyes them) — they are
// tinted here with the default leather colour so the buttons look right.
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const SRC = path.join(process.argv[2] ?? "", "assets/minecraft/textures");
const DEST = "public/assets/mc";
const LEATHER = [0xa0, 0x65, 0x40];

const ARMOR = ["leather", "leather_overlay", "chainmail", "iron", "gold", "diamond", "netherite", "copper"];
const PATTERNS = [
  "sentry", "dune", "coast", "wild", "ward", "eye", "vex", "tide", "snout",
  "rib", "spire", "wayfinder", "shaper", "silence", "raiser", "host", "flow", "bolt",
];
const PALETTES = [
  "trim_palette", "quartz", "iron", "iron_darker", "netherite", "netherite_darker", "redstone",
  "copper", "copper_darker", "gold", "gold_darker", "emerald", "diamond", "diamond_darker",
  "lapis", "amethyst", "resin",
];
const ITEMS = [
  "quartz", "iron_ingot", "netherite_ingot", "redstone", "copper_ingot", "gold_ingot",
  "emerald", "diamond", "lapis_lazuli", "amethyst_shard", "resin_brick", "barrier",
  ...PATTERNS.map((p) => `${p}_armor_trim_smithing_template`),
  ...["chainmail", "iron", "golden", "diamond", "netherite", "copper"].flatMap((m) =>
    ["helmet", "chestplate", "leggings", "boots"].map((piece) => `${m}_${piece}`)
  ),
];

if (!fs.existsSync(SRC)) {
  console.error(`Not found: ${SRC}`);
  process.exit(1);
}

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

for (const layer of ["humanoid", "humanoid_leggings"]) {
  for (const name of ARMOR) {
    copy(path.join(SRC, "entity/equipment", layer, `${name}.png`), path.join(DEST, "armor", layer, `${name}.png`));
  }
  for (const name of PATTERNS) {
    copy(path.join(SRC, "trims/entity", layer, `${name}.png`), path.join(DEST, "trims", layer, `${name}.png`));
  }
}
for (const name of PALETTES) {
  copy(path.join(SRC, "trims/color_palettes", `${name}.png`), path.join(DEST, "trims/palettes", `${name}.png`));
}
for (const name of ITEMS) {
  copy(path.join(SRC, "item", `${name}.png`), path.join(DEST, "items", `${name}.png`));
}

// leather_<piece>.png × default dye, then the undyed leather_<piece>_overlay.png on top
for (const piece of ["helmet", "chestplate", "leggings", "boots"]) {
  const base = await sharp(path.join(SRC, "item", `leather_${piece}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = base;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) data[i + c] = Math.round((data[i + c] * LEATHER[c]) / 255);
  }
  await sharp(data, { raw: info })
    .composite([{ input: path.join(SRC, "item", `leather_${piece}_overlay.png`) }])
    .png()
    .toFile(path.join(DEST, "items", `leather_${piece}.png`));
}

console.log(`Copied armor textures to ${DEST}`);
