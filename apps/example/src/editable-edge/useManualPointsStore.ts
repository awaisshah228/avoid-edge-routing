import { create } from "zustand";

export type ManualPoint = { x: number; y: number; id: string };

type ManualPointsState = {
  /** Manual control points keyed by edge ID */
  points: Record<string, ManualPoint[]>;
  setPoints: (edgeId: string, pts: ManualPoint[]) => void;
  clearPoints: (edgeId: string) => void;
};

export const useManualPointsStore = create<ManualPointsState>((set) => ({
  points: {},
  setPoints: (edgeId, pts) =>
    set((s) => ({ points: { ...s.points, [edgeId]: pts } })),
  clearPoints: (edgeId) =>
    set((s) => {
      const { [edgeId]: _, ...rest } = s.points;
      return { points: rest };
    }),
}));
