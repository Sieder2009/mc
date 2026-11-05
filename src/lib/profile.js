import { capeHashFromUrl } from "./capes.js";

// Public Minecraft profiles by name or UUID. Mojang's own API sends no CORS
// headers, so a browser can't read it; two services relay the same public data:
// - playerdb.co says clearly whether a player exists, but its copy of the skin
//   and cape can be a week old.
// - api.minetools.eu is at most half an hour behind, so it freshens what playerdb
//   found, and stands in when playerdb is down.
const PLAYERDB = "https://playerdb.co/api/player/minecraft/";
const MINETOOLS = "https://api.minetools.eu/";
// minetools can take 5 seconds for a name it hasn't seen yet
const TIMEOUT_MS = 8000;
// only an improvement on an answer we already have, so it may not hold up the result
const REFRESH_TIMEOUT_MS = 2500;

const NAME_PATTERN = /^[A-Za-z0-9_]{1,16}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

export function isPlayerQuery(text) {
  return NAME_PATTERN.test(text) || UUID_PATTERN.test(text);
}

export function trimmedUuid(raw) {
  return (raw || "").replace(/-/g, "").toLowerCase();
}

export function dashedUuid(raw) {
  const id = trimmedUuid(raw);
  if (id.length !== 32) return raw || "";
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

async function getJson(url, signal, timeoutMs = TIMEOUT_MS) {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const controller = new AbortController();
  const stop = () => controller.abort();
  const timer = setTimeout(stop, timeoutMs);
  signal.addEventListener("abort", stop);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return await res.json();
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", stop);
  }
}

// Both services pass on Mojang's own record, with the textures base64-encoded.
function toProfile({ id, name, properties }) {
  let textures = {};
  try {
    textures = JSON.parse(atob(properties.find((p) => p.name === "textures").value)).textures ?? {};
  } catch {
    // no texture data: treated like a default skin without a cape
  }
  const { SKIN: skin, CAPE: cape } = textures;
  return {
    name,
    uuid: dashedUuid(id),
    // Mojang writes http:// links, which an https page may not load
    skinUrl: skin?.url?.replace(/^http:/, "https:") ?? null,
    capeHash: cape?.url ? capeHashFromUrl(cape.url) : null,
    model: skin ? (skin.metadata?.model === "slim" ? "slim" : "classic") : null,
  };
}

async function fromPlayerDb(query, signal) {
  const body = await getJson(PLAYERDB + encodeURIComponent(query), signal);
  if (body?.code === "minecraft.invalid_username") return null;
  const player = body?.data?.player;
  if (!player) throw new Error(body?.code ?? "playerdb: no answer");
  return toProfile({ id: player.raw_id || player.id, name: player.username, properties: player.properties });
}

async function fromMinetools(id, signal, timeoutMs) {
  const { raw } = await getJson(`${MINETOOLS}profile/${encodeURIComponent(trimmedUuid(id))}`, signal, timeoutMs);
  if (!raw?.id) throw new Error("minetools: no profile");
  return toProfile(raw);
}

// Resolves to the profile, or null if the player doesn't exist. Rejects if neither
// service can answer.
export async function lookupProfile(rawQuery, signal) {
  // with or without dashes, in any case: the same player
  const query = UUID_PATTERN.test(rawQuery) ? trimmedUuid(rawQuery) : rawQuery;
  let found;
  try {
    found = await fromPlayerDb(query, signal);
  } catch (err) {
    if (signal.aborted) throw err;
    const { id, status } = await getJson(`${MINETOOLS}uuid/${encodeURIComponent(query)}`, signal);
    return status === "OK" && id ? fromMinetools(id, signal) : null;
  }
  if (!found) return null;
  return fromMinetools(found.uuid, signal, REFRESH_TIMEOUT_MS).catch(() => found);
}
