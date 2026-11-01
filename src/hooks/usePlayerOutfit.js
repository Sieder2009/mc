import { useEffect, useRef } from "react";
import { ArmorRig } from "../lib/armor.js";
import { capeTextureUrl } from "../lib/capes.js";

// Dresses a skinview3d viewer: armor (see lib/armor.js) and a cape by its
// texture hash. Shared by the hero viewer and the one in the wardrobe dialog.
export function usePlayerOutfit(viewer, { outfit, capeHash }) {
  const rigRef = useRef(null);

  useEffect(() => {
    if (!viewer) return;
    const rig = new ArmorRig(viewer.playerObject);
    rigRef.current = rig;
    return () => {
      rig.dispose();
      rigRef.current = null;
    };
  }, [viewer]);

  useEffect(() => {
    rigRef.current?.update(outfit);
  }, [viewer, outfit]);

  useEffect(() => {
    if (!viewer) return;
    if (!capeHash) {
      viewer.resetCape();
      return;
    }
    // Loaded here rather than via viewer.loadCape(url): with quick switching,
    // an older cape could otherwise finish last and win.
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) viewer.loadCape(img);
    };
    img.onerror = () => {
      if (!cancelled) viewer.resetCape();
    };
    img.src = capeTextureUrl(capeHash);
    return () => {
      cancelled = true;
    };
  }, [viewer, capeHash]);
}
