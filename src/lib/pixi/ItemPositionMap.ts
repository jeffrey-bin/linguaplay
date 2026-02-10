import { ITEM_SLOTS } from "@/config/positions";

const assignedPositions = new Map<string, { x: number; y: number }>();

export function assignPositions(
  targetItems: string[],
  distractors: string[],
  expectedAction: { type: string; target: string; source: string | null }
): void {
  assignedPositions.clear();
  const allItems = [...targetItems, ...distractors];
  const shuffledSlots = [...ITEM_SLOTS].sort(() => Math.random() - 0.5);

  // For drag: place destination and source in specific slots
  if (expectedAction.type === "drag" && expectedAction.source) {
    const destSlot = shuffledSlots.pop()!;
    assignedPositions.set(expectedAction.target, {
      x: destSlot.x,
      y: destSlot.y,
    });
    const sourceSlot = shuffledSlots.pop()!;
    assignedPositions.set(expectedAction.source, {
      x: sourceSlot.x,
      y: sourceSlot.y,
    });
  }

  // Assign remaining items to remaining slots
  for (const item of allItems) {
    if (assignedPositions.has(item)) continue;
    const slot = shuffledSlots.pop();
    if (!slot) break;
    assignedPositions.set(item, { x: slot.x, y: slot.y });
  }
}

export function getItemPosition(
  itemKey: string
): { x: number; y: number } {
  return assignedPositions.get(itemKey) ?? { x: 512, y: 384 };
}
