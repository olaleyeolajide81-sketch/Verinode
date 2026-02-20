export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license: string;
  main: string;
  permissions: Permission[];
  dependencies?: Record<string, string>;
  engines: {
    verinode: string;
  };
  keywords?: string[];
  category?: string;
  icon?: string;
  screenshots?: string[];
}

export interface Permission {
  type: 'file_system' | 'network' | 'storage' | 'ui' | 'api' | 'stellar';
  scope: string;
  description: string;
  required: boolean;
}

export interface PluginContext {
  api: PluginAPI;
  storage: PluginStorage;
  logger: PluginLogger;
  permissions: PermissionManager;
}

export interface PluginAPI {
  registerCommand: (name: string, handler: CommandHandler) => void;
  registerMenuItem: (menu: MenuItem) => void;
  registerPanel: (panel: Panel) => void;
  registerHook: (hook: string, handler: HookHandler) => void;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: EventHandler) => void;
  off: (event: string, handler: EventHandler) => void;
  request: (url: string, options?: RequestOptions) => Promise<Response>;
  showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  showDialog: (options: DialogOptions) => Promise<DialogResult>;
}

export interface PluginStorage {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  keys: () => Promise<string[]>;
}

export interface PluginLogger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

export interface PermissionManager {
  checkPermission: (permission: Permission) => Promise<boolean>;
  requestPermission: (permission: Permission) => Promise<boolean>;
  hasPermission: (type: string, scope: string) => boolean;
}

export type CommandHandler = (args: string[], context: PluginContext) => Promise<any>;

export type HookHandler = (data: any, context: PluginContext) => Promise<any>;

export type EventHandler = (data: any) => void;

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  category?: string;
  order?: number;
  action: () => void;
  submenu?: MenuItem[];
}

export interface Panel {
  id: string;
  title: string;
  icon?: string;
  component: React.ComponentType<any>;
  position?: 'left' | 'right' | 'bottom';
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface DialogOptions {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'confirm';
  buttons?: DialogButton[];
}

export interface DialogButton {
  label: string;
  value: string;
  primary?: boolean;
}

export interface DialogResult {
  button: string;
  cancelled: boolean;
}

export interface Plugin {
  manifest: PluginManifest;
  instance: any;
  context: PluginContext;
  enabled: boolean;
  loaded: boolean;
  error?: string;
}

export interface PluginEvent {
  type: 'plugin-loaded' | 'plugin-unloaded' | 'plugin-enabled' | 'plugin-disabled' | 'plugin-error';
  pluginId: string;
  data?: any;
  timestamp: number;
}

export interface PluginError extends Error {
  pluginId: string;
  code: string;
  details?: any;
}

export interface PluginHook {
  name: string;
  handlers: Array<{
    pluginId: string;
    handler: HookHandler;
    priority: number;
  }>;
}

export interface PluginCommand {
  name: string;
  description: string;
  pluginId: string;
  handler: CommandHandler;
}

export interface PluginRegistry {
  plugins: Map<string, Plugin>;
  hooks: Map<string, PluginHook>;
  commands: Map<string, PluginCommand>;
  menus: Map<string, MenuItem[]>;
  panels: Map<string, Panel>;
}
