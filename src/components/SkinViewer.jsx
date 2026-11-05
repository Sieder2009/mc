import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Raycaster, Vector2 } from "three";
import { SkinViewer as SkinView3D } from "skinview3d";
import Wardrobe from "./Wardrobe.jsx";
import { skinUrlFor } from "../lib/skin.js";
import { armorToOutfit, normalizeArmor } from "../lib/armor.js";
import { listCapes } from "../lib/capes.js";
import { useMinecraftProfile } from "../hooks/useMinecraftProfile.js";
import { usePlayerOutfit } from "../hooks/usePlayerOutfit.js";

const DEFAULT_SKIN_URL = skinUrlFor("MHF_Steve");
const ARMOR_STORAGE_KEY = "skin-armor";

function loadArmor(fallback) {
  try {
    const stored = localStorage.getItem(ARMOR_STORAGE_KEY);
    if (stored) return normalizeArmor(JSON.parse(stored));
  } catch {
    // private window / blocked storage: just start from content.js
  }
  return normalizeArmor(fallback);
}

function isShown(object) {
  for (let o = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

export default function SkinViewer({ minecraftName, minecraftUuid, minecraftCreated, capes: ownedCapes, armor: defaultArmor }) {
  const canvasRef = useRef(null);
  const profileBtnRef = useRef(null);
  const openerRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const [status, setStatus] = useState("Lade Skin …");
  const [ariaLabel, setAriaLabel] = useState("3D-Vorschau des Minecraft-Skins");
  const [rotating, setRotating] = useState(true);
  const [available, setAvailable] = useState(true);

  const { status: profileStatus, profile } = useMinecraftProfile(minecraftName, minecraftUuid);
  const [armor, setArmor] = useState(() => loadArmor(defaultArmor));
  const outfit = useMemo(() => armorToOutfit(armor), [armor]);
  // undefined = whatever cape is worn in-game, null = none, else a tried-on hash
  const [capeChoice, setCapeChoice] = useState(undefined);
  const wornCape = profile?.capeHash ?? null;
  const capeHash = capeChoice === undefined ? wornCape : capeChoice;
  const capes = useMemo(() => listCapes(ownedCapes, wornCape), [ownedCapes, wornCape]);
  const [wardrobeTab, setWardrobeTab] = useState(null); // null = closed
  const [focusSearch, setFocusSearch] = useState(false); // opened to look up one's own profile

  usePlayerOutfit(viewer, { outfit, capeHash });

  function changeArmor(next) {
    setArmor(next);
    try {
      localStorage.setItem(ARMOR_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // not saved — the choice still applies for this visit
    }
  }

  const openWardrobe = useCallback((tab, { search = false } = {}) => {
    openerRef.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : profileBtnRef.current;
    setFocusSearch(search);
    setWardrobeTab(tab);
  }, []);

  const closeWardrobe = useCallback(() => {
    setWardrobeTab(null);
    // preventScroll: on a short screen the button can be off-screen, and scrolling
    // to it would fade the hero out (with the model just dressed) on closing
    openerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // No skin up front: skinview3d applies whichever image finishes loading
    // last, so a default Steve loading next to the real skin could land on
    // top of it. Steve is only fetched when there is no name or it fails.
    let viewer;
    try {
      viewer = new SkinView3D({
        canvas,
        width: 340,
        height: 460,
      });
    } catch {
      setAvailable(false);
      setStatus("3D-Vorschau konnte nicht geladen werden.");
      setAriaLabel("3D-Vorschau des Minecraft-Skins nicht verfügbar");
      return;
    }

    // Turning the model with the mouse stays; zooming is off — and with it,
    // the mouse wheel over the skin scrolls the page instead of being eaten.
    viewer.controls.enableZoom = false;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    viewer.autoRotateSpeed = 0.6;
    setViewer(viewer);

    function syncRotateState(autoRotate) {
      viewer.autoRotate = autoRotate;
      setRotating(autoRotate);
    }
    syncRotateState(!motionQuery.matches);
    const onMotionChange = (e) => syncRotateState(!e.matches);
    motionQuery.addEventListener("change", onMotionChange);

    const name = (minecraftName || "").trim();
    if (!name) {
      setStatus("Standard-Skin wird gezeigt — mein Minecraft-Name folgt.");
      setAriaLabel("Standard-Minecraft-Skin (Platzhalter)");
      viewer.loadSkin(DEFAULT_SKIN_URL).catch(() => {});
    } else {
      setStatus(`Lade Skin von ${name} …`);
      setAriaLabel(`Lade Skin von ${name}`);
      viewer
        .loadSkin(skinUrlFor(name))
        .then(() => {
          setStatus(`Skin von ${name}`);
          setAriaLabel(`Drehbares 3D-Modell des Minecraft-Skins von ${name}`);
        })
        .catch(() => {
          setStatus(`Skin von "${name}" konnte nicht geladen werden — Standard-Skin wird gezeigt.`);
          setAriaLabel("Standard-Minecraft-Skin (Platzhalter)");
          viewer.loadSkin(DEFAULT_SKIN_URL).catch(() => {});
        });
    }

    return () => {
      motionQuery.removeEventListener("change", onMotionChange);
      setViewer(null);
      viewer.dispose();
    };
  }, [minecraftName]);

  // Clicking the character opens the profile. Dragging turns the model, so
  // only a press that barely moved counts as a click.
  useEffect(() => {
    if (!viewer) return;
    const canvas = viewer.canvas;
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    let down = null;

    function hitsPlayer(e) {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, viewer.camera);
      return raycaster.intersectObject(viewer.playerObject, true).some((hit) => isShown(hit.object));
    }
    const onDown = (e) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5 && hitsPlayer(e)) {
        openerRef.current = profileBtnRef.current;
        setFocusSearch(false);
        setWardrobeTab("profile");
      }
      down = null;
    };
    const onMove = (e) => {
      if (e.pointerType === "mouse" && e.buttons === 0) canvas.style.cursor = hitsPlayer(e) ? "pointer" : "";
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointermove", onMove);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointermove", onMove);
    };
  }, [viewer]);

  // the dialog has its own model — no need to draw this one underneath
  useEffect(() => {
    if (viewer) viewer.renderPaused = Boolean(wardrobeTab);
  }, [viewer, wardrobeTab]);

  function toggleRotate() {
    if (!viewer) return;
    viewer.autoRotate = !viewer.autoRotate;
    setRotating(viewer.autoRotate);
  }

  return (
    <div className="skin-panel skin-panel--hero">
      <div className="skin-panel__viewer">
        <canvas
          ref={canvasRef}
          id="skinCanvas"
          width={340}
          height={460}
          role="img"
          aria-label={ariaLabel}
          title="Anklicken für Profil, UUID und Capes"
        />
      </div>
      <div className="skin-panel__side">
        <p className="skin-status" role="status" aria-live="polite">
          {status}
        </p>
        {available && (
          <div className="skin-panel__controls">
            <button
              type="button"
              className="btn btn--small"
              aria-pressed={rotating}
              onClick={toggleRotate}
            >
              {rotating ? "Drehung pausieren" : "Drehung fortsetzen"}
            </button>
            <button type="button" className="btn btn--small" onClick={() => openWardrobe("armor")}>
              Rüstung
            </button>
            <button
              type="button"
              className="btn btn--small"
              ref={profileBtnRef}
              onClick={() => openWardrobe("profile")}
            >
              Mein Profil
            </button>
            <button type="button" className="btn btn--small" onClick={() => openWardrobe("profile", { search: true })}>
              Dein Profil
            </button>
          </div>
        )}
      </div>

      {wardrobeTab && (
        <Wardrobe
          tab={wardrobeTab}
          onTabChange={setWardrobeTab}
          onClose={closeWardrobe}
          focusSearch={focusSearch}
          minecraftName={minecraftName}
          minecraftCreated={minecraftCreated}
          profileStatus={profileStatus}
          profile={profile}
          capes={capes}
          capeHash={capeHash}
          onCapeChange={setCapeChoice}
          armor={armor}
          onArmorChange={changeArmor}
          outfit={outfit}
        />
      )}
    </div>
  );
}
