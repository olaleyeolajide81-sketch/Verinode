import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import { 
  Plugin, 
  PluginManifest, 
  PluginContext, 
  PluginAPI, 
  PluginRegistry, 
  PluginEvent, 
  PluginError,
  PluginHook,
  PluginCommand,
  MenuItem,
  Panel
} from './pluginAPI';
import { SecuritySandbox } from './securitySandbox';
import { PermissionManager } from './permissionsModel';
import { VersionManager } from './versionManager';

export class PluginManager extends EventEmitter {
  private registry: PluginRegistry;
  private pluginsPath: string;
  private sandbox: SecuritySandbox;
  private permissionManager: PermissionManager;
  private versionManager: VersionManager;

  constructor(pluginsPath: string = './plugins') {
    super();
    this.registry = {
      plugins: new Map(),
      hooks: new Map(),
      commands: new Map(),
      menus: new Map(),
      panels: new Map()
    };
    this.pluginsPath = pluginsPath;
    this.sandbox = new SecuritySandbox();
    this.permissionManager = new PermissionManager();
    this.versionManager = new VersionManager();
  }

  async initialize(): Promise<void> {
    try {
      await this.ensurePluginsDirectory();
      await this.loadInstalledPlugins();
      this.emit('manager-initialized');
    } catch (error) {
      this.emit('manager-error', error);
      throw error;
    }
  }

  private async ensurePluginsDirectory(): Promise<void> {
    try {
      await fs.access(this.pluginsPath);
    } catch {
      await fs.mkdir(this.pluginsPath, { recursive: true });
    }
  }

  async installPlugin(pluginPath: string): Promise<void> {
    try {
      const manifestPath = path.join(pluginPath, 'plugin.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: PluginManifest = JSON.parse(manifestContent);

      await this.validateManifest(manifest);
      await this.checkCompatibility(manifest);
      await this.checkPermissions(manifest.permissions);

      const pluginId = `${manifest.name}@${manifest.version}`;
      const targetPath = path.join(this.pluginsPath, pluginId);

      if (await this.pluginExists(pluginId)) {
        throw new Error(`Plugin ${pluginId} is already installed`);
      }

      await this.copyPlugin(pluginPath, targetPath);
      await this.loadPlugin(pluginId);

      this.emit('plugin-installed', { pluginId, manifest });
    } catch (error) {
      this.emit('plugin-install-error', { pluginPath, error });
      throw error;
    }
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    try {
      await this.unloadPlugin(pluginId);
      const pluginPath = path.join(this.pluginsPath, pluginId);
      await fs.rm(pluginPath, { recursive: true, force: true });
      
      this.emit('plugin-uninstalled', { pluginId });
    } catch (error) {
      this.emit('plugin-uninstall-error', { pluginId, error });
      throw error;
    }
  }

  async loadPlugin(pluginId: string): Promise<void> {
    try {
      const pluginPath = path.join(this.pluginsPath, pluginId);
      const manifestPath = path.join(pluginPath, 'plugin.json');
      
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: PluginManifest = JSON.parse(manifestContent);

      const mainPath = path.join(pluginPath, manifest.main);
      const PluginClass = await this.loadPluginModule(mainPath);

      const context = await this.createPluginContext(pluginId, manifest);
      const instance = new PluginClass(context);

      const plugin: Plugin = {
        manifest,
        instance,
        context,
        enabled: true,
        loaded: true
      };

      this.registry.plugins.set(pluginId, plugin);

      if (typeof instance.initialize === 'function') {
        await instance.initialize();
      }

      if (typeof instance.activate === 'function') {
        await instance.activate();
      }

      this.emitEvent({
        type: 'plugin-loaded',
        pluginId,
        timestamp: Date.now()
      });

    } catch (error) {
      const pluginError: PluginError = {
        name: 'PluginLoadError',
        message: `Failed to load plugin ${pluginId}: ${error.message}`,
        pluginId,
        code: 'LOAD_ERROR',
        stack: error.stack
      };

      this.emitEvent({
        type: 'plugin-error',
        pluginId,
        data: pluginError,
        timestamp: Date.now()
      });

      throw pluginError;
    }
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    try {
      const plugin = this.registry.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      if (typeof plugin.instance.deactivate === 'function') {
        await plugin.instance.deactivate();
      }

      if (typeof plugin.instance.dispose === 'function') {
        await plugin.instance.dispose();
      }

      this.unregisterPluginHooks(pluginId);
      this.unregisterPluginCommands(pluginId);
      this.unregisterPluginMenus(pluginId);
      this.unregisterPluginPanels(pluginId);

      this.registry.plugins.delete(pluginId);

      this.emitEvent({
        type: 'plugin-unloaded',
        pluginId,
        timestamp: Date.now()
      });

    } catch (error) {
      this.emitEvent({
        type: 'plugin-error',
        pluginId,
        data: error,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.registry.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.enabled) {
      return;
    }

    plugin.enabled = true;

    if (typeof plugin.instance.activate === 'function') {
      await plugin.instance.activate();
    }

    this.emitEvent({
      type: 'plugin-enabled',
      pluginId,
      timestamp: Date.now()
    });
  }

  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.registry.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (!plugin.enabled) {
      return;
    }

    plugin.enabled = false;

    if (typeof plugin.instance.deactivate === 'function') {
      await plugin.instance.deactivate();
    }

    this.emitEvent({
      type: 'plugin-disabled',
      pluginId,
      timestamp: Date.now()
    });
  }

  private async loadPluginModule(mainPath: string): Promise<any> {
    return this.sandbox.loadModule(mainPath);
  }

  private async createPluginContext(pluginId: string, manifest: PluginManifest): Promise<PluginContext> {
    const api: PluginAPI = {
      registerCommand: (name: string, handler) => this.registerCommand(pluginId, name, handler),
      registerMenuItem: (menu) => this.registerMenuItem(pluginId, menu),
      registerPanel: (panel) => this.registerPanel(pluginId, panel),
      registerHook: (hook: string, handler) => this.registerHook(pluginId, hook, handler),
      emit: (event: string, data: any) => this.emit(event, data),
      on: (event: string, handler) => this.on(event, handler),
      off: (event: string, handler) => this.off(event, handler),
      request: async (url: string, options?) => this.sandbox.makeRequest(url, options),
      showNotification: (message: string, type?) => this.showNotification(message, type),
      showDialog: async (options) => this.showDialog(options)
    };

    return {
      api,
      storage: this.sandbox.createStorage(pluginId),
      logger: this.sandbox.createLogger(pluginId),
      permissions: this.permissionManager
    };
  }

  private registerCommand(pluginId: string, name: string, handler: any): void {
    const command: PluginCommand = {
      name,
      description: `Command from ${pluginId}`,
      pluginId,
      handler
    };
    this.registry.commands.set(name, command);
  }

  private registerMenuItem(pluginId: string, menu: MenuItem): void {
    const category = menu.category || 'default';
    if (!this.registry.menus.has(category)) {
      this.registry.menus.set(category, []);
    }
    this.registry.menus.get(category)!.push(menu);
  }

  private registerPanel(pluginId: string, panel: Panel): void {
    this.registry.panels.set(panel.id, panel);
  }

  private registerHook(pluginId: string, hookName: string, handler: any): void {
    if (!this.registry.hooks.has(hookName)) {
      this.registry.hooks.set(hookName, {
        name: hookName,
        handlers: []
      });
    }
    
    const hook = this.registry.hooks.get(hookName)!;
    hook.handlers.push({
      pluginId,
      handler,
      priority: 0
    });
    
    hook.handlers.sort((a, b) => b.priority - a.priority);
  }

  private unregisterPluginHooks(pluginId: string): void {
    for (const [hookName, hook] of this.registry.hooks) {
      hook.handlers = hook.handlers.filter(h => h.pluginId !== pluginId);
    }
  }

  private unregisterPluginCommands(pluginId: string): void {
    for (const [commandName, command] of this.registry.commands) {
      if (command.pluginId === pluginId) {
        this.registry.commands.delete(commandName);
      }
    }
  }

  private unregisterPluginMenus(pluginId: string): void {
    for (const [category, menus] of this.registry.menus) {
      this.registry.menus.set(category, menus.filter(m => m.id !== pluginId));
    }
  }

  private unregisterPluginPanels(pluginId: string): void {
    for (const [panelId, panel] of this.registry.panels) {
      if (panelId.startsWith(pluginId)) {
        this.registry.panels.delete(panelId);
      }
    }
  }

  private async validateManifest(manifest: PluginManifest): Promise<void> {
    const required = ['name', 'version', 'description', 'author', 'license', 'main', 'permissions', 'engines'];
    for (const field of required) {
      if (!manifest[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!manifest.engines.verinode) {
      throw new Error('Missing verinode engine version');
    }
  }

  private async checkCompatibility(manifest: PluginManifest): Promise<void> {
    return this.versionManager.checkCompatibility(manifest.engines.verinode);
  }

  private async checkPermissions(permissions: any[]): Promise<void> {
    for (const permission of permissions) {
      if (!this.permissionManager.isValidPermission(permission)) {
        throw new Error(`Invalid permission: ${permission.type}:${permission.scope}`);
      }
    }
  }

  private async pluginExists(pluginId: string): Promise<boolean> {
    const pluginPath = path.join(this.pluginsPath, pluginId);
    try {
      await fs.access(pluginPath);
      return true;
    } catch {
      return false;
    }
  }

  private async copyPlugin(source: string, target: string): Promise<void> {
    await fs.mkdir(target, { recursive: true });
    await fs.cp(source, target, { recursive: true });
  }

  private async loadInstalledPlugins(): Promise<void> {
    try {
      const entries = await fs.readdir(this.pluginsPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            await this.loadPlugin(entry.name);
          } catch (error) {
            console.error(`Failed to load plugin ${entry.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load installed plugins:', error);
    }
  }

  private emitEvent(event: PluginEvent): void {
    this.emit(event.type, event);
  }

  private showNotification(message: string, type: string = 'info'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  private async showDialog(options: any): Promise<any> {
    return { button: 'ok', cancelled: false };
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.registry.plugins.get(pluginId);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.registry.plugins.values());
  }

  getCommands(): PluginCommand[] {
    return Array.from(this.registry.commands.values());
  }

  getMenus(category?: string): Map<string, MenuItem[]> {
    if (category) {
      const menus = new Map();
      if (this.registry.menus.has(category)) {
        menus.set(category, this.registry.menus.get(category)!);
      }
      return menus;
    }
    return this.registry.menus;
  }

  getPanels(): Panel[] {
    return Array.from(this.registry.panels.values());
  }

  async executeHook(hookName: string, data: any): Promise<any> {
    const hook = this.registry.hooks.get(hookName);
    if (!hook) {
      return data;
    }

    let result = data;
    for (const { handler } of hook.handlers) {
      try {
        result = await handler(result, {} as PluginContext);
      } catch (error) {
        console.error(`Hook handler error for ${hookName}:`, error);
      }
    }

    return result;
  }
}
