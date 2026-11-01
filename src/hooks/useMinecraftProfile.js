import { useEffect, useState } from "react";
import { capeHashFromUrl } from "../lib/capes.js";

// Mojang's own profile API sends no CORS headers, so the browser can't ask it
// directly — playerdb.co relays the same public data (UUID, skin, the cape
// currently worn) with CORS and https texture links.
const PROFILE_API = "https://playerdb.co/api/player/minecraft/";

function dashedUuid(raw) {
  const id = (raw || "").replace(/-/g, "").toLowerCase();
  if (id.length !== 32) return raw || "";
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

function skinModel(properties) {
  try {
    const textures = properties.find((p) => p.name === "textures");
    const decoded = JSON.parse(atob(textures.value));
    return decoded.textures?.SKIN?.metadata?.model === "slim" ? "slim" : "classic";
  } catch {
    return null;
  }
}

export function useMinecraftProfile(minecraftName, fallbackUuid) {
  const name = (minecraftName || "").trim();
  const [state, setState] = useState({ status: name ? "loading" : "idle", profile: null });

  useEffect(() => {
    if (!name) {
      setState({ status: "idle", profile: null });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading", profile: null });

    fetch(PROFILE_API + encodeURIComponent(name), { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        const player = json?.data?.player;
        if (!json?.success || !player) throw new Error("Profil nicht gefunden");
        setState({
          status: "ready",
          profile: {
            name: player.username,
            uuid: dashedUuid(player.id || player.raw_id),
            skinUrl: player.skin_texture || null,
            capeHash: player.cape_texture ? capeHashFromUrl(player.cape_texture) : null,
            model: skinModel(player.properties || []),
          },
        });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState({ status: "error", profile: null });
      });

    return () => controller.abort();
  }, [name]);

  // The UUID never changes, so content.js can carry it as a fallback when the
  // lookup service is down.
  const profile = state.profile ?? (fallbackUuid ? { name, uuid: dashedUuid(fallbackUuid), skinUrl: null, capeHash: null, model: null } : null);
  return { status: state.status, profile };
}
