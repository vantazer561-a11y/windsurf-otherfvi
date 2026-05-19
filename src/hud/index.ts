// HUD stub — replaced by Task 3.
// Contract: see src/engine/types.ts (HudAPI).
import type { HudAPI, HudState, KillFeedEntry } from '../engine/types';

export function createHud(rootEl: HTMLElement): HudAPI {
  rootEl.innerHTML = '<div style="position:fixed;left:12px;bottom:12px;color:#f7c948;font:14px monospace;text-shadow:0 0 2px #000;">HUD STUB</div>';
  return {
    update(_s: HudState) {},
    log(_t: string) {},
    killFeed(_e: KillFeedEntry) {},
    setBuyMenu(_open: boolean) {},
    showMessage(_t: string) {},
  };
}
