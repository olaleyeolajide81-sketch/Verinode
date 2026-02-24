import { IsolationService } from './isolationService';
import { BrandingService } from './brandingService';
import { ResourceManager } from './resourceManager';
import { RoutingService } from './routingService';
import { Tenant } from '../models/Tenant';
import { TenantConfig } from '../models/TenantConfig';

export interface CreateTenantData {
  name: string;
  subdomain: string;
  ownerId: string;
  plan: 'basic' | 'premium' | 'enterprise';
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    theme?: 'light' | 'dark' | 'auto';
  };
  config?: Partial<TenantConfig>;
}

export interface TenantUpdateData {
  name?: string;
  plan?: 'basic' | 'premium' | 'enterprise';
  status?: 'active' | 'suspended' | 'inactive';
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    theme?: 'light' | 'dark' | 'auto';
  };
  config?: Partial<TenantConfig>;
}

export class TenantService {
  private isolationService: IsolationService;
  private brandingService: BrandingService;
  private resourceManager: ResourceManager;
  private routingService: RoutingService;

  constructor() {
    this.isolationService = new IsolationService();
    this.brandingService = new BrandingService();
    this.resourceManager = new ResourceManager();
    this.routingService = new RoutingService();
  }

  /**
   * Create a new tenant with complete isolation setup
   */
  async createTenant(data: CreateTenantData): Promise<Tenant> {
    // Validate subdomain availability
    const isSubdomainAvailable = await this.routingService.isSubdomainAvailable(data.subdomain);
    if (!isSubdomainAvailable) {
      throw new Error('Subdomain already taken');
    }

    // Validate subdomain format
    if (!this.isValidSubdomain(data.subdomain)) {
      throw new Error('Invalid subdomain format');
    }

    // Create tenant isolation
    const isolationId = await this.isolationService.createTenantIsolation(data.subdomain);

    // Initialize resource allocation
    await this.resourceManager.initializeAllocation(isolationId, data.plan);

    // Create branding configuration
    if (data.branding) {
      await this.brandingService.createBranding(isolationId, data.branding);
    }

    // Setup routing
    await this.routingService.setupTenantRouting(isolationId, data.subdomain);

    // Create tenant record
    const tenant = new Tenant({
      name: data.name,
      subdomain: data.subdomain,
      ownerId: data.ownerId,
      plan: data.plan,
      isolationId,
      status: 'active',
      branding: data.branding || {},
      config: data.config || {}
    });

    await tenant.save();

    return tenant;
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string): Promise<Tenant | null> {
    return await Tenant.findById(tenantId).populate('config').exec();
  }

  /**
   * Get tenant by subdomain
   */
  async getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
    return await Tenant.findOne({ subdomain }).populate('config').exec();
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId: string, updates: TenantUpdateData): Promise<Tenant> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Update basic fields
    if (updates.name) tenant.name = updates.name;
    if (updates.plan) tenant.plan = updates.plan;
    if (updates.status) tenant.status = updates.status;

    // Update branding
    if (updates.branding) {
      await this.brandingService.updateBranding(tenant.isolationId, updates.branding);
      tenant.branding = { ...tenant.branding, ...updates.branding };
    }

    // Update configuration
    if (updates.config) {
      if (tenant.config) {
        Object.assign(tenant.config, updates.config);
        await tenant.config.save();
      } else {
        const newConfig = new TenantConfig({ ...updates.config, tenantId });
        await newConfig.save();
        tenant.config = newConfig;
      }
    }

    // Update resource allocation if plan changed
    if (updates.plan && updates.plan !== tenant.plan) {
      await this.resourceManager.updateAllocation(tenant.isolationId, updates.plan);
    }

    await tenant.save();
    return tenant;
  }

  /**
   * Delete tenant and clean up all resources
   */
  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Clean up isolation
    await this.isolationService.cleanupTenantIsolation(tenant.isolationId);

    // Clean up branding
    await this.brandingService.deleteBranding(tenant.isolationId);

    // Clean up resource allocation
    await this.resourceManager.cleanupAllocation(tenant.isolationId);

    // Clean up routing
    await this.routingService.removeTenantRouting(tenant.subdomain);

    // Delete tenant config
    if (tenant.config) {
      await TenantConfig.findByIdAndDelete(tenant.config._id);
    }

    // Delete tenant record
    await Tenant.findByIdAndDelete(tenantId);
  }

  /**
   * List tenants for a user
   */
  async listTenants(ownerId: string, page: number = 1, limit: number = 10): Promise<{
    tenants: Tenant[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const total = await Tenant.countDocuments({ ownerId });
    const tenants = await Tenant.find({ ownerId })
      .populate('config')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return {
      tenants,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Validate subdomain format
   */
  private isValidSubdomain(subdomain: string): boolean {
    // Subdomain rules: 3-63 chars, alphanumeric and hyphens only
    // Cannot start or end with hyphen
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;
    return subdomainRegex.test(subdomain.toLowerCase());
  }

  /**
   * Get tenant analytics
   */
  async getTenantAnalytics(tenantId: string, period: 'day' | 'week' | 'month' | 'quarter' | 'year'): Promise<any> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return await this.resourceManager.getResourceAnalytics(tenant.isolationId, period);
  }

  /**
   * Check if user has access to tenant
   */
  async hasAccessToTenant(userId: string, tenantId: string): Promise<boolean> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      return false;
    }

    // Owner has full access
    if (tenant.ownerId === userId) {
      return true;
    }

    // Check if user is a member of the tenant
    // This would typically check a user-tenant relationship table
    // For now, we'll implement a basic check
    return false;
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(tenantId: string, reason?: string): Promise<void> {
    await this.updateTenant(tenantId, { status: 'suspended' });
    
    // Optionally disable routing for suspended tenants
    const tenant = await this.getTenantById(tenantId);
    if (tenant) {
      await this.routingService.disableTenantRouting(tenant.subdomain);
    }
  }

  /**
   * Activate tenant
   */
  async activateTenant(tenantId: string): Promise<void> {
    await this.updateTenant(tenantId, { status: 'active' });
    
    // Enable routing
    const tenant = await this.getTenantById(tenantId);
    if (tenant) {
      await this.routingService.enableTenantRouting(tenant.subdomain);
    }
  }
}
