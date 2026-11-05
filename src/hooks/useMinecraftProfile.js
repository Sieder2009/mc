import { useCallback, useEffect, useRef, useState } from "react";
import { dashedUuid, isPlayerQuery, lookupProfile, trimmedUuid } from "../lib/profile.js";

export function useMinecraftProfile(minecraftName, minecraftUuid) {
  const name = (minecraftName || "").trim();
  // by UUID where it's known: it never changes, a name can
  const query = minecraftUuid ? trimmedUuid(minecraftUuid) : name;
  const [state, setState] = useState({ status: query ? "loading" : "idle", profile: null });

  useEffect(() => {
    if (!query) {
      setState({ status: "idle", profile: null });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading", profile: null });

    lookupProfile(query, controller.signal).then(
      (profile) => {
        if (!controller.signal.aborted) setState({ status: profile ? "ready" : "error", profile });
      },
      () => {
        if (!controller.signal.aborted) setState({ status: "error", profile: null });
      }
    );

    return () => controller.abort();
  }, [query]);

  // content.js carries the UUID as a fallback for when both lookup services are down
  const profile = state.profile ?? (minecraftUuid ? { name, uuid: dashedUuid(minecraftUuid), skinUrl: null, capeHash: null, model: null } : null);
  return { status: state.status, profile };
}

const NO_SEARCH = { status: "idle", query: "", player: null };

// A visitor's search. The last player found stays in `player` while the next search
// runs, and when that one finds nothing.
export function usePlayerSearch() {
  const [state, setState] = useState(NO_SEARCH);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const search = useCallback((query) => {
    controllerRef.current?.abort();
    if (!isPlayerQuery(query)) {
      setState((s) => ({ ...s, status: "invalid", query }));
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((s) => ({ ...s, status: "loading", query }));

    lookupProfile(query, controller.signal).then(
      (player) => {
        if (controller.signal.aborted) return;
        setState((s) => (player ? { status: "ready", query, player } : { ...s, status: "notfound", query }));
      },
      () => {
        if (!controller.signal.aborted) setState((s) => ({ ...s, status: "error", query }));
      }
    );
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setState(NO_SEARCH);
  }, []);

  return { ...state, search, reset };
}
