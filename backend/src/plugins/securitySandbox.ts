import { VM } from 'vm2';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { PluginStorage, PluginLogger, RequestOptions } from './pluginAPI';

export class SecuritySandbox {
  private vm: VM;
  private allowedDomains: Set<string>;
  private storagePath: string;
  private logPath: string;

  constructor() {
    this.vm = new VM({
      timeout: 5000,
      sandbox: this.createSandboxContext(),
      eval: false,
      wasm: false,
      fixAsync: true
    });

    this.allowedDomains = new Set([
      'api.github.com',
      'registry.npmjs.org',
      'cdn.jsdelivr.net'
    ]);

    this.storagePath = './plugins-storage';
    this.logPath = './plugins-logs';
  }

  private createSandboxContext(): any {
    return {
      console: {
        log: (...args: any[]) => console.log('[Plugin]', ...args),
        error: (...args: any[]) => console.error('[Plugin]', ...args),
        warn: (...args: any[]) => console.warn('[Plugin]', ...args),
        info: (...args: any[]) => console.info('[Plugin]', ...args),
        debug: (...args: any[]) => console.debug('[Plugin]', ...args)
      },
      setTimeout: (fn: Function, delay: number) => {
        if (delay > 10000) {
          throw new Error('Timeout delay cannot exceed 10 seconds');
        }
        return setTimeout(fn, Math.min(delay, 10000));
      },
      clearTimeout: clearTimeout,
      Buffer: Buffer,
      JSON: JSON,
      Date: Date,
      Math: Math,
      RegExp: RegExp,
      String: String,
      Number: Number,
      Array: Array,
      Object: Object,
      Promise: Promise,
      Map: Map,
      Set: Set,
      URL: URL,
      URLSearchParams: URLSearchParams
    };
  }

  async loadModule(modulePath: string): Promise<any> {
    try {
      const moduleCode = await fs.readFile(modulePath, 'utf-8');
      
      const wrappedCode = this.wrapModuleCode(moduleCode, modulePath);
      
      const moduleExports = this.vm.run(wrappedCode);
      
      return moduleExports;
    } catch (error) {
      throw new Error(`Failed to load module ${modulePath}: ${error.message}`);
    }
  }

  private wrapModuleCode(code: string, modulePath: string): string {
    const moduleWrapper = `
      (function() {
        const module = { exports: {} };
        const exports = module.exports;
        const __filename = '${modulePath}';
        const __dirname = '${path.dirname(modulePath)}';
        
        ${this.sanitizeCode(code)}
        
        return module.exports;
      })()
    `;
    
    return moduleWrapper;
  }

  private sanitizeCode(code: string): string {
    const dangerousPatterns = [
      /require\s*\(/g,
      /import\s+.*\s+from\s+['"]/g,
      /eval\s*\(/g,
      /Function\s*\(/g,
      /process\./g,
      /global\./g,
      /Buffer\./g,
      /child_process/g,
      /fs\./g,
      /path\./g,
      /os\./g,
      /crypto\./g,
      /net\./g,
      /http\./g,
      /https\./g,
      /url\./g,
      /querystring\./g,
      /stream\./g,
      /zlib\./g,
      /readline\./g,
      /repl\./g,
      /vm\./g,
      /assert\./g,
      /util\./g,
      /events\./g,
      /cluster\./g,
      /dgram\./g,
      /dns\./g,
      /tls\./g,
      /punycode\./g
    ];

    let sanitizedCode = code;
    
    for (const pattern of dangerousPatterns) {
      sanitizedCode = sanitizedCode.replace(pattern, '/* BLOCKED */');
    }

    sanitizedCode = sanitizedCode.replace(/document\./g, '/* BLOCKED */');
    sanitizedCode = sanitizedCode.replace(/window\./g, '/* BLOCKED */');
    sanitizedCode = sanitizedCode.replace(/globalThis\./g, '/* BLOCKED */');

    return sanitizedCode;
  }

  async makeRequest(url: string, options?: RequestOptions): Promise<Response> {
    try {
      const parsedUrl = new URL(url);
      
      if (!this.isAllowedDomain(parsedUrl.hostname)) {
        throw new Error(`Domain ${parsedUrl.hostname} is not allowed`);
      }

      const fetchOptions: RequestInit = {
        method: options?.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Verinode-Plugin/1.0',
          ...options?.headers
        }
      };

      if (options?.body && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
        fetchOptions.body = typeof options.body === 'string' 
          ? options.body 
          : JSON.stringify(options.body);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options?.timeout || 10000);
      
      fetchOptions.signal = controller.signal;

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  private isAllowedDomain(hostname: string): boolean {
    return this.allowedDomains.has(hostname) || 
           hostname.endsWith('.github.com') ||
           hostname.endsWith('.jsdelivr.net') ||
           hostname.endsWith('localhost');
  }

  createStorage(pluginId: string): PluginStorage {
    const pluginStoragePath = path.join(this.storagePath, this.hashPluginId(pluginId));
    
    return {
      get: async (key: string): Promise<any> => {
        try {
          const filePath = path.join(pluginStoragePath, `${key}.json`);
          const content = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(content);
        } catch (error) {
          return null;
        }
      },
      
      set: async (key: string, value: any): Promise<void> => {
        try {
          await fs.mkdir(pluginStoragePath, { recursive: true });
          const filePath = path.join(pluginStoragePath, `${key}.json`);
          await fs.writeFile(filePath, JSON.stringify(value, null, 2));
        } catch (error) {
          throw new Error(`Failed to store data: ${error.message}`);
        }
      },
      
      delete: async (key: string): Promise<void> => {
        try {
          const filePath = path.join(pluginStoragePath, `${key}.json`);
          await fs.unlink(filePath);
        } catch (error) {
        }
      },
      
      clear: async (): Promise<void> => {
        try {
          await fs.rm(pluginStoragePath, { recursive: true, force: true });
        } catch (error) {
        }
      },
      
      keys: async (): Promise<string[]> => {
        try {
          await fs.mkdir(pluginStoragePath, { recursive: true });
          const files = await fs.readdir(pluginStoragePath);
          return files
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));
        } catch (error) {
          return [];
        }
      }
    };
  }

  createLogger(pluginId: string): PluginLogger {
    const pluginLogPath = path.join(this.logPath, `${this.hashPluginId(pluginId)}.log`);
    
    return {
      debug: (message: string, ...args: any[]): void => {
        this.writeLog(pluginLogPath, 'DEBUG', message, args);
      },
      
      info: (message: string, ...args: any[]): void => {
        this.writeLog(pluginLogPath, 'INFO', message, args);
      },
      
      warn: (message: string, ...args: any[]): void => {
        this.writeLog(pluginLogPath, 'WARN', message, args);
      },
      
      error: (message: string, ...args: any[]): void => {
        this.writeLog(pluginLogPath, 'ERROR', message, args);
      }
    };
  }

  private async writeLog(logPath: string, level: string, message: string, args: any[]): Promise<void> {
    try {
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level}] ${message} ${args.length > 0 ? JSON.stringify(args) : ''}\n`;
      await fs.appendFile(logPath, logEntry);
    } catch (error) {
      console.error('Failed to write plugin log:', error);
    }
  }

  private hashPluginId(pluginId: string): string {
    return crypto.createHash('sha256').update(pluginId).digest('hex').substring(0, 16);
  }

  validatePluginCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, message: 'Use of eval() is forbidden' },
      { pattern: /Function\s*\(/, message: 'Use of Function constructor is forbidden' },
      { pattern: /process\./, message: 'Access to process object is forbidden' },
      { pattern: /global\./, message: 'Access to global object is forbidden' },
      { pattern: /require\s*\(/, message: 'Use of require() is forbidden' },
      { pattern: /import\s+.*\s+from/, message: 'Use of import statements is forbidden' },
      { pattern: /child_process/, message: 'Access to child_process is forbidden' },
      { pattern: /fs\./, message: 'Access to fs module is forbidden' },
      { pattern: /net\./, message: 'Access to net module is forbidden' },
      { pattern: /http\./, message: 'Access to http module is forbidden' },
      { pattern: /https\./, message: 'Access to https module is forbidden' }
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(message);
      }
    }

    if (code.length > 100000) {
      errors.push('Plugin code exceeds maximum size limit (100KB)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async cleanupPluginData(pluginId: string): Promise<void> {
    const hashedId = this.hashPluginId(pluginId);
    
    try {
      const storagePath = path.join(this.storagePath, hashedId);
      await fs.rm(storagePath, { recursive: true, force: true });
    } catch (error) {
    }

    try {
      const logPath = path.join(this.logPath, `${hashedId}.log`);
      await fs.unlink(logPath);
    } catch (error) {
    }
  }

  setAllowedDomains(domains: string[]): void {
    this.allowedDomains = new Set(domains);
  }

  getAllowedDomains(): string[] {
    return Array.from(this.allowedDomains);
  }
}
