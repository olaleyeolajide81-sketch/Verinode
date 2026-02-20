import { Permission } from './pluginAPI';

export class PermissionManager {
  private grantedPermissions: Map<string, Set<string>> = new Map();
  private permissionRequests: Map<string, Promise<boolean>> = new Map();

  constructor() {
    this.initializeDefaultPermissions();
  }

  private initializeDefaultPermissions(): void {
  }

  async checkPermission(permission: Permission): Promise<boolean> {
    const permissionKey = `${permission.type}:${permission.scope}`;
    const granted = this.grantedPermissions.get(permission.type);
    
    if (granted && granted.has(permission.scope)) {
      return true;
    }

    if (permission.required) {
      return await this.requestPermission(permission);
    }

    return false;
  }

  async requestPermission(permission: Permission): Promise<boolean> {
    const permissionKey = `${permission.type}:${permission.scope}`;
    
    if (this.permissionRequests.has(permissionKey)) {
      return this.permissionRequests.get(permissionKey)!;
    }

    const requestPromise = this.promptUserPermission(permission);
    this.permissionRequests.set(permissionKey, requestPromise);

    try {
      const granted = await requestPromise;
      
      if (granted) {
        this.grantPermission(permission.type, permission.scope);
      }
      
      return granted;
    } finally {
      this.permissionRequests.delete(permissionKey);
    }
  }

  hasPermission(type: string, scope: string): boolean {
    const granted = this.grantedPermissions.get(type);
    return granted ? granted.has(scope) : false;
  }

  grantPermission(type: string, scope: string): void {
    if (!this.grantedPermissions.has(type)) {
      this.grantedPermissions.set(type, new Set());
    }
    this.grantedPermissions.get(type)!.add(scope);
  }

  revokePermission(type: string, scope: string): void {
    const granted = this.grantedPermissions.get(type);
    if (granted) {
      granted.delete(scope);
    }
  }

  revokeAllPermissions(type?: string): void {
    if (type) {
      this.grantedPermissions.delete(type);
    } else {
      this.grantedPermissions.clear();
    }
  }

  getGrantedPermissions(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const [type, scopes] of this.grantedPermissions) {
      result.set(type, Array.from(scopes));
    }
    return result;
  }

  isValidPermission(permission: any): permission is Permission {
    return (
      permission &&
      typeof permission === 'object' &&
      typeof permission.type === 'string' &&
      typeof permission.scope === 'string' &&
      typeof permission.description === 'string' &&
      typeof permission.required === 'boolean' &&
      this.isValidPermissionType(permission.type) &&
      this.isValidPermissionScope(permission.type, permission.scope)
    );
  }

  private isValidPermissionType(type: string): boolean {
    const validTypes = ['file_system', 'network', 'storage', 'ui', 'api', 'stellar'];
    return validTypes.includes(type);
  }

  private isValidPermissionScope(type: string, scope: string): boolean {
    switch (type) {
      case 'file_system':
        return /^\/|^[a-zA-Z]:\\/.test(scope) || scope === 'read' || scope === 'write';
      case 'network':
        return /^https?:\/\//.test(scope) || scope === 'any';
      case 'storage':
        return scope === 'local' || scope === 'cloud' || scope === 'session';
      case 'ui':
        return ['menu', 'panel', 'dialog', 'notification', 'statusbar'].includes(scope);
      case 'api':
        return ['stellar', 'database', 'auth', 'webhook'].includes(scope);
      case 'stellar':
        return ['read', 'write', 'transaction', 'query'].includes(scope);
      default:
        return false;
    }
  }

  private async promptUserPermission(permission: Permission): Promise<boolean> {
    console.log(`Permission Request: ${permission.type}:${permission.scope}`);
    console.log(`Description: ${permission.description}`);
    console.log(`Required: ${permission.required}`);
    
    return true;
  }

  createPermissionPrompt(permission: Permission): string {
    const typeDescriptions = {
      'file_system': 'File System Access',
      'network': 'Network Access',
      'storage': 'Storage Access',
      'ui': 'User Interface Access',
      'api': 'API Access',
      'stellar': 'Stellar Blockchain Access'
    };

    return `Plugin is requesting ${typeDescriptions[permission.type]} for "${permission.scope}". ${permission.description}`;
  }

  getPermissionRiskLevel(permission: Permission): 'low' | 'medium' | 'high' {
    const highRiskPermissions = [
      { type: 'file_system', scope: 'write' },
      { type: 'network', scope: 'any' },
      { type: 'stellar', scope: 'write' },
      { type: 'stellar', scope: 'transaction' }
    ];

    const mediumRiskPermissions = [
      { type: 'file_system', scope: 'read' },
      { type: 'storage', scope: 'cloud' },
      { type: 'api', scope: 'database' },
      { type: 'api', scope: 'auth' }
    ];

    const isHighRisk = highRiskPermissions.some(
      p => p.type === permission.type && p.scope === permission.scope
    );

    const isMediumRisk = mediumRiskPermissions.some(
      p => p.type === permission.type && p.scope === permission.scope
    );

    if (isHighRisk) return 'high';
    if (isMediumRisk) return 'medium';
    return 'low';
  }

  async checkMultiplePermissions(permissions: Permission[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const permission of permissions) {
      const key = `${permission.type}:${permission.scope}`;
      const granted = await this.checkPermission(permission);
      results.set(key, granted);
    }
    
    return results;
  }

  exportPermissions(): string {
    const permissions: any = {};
    for (const [type, scopes] of this.grantedPermissions) {
      permissions[type] = Array.from(scopes);
    }
    return JSON.stringify(permissions, null, 2);
  }

  importPermissions(permissionsJson: string): void {
    try {
      const permissions = JSON.parse(permissionsJson);
      this.grantedPermissions.clear();
      
      for (const [type, scopes] of Object.entries(permissions)) {
        if (Array.isArray(scopes)) {
          this.grantedPermissions.set(type, new Set(scopes));
        }
      }
    } catch (error) {
      throw new Error('Invalid permissions JSON format');
    }
  }

  reset(): void {
    this.grantedPermissions.clear();
    this.permissionRequests.clear();
    this.initializeDefaultPermissions();
  }
}
