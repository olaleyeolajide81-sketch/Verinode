export interface ResourceQuota {
  maxUsers: number;
  maxProofs: number;
  maxStorage: number; // in MB
  maxApiCalls: number; // per day
  maxBandwidth: number; // in GB per month
  maxCustomDomains: number;
  maxApiKeys: number;
}

export interface ResourceUsage {
  users: number;
  proofs: number;
  storage: number; // in MB
  apiCalls: number; // per day
  bandwidth: number; // in GB per month
  customDomains: number;
  apiKeys: number;
}

export interface ResourceAllocation {
  tenantId: string;
  plan: 'basic' | 'premium' | 'enterprise';
  quota: ResourceQuota;
  usage: ResourceUsage;
  createdAt: Date;
  updatedAt: Date;
  lastResetDate: Date;
}

export interface ResourceCheckResult {
  allowed: boolean;
  remaining: number;
  message?: string;
}

export interface ResourceAnalytics {
  period: string;
  usage: ResourceUsage;
  quota: ResourceQuota;
  utilization: {
    users: number;
    proofs: number;
    storage: number;
    apiCalls: number;
    bandwidth: number;
    customDomains: number;
    apiKeys: number;
  };
  trends: Array<{
    date: string;
    usage: ResourceUsage;
  }>;
}

export class ResourceManager {
  private planQuotas: Record<string, ResourceQuota> = {
    basic: {
      maxUsers: 5,
      maxProofs: 100,
      maxStorage: 1024, // 1GB
      maxApiCalls: 1000,
      maxBandwidth: 10, // 10GB
      maxCustomDomains: 0,
      maxApiKeys: 2
    },
    premium: {
      maxUsers: 50,
      maxProofs: 5000,
      maxStorage: 10240, // 10GB
      maxApiCalls: 10000,
      maxBandwidth: 100, // 100GB
      maxCustomDomains: 1,
      maxApiKeys: 10
    },
    enterprise: {
      maxUsers: 1000,
      maxProofs: 100000,
      maxStorage: 102400, // 100GB
      maxApiCalls: 100000,
      maxBandwidth: 1000, // 1TB
      maxCustomDomains: 5,
      maxApiKeys: 50
    }
  };

  /**
   * Initialize resource allocation for a new tenant
   */
  async initializeAllocation(tenantId: string, plan: 'basic' | 'premium' | 'enterprise'): Promise<ResourceAllocation> {
    const quota = this.planQuotas[plan];
    const usage: ResourceUsage = {
      users: 0,
      proofs: 0,
      storage: 0,
      apiCalls: 0,
      bandwidth: 0,
      customDomains: 0,
      apiKeys: 0
    };

    const allocation: ResourceAllocation = {
      tenantId,
      plan,
      quota,
      usage,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastResetDate: new Date()
    };

    await this.storeAllocation(allocation);
    return allocation;
  }

  /**
   * Get resource allocation for a tenant
   */
  async getAllocation(tenantId: string): Promise<ResourceAllocation | null> {
    try {
      const allocation = await this.fetchAllocation(tenantId);
      return allocation;
    } catch (error) {
      console.error('Error fetching allocation:', error);
      return null;
    }
  }

  /**
   * Update resource allocation (e.g., when changing plans)
   */
  async updateAllocation(tenantId: string, newPlan: 'basic' | 'premium' | 'enterprise'): Promise<void> {
    const allocation = await this.getAllocation(tenantId);
    if (!allocation) {
      throw new Error('Resource allocation not found');
    }

    const newQuota = this.planQuotas[newPlan];
    allocation.quota = newQuota;
    allocation.plan = newPlan;
    allocation.updatedAt = new Date();

    await this.storeAllocation(allocation);
  }

  /**
   * Check if tenant can consume a resource
   */
  async checkResourceLimit(tenantId: string, resource: keyof ResourceUsage, amount: number = 1): Promise<ResourceCheckResult> {
    const allocation = await this.getAllocation(tenantId);
    if (!allocation) {
      throw new Error('Resource allocation not found');
    }

    const currentUsage = allocation.usage[resource];
    const maxAllowed = allocation.quota[resource];
    const remaining = maxAllowed - currentUsage;

    if (currentUsage + amount > maxAllowed) {
      return {
        allowed: false,
        remaining,
        message: `Resource limit exceeded for ${resource}. Current: ${currentUsage}, Max: ${maxAllowed}, Requested: ${amount}`
      };
    }

    return {
      allowed: true,
      remaining
    };
  }

  /**
   * Consume a resource
   */
  async consumeResource(tenantId: string, resource: keyof ResourceUsage, amount: number = 1): Promise<void> {
    const checkResult = await this.checkResourceLimit(tenantId, resource, amount);
    if (!checkResult.allowed) {
      throw new Error(checkResult.message || 'Resource limit exceeded');
    }

    const allocation = await this.getAllocation(tenantId);
    if (!allocation) {
      throw new Error('Resource allocation not found');
    }

    allocation.usage[resource] += amount;
    allocation.updatedAt = new Date();

    await this.storeAllocation(allocation);
  }

  /**
   * Release a resource (undo consumption)
   */
  async releaseResource(tenantId: string, resource: keyof ResourceUsage, amount: number = 1): Promise<void> {
    const allocation = await this.getAllocation(tenantId);
    if (!allocation) {
      throw new Error('Resource allocation not found');
    }

    allocation.usage[resource] = Math.max(0, allocation.usage[resource] - amount);
    allocation.updatedAt = new Date();

    await this.storeAllocation(allocation);
  }

  /**
   * Reset daily usage counters
   */
  async resetDailyUsage(tenantId: string): Promise<void> {
    const allocation = await this.getAllocation(tenantId);
    if (!allocation) {
      throw new Error('Resource allocation not found');
    }

    allocation.usage.apiCalls = 0;
    allocation.lastResetDate = new Date();
    allocation.updatedAt = new Date();

    await this.storeAllocation(allocation);
  }

  /**
   * Reset monthly usage counters
   */
  async resetMonthlyUsage(tenantId: string): Promise<void> {
    const allocation = await this.getAllocation(tenantId);
    if (!allocation) {
      throw new Error('Resource allocation not found');
    }

    allocation.usage.bandwidth = 0;
    allocation.updatedAt = new Date();

    await this.storeAllocation(allocation);
  }

  /**
   * Get resource analytics
   */
  async getResourceAnalytics(tenantId: string, period: 'day' | 'week' | 'month' | 'quarter' | 'year'): Promise<ResourceAnalytics> {
    const allocation = await this.getAllocation(tenantId);
    if (!allocation) {
      throw new Error('Resource allocation not found');
    }

    const utilization = {
      users: this.calculateUtilization(allocation.usage.users, allocation.quota.maxUsers),
      proofs: this.calculateUtilization(allocation.usage.proofs, allocation.quota.maxProofs),
      storage: this.calculateUtilization(allocation.usage.storage, allocation.quota.maxStorage),
      apiCalls: this.calculateUtilization(allocation.usage.apiCalls, allocation.quota.maxApiCalls),
      bandwidth: this.calculateUtilization(allocation.usage.bandwidth, allocation.quota.maxBandwidth),
      customDomains: this.calculateUtilization(allocation.usage.customDomains, allocation.quota.maxCustomDomains),
      apiKeys: this.calculateUtilization(allocation.usage.apiKeys, allocation.quota.maxApiKeys)
    };

    const trends = await this.getResourceTrends(tenantId, period);

    return {
      period,
      usage: allocation.usage,
      quota: allocation.quota,
      utilization,
      trends
    };
  }

  /**
   * Get resource usage alerts
   */
  async getResourceAlerts(tenantId: string): Promise<Array<{
    type: 'warning' | 'critical';
    resource: keyof ResourceUsage;
    message: string;
    percentage: number;
  }>> {
    const allocation = await this.getAllocation(tenantId);
    if (!allocation) {
      return [];
    }

    const alerts: Array<{
      type: 'warning' | 'critical';
      resource: keyof ResourceUsage;
      message: string;
      percentage: number;
    }> = [];

    for (const [resource, usage] of Object.entries(allocation.usage) as [keyof ResourceUsage, number][]) {
      const max = allocation.quota[resource];
      const percentage = this.calculateUtilization(usage, max);

      if (percentage >= 90) {
        alerts.push({
          type: 'critical',
          resource,
          message: `Critical: ${resource} usage is at ${percentage}% (${usage}/${max})`,
          percentage
        });
      } else if (percentage >= 75) {
        alerts.push({
          type: 'warning',
          resource,
          message: `Warning: ${resource} usage is at ${percentage}% (${usage}/${max})`,
          percentage
        });
      }
    }

    return alerts;
  }

  /**
   * Get plan comparison
   */
  getPlanComparison(): Array<{
    plan: 'basic' | 'premium' | 'enterprise';
    quota: ResourceQuota;
    features: string[];
  }> {
    return [
      {
        plan: 'basic',
        quota: this.planQuotas.basic,
        features: [
          'Up to 5 users',
          '100 proofs per month',
          '1GB storage',
          '1,000 API calls per day',
          '10GB bandwidth per month',
          'Basic support'
        ]
      },
      {
        plan: 'premium',
        quota: this.planQuotas.premium,
        features: [
          'Up to 50 users',
          '5,000 proofs per month',
          '10GB storage',
          '10,000 API calls per day',
          '100GB bandwidth per month',
          '1 custom domain',
          'Priority support',
          'Custom branding'
        ]
      },
      {
        plan: 'enterprise',
        quota: this.planQuotas.enterprise,
        features: [
          'Up to 1,000 users',
          '100,000 proofs per month',
          '100GB storage',
          '100,000 API calls per day',
          '1TB bandwidth per month',
          '5 custom domains',
          'Dedicated support',
          'Advanced features',
          'API access',
          'SLA guarantee'
        ]
      }
    ];
  }

  /**
   * Clean up resource allocation
   */
  async cleanupAllocation(tenantId: string): Promise<void> {
    try {
      await this.deleteStoredAllocation(tenantId);
    } catch (error) {
      console.error('Error cleaning up allocation:', error);
      throw new Error('Failed to cleanup resource allocation');
    }
  }

  /**
   * Store resource allocation
   */
  private async storeAllocation(allocation: ResourceAllocation): Promise<void> {
    // This would store in your database
    console.log(`Storing allocation for tenant ${allocation.tenantId}:`, allocation);
  }

  /**
   * Fetch resource allocation
   */
  private async fetchAllocation(tenantId: string): Promise<ResourceAllocation | null> {
    // This would fetch from your database
    console.log(`Fetching allocation for tenant ${tenantId}`);
    return null; // Return null for now
  }

  /**
   * Delete stored allocation
   */
  private async deleteStoredAllocation(tenantId: string): Promise<void> {
    // This would delete from your database
    console.log(`Deleting allocation for tenant ${tenantId}`);
  }

  /**
   * Calculate utilization percentage
   */
  private calculateUtilization(used: number, max: number): number {
    if (max === 0) return 0;
    return Math.round((used / max) * 100);
  }

  /**
   * Get resource usage trends
   */
  private async getResourceTrends(tenantId: string, period: string): Promise<Array<{
    date: string;
    usage: ResourceUsage;
  }>> {
    // This would fetch historical usage data from your database
    // For now, return empty array
    console.log(`Fetching resource trends for tenant ${tenantId} for period ${period}`);
    return [];
  }

  /**
   * Get resource usage statistics
   */
  async getResourceStats(): Promise<{
    totalTenants: number;
    totalUsage: ResourceUsage;
    totalQuota: ResourceQuota;
    averageUtilization: {
      users: number;
      proofs: number;
      storage: number;
      apiCalls: number;
      bandwidth: number;
      customDomains: number;
      apiKeys: number;
    };
  }> {
    // This would aggregate data across all tenants
    console.log('Fetching resource statistics');
    
    return {
      totalTenants: 0,
      totalUsage: {
        users: 0,
        proofs: 0,
        storage: 0,
        apiCalls: 0,
        bandwidth: 0,
        customDomains: 0,
        apiKeys: 0
      },
      totalQuota: {
        maxUsers: 0,
        maxProofs: 0,
        maxStorage: 0,
        maxApiCalls: 0,
        maxBandwidth: 0,
        maxCustomDomains: 0,
        maxApiKeys: 0
      },
      averageUtilization: {
        users: 0,
        proofs: 0,
        storage: 0,
        apiCalls: 0,
        bandwidth: 0,
        customDomains: 0,
        apiKeys: 0
      }
    };
  }
}
