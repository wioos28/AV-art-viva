/**
 * store.ts
 * --------
 * Application Layer — AppStore điều phối toàn bộ luồng:
 * document, selection, tools, viewport, history (undo/redo), auto-save,
 * generate, import/export. Presentation Layer chỉ đọc state + gọi actions.
 */

import {
  ArtDocument,
  ArtElement,
} from '../domain/model';
import {
  createDocument,
  createLayer,
  addLayer,
  removeLayer,
  updateLayer,
  reorderLayer,
  addElement,
  updateElement,
  removeElement,
  duplicateElement,
  addElementToTop,
  findElement,
  findLayer,
  createElement,
  countElements,
} from '../domain/document';
import { History, createHistory, push, undo, redo, canUndo, canRedo } from '../domain/history';
import { AiEngine, ai as defaultAi } from '../ai';
import { generateFromPrompt } from './use-cases/generate';
import { events } from './events';
import { ViewportService, Viewport, DEFAULT_VIEWPORT } from './viewport';
import { AutosaveService } from '../infrastructure/storage/autosave';
import { AppSettings, loadSettings, saveSettings } from '../infrastructure/storage/settings';
import { exportSvg, exportPng, exportPdf, copySvg } from '../infrastructure';
import { importFile, ImportResult } from '../infrastructure';
import { loadDocument, listDocuments, deleteDocument, StoredDocument } from '../infrastructure/storage/db';
import { createTemplate, TemplateKind } from './use-cases/templates';

export type Tool = 'select' | 'pan' | 'rect' | 'circle' | 'ellipse' | 'line' | 'path' | 'polygon' | 'text';
export type PanelId = 'layers' | 'inspector' | 'prompt';

export type GenerationStatus =
  | { status: 'idle' }
  | { status: 'working'; stage: string; progress: number }
  | { status: 'error'; message: string };

export interface AppState {
  document: ArtDocument | null;
  fileName: string;
  selection: string[];
  tool: Tool;
  viewport: Viewport;
  panels: Record<PanelId, boolean>;
  history: { canUndo: boolean; canRedo: boolean };
  dirty: boolean;
  savedAt: number | null;
  generation: GenerationStatus;
  theme: AppSettings['theme'];
  aiMode: AppSettings['aiMode'];
  aiModelId: string;
  offline: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  elementCount: number;
  activeProvider: string;
}

type Listener = () => void;

export class AppStore {
  private state: AppState;
  private history: History<ArtDocument>;
  private listeners = new Set<Listener>();
  private vp: ViewportService;
  private autosave: AutosaveService;
  readonly ai: AiEngine;
  private settings: AppSettings;
  private revision = 0;
  private savedRevision = 0;
  private draftId: string | null = null;
  private offlineUnsubs: (() => void)[] = [];

  constructor(aiEngine: AiEngine = defaultAi) {
    this.ai = aiEngine;
    this.settings = loadSettings();
    this.ai.setMode(this.settings.aiMode);
    this.ai.setModel(this.settings.aiModelId);
    this.ai.setAllowLargeModels(this.settings.aiAllowLargeModels);
    this.ai.setModelHost(this.settings.aiModelHost);
    this.vp = new ViewportService(DEFAULT_VIEWPORT);
    this.history = createHistory<ArtDocument>(80);
    this.autosave = new AutosaveService(
      {
        onSaved: ({ id, at }) => {
          this.savedRevision = this.revision;
          this.setState({ dirty: false, savedAt: at });
          events.emit('document:saved', { id, at });
        },
        onError: (err) => console.error('[autosave]', err),
      },
      this.settings.autosaveIntervalMs,
    );
    this.state = {
      document: null,
      fileName: '',
      selection: [],
      tool: 'select',
      viewport: { ...DEFAULT_VIEWPORT },
      panels: { layers: true, inspector: true, prompt: true },
      history: { canUndo: false, canRedo: false },
      dirty: false,
      savedAt: null,
      generation: { status: 'idle' },
      theme: this.settings.theme,
      aiMode: this.settings.aiMode,
      aiModelId: this.settings.aiModelId,
      offline: !navigator.onLine,
      showGrid: this.settings.showGrid,
      snapToGrid: this.settings.snapToGrid,
      elementCount: 0,
      activeProvider: this.ai.getProviderName(),
    };
    this.setupOfflineTracking();
  }

  /* ------------------------------ state ------------------------------ */

  getState(): AppState {
    return this.state;
  }

  getDocument(): ArtDocument | null {
    return this.state.document;
  }

  getDraftId(): string | null {
    return this.draftId;
  }

  getSettings(): AppSettings {
    return this.settings;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of [...this.listeners]) l();
  }

  /* ----------------------------- document ---------------------------- */

  newDocument(options: Partial<Pick<ArtDocument, 'name' | 'width' | 'height' | 'background' | 'origin'>> = {}): void {
    const doc = createDocument({
      name: options.name ?? 'Untitled',
      width: options.width ?? this.settings.canvasWidth,
      height: options.height ?? this.settings.canvasHeight,
      background: options.background ?? null,
      origin: options.origin ?? 'blank',
    });
    this.openDocument(doc);
  }

  openDocument(doc: ArtDocument): void {
    this.draftId = doc.id;
    this.history = createHistory<ArtDocument>(80);
    this.vp.set(DEFAULT_VIEWPORT);
    this.revision = 0;
    this.savedRevision = 0;
    this.commitDocument(doc, { schedule: false });
    this.setSelection([]);
    this.setState({ dirty: false, savedAt: null, generation: { status: 'idle' } });
    events.emit('document:changed', { id: doc.id });
    // Lưu ngay bản draft ban đầu
    void this.autosave.flushNow(doc);
  }

  /** Mở một document từ IndexedDB. */
  async openDraft(id: string): Promise<void> {
    const stored = await loadDocument(id);
    if (stored) this.openDocument(stored.document);
  }

  /** Mở file .svg/.json đã chọn. */
  async openImport(file: File): Promise<ImportResult> {
    const result = await importFile(file);
    if (result.document) {
      this.openDocument(result.document);
    }
    return result;
  }

  async openFromText(text: string, name: string): Promise<ImportResult> {
    const { parseImported } = await import('../infrastructure/import/file-import');
    const result = parseImported(text, name);
    if (result.document) this.openDocument(result.document);
    return result;
  }

  async listDrafts(): Promise<StoredDocument[]> {
    return listDocuments(60);
  }

  async deleteDraft(id: string): Promise<void> {
    await deleteDocument(id);
    if (this.draftId === id) this.draftId = null;
  }

  newFromTemplate(kind: TemplateKind): void {
    const doc = createTemplate(kind);
    this.openDocument(doc);
  }

  updateDocProperties(patch: Partial<Pick<ArtDocument, 'name' | 'width' | 'height' | 'background'>>): void {
    const doc = this.state.document;
    if (!doc) return;
    this.beginChange();
    this.commitDocument({ ...doc, ...patch });
  }

  renameDocument(name: string): void {
    this.updateDocProperties({ name });
  }

  /* --------------------------- undo / redo --------------------------- */

  /** Đánh dấu bắt đầu một thao tác — snapshot hiện tại vào undo stack. */
  beginChange(): void {
    const doc = this.state.document;
    if (!doc) return;
    this.history = push(this.history, doc);
    this.syncHistoryFlags();
  }

  undoAction(): void {
    const doc = this.state.document;
    if (!doc) return;
    const [h, prev] = undo(this.history, doc);
    this.history = h;
    this.commitDocument(prev, { schedule: true });
    this.setSelection([]);
    this.syncHistoryFlags();
    events.emit('document:changed', { id: prev.id });
  }

  redoAction(): void {
    const doc = this.state.document;
    if (!doc) return;
    const [h, next] = redo(this.history, doc);
    this.history = h;
    this.commitDocument(next, { schedule: true });
    this.setSelection([]);
    this.syncHistoryFlags();
    events.emit('document:changed', { id: next.id });
  }

  private syncHistoryFlags(): void {
    this.setState({
      history: { canUndo: canUndo(this.history), canRedo: canRedo(this.history) },
    });
  }

  /* ------------------------- document commit ------------------------- */

  private commitDocument(doc: ArtDocument, opts: { schedule?: boolean } = {}): void {
    this.revision += 1;
    const elCount = doc ? countElements(doc) : 0;
    this.setState({
      document: doc,
      fileName: doc.name,
      dirty: this.revision !== this.savedRevision,
      elementCount: elCount,
    });
    if (opts.schedule !== false) {
      this.autosave.schedule(doc);
    }
  }

  /* ------------------------------ tools ------------------------------ */

  setTool(tool: Tool): void {
    if (tool === this.state.tool) return;
    this.setState({ tool });
    events.emit('tool:changed', { tool });
  }

  setSelection(ids: string[]): void {
    if (sameArray(this.state.selection, ids)) return;
    this.setState({ selection: ids });
    events.emit('selection:changed', { ids });
  }

  /** Chọn/nhấn thêm một element. */
  toggleSelect(id: string): void {
    const sel = this.state.selection;
    if (sel.includes(id)) this.setSelection(sel.filter((s) => s !== id));
    else this.setSelection([...sel, id]);
  }

  /* ---------------------------- elements ----------------------------- */

  getSelectedElements(): ArtElement[] {
    const doc = this.state.document;
    if (!doc) return [];
    return this.state.selection
      .map((id) => findElement(doc, id))
      .filter((e): e is ArtElement => e !== null);
  }

  addElement(element: ArtElement, opts: { select?: boolean } = {}): void {
    const doc = this.state.document;
    if (!doc) return;
    this.beginChange();
    const next = addElementToTop(doc, element);
    this.commitDocument(next);
    if (opts.select !== false) this.setSelection([element.id]);
  }

  addShape(tool: Tool, x: number, y: number): void {
    const doc = this.state.document;
    if (!doc) return;
    const layer = doc.layers[0] ?? createLayer();
    const base = {
      fill: '#7c5cff',
      stroke: null,
      strokeWidth: 2,
    };
    let el: ArtElement;
    switch (tool) {
      case 'rect':
        el = createElement('rect', { ...base, x: x - 60, y: y - 60, width: 120, height: 120, rx: 8, ry: 8 });
        break;
      case 'circle':
        el = createElement('circle', { ...base, x, y, radius: 60 });
        break;
      case 'ellipse':
        el = createElement('ellipse', { ...base, x, y, radiusX: 90, radiusY: 55 });
        break;
      case 'line':
        el = createElement('line', { ...base, x: x - 60, y, x2: x + 60, y2: y, stroke: '#7c5cff', strokeWidth: 4 });
        break;
      case 'text':
        el = createElement('text', {
          ...base,
          x, y,
          text: 'Văn bản',
          fontSize: 48,
          fontFamily: 'system-ui',
          fontWeight: 'bold',
          textAnchor: 'start',
          letterSpacing: 0,
          fill: '#7c5cff',
        });
        break;
      case 'polygon':
        el = createElement('polygon', {
          ...base,
          points: '-60,40 0,-50 60,40',
          x: x - 60,
          y: y - 50,
        });
        break;
      case 'path':
        el = createElement('path', {
          ...base,
          d: `M ${x - 80} ${y + 60} C ${x - 60} ${y - 80} ${x + 60} ${y - 80} ${x + 80} ${y + 60}`,
          fill: null,
          stroke: '#7c5cff',
          strokeWidth: 4,
        });
        break;
      default:
        return;
    }
    if (doc.layers.length === 0) {
      this.beginChange();
      const withLayer = addLayer(doc, layer);
      const next = addElement(withLayer, layer.id, el);
      this.commitDocument(next);
    } else {
      this.addElement(el);
    }
    this.setSelection([el.id]);
  }

  updateElements(patch: Partial<ArtElement>, recordHistory = true): void {
    const doc = this.state.document;
    if (!doc || this.state.selection.length === 0) return;
    if (recordHistory) this.beginChange();
    let next = doc;
    for (const id of this.state.selection) next = updateElement(next, id, patch);
    this.commitDocument(next);
  }

  updateElementById(id: string, patch: Partial<ArtElement>, recordHistory = true): void {
    const doc = this.state.document;
    if (!doc) return;
    if (recordHistory) this.beginChange();
    this.commitDocument(updateElement(doc, id, patch));
  }

  removeSelected(): void {
    const doc = this.state.document;
    if (!doc || this.state.selection.length === 0) return;
    this.beginChange();
    let next = doc;
    for (const id of this.state.selection) next = removeElement(next, id);
    this.commitDocument(next);
    this.setSelection([]);
  }

  duplicateSelected(): void {
    const doc = this.state.document;
    if (!doc || this.state.selection.length === 0) return;
    this.beginChange();
    let next = doc;
    for (const id of this.state.selection) next = duplicateElement(next, id);
    this.commitDocument(next);
  }

  bringForward(): void {
    this.reorderInLayer(1);
  }

  sendBackward(): void {
    this.reorderInLayer(-1);
  }

  private reorderInLayer(dir: 1 | -1): void {
    const doc = this.state.document;
    if (!doc || this.state.selection.length === 0) return;
    const id = this.state.selection[0];
    for (const layer of doc.layers) {
      const idx = layer.elements.findIndex((e) => e.id === id);
      if (idx !== -1) {
        const to = idx + dir;
        if (to < 0 || to >= layer.elements.length) return;
        this.beginChange();
        const elements = [...layer.elements];
        const [moved] = elements.splice(idx, 1);
        elements.splice(to, 0, moved);
        this.commitDocument(updateLayer(doc, layer.id, { elements }));
        return;
      }
    }
  }

  /* ------------------------------ layers ----------------------------- */

  addLayerAction(name?: string): void {
    const doc = this.state.document;
    if (!doc) return;
    this.beginChange();
    const layer = createLayer(name ?? `Layer ${doc.layers.length + 1}`);
    this.commitDocument(addLayer(doc, layer, 0));
    this.setSelection([]);
  }

  removeLayerAction(layerId: string): void {
    const doc = this.state.document;
    if (!doc) return;
    this.beginChange();
    this.commitDocument(removeLayer(doc, layerId));
    this.setSelection([]);
  }

  toggleLayerVisible(layerId: string): void {
    const doc = this.state.document;
    const layer = doc ? findLayer(doc, layerId) : null;
    if (!doc || !layer) return;
    this.beginChange();
    this.commitDocument(updateLayer(doc, layerId, { visible: !layer.visible }));
  }

  toggleLayerLock(layerId: string): void {
    const doc = this.state.document;
    const layer = doc ? findLayer(doc, layerId) : null;
    if (!doc || !layer) return;
    this.beginChange();
    this.commitDocument(updateLayer(doc, layerId, { locked: !layer.locked }));
  }

  setLayerOpacity(layerId: string, opacity: number, recordHistory = true): void {
    const doc = this.state.document;
    if (!doc) return;
    if (recordHistory) this.beginChange();
    this.commitDocument(updateLayer(doc, layerId, { opacity }));
  }

  moveLayer(from: number, to: number): void {
    const doc = this.state.document;
    if (!doc || from === to) return;
    this.beginChange();
    this.commitDocument(reorderLayer(doc, from, to));
  }

  /* ---------------------------- generation --------------------------- */

  async generate(prompt: string, opts: { width?: number; height?: number } = {}): Promise<void> {
    if (!prompt.trim()) return;
    this.setState({ generation: { status: 'working', stage: 'start', progress: 0.05 } });
    events.emit('generation:started', { prompt });
    try {
      const result = await generateFromPrompt(
        this.ai,
        prompt,
        { width: opts.width, height: opts.height },
        (p) => this.setState({ generation: { status: 'working', stage: p.stage, progress: p.fraction } }),
      );
      this.openDocument(result.document);
      this.setState({
        generation: { status: 'idle' },
        activeProvider: result.analysis.provider,
      });
      events.emit('generation:done', { prompt });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tạo SVG từ prompt.';
      this.setState({ generation: { status: 'error', message } });
      events.emit('generation:error', { error: message });
    }
  }

  cancelGeneration(): void {
    this.setState({ generation: { status: 'idle' } });
  }

  /* ----------------------------- viewport ---------------------------- */

  zoomAt(screenX: number, screenY: number, factor: number): void {
    this.vp.set(this.vp.zoomAt(screenX, screenY, factor));
    this.setState({ viewport: this.vp.get() });
  }

  zoomIn(centerX: number, centerY: number): void {
    this.zoomAt(centerX, centerY, 1.2);
  }

  zoomOut(centerX: number, centerY: number): void {
    this.zoomAt(centerX, centerY, 1 / 1.2);
  }

  panBy(dx: number, dy: number): void {
    this.vp.set(this.vp.pan(dx, dy));
    this.setState({ viewport: this.vp.get() });
  }

  fitToScreen(viewW: number, viewH: number): void {
    const doc = this.state.document;
    if (!doc) return;
    this.vp.set(this.vp.fit(doc.width, doc.height, viewW, viewH));
    this.setState({ viewport: this.vp.get() });
  }

  resetZoom(): void {
    this.vp.set({ zoom: 1, panX: 0, panY: 0 });
    this.setState({ viewport: this.vp.get() });
  }

  setViewport(vp: Viewport): void {
    this.vp.set(vp);
    this.setState({ viewport: this.vp.get() });
  }

  /* ------------------------------ panels ------------------------------ */

  togglePanel(panel: PanelId): void {
    this.setState({ panels: { ...this.state.panels, [panel]: !this.state.panels[panel] } });
  }

  /* ------------------------------ export ------------------------------ */

  exportSvg(): void {
    const doc = this.state.document;
    if (doc) exportSvg(doc, true);
  }

  async exportPng(scale = 2): Promise<void> {
    const doc = this.state.document;
    if (doc) await exportPng(doc, { scale });
  }

  async exportPdf(): Promise<void> {
    const doc = this.state.document;
    if (doc) await exportPdf(doc, 2);
  }

  async copySvg(): Promise<boolean> {
    const doc = this.state.document;
    return doc ? copySvg(doc) : false;
  }

  /* ---------------------------- preferences --------------------------- */

  setTheme(theme: AppSettings['theme']): void {
    this.settings = { ...this.settings, theme };
    saveSettings(this.settings);
    this.setState({ theme });
    events.emit('theme:changed', { theme });
  }

  setAiMode(mode: AppSettings['aiMode']): void {
    this.settings = { ...this.settings, aiMode: mode };
    saveSettings(this.settings);
    this.ai.setMode(mode);
    this.setState({ aiMode: mode });
    void this.refreshActiveProvider();
  }

  /** Chọn model AI (preset id hoặc repoId custom). '' = tự động. */
  setAiModel(modelId: string): void {
    this.settings = { ...this.settings, aiModelId: modelId };
    saveSettings(this.settings);
    this.ai.setModel(modelId);
    this.setState({ aiModelId: modelId });
    void this.refreshActiveProvider();
  }

  setAiAllowLargeModels(allow: boolean): void {
    this.settings = { ...this.settings, aiAllowLargeModels: allow };
    saveSettings(this.settings);
    this.ai.setAllowLargeModels(allow);
    this.setState({});
    void this.refreshActiveProvider();
  }

  setAiModelHost(host: AppSettings['aiModelHost']): void {
    this.settings = { ...this.settings, aiModelHost: host };
    saveSettings(this.settings);
    this.ai.setModelHost(host);
    this.setState({});
    void this.refreshActiveProvider();
  }

  setLanguage(lang: AppSettings['language']): void {
    this.settings = { ...this.settings, language: lang };
    saveSettings(this.settings);
    this.setState({}); // re-render (i18n đọc settings)
  }

  setGrid(show: boolean, snap: boolean): void {
    this.settings = { ...this.settings, showGrid: show, snapToGrid: snap };
    saveSettings(this.settings);
    this.setState({ showGrid: show, snapToGrid: snap });
  }

  async refreshActiveProvider(): Promise<void> {
    const model = this.ai.getSelectedModel();
    const loaded = this.ai.isModelLoaded();
    const name = this.ai.getProviderName();
    this.setState({ activeProvider: loaded ? `${name}:${model?.id ?? ''}` : name });
  }

  /** Nạp model AI theo cài đặt hiện tại (gọi từ Settings). */
  async loadAiModel(onProgress?: (stage: string, fraction: number) => void): Promise<boolean> {
    const ok = await this.ai.loadModel(this.settings.aiModelId || undefined, (stage, f) => onProgress?.(stage, f));
    await this.refreshActiveProvider();
    return ok;
  }

  /** Bỏ model khỏi bộ nhớ. */
  async unloadAiModel(): Promise<void> {
    await this.ai.unloadModel();
    await this.refreshActiveProvider();
  }

  /* ------------------------------ offline ----------------------------- */

  private setupOfflineTracking(): void {
    const apply = () => {
      const offline = !navigator.onLine;
      this.setState({ offline });
      events.emit('offline:changed', { offline });
    };
    window.addEventListener('online', apply);
    window.addEventListener('offline', apply);
    this.offlineUnsubs.push(() => window.removeEventListener('online', apply));
    this.offlineUnsubs.push(() => window.removeEventListener('offline', apply));
  }

  dispose(): void {
    this.autosave.dispose();
    for (const unsub of this.offlineUnsubs) unsub();
  }
}

function sameArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
