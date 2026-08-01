/**
 * history.ts
 * ----------
 * Undo/Redo dựa trên snapshot. Mỗi thao tác lưu một bản deep-clone của
 * document vào stack; giới hạn dung lượng để không tốn RAM.
 */

export interface History<T> {
  undoStack: T[];
  redoStack: T[];
  limit: number;
}

export function createHistory<T>(limit = 100): History<T> {
  return { undoStack: [], redoStack: [], limit };
}

export function canUndo<T>(h: History<T>): boolean {
  return h.undoStack.length > 0;
}

export function canRedo<T>(h: History<T>): boolean {
  return h.redoStack.length > 0;
}

/** Đẩy một trạng thái (snapshot) vào undo stack; xoá redo. */
export function push<T>(h: History<T>, snapshot: T): History<T> {
  return {
    undoStack: [...h.undoStack, snapshot].slice(-h.limit),
    redoStack: [],
    limit: h.limit,
  };
}

/** Lùi về trạng thái trước; trả [history mới, trạng thái hiện tại]. */
export function undo<T>(h: History<T>, current: T): [History<T>, T] {
  const prev = h.undoStack[h.undoStack.length - 1];
  if (!prev) return [h, current];
  return [
    {
      undoStack: h.undoStack.slice(0, -1),
      redoStack: [...h.redoStack, current].slice(-h.limit),
      limit: h.limit,
    },
    prev,
  ];
}

/** Tiến tới trạng thái kế tiếp; trả [history mới, trạng thái kế]. */
export function redo<T>(h: History<T>, current: T): [History<T>, T] {
  const next = h.redoStack[h.redoStack.length - 1];
  if (!next) return [h, current];
  return [
    {
      undoStack: [...h.undoStack, current].slice(-h.limit),
      redoStack: h.redoStack.slice(0, -1),
      limit: h.limit,
    },
    next,
  ];
}

export function clearHistory<T>(h: History<T>): History<T> {
  return { ...h, undoStack: [], redoStack: [] };
}
