import { BoxGeometry, CanvasTexture, DoubleSide, Mesh, MeshStandardMaterial, NearestFilter } from "three";

// Armor for the skinview3d player model: extra boxes around head, body, arms
// and legs, painted with the game's own armor + armor-trim textures
// (copied to public/assets/mc/ by scripts/extract-armor-textures.mjs).

const ASSETS = "assets/mc/";

export const DEFAULT_LEATHER_COLOR = "#a06540";

// Put on when someone picks a piece or a template while wearing nothing.
export const DEFAULT_ARMOR_MATERIAL = "iron";

export const ARMOR_MATERIALS = [
  { id: "leather", name: "Leder", items: ["Lederkappe", "Lederjacke", "Lederhose", "Lederstiefel"] },
  { id: "chainmail", name: "Kette", items: ["Kettenhaube", "Kettenhemd", "Kettenhose", "Kettenstiefel"] },
  { id: "iron", name: "Eisen", items: ["Eisenhelm", "Eisenharnisch", "Eisenbeinschutz", "Eisenstiefel"] },
  { id: "gold", name: "Gold", itemPrefix: "golden", items: ["Goldhelm", "Goldharnisch", "Goldbeinschutz", "Goldstiefel"] },
  { id: "diamond", name: "Diamant", items: ["Diamanthelm", "Diamantharnisch", "Diamantbeinschutz", "Diamantstiefel"] },
  { id: "netherite", name: "Netherit", items: ["Netherithelm", "Netheritharnisch", "Netheritbeinschutz", "Netheritstiefel"] },
  { id: "copper", name: "Kupfer", items: ["Kupferhelm", "Kupferharnisch", "Kupferbeinschutz", "Kupferstiefel"] },
];

export const ARMOR_SLOTS = [
  { id: "head", piece: "helmet" },
  { id: "chest", piece: "chestplate" },
  { id: "legs", piece: "leggings" },
  { id: "feet", piece: "boots" },
];

export const TRIM_PATTERNS = [
  { id: "sentry", name: "Wachen" },
  { id: "dune", name: "Dünen" },
  { id: "coast", name: "Küsten" },
  { id: "wild", name: "Wildnis" },
  { id: "ward", name: "Warthof" },
  { id: "eye", name: "Augen" },
  { id: "vex", name: "Plagegeister" },
  { id: "tide", name: "Gezeiten" },
  { id: "snout", name: "Schnauzen" },
  { id: "rib", name: "Rippen" },
  { id: "spire", name: "Turmspitzen" },
  { id: "wayfinder", name: "Wegfinder" },
  { id: "shaper", name: "Gestalter" },
  { id: "silence", name: "Stille" },
  { id: "raiser", name: "Aufzieher" },
  { id: "host", name: "Gastwirts" },
  { id: "flow", name: "Fluss" },
  { id: "bolt", name: "Bolzen" },
].map((p) => ({ ...p, name: `${p.name}-Rüstungsbesatz`, icon: `${ASSETS}items/${p.id}_armor_trim_smithing_template.png` }));

export const TRIM_MATERIALS = [
  { id: "quartz", name: "Quarz", item: "quartz" },
  { id: "iron", name: "Eisen", item: "iron_ingot" },
  { id: "netherite", name: "Netherit", item: "netherite_ingot" },
  { id: "redstone", name: "Redstone", item: "redstone" },
  { id: "copper", name: "Kupfer", item: "copper_ingot" },
  { id: "gold", name: "Gold", item: "gold_ingot" },
  { id: "emerald", name: "Smaragd", item: "emerald" },
  { id: "diamond", name: "Diamant", item: "diamond" },
  { id: "lapis", name: "Lapislazuli", item: "lapis_lazuli" },
  { id: "amethyst", name: "Amethyst", item: "amethyst_shard" },
  { id: "resin", name: "Harz", item: "resin_brick" },
].map((m) => ({ ...m, icon: `${ASSETS}items/${m.item}.png` }));

// The game swaps in a darker palette when the trim is the armor's own
// material (gold trim on gold armor), so it stays visible.
const DARKER_PALETTES = new Set(["iron", "gold", "diamond", "netherite", "copper"]);

export function armorItemIcon(materialId, slotId) {
  const material = ARMOR_MATERIALS.find((m) => m.id === materialId);
  const slot = ARMOR_SLOTS.find((s) => s.id === slotId);
  return `${ASSETS}items/${material.itemPrefix ?? material.id}_${slot.piece}.png`;
}

export function armorItemName(materialId, slotId) {
  const material = ARMOR_MATERIALS.find((m) => m.id === materialId);
  return material.items[ARMOR_SLOTS.findIndex((s) => s.id === slotId)];
}

/* --- textures ------------------------------------------------------------ */

const images = new Map();

function loadImage(path) {
  if (!images.has(path)) {
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        images.delete(path);
        reject(new Error(`Textur nicht gefunden: ${path}`));
      };
      img.src = ASSETS + path;
    });
    images.set(path, promise);
  }
  return images.get(path);
}

function pixelsOf(img) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Fetches everything one armor piece needs; drawing happens afterwards in one
// go so a half-loaded set never shows.
async function loadPiece(layer, { material, trim }) {
  const [base, overlay] = await Promise.all([
    loadImage(`armor/${layer}/${material}.png`),
    material === "leather" ? loadImage(`armor/${layer}/leather_overlay.png`) : null,
  ]);
  if (!trim) return { base, overlay };

  const trimPalette = DARKER_PALETTES.has(material) && trim.material === material ? `${trim.material}_darker` : trim.material;
  // a trim texture that won't load costs the trim, not the whole armor piece
  const [pattern, key, palette] = await Promise.all([
    loadImage(`trims/${layer}/${trim.pattern}.png`),
    loadImage("trims/palettes/trim_palette.png"),
    loadImage(`trims/palettes/${trimPalette}.png`),
  ]).catch(() => []);
  return { base, overlay, pattern, key, palette };
}

function paintPiece(ctx, { base, overlay, pattern, key, palette }, color) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);

  if (overlay) {
    // leather is greyscale in the game files and gets multiplied by its dye
    const dyed = pixelsOf(base);
    const [r, g, b] = hexToRgb(color || DEFAULT_LEATHER_COLOR);
    for (let i = 0; i < dyed.data.length; i += 4) {
      dyed.data[i] = (dyed.data[i] * r) / 255;
      dyed.data[i + 1] = (dyed.data[i + 1] * g) / 255;
      dyed.data[i + 2] = (dyed.data[i + 2] * b) / 255;
    }
    ctx.putImageData(dyed, 0, 0);
    ctx.drawImage(overlay, 0, 0);
  } else {
    ctx.drawImage(base, 0, 0);
  }

  if (pattern) {
    // Trim textures are drawn in the 8 greys of trim_palette.png; each grey
    // becomes the colour at the same position in the material's palette.
    // Nearest grey, not exact: some browsers (Brave) add noise to canvas reads,
    // and a key colour that is off by one would leave its pixels uncoloured.
    const keyPx = pixelsOf(key).data;
    const palPx = pixelsOf(palette).data;
    const trim = pixelsOf(pattern);
    const d = trim.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      let nearest = 0;
      for (let k = 4; k < keyPx.length; k += 4) {
        if (Math.abs(keyPx[k] - d[i]) < Math.abs(keyPx[nearest] - d[i])) nearest = k;
      }
      d[i] = palPx[nearest];
      d[i + 1] = palPx[nearest + 1];
      d[i + 2] = palPx[nearest + 2];
    }
    const layer = document.createElement("canvas");
    layer.width = trim.width;
    layer.height = trim.height;
    layer.getContext("2d").putImageData(trim, 0, 0);
    ctx.drawImage(layer, 0, 0);
  }
}

/* --- geometry ------------------------------------------------------------ */

// Same box unwrap as skinview3d's (not exported) setUVs, for the 64×32
// armor texture layout.
function setArmorUVs(box, u, v, width, height, depth) {
  const W = 64;
  const H = 32;
  const face = (x1, y1, x2, y2) => [
    [x1 / W, 1 - y2 / H],
    [x2 / W, 1 - y2 / H],
    [x2 / W, 1 - y1 / H],
    [x1 / W, 1 - y1 / H],
  ];
  const top = face(u + depth, v, u + width + depth, v + depth);
  const bottom = face(u + width + depth, v, u + width * 2 + depth, v + depth);
  const left = face(u, v + depth, u + depth, v + depth + height);
  const front = face(u + depth, v + depth, u + width + depth, v + depth + height);
  const right = face(u + width + depth, v + depth, u + width + depth * 2, v + height + depth);
  const back = face(u + width + depth * 2, v + depth, u + width * 2 + depth * 2, v + height + depth);
  const order = [
    [right[3], right[2], right[0], right[1]],
    [left[3], left[2], left[0], left[1]],
    [top[3], top[2], top[0], top[1]],
    [bottom[0], bottom[1], bottom[3], bottom[2]],
    [front[3], front[2], front[0], front[1]],
    [back[3], back[2], back[0], back[1]],
  ];
  box.attributes.uv.set(new Float32Array(order.flat(2)));
  box.attributes.uv.needsUpdate = true;
}

// Boxes as the game's armor model builds them: the player's own boxes grown
// by 1 px per side (outer armor) or 0.5 px (leggings), legs 0.1 px slimmer.
// Left limbs reuse the right limb's texture, mirrored.
const PIECES = {
  head: [{ part: "head", size: [8, 8, 8], grow: 1, uv: [0, 0], at: [0, 4, 0] }],
  chest: [
    { part: "body", size: [8, 12, 4], grow: 1, uv: [16, 16], at: [0, 0, 0] },
    { part: "rightArm", size: [4, 12, 4], grow: 1, uv: [40, 16], at: [-1, -4, 0] },
    { part: "leftArm", size: [4, 12, 4], grow: 1, uv: [40, 16], at: [1, -4, 0], mirror: true },
  ],
  legs: [
    { part: "body", size: [8, 12, 4], grow: 0.5, uv: [16, 16], at: [0, 0, 0] },
    { part: "rightLeg", size: [4, 12, 4], grow: 0.4, uv: [0, 16], at: [0, -6, 0] },
    { part: "leftLeg", size: [4, 12, 4], grow: 0.4, uv: [0, 16], at: [0, -6, 0], mirror: true },
  ],
  feet: [
    { part: "rightLeg", size: [4, 12, 4], grow: 0.9, uv: [0, 16], at: [0, -6, 0] },
    { part: "leftLeg", size: [4, 12, 4], grow: 0.9, uv: [0, 16], at: [0, -6, 0], mirror: true },
  ],
};

const LAYER = { head: "humanoid", chest: "humanoid", legs: "humanoid_leggings", feet: "humanoid" };

const CAPE_Y = 8;
const CAPE_Z = -2;

export class ArmorRig {
  constructor(player) {
    this.player = player;
    this.version = 0;
    this.slots = {};

    for (const [slot, pieces] of Object.entries(PIECES)) {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 32;
      // set up like skinview3d's own skin texture, so colours match the skin
      const texture = new CanvasTexture(canvas);
      texture.magFilter = NearestFilter;
      texture.minFilter = NearestFilter;
      // the game draws armor without back-face culling (see-through chainmail)
      const material = new MeshStandardMaterial({ map: texture, side: DoubleSide, alphaTest: 0.1 });
      const meshes = pieces.map(({ part, size: [w, h, d], grow, uv, at, mirror }) => {
        const box = new BoxGeometry(w + grow * 2, h + grow * 2, d + grow * 2);
        setArmorUVs(box, uv[0], uv[1], w, h, d);
        const mesh = new Mesh(box, material);
        mesh.name = `armor-${slot}`;
        mesh.position.set(...at);
        if (mirror) mesh.scale.x = -1;
        mesh.visible = false;
        player.skin[part].add(mesh);
        return mesh;
      });
      this.slots[slot] = { canvas, ctx: canvas.getContext("2d"), texture, material, meshes };
    }
  }

  // outfit: { head|chest|legs|feet: { material, color?, trim?: { pattern, material } } | null }
  async update(outfit) {
    const version = ++this.version;
    const loaded = await Promise.all(
      Object.keys(this.slots).map(async (slot) => {
        const piece = outfit?.[slot];
        if (!piece?.material) return null;
        try {
          return await loadPiece(LAYER[slot], piece);
        } catch {
          return null;
        }
      })
    );
    // a newer outfit was picked while this one was still loading
    if (version !== this.version || this.disposed) return;

    Object.entries(this.slots).forEach(([slot, s], i) => {
      const images = loaded[i];
      if (images) {
        paintPiece(s.ctx, images, outfit[slot].color);
        s.texture.needsUpdate = true;
      }
      s.meshes.forEach((mesh) => (mesh.visible = Boolean(images)));
    });

    // like in-game: a chestplate pushes the cape back so it doesn't cut into it
    const chest = Boolean(loaded[Object.keys(this.slots).indexOf("chest")]);
    this.player.cape.position.y = chest ? CAPE_Y + 0.85 : CAPE_Y;
    this.player.cape.position.z = chest ? CAPE_Z - 1.1 : CAPE_Z;
  }

  dispose() {
    this.disposed = true;
    for (const s of Object.values(this.slots)) {
      for (const mesh of s.meshes) {
        mesh.removeFromParent();
        mesh.geometry.dispose();
      }
      s.material.dispose();
      s.texture.dispose();
    }
    this.player.cape.position.y = CAPE_Y;
    this.player.cape.position.z = CAPE_Z;
  }
}

/* --- outfit settings ------------------------------------------------------- */

export const ALL_PIECES = { head: true, chest: true, legs: true, feet: true };

// What the armor editor stores — one material for the whole set; pieces can
// be switched off one by one.
export const EMPTY_ARMOR = {
  material: null,
  pieces: ALL_PIECES,
  color: DEFAULT_LEATHER_COLOR,
  trimPattern: null,
  trimMaterial: "gold",
};

export function normalizeArmor(value) {
  const v = value && typeof value === "object" ? value : {};
  const known = (list, id) => (list.some((x) => x.id === id) ? id : null);
  return {
    material: known(ARMOR_MATERIALS, v.material),
    pieces: { ...EMPTY_ARMOR.pieces, ...(v.pieces && typeof v.pieces === "object" ? v.pieces : {}) },
    color: /^#[0-9a-f]{6}$/i.test(v.color) ? v.color : DEFAULT_LEATHER_COLOR,
    trimPattern: known(TRIM_PATTERNS, v.trimPattern),
    trimMaterial: known(TRIM_MATERIALS, v.trimMaterial) ?? EMPTY_ARMOR.trimMaterial,
  };
}

export function armorToOutfit(armor) {
  const outfit = {};
  for (const { id } of ARMOR_SLOTS) {
    outfit[id] =
      armor.material && armor.pieces[id]
        ? {
            material: armor.material,
            color: armor.color,
            trim: armor.trimPattern ? { pattern: armor.trimPattern, material: armor.trimMaterial } : null,
          }
        : null;
  }
  return outfit;
}
