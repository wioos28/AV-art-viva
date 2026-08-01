/**
 * index.ts
 * --------
 * Plugin Layer: bundle + đăng ký built-in plugins.
 */

export { PluginManager, pluginManager } from './manager';
export type { ArtVivaPlugin, PluginContext, PluginAction, PluginShortcut } from './types';
import { shortcutsPlugin } from './builtin/shortcuts';
import { quickExportPlugin } from './builtin/quick-export';

export const BUILTIN_PLUGINS = [shortcutsPlugin, quickExportPlugin];
