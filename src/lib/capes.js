// Official Minecraft capes by name → texture hash on textures.minecraft.net.
// Mojang only tells the public which cape someone is *wearing*; which capes
// they *own* has to be written into content.js (capes: [...]) by hand. Names
// listed here get a preview and can be tried on in the skin viewer.
export const KNOWN_CAPES = {
  Migrator: "2340c0e03dd24a11b15a8b33c2a7e9e32abb2051b2481d0ba7defd635ca7a933",
  Vanilla: "f9a76537647989f9a0b6d001e320dac591c359e9e61a31f4ce11c88f207f0ad4",
  Pan: "28de4a81688ad18b49e735a273e086c18f1e3966956123ccb574034c06f5d336",
  "Cherry Blossom": "afd553b39358a24edfe3b8a9a939fa5fa4faa4d9a9c3d6af8eafb377fa05c2bb",
  "15th Anniversary": "cd9d82ab17fd92022dbd4a86cde4c382a7540e117fae7b9a2853658505a80625",
  "Purple Heart": "cb40a92e32b57fd732a00fc325e7afb00a7ca74936ad50d8e860152e482cfbde",
  "Follower's": "569b7f2a1d00d26f30efe3f9ab9ac817b1e6d35f4f3cfb0324ef2d328223d350",
  "MCC 15th Year": "56c35628fe1c4d59dd52561a3d03bfa4e1a76d397c8b9c476c2f77cb6aebb1df",
  "Mojang Office": "5c29410057e32abec02d870ecb52ec25fb45ea81e785a7854ae8429d7236ca26",
  Menace: "dbc21e222528e30dc88445314f7be6ff12d3aeebc3c192054fba7e3b3f8c77b1",
  Home: "1de21419009db483900da6298a1e6cbf9f1bc1523a0dcdc16263fab150693edd",
  Yearn: "308b32a9e303155a0b4262f9e5483ad4a22e3412e84fe8385a0bdd73dc41fa89",
  "MINECON 2011": "953cac8b779fe41383e675ee2b86071a71658f2180f56fbce8aa315ea70e2ed6",
  "MINECON 2012": "a2e8d97ec79100e90a75d369d1b3ba81273c4f82bc1b737e934eed4a854be1b6",
  "MINECON 2013": "153b1a0dfcbae953cdeb6f2c2bf6bf79943239b1372780da44bcbb29273131da",
  "MINECON 2015": "b0cc08840700447322d953a02b965f1d65a13a603bf64b17c803c21446fe1635",
  "MINECON 2016": "e7dfea16dc83c97df01a12fabbd1216359c0cd0ea42f9999b6e97c584963e980",
  "Realms MapMaker": "17912790ff164b93196f08ba71d0e62129304776d0f347334f8a6eae509f8a56",
};

export function capeTextureUrl(hash) {
  return `https://textures.minecraft.net/texture/${hash}`;
}

export function capeHashFromUrl(url) {
  return (url || "").split("/").pop() || null;
}

export function capeNameForHash(hash) {
  return Object.keys(KNOWN_CAPES).find((name) => KNOWN_CAPES[name] === hash) ?? null;
}

// The owned capes from content.js, plus the one currently worn if it isn't
// listed — each { name, hash (null if unknown), active }.
export function listCapes(ownedNames, activeHash) {
  const capes = (ownedNames || [])
    .map((name) => String(name).trim())
    .filter(Boolean)
    .map((name) => {
      const key = Object.keys(KNOWN_CAPES).find((k) => k.toLowerCase() === name.toLowerCase());
      const hash = key ? KNOWN_CAPES[key] : null;
      return { name: key ?? name, hash, active: Boolean(hash) && hash === activeHash };
    });
  if (activeHash && !capes.some((c) => c.hash === activeHash)) {
    capes.unshift({ name: capeNameForHash(activeHash) ?? "Aktuelles Cape", hash: activeHash, active: true });
  }
  return capes;
}
