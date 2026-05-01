// ─── inspectModeStore — Phase 4.5 (2026-05-01) ──────────────────────────
//
// Pure store contract for the mobile blade-canvas Inspect mode.
//
// Coverage:
//   1. Initial state: not inspecting, zoom=1, panX=0, originXFraction=0.5.
//   2. enter(originXFraction) flips isInspecting + sets zoom to 2.4.
//   3. enter() clamps origin to 0..1.
//   4. exit() resets every field to defaults.
//   5. setZoom + setPanX update the field without touching others.
//   6. recenter() resets zoom + pan + origin without exiting.

import { describe, it, expect, beforeEach } from 'vitest';
import { useInspectModeStore } from '../stores/inspectModeStore';

describe('inspectModeStore', () => {
  beforeEach(() => {
    useInspectModeStore.setState({
      isInspecting: false,
      zoom: 1,
      panX: 0,
      originXFraction: 0.5,
    });
  });

  it('starts with default state', () => {
    const s = useInspectModeStore.getState();
    expect(s.isInspecting).toBe(false);
    expect(s.zoom).toBe(1);
    expect(s.panX).toBe(0);
    expect(s.originXFraction).toBe(0.5);
  });

  it('enter(0.6) flips isInspecting + sets zoom=2.4 + records origin', () => {
    useInspectModeStore.getState().enter(0.6);
    const s = useInspectModeStore.getState();
    expect(s.isInspecting).toBe(true);
    expect(s.zoom).toBe(2.4);
    expect(s.panX).toBe(0);
    expect(s.originXFraction).toBe(0.6);
  });

  it('enter() clamps originXFraction to [0, 1]', () => {
    useInspectModeStore.getState().enter(-0.5);
    expect(useInspectModeStore.getState().originXFraction).toBe(0);
    useInspectModeStore.getState().enter(2.0);
    expect(useInspectModeStore.getState().originXFraction).toBe(1);
  });

  it('exit() resets every field to defaults', () => {
    useInspectModeStore.getState().enter(0.7);
    useInspectModeStore.getState().setZoom(4);
    useInspectModeStore.getState().setPanX(123);
    useInspectModeStore.getState().exit();
    const s = useInspectModeStore.getState();
    expect(s.isInspecting).toBe(false);
    expect(s.zoom).toBe(1);
    expect(s.panX).toBe(0);
    expect(s.originXFraction).toBe(0.5);
  });

  it('setZoom updates only the zoom field', () => {
    useInspectModeStore.getState().enter(0.3);
    useInspectModeStore.getState().setPanX(20);
    useInspectModeStore.getState().setZoom(4);
    const s = useInspectModeStore.getState();
    expect(s.zoom).toBe(4);
    expect(s.panX).toBe(20);
    expect(s.originXFraction).toBe(0.3);
    expect(s.isInspecting).toBe(true);
  });

  it('setPanX updates only the pan field', () => {
    useInspectModeStore.getState().enter(0.3);
    useInspectModeStore.getState().setZoom(4);
    useInspectModeStore.getState().setPanX(-50);
    const s = useInspectModeStore.getState();
    expect(s.panX).toBe(-50);
    expect(s.zoom).toBe(4);
    expect(s.isInspecting).toBe(true);
  });

  it('recenter() resets zoom + pan + origin but NOT isInspecting', () => {
    useInspectModeStore.getState().enter(0.7);
    useInspectModeStore.getState().setZoom(4);
    useInspectModeStore.getState().setPanX(100);
    useInspectModeStore.getState().recenter();
    const s = useInspectModeStore.getState();
    expect(s.isInspecting).toBe(true); // STILL inspecting
    expect(s.zoom).toBe(1);
    expect(s.panX).toBe(0);
    expect(s.originXFraction).toBe(0.5);
  });

  it('zoom values are typed to 1 | 2.4 | 4 (handoff §Q4)', () => {
    useInspectModeStore.getState().setZoom(1);
    expect(useInspectModeStore.getState().zoom).toBe(1);
    useInspectModeStore.getState().setZoom(2.4);
    expect(useInspectModeStore.getState().zoom).toBe(2.4);
    useInspectModeStore.getState().setZoom(4);
    expect(useInspectModeStore.getState().zoom).toBe(4);
  });
});
