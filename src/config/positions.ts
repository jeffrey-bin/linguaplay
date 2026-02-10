export interface SlotPosition {
  x: number;
  y: number;
  zone: string;
}

export const ITEM_SLOTS: SlotPosition[] = [
  { x: 160, y: 220, zone: "countertop-left" },
  { x: 360, y: 220, zone: "countertop-center" },
  { x: 560, y: 200, zone: "shelf-left" },
  { x: 780, y: 180, zone: "shelf-right" },
  { x: 250, y: 430, zone: "table-left" },
  { x: 500, y: 430, zone: "table-center" },
  { x: 750, y: 400, zone: "stove" },
  { x: 160, y: 620, zone: "lower-left" },
  { x: 420, y: 620, zone: "lower-center" },
  { x: 700, y: 620, zone: "lower-right" },
];
