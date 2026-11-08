import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SkinViewer as SkinView3D } from "skinview3d";
import { useLenis } from "./SmoothScrollProvider.jsx";
import { usePlayerOutfit } from "../hooks/usePlayerOutfit.js";
import { usePlayerSearch } from "../hooks/useMinecraftProfile.js";
import { prefersReducedMotion } from "../lib/animation.js";
import { setWorldPaused } from "../lib/world.js";
import { skinUrlFor } from "../lib/skin.js";
import { capeNameForHash, capeTextureUrl, listCapes } from "../lib/capes.js";
import { trimmedUuid } from "../lib/profile.js";
import {
  ARMOR_MATERIALS,
  ARMOR_SLOTS,
  DEFAULT_ARMOR_MATERIAL,
  DEFAULT_LEATHER_COLOR,
  EMPTY_ARMOR,
  TRIM_MATERIALS,
  TRIM_PATTERNS,
  armorItemIcon,
  armorItemName,
} from "../lib/armor.js";

const DEFAULT_SKIN_URL = skinUrlFor("MHF_Steve");
const BARRIER_ICON = "assets/mc/items/barrier.png";
const SKIN_MODELS = { slim: "slim", classic: "default" };
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
  focusSearch,
  minecraftName,
  minecraftCreated,
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
  const searchInputRef = useRef(null);
  const lenisRef = useLenis();

  // A visitor's search only changes this dialog (which forgets it on closing):
  // the hero keeps showing the owner, with the owner's cape.
  const search = usePlayerSearch();
  const [visitorCape, setVisitorCape] = useState({ uuid: null, hash: null });
  // Up here so switching to the profile tab and back keeps the piece in hand.
  const [armorSlot, setArmorSlot] = useState(() => ARMOR_SLOTS.find((s) => armor[s.id].material)?.id ?? ARMOR_SLOTS[0].id);
  const visitor = search.player && trimmedUuid(search.player.uuid) !== trimmedUuid(profile?.uuid) ? search.player : null;
  const visitorCapeHash = visitor && (visitorCape.uuid === visitor.uuid ? visitorCape.hash : visitor.capeHash);
  const ownerSkinUrl = minecraftName ? skinUrlFor(minecraftName) : DEFAULT_SKIN_URL;

  const shownProfile = visitor ?? profile;
  const shownUuid = trimmedUuid(shownProfile?.uuid);
  const name = shownProfile?.name || minecraftName || "Steve";

  useEffect(() => {
    (focusSearch ? searchInputRef : closeBtnRef).current?.focus();
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
  }, [onClose, lenisRef, focusSearch]);

  function onTabKeyDown(e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    onTabChange(next.id);
    document.getElementById(`wardrobe-tab-${next.id}`)?.focus();
  }

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

        <WardrobeStage
          skinUrl={visitor ? (visitor.skinUrl ?? skinUrlFor(shownUuid)) : ownerSkinUrl}
          model={visitor?.model}
          outfit={outfit}
          capeHash={visitor ? visitorCapeHash : capeHash}
        />

        <div className="wardrobe__panel">
          <h2 id="wardrobeTitle" className="wardrobe__title">
            <img
              className="pixelated"
              src={`https://mc-heads.net/avatar/${encodeURIComponent(shownUuid || name)}/64`}
              width="32"
              height="32"
              alt=""
            />
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
                status={visitor ? "ready" : profileStatus}
                profile={shownProfile}
                created={visitor ? null : minecraftCreated}
                capes={visitor ? listCapes([], visitor.capeHash) : capes}
                capeHash={visitor ? visitorCapeHash : capeHash}
                onCapeChange={visitor ? (hash) => setVisitorCape({ uuid: visitor.uuid, hash }) : onCapeChange}
                search={search}
                searchInputRef={searchInputRef}
                visitor={visitor}
                ownerName={profile?.name || minecraftName}
              />
            ) : (
              <ArmorTab armor={armor} onArmorChange={onArmorChange} slotId={armorSlot} onSlotChange={setArmorSlot} />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* --- the big model on the left ------------------------------------------------ */

function WardrobeStage({ skinUrl, model, outfit, capeHash }) {
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

    setViewer(v);
    return () => {
      canvas.removeEventListener("pointerdown", stopRotate);
      setViewer(null);
      v.dispose();
    };
  }, []);

  // Loaded here rather than via viewer.loadSkin(url): with quick searches, an older
  // skin could otherwise finish last and win.
  useEffect(() => {
    if (!viewer) return;
    let cancelled = false;
    const show = (url, onFail) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!cancelled) viewer.loadSkin(img, { model: SKIN_MODELS[model] ?? "auto-detect" });
      };
      img.onerror = () => {
        if (!cancelled) onFail?.();
      };
      img.src = url;
    };
    show(skinUrl, () => show(DEFAULT_SKIN_URL));
    return () => {
      cancelled = true;
    };
  }, [viewer, skinUrl, model]);

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

function PlayerSearch({ search, inputRef, visitor, ownerName }) {
  const [draft, setDraft] = useState(search.query);

  function submit(e) {
    e.preventDefault();
    const query = draft.trim();
    if (query) search.search(query);
  }

  function backToOwner() {
    search.reset();
    setDraft("");
    inputRef.current?.focus();
  }

  const messages = {
    loading: "Suche …",
    invalid: "Das passt nicht: Namen haben bis zu 16 Buchstaben, Zahlen oder _, eine UUID hat 32 Zeichen.",
    notfound: `Kein Java-Spieler „${search.query}“ gefunden. Bedrock-Namen gehen hier nicht.`,
    error: "Die Suche ist gerade nicht erreichbar. Versuch es gleich noch einmal.",
    ready: visitor && `Profil von ${visitor.name}`,
  };
  const problem = ["invalid", "notfound", "error"].includes(search.status);

  return (
    <form className="player-search" role="search" onSubmit={submit} noValidate>
      <div className="player-search__head">
        <label className="wardrobe-group__label" htmlFor="playerSearch">
          Dein Profil ansehen
        </label>
        {visitor && (
          <button type="button" className="wardrobe-link-btn" onClick={backToOwner}>
            Zurück zu {ownerName}
          </button>
        )}
      </div>
      <div className="player-search__row">
        <input
          ref={inputRef}
          id="playerSearch"
          className="player-search__input"
          type="text"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={64}
          placeholder="Minecraft-Name oder UUID"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="btn btn--small">
          Suchen
        </button>
      </div>
      <p className="wardrobe-hint player-search__status" role="status" data-problem={problem || undefined}>
        {messages[search.status] || "Nur Java Edition. Die Suche läuft über playerdb.co und minetools.eu."}
      </p>
    </form>
  );
}

function ProfileTab({ name, status, profile, created, capes, capeHash, onCapeChange, search, searchInputRef, visitor, ownerName }) {
  const uuid = profile?.uuid;
  const worn = capes.find((c) => c.active);
  const wornName = worn && capeNameForHash(worn.hash);
  const nameMcUrl = `https://namemc.com/profile/${encodeURIComponent(uuid || name)}`;

  return (
    <div className="wardrobe-profile">
      <PlayerSearch search={search} inputRef={searchInputRef} visitor={visitor} ownerName={ownerName} />

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
              <CopyButton text={uuid.replace(/-/g, "")} label="UUID ohne Striche" />
            </dd>
          </div>
        )}
        {status === "ready" && (
          <div className="wardrobe-facts__row">
            <dt>Skin-Modell</dt>
            <dd>
              {!profile?.model
                ? "Standard-Skin"
                : profile.model === "slim"
                  ? "Schlank (Alex, 3 px Arme)"
                  : "Klassisch (Steve, 4 px Arme)"}
            </dd>
          </div>
        )}
        {created && (
          <div className="wardrobe-facts__row">
            <dt>Konto erstellt</dt>
            <dd>{created}</dd>
          </div>
        )}
      </dl>

      <fieldset className="wardrobe-group">
        <legend className="wardrobe-group__label">
          Capes{" "}
          {status === "ready" && (
            <span className="wardrobe-group__value">
              Trägt gerade {!worn ? "kein Cape" : wornName ? `${wornName}-Cape` : "ein Cape"}
            </span>
          )}
        </legend>
        {(!visitor || capes.length > 0) && (
          <>
            <p className="wardrobe-hint">
              {visitor
                ? "Mojang zeigt öffentlich nur das Cape, das gerade getragen wird."
                : "Antippen, um ein Cape am Modell anzuprobieren."}
            </p>
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
          </>
        )}
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
        {worn?.hash && (
          <a href={capeTextureUrl(worn.hash)} target="_blank" rel="noopener">
            Cape-Datei (PNG)
          </a>
        )}
      </p>
    </div>
  );
}

/* --- armor tab ---------------------------------------------------------------- */

const noop = () => {};

function IconOption({ name, checked, onPick, icon, label, empty, badge }) {
  return (
    <label className="mc-option" title={label} data-empty={empty || undefined}>
      {/* onClick, not onChange: a radio that is already selected fires no change,
          and picking it again has to work (the remembered template after taking
          the piece off, the default gold trim on a first visit). */}
      <input type="radio" name={name} className="sr-only" checked={checked} onClick={onPick} onChange={noop} />
      {/* not draggable: a mouse moving a few px during the click would drag the
          icon instead, and the click would be lost */}
      <img className="pixelated" src={icon} width="32" height="32" alt="" draggable={false} />
      {badge && <img className="mc-option__badge pixelated" src={badge} width="16" height="16" alt="" draggable={false} />}
      <span className="sr-only">{label}</span>
    </label>
  );
}

function OptionGroup({ label, columns, idle, children }) {
  return (
    <fieldset className="wardrobe-group" data-idle={idle || undefined}>
      <legend className="wardrobe-group__label">{label}</legend>
      <div className="mc-options" style={{ "--columns": columns }}>
        {children}
      </div>
    </fieldset>
  );
}

function ArmorTab({ armor, onArmorChange, slotId, onSlotChange }) {
  // The icons say little on their own, so the line below names the one under the mouse.
  const [hovered, setHovered] = useState(null);

  function onPointerOver(e) {
    const title = e.pointerType === "mouse" && e.target.closest(".mc-option")?.title;
    if (title) setHovered(title);
  }

  const piece = armor[slotId];
  const material = ARMOR_MATERIALS.find((m) => m.id === piece.material);
  const pattern = TRIM_PATTERNS.find((p) => p.id === piece.trimPattern);
  const trimMaterial = TRIM_MATERIALS.find((m) => m.id === piece.trimMaterial);
  const summary = material
    ? [armorItemName(material.id, slotId), pattern?.name, pattern && trimMaterial?.name].filter(Boolean).join(" · ")
    : `${ARMOR_SLOTS.find((s) => s.id === slotId).name}: nichts angelegt`;

  const set = (patch) => onArmorChange({ ...armor, [slotId]: { ...piece, ...patch } });

  // Nothing in here is locked, and every pick shows on the model: a template or
  // ore picked for an empty slot puts that one piece on along with it.
  const dress = material ? {} : { material: DEFAULT_ARMOR_MATERIAL };

  return (
    <div className="wardrobe-armor">
      <div className="armor-flow" onPointerOver={onPointerOver} onPointerLeave={() => setHovered(null)}>
        <OptionGroup label="Teil" columns={1}>
          {ARMOR_SLOTS.map((s) => {
            const worn = armor[s.id];
            const trimmed = worn.material && worn.trimPattern;
            return (
              <IconOption
                key={s.id}
                name="armor-slot"
                checked={slotId === s.id}
                onPick={() => onSlotChange(s.id)}
                icon={armorItemIcon(worn.material ?? DEFAULT_ARMOR_MATERIAL, s.id)}
                empty={!worn.material}
                badge={trimmed ? TRIM_MATERIALS.find((m) => m.id === worn.trimMaterial).icon : null}
                label={worn.material ? armorItemName(worn.material, s.id) : `${s.name} (leer)`}
              />
            );
          })}
        </OptionGroup>

        <OptionGroup label="Material" columns={2}>
          <IconOption
            name="armor-material"
            checked={!material}
            onPick={() => set({ material: null })}
            icon={BARRIER_ICON}
            label="Keine Rüstung"
          />
          {ARMOR_MATERIALS.map((m) => (
            <IconOption
              key={m.id}
              name="armor-material"
              checked={piece.material === m.id}
              onPick={() => set({ material: m.id })}
              icon={armorItemIcon(m.id, slotId)}
              label={armorItemName(m.id, slotId)}
            />
          ))}
          {piece.material === "leather" && (
            <span className="wardrobe-dye">
              <input
                type="color"
                className="wardrobe-color"
                title="Lederfarbe"
                aria-label="Lederfarbe"
                value={piece.color}
                onChange={(e) => set({ color: e.target.value })}
              />
              {piece.color !== DEFAULT_LEATHER_COLOR && (
                <button type="button" className="wardrobe-link-btn" onClick={() => set({ color: DEFAULT_LEATHER_COLOR })}>
                  Ungefärbt
                </button>
              )}
            </span>
          )}
        </OptionGroup>

        <OptionGroup label="Schmiedevorlage" columns={4} idle={!material}>
          <IconOption
            name="armor-trim"
            checked={!pattern}
            onPick={() => set({ trimPattern: null })}
            icon={BARRIER_ICON}
            label="Kein Besatz"
          />
          {TRIM_PATTERNS.map((p) => (
            <IconOption
              key={p.id}
              name="armor-trim"
              checked={piece.trimPattern === p.id}
              onPick={() => set({ ...dress, trimPattern: p.id })}
              icon={p.icon}
              label={p.name}
            />
          ))}
        </OptionGroup>

        {/* idle: no template yet, so this colour is not on the model — picking one
            here starts with the first template */}
        <OptionGroup label="Erz" columns={2} idle={!material || !pattern}>
          {TRIM_MATERIALS.map((m) => (
            <IconOption
              key={m.id}
              name="armor-trim-material"
              checked={piece.trimMaterial === m.id}
              onPick={() => set({ ...dress, trimMaterial: m.id, trimPattern: piece.trimPattern ?? TRIM_PATTERNS[0].id })}
              icon={m.icon}
              label={m.name}
            />
          ))}
        </OptionGroup>
      </div>

      <div className="armor-foot">
        <p className="armor-info" role="status">
          {hovered ?? summary}
        </p>
        <div className="armor-actions">
          {material && (
            <button
              type="button"
              className="btn btn--small"
              onClick={() => onArmorChange(Object.fromEntries(ARMOR_SLOTS.map((s) => [s.id, piece])))}
            >
              Auf alle Teile
            </button>
          )}
          {/* always there: a button that vanished on its own click would drop the
              keyboard focus out of the dialog */}
          <button type="button" className="btn btn--small" onClick={() => onArmorChange(EMPTY_ARMOR)}>
            Alles ablegen
          </button>
        </div>
      </div>
    </div>
  );
}
