import { Schema, model, Document } from 'mongoose';

export interface ITenantConfig extends Document {
  tenantId: string;
  features: {
    publicRegistration: boolean;
    emailVerification: boolean;
    twoFactorAuth: boolean;
    apiAccess: boolean;
    customDomains: boolean;
    analytics: boolean;
    auditLogs: boolean;
    dataExport: boolean;
    integrations: boolean;
    customWorkflows: boolean;
    templates: boolean;
    whiteLabeling: boolean;
  };
  limits: {
    maxUsers: number;
    maxProofs: number;
    maxStorage: number;
    maxApiCalls: number;
    maxBandwidth: number;
    maxCustomDomains: number;
    maxApiKeys: number;
    maxWebhooks: number;
    maxIntegrations: number;
    maxTemplates: number;
  };
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
      preventReuse: number;
    };
    sessionPolicy: {
      maxDuration: number;
      idleTimeout: number;
      concurrentSessions: number;
    };
    ipWhitelist: string[];
    allowedOrigins: string[];
    rateLimiting: {
      enabled: boolean;
      requests: number;
      windowMs: number;
    };
  };
  notifications: {
    email: {
      enabled: boolean;
      welcome: boolean;
      proofCreated: boolean;
      proofVerified: boolean;
      accountSuspended: boolean;
      billing: boolean;
      security: boolean;
    };
    sms: {
      enabled: boolean;
      verification: boolean;
      alerts: boolean;
    };
    push: {
      enabled: boolean;
      proofUpdates: boolean;
      mentions: boolean;
    };
    inApp: {
      enabled: boolean;
      systemUpdates: boolean;
      userActivity: boolean;
    };
  };
  integrations: {
    slack: {
      enabled: boolean;
      webhookUrl?: string;
      channels: string[];
    };
    discord: {
      enabled: boolean;
      webhookUrl?: string;
      channels: string[];
    };
    zapier: {
      enabled: boolean;
      apiKey?: string;
    };
    webhook: {
      enabled: boolean;
      endpoints: Array<{
        id: string;
        url: string;
        events: string[];
        secret?: string;
        active: boolean;
      }>;
    };
  };
  customization: {
    logo?: string;
    favicon?: string;
    customCSS?: string;
    customJS?: string;
    footer: {
      enabled: boolean;
      text?: string;
      links: Array<{
        label: string;
        url: string;
      }>;
    };
    navigation: {
      showBranding: boolean;
      customItems: Array<{
        label: string;
        url: string;
        order: number;
      }>;
    };
  };
  workflows: {
    proofCreation: {
      autoVerify: boolean;
      requireApproval: boolean;
      notifications: boolean;
    };
    userOnboarding: {
      sendWelcome: boolean;
      requireVerification: boolean;
      defaultRole: string;
    };
    dataRetention: {
      autoDelete: boolean;
      retentionDays: number;
      archiveBeforeDelete: boolean;
    };
  };
  compliance: {
    gdpr: {
      enabled: boolean;
      dataProcessing: boolean;
      consentManagement: boolean;
      rightToBeForgotten: boolean;
      dataPortability: boolean;
    };
    sox: {
      enabled: boolean;
      auditTrail: boolean;
      accessControl: boolean;
      changeManagement: boolean;
    };
    hipaa: {
      enabled: boolean;
      encryption: boolean;
      auditLogs: boolean;
      accessControls: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const TenantConfigSchema = new Schema<ITenantConfig>({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    ref: 'Tenant'
  },
  features: {
    publicRegistration: { type: Boolean, default: false },
    emailVerification: { type: Boolean, default: true },
    twoFactorAuth: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    customDomains: { type: Boolean, default: false },
    analytics: { type: Boolean, default: true },
    auditLogs: { type: Boolean, default: true },
    dataExport: { type: Boolean, default: true },
    integrations: { type: Boolean, default: false },
    customWorkflows: { type: Boolean, default: false },
    templates: { type: Boolean, default: true },
    whiteLabeling: { type: Boolean, default: false }
  },
  limits: {
    maxUsers: { type: Number, default: 5 },
    maxProofs: { type: Number, default: 100 },
    maxStorage: { type: Number, default: 1024 },
    maxApiCalls: { type: Number, default: 1000 },
    maxBandwidth: { type: Number, default: 10 },
    maxCustomDomains: { type: Number, default: 0 },
    maxApiKeys: { type: Number, default: 2 },
    maxWebhooks: { type: Number, default: 0 },
    maxIntegrations: { type: Number, default: 0 },
    maxTemplates: { type: Number, default: 5 }
  },
  security: {
    passwordPolicy: {
      minLength: { type: Number, default: 8, min: 6, max: 128 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSymbols: { type: Boolean, default: false },
      preventReuse: { type: Number, default: 5, min: 0, max: 20 }
    },
    sessionPolicy: {
      maxDuration: { type: Number, default: 86400000 }, // 24 hours in ms
      idleTimeout: { type: Number, default: 3600000 }, // 1 hour in ms
      concurrentSessions: { type: Number, default: 3, min: 1, max: 10 }
    },
    ipWhitelist: [{ type: String }],
    allowedOrigins: [{ type: String }],
    rateLimiting: {
      enabled: { type: Boolean, default: true },
      requests: { type: Number, default: 100 },
      windowMs: { type: Number, default: 900000 } // 15 minutes in ms
    }
  },
  notifications: {
    email: {
      enabled: { type: Boolean, default: true },
      welcome: { type: Boolean, default: true },
      proofCreated: { type: Boolean, default: true },
      proofVerified: { type: Boolean, default: true },
      accountSuspended: { type: Boolean, default: true },
      billing: { type: Boolean, default: true },
      security: { type: Boolean, default: true }
    },
    sms: {
      enabled: { type: Boolean, default: false },
      verification: { type: Boolean, default: true },
      alerts: { type: Boolean, default: true }
    },
    push: {
      enabled: { type: Boolean, default: false },
      proofUpdates: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true }
    },
    inApp: {
      enabled: { type: Boolean, default: true },
      systemUpdates: { type: Boolean, default: true },
      userActivity: { type: Boolean, default: false }
    }
  },
  integrations: {
    slack: {
      enabled: { type: Boolean, default: false },
      webhookUrl: String,
      channels: [{ type: String }]
    },
    discord: {
      enabled: { type: Boolean, default: false },
      webhookUrl: String,
      channels: [{ type: String }]
    },
    zapier: {
      enabled: { type: Boolean, default: false },
      apiKey: String
    },
    webhook: {
      enabled: { type: Boolean, default: false },
      endpoints: [{
        id: { type: String, required: true },
        url: { type: String, required: true },
        events: [{ type: String }],
        secret: String,
        active: { type: Boolean, default: true }
      }]
    }
  },
  customization: {
    logo: String,
    favicon: String,
    customCSS: String,
    customJS: String,
    footer: {
      enabled: { type: Boolean, default: true },
      text: String,
      links: [{
        label: { type: String, required: true },
        url: { type: String, required: true }
      }]
    },
    navigation: {
      showBranding: { type: Boolean, default: true },
      customItems: [{
        label: { type: String, required: true },
        url: { type: String, required: true },
        order: { type: Number, default: 0 }
      }]
    }
  },
  workflows: {
    proofCreation: {
      autoVerify: { type: Boolean, default: false },
      requireApproval: { type: Boolean, default: false },
      notifications: { type: Boolean, default: true }
    },
    userOnboarding: {
      sendWelcome: { type: Boolean, default: true },
      requireVerification: { type: Boolean, default: true },
      defaultRole: { type: String, default: 'user' }
    },
    dataRetention: {
      autoDelete: { type: Boolean, default: false },
      retentionDays: { type: Number, default: 365 },
      archiveBeforeDelete: { type: Boolean, default: true }
    }
  },
  compliance: {
    gdpr: {
      enabled: { type: Boolean, default: true },
      dataProcessing: { type: Boolean, default: true },
      consentManagement: { type: Boolean, default: true },
      rightToBeForgotten: { type: Boolean, default: true },
      dataPortability: { type: Boolean, default: true }
    },
    sox: {
      enabled: { type: Boolean, default: false },
      auditTrail: { type: Boolean, default: true },
      accessControl: { type: Boolean, default: true },
      changeManagement: { type: Boolean, default: true }
    },
    hipaa: {
      enabled: { type: Boolean, default: false },
      encryption: { type: Boolean, default: true },
      auditLogs: { type: Boolean, default: true },
      accessControls: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      // Hide sensitive data
      if (ret.integrations?.zapier?.apiKey) {
        ret.integrations.zapier.apiKey = '***';
      }
      if (ret.integrations?.webhook?.endpoints) {
        ret.integrations.webhook.endpoints.forEach((endpoint: any) => {
          if (endpoint.secret) {
            endpoint.secret = '***';
          }
        });
      }
      return ret;
    }
  }
});

// Indexes
TenantConfigSchema.index({ tenantId: 1 });

// Virtual fields
TenantConfigSchema.virtual('isGDPRCompliant').get(function() {
  return this.compliance.gdpr.enabled;
});

TenantConfigSchema.virtual('isSOXCompliant').get(function() {
  return this.compliance.sox.enabled;
});

TenantConfigSchema.virtual('isHIPAACompliant').get(function() {
  return this.compliance.hipaa.enabled;
});

// Instance methods
TenantConfigSchema.methods.enableFeature = function(feature: string) {
  if (this.features.hasOwnProperty(feature)) {
    (this.features as any)[feature] = true;
  }
  return this.save();
};

TenantConfigSchema.methods.disableFeature = function(feature: string) {
  if (this.features.hasOwnProperty(feature)) {
    (this.features as any)[feature] = false;
  }
  return this.save();
};

TenantConfigSchema.methods.updateLimit = function(limit: string, value: number) {
  if (this.limits.hasOwnProperty(limit)) {
    (this.limits as any)[limit] = value;
  }
  return this.save();
};

TenantConfigSchema.methods.addWebhookEndpoint = function(endpoint: any) {
  if (!this.integrations.webhook.enabled) {
    this.integrations.webhook.enabled = true;
  }
  this.integrations.webhook.endpoints.push(endpoint);
  return this.save();
};

TenantConfigSchema.methods.removeWebhookEndpoint = function(endpointId: string) {
  this.integrations.webhook.endpoints = this.integrations.webhook.endpoints.filter(
    (endpoint: any) => endpoint.id !== endpointId
  );
  return this.save();
};

// Static methods
TenantConfigSchema.statics.findByTenantId = function(tenantId: string) {
  return this.findOne({ tenantId });
};

TenantConfigSchema.statics.createDefaultConfig = function(tenantId: string, plan: string) {
  const defaultConfig = this.getDefaultConfigForPlan(plan);
  return this.create({ tenantId, ...defaultConfig });
};

TenantConfigSchema.statics.getDefaultConfigForPlan = function(plan: string) {
  const configs = {
    basic: {
      features: {
        publicRegistration: false,
        emailVerification: true,
        twoFactorAuth: false,
        apiAccess: false,
        customDomains: false,
        analytics: true,
        auditLogs: true,
        dataExport: true,
        integrations: false,
        customWorkflows: false,
        templates: true,
        whiteLabeling: false
      },
      limits: {
        maxUsers: 5,
        maxProofs: 100,
        maxStorage: 1024,
        maxApiCalls: 1000,
        maxBandwidth: 10,
        maxCustomDomains: 0,
        maxApiKeys: 2,
        maxWebhooks: 0,
        maxIntegrations: 0,
        maxTemplates: 5
      }
    },
    premium: {
      features: {
        publicRegistration: true,
        emailVerification: true,
        twoFactorAuth: true,
        apiAccess: true,
        customDomains: true,
        analytics: true,
        auditLogs: true,
        dataExport: true,
        integrations: true,
        customWorkflows: false,
        templates: true,
        whiteLabeling: true
      },
      limits: {
        maxUsers: 50,
        maxProofs: 5000,
        maxStorage: 10240,
        maxApiCalls: 10000,
        maxBandwidth: 100,
        maxCustomDomains: 1,
        maxApiKeys: 10,
        maxWebhooks: 5,
        maxIntegrations: 3,
        maxTemplates: 20
      }
    },
    enterprise: {
      features: {
        publicRegistration: true,
        emailVerification: true,
        twoFactorAuth: true,
        apiAccess: true,
        customDomains: true,
        analytics: true,
        auditLogs: true,
        dataExport: true,
        integrations: true,
        customWorkflows: true,
        templates: true,
        whiteLabeling: true
      },
      limits: {
        maxUsers: 1000,
        maxProofs: 100000,
        maxStorage: 102400,
        maxApiCalls: 100000,
        maxBandwidth: 1000,
        maxCustomDomains: 5,
        maxApiKeys: 50,
        maxWebhooks: 20,
        maxIntegrations: 10,
        maxTemplates: 100
      }
    }
  };

  return configs[plan] || configs.basic;
};

// Pre-save middleware
TenantConfigSchema.pre('save', function(next) {
  // Validate webhook endpoints
  if (this.integrations.webhook.endpoints) {
    this.integrations.webhook.endpoints.forEach((endpoint: any) => {
      if (!endpoint.url || !endpoint.events || endpoint.events.length === 0) {
        throw new Error('Webhook endpoint must have URL and at least one event');
      }
    });
  }
  
  next();
});

export const TenantConfig = model<ITenantConfig>('TenantConfig', TenantConfigSchema);
