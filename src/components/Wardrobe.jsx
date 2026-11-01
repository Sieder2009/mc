import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SkinViewer as SkinView3D } from "skinview3d";
import { useLenis } from "./SmoothScrollProvider.jsx";
import { usePlayerOutfit } from "../hooks/usePlayerOutfit.js";
import { prefersReducedMotion } from "../lib/animation.js";
import { setWorldPaused } from "../lib/world.js";
import { skinUrlFor } from "../lib/skin.js";
import { capeTextureUrl } from "../lib/capes.js";
import {
  ARMOR_MATERIALS,
  ARMOR_SLOTS,
  DEFAULT_LEATHER_COLOR,
  TRIM_MATERIALS,
  TRIM_PATTERNS,
  armorItemIcon,
  armorItemName,
} from "../lib/armor.js";

const DEFAULT_SKIN_URL = skinUrlFor("MHF_Steve");
const BARRIER_ICON = "assets/mc/items/barrier.png";
const TABS = [
  { id: "profile", label: "Profil" },
  { id: "armor", label: "Rüstung" },
];

function getFocusable(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !(el.type === "radio" && !el.checked));
}

export default function Wardrobe({
  tab,
  onTabChange,
  onClose,
  minecraftName,
  profileStatus,
  profile,
  capes,
  capeHash,
  onCapeChange,
  armor,
  onArmorChange,
  outfit,
}) {
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const lenisRef = useLenis();

  useEffect(() => {
    closeBtnRef.current?.focus();
    document.body.style.overflow = "hidden";
    lenisRef?.current?.stop();
    setWorldPaused(true);

    function onKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = getFocusable(dialogRef.current);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      lenisRef?.current?.start();
      setWorldPaused(false);
    };
  }, [onClose, lenisRef]);

  function onTabKeyDown(e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    onTabChange(next.id);
    document.getElementById(`wardrobe-tab-${next.id}`)?.focus();
  }

  const name = profile?.name || minecraftName || "Steve";

  // Rendered into <body>: the hero content sits inside a transformed element,
  // which would otherwise pin this fixed overlay to the hero instead of the
  // screen.
  return createPortal(
    <div className="wardrobe">
      <div className="wardrobe__backdrop" onClick={onClose} />
      <div
        className="wardrobe__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wardrobeTitle"
        ref={dialogRef}
        data-lenis-prevent
      >
        <button
          type="button"
          className="lightbox__close wardrobe__close"
          aria-label="Schließen"
          onClick={onClose}
          ref={closeBtnRef}
        >
          &times;
        </button>

        <WardrobeStage minecraftName={minecraftName} outfit={outfit} capeHash={capeHash} />

        <div className="wardrobe__panel">
          <h2 id="wardrobeTitle" className="wardrobe__title">
            {name}
          </h2>
          <div className="wardrobe__tabs" role="tablist" aria-label="Ansicht">
            {TABS.map((t) => (
              <button
                key={t.id}
                id={`wardrobe-tab-${t.id}`}
                type="button"
                role="tab"
                className="wardrobe__tab"
                aria-selected={tab === t.id}
                aria-controls={`wardrobe-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => onTabChange(t.id)}
                onKeyDown={onTabKeyDown}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div
            id={`wardrobe-panel-${tab}`}
            className="wardrobe__tabpanel"
            role="tabpanel"
            aria-labelledby={`wardrobe-tab-${tab}`}
          >
            {tab === "profile" ? (
              <ProfileTab
                name={name}
                status={profileStatus}
                profile={profile}
                capes={capes}
                capeHash={capeHash}
                onCapeChange={onCapeChange}
              />
            ) : (
              <ArmorTab armor={armor} onArmorChange={onArmorChange} />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* --- the big model on the left ------------------------------------------------ */

function WardrobeStage({ minecraftName, outfit, capeHash }) {
  const canvasRef = useRef(null);
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let v;
    try {
      v = new SkinView3D({ canvas, width: 300, height: 420 });
    } catch {
      return;
    }
    v.autoRotate = !prefersReducedMotion;
    v.autoRotateSpeed = 0.5;
    v.playerWrapper.rotation.y = 0.5;
    // once someone grabs the model, it stays where they leave it
    const stopRotate = () => (v.autoRotate = false);
    canvas.addEventListener("pointerdown", stopRotate);

    const name = (minecraftName || "").trim();
    const fallback = () => v.loadSkin(DEFAULT_SKIN_URL).catch(() => {});
    if (name) v.loadSkin(skinUrlFor(name)).catch(fallback);
    else fallback();

    setViewer(v);
    return () => {
      canvas.removeEventListener("pointerdown", stopRotate);
      setViewer(null);
      v.dispose();
    };
  }, [minecraftName]);

  usePlayerOutfit(viewer, { outfit, capeHash });

  return (
    <div className="wardrobe__stage">
      <canvas
        ref={canvasRef}
        className="wardrobe__canvas"
        width={300}
        height={420}
        role="img"
        aria-label="Drehbares 3D-Modell mit der gewählten Rüstung und dem gewählten Cape"
      />
      <p className="wardrobe__stage-hint" aria-hidden="true">
        Ziehen zum Drehen · Mausrad zum Zoomen
      </p>
    </div>
  );
}

/* --- profile tab -------------------------------------------------------------- */

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="wardrobe-copy" onClick={copy} aria-label={`${label} kopieren`}>
      <span aria-live="polite">{copied ? "Kopiert" : "Kopieren"}</span>
    </button>
  );
}

function ProfileTab({ name, status, profile, capes, capeHash, onCapeChange }) {
  const uuid = profile?.uuid;
  const worn = capes.find((c) => c.active);
  const nameMcUrl = `https://namemc.com/profile/${encodeURIComponent(uuid || name)}`;

  return (
    <div className="wardrobe-profile">
      <div className="wardrobe-profile__head">
        <img
          className="pixelated"
          src={`https://mc-heads.net/avatar/${encodeURIComponent(name)}/64`}
          width="48"
          height="48"
          alt=""
        />
        <p className="wardrobe-profile__edition">Minecraft: Java Edition</p>
      </div>

      {status === "loading" && <p className="wardrobe-note">Lade Profil von Mojang …</p>}
      {status === "error" && (
        <p className="wardrobe-note">
          Live-Daten sind gerade nicht erreichbar{uuid ? " — die UUID kommt aus der Seite selbst." : "."}
        </p>
      )}

      <dl className="wardrobe-facts">
        <div className="wardrobe-facts__row">
          <dt>UUID</dt>
          <dd>
            {uuid ? (
              <>
                <code className="wardrobe-facts__code">{uuid}</code>
                <CopyButton text={uuid} label="UUID" />
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
        {uuid && (
          <div className="wardrobe-facts__row">
            <dt>Ohne Striche</dt>
            <dd>
              <code className="wardrobe-facts__code">{uuid.replace(/-/g, "")}</code>
            </dd>
          </div>
        )}
        {profile?.model && (
          <div className="wardrobe-facts__row">
            <dt>Skin-Modell</dt>
            <dd>{profile.model === "slim" ? "Schlank (Alex, 3 px Arme)" : "Klassisch (Steve, 4 px Arme)"}</dd>
          </div>
        )}
        {status === "ready" && (
          <div className="wardrobe-facts__row">
            <dt>Trägt gerade</dt>
            <dd>{worn ? `${worn.name}-Cape` : "kein Cape"}</dd>
          </div>
        )}
      </dl>

      <fieldset className="wardrobe-group">
        <legend className="wardrobe-group__label">
          Capes <span className="wardrobe-group__value">{capes.length}</span>
        </legend>
        <p className="wardrobe-hint">Antippen, um ein Cape am Modell anzuprobieren.</p>
        <div className="cape-list">
          {capes.map((cape) => (
            <label key={cape.name} className="cape-option" data-disabled={!cape.hash || undefined}>
              <input
                type="radio"
                name="wardrobe-cape"
                className="sr-only"
                checked={Boolean(cape.hash) && capeHash === cape.hash}
                disabled={!cape.hash}
                onChange={() => onCapeChange(cape.hash)}
              />
              <span
                className="cape-option__thumb"
                style={cape.hash ? { backgroundImage: `url(${capeTextureUrl(cape.hash)})` } : undefined}
                aria-hidden="true"
              />
              <span className="cape-option__name">{cape.name}</span>
              {cape.active && <span className="cape-option__badge">getragen</span>}
            </label>
          ))}
          <label className="cape-option">
            <input
              type="radio"
              name="wardrobe-cape"
              className="sr-only"
              checked={!capeHash}
              onChange={() => onCapeChange(null)}
            />
            <span className="cape-option__thumb cape-option__thumb--none" aria-hidden="true" />
            <span className="cape-option__name">Ohne Cape</span>
          </label>
        </div>
      </fieldset>

      <p className="wardrobe-links">
        <a href={nameMcUrl} target="_blank" rel="noopener">
          NameMC-Profil
        </a>
        {profile?.skinUrl && (
          <a href={profile.skinUrl} target="_blank" rel="noopener">
            Skin-Datei (PNG)
          </a>
        )}
      </p>
    </div>
  );
}

/* --- armor tab ---------------------------------------------------------------- */

function IconOption({ name, checked, onChange, icon, label, type = "radio", disabled }) {
  return (
    <label className="mc-option" title={label} data-disabled={disabled || undefined}>
      <input
        type={type}
        name={name}
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <img className="pixelated" src={icon} width="32" height="32" alt="" />
      <span className="sr-only">{label}</span>
    </label>
  );
}

function ArmorTab({ armor, onArmorChange }) {
  const set = (patch) => onArmorChange({ ...armor, ...patch });
  const material = ARMOR_MATERIALS.find((m) => m.id === armor.material);
  const pattern = TRIM_PATTERNS.find((p) => p.id === armor.trimPattern);
  const trimMaterial = TRIM_MATERIALS.find((m) => m.id === armor.trimMaterial);
  const noArmor = !material;

  return (
    <div className="wardrobe-armor">
      <fieldset className="wardrobe-group">
        <legend className="wardrobe-group__label">
          Material <span className="wardrobe-group__value">{material?.name ?? "Keine Rüstung"}</span>
        </legend>
        <div className="mc-options">
          <IconOption
            name="armor-material"
            checked={noArmor}
            onChange={() => set({ material: null })}
            icon={BARRIER_ICON}
            label="Keine Rüstung"
          />
          {ARMOR_MATERIALS.map((m) => (
            <IconOption
              key={m.id}
              name="armor-material"
              checked={armor.material === m.id}
              onChange={() => set({ material: m.id })}
              icon={armorItemIcon(m.id, "chest")}
              label={m.name}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="wardrobe-group" disabled={noArmor}>
        <legend className="wardrobe-group__label">Teile</legend>
        <div className="mc-options">
          {ARMOR_SLOTS.map((s) => (
            <IconOption
              key={s.id}
              type="checkbox"
              name={`armor-piece-${s.id}`}
              checked={!noArmor && armor.pieces[s.id]}
              disabled={noArmor}
              onChange={(e) => set({ pieces: { ...armor.pieces, [s.id]: e.target.checked } })}
              icon={armorItemIcon(material?.id ?? "iron", s.id)}
              label={armorItemName(material?.id ?? "iron", s.id)}
            />
          ))}
        </div>
      </fieldset>

      {armor.material === "leather" && (
        <div className="wardrobe-group wardrobe-group--inline">
          <label className="wardrobe-group__label" htmlFor="armorColor">
            Lederfarbe
          </label>
          <input
            id="armorColor"
            type="color"
            className="wardrobe-color"
            value={armor.color}
            onChange={(e) => set({ color: e.target.value })}
          />
          {armor.color !== DEFAULT_LEATHER_COLOR && (
            <button type="button" className="wardrobe-link-btn" onClick={() => set({ color: DEFAULT_LEATHER_COLOR })}>
              Ungefärbt
            </button>
          )}
        </div>
      )}

      <fieldset className="wardrobe-group" disabled={noArmor}>
        <legend className="wardrobe-group__label">
          Schmiedevorlage <span className="wardrobe-group__value">{pattern?.name ?? "Kein Besatz"}</span>
        </legend>
        <div className="mc-options">
          <IconOption
            name="armor-trim"
            checked={!pattern}
            disabled={noArmor}
            onChange={() => set({ trimPattern: null })}
            icon={BARRIER_ICON}
            label="Kein Besatz"
          />
          {TRIM_PATTERNS.map((p) => (
            <IconOption
              key={p.id}
              name="armor-trim"
              checked={armor.trimPattern === p.id}
              disabled={noArmor}
              onChange={() => set({ trimPattern: p.id })}
              icon={p.icon}
              label={p.name}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="wardrobe-group" disabled={noArmor || !pattern}>
        <legend className="wardrobe-group__label">
          Besatz-Material <span className="wardrobe-group__value">{trimMaterial?.name}</span>
        </legend>
        <div className="mc-options">
          {TRIM_MATERIALS.map((m) => (
            <IconOption
              key={m.id}
              name="armor-trim-material"
              checked={armor.trimMaterial === m.id}
              disabled={noArmor || !pattern}
              onChange={() => set({ trimMaterial: m.id })}
              icon={m.icon}
              label={m.name}
            />
          ))}
        </div>
      </fieldset>

      {!noArmor && (
        <button type="button" className="btn btn--small" onClick={() => set({ material: null })}>
          Rüstung ablegen
        </button>
      )}
    </div>
  );
}
