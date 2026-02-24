import { Schema, model, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  subdomain: string;
  ownerId: string;
  plan: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'suspended' | 'inactive';
  isolationId: string;
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    theme?: 'light' | 'dark' | 'auto';
  };
  metadata: {
    companyName?: string;
    industry?: string;
    size?: string;
    website?: string;
    description?: string;
  };
  billing: {
    subscriptionId?: string;
    planId?: string;
    status: 'active' | 'cancelled' | 'past_due';
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  };
  compliance: {
    gdprCompliant: boolean;
    dataRetentionDays: number;
    auditLogRetentionDays: number;
    encryptionEnabled: boolean;
    twoFactorEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
}

const TenantSchema = new Schema<ITenant>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  subdomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/
  },
  ownerId: {
    type: String,
    required: true,
    ref: 'User'
  },
  plan: {
    type: String,
    required: true,
    enum: ['basic', 'premium', 'enterprise'],
    default: 'basic'
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  isolationId: {
    type: String,
    required: true,
    unique: true
  },
  branding: {
    primaryColor: {
      type: String,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      default: '#3b82f6'
    },
    secondaryColor: {
      type: String,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      default: '#64748b'
    },
    logo: String,
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    }
  },
  metadata: {
    companyName: String,
    industry: String,
    size: String,
    website: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Website must be a valid URL'
      }
    },
    description: {
      type: String,
      maxlength: 500
    }
  },
  billing: {
    subscriptionId: String,
    planId: String,
    status: {
      type: String,
      enum: ['active', 'cancelled', 'past_due'],
      default: 'active'
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    }
  },
  compliance: {
    gdprCompliant: {
      type: Boolean,
      default: true
    },
    dataRetentionDays: {
      type: Number,
      default: 365,
      min: 30,
      max: 2555
    },
    auditLogRetentionDays: {
      type: Number,
      default: 90,
      min: 30,
      max: 365
    },
    encryptionEnabled: {
      type: Boolean,
      default: true
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    }
  },
  lastActiveAt: Date
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better performance
TenantSchema.index({ subdomain: 1 });
TenantSchema.index({ ownerId: 1 });
TenantSchema.index({ status: 1 });
TenantSchema.index({ plan: 1 });
TenantSchema.index({ createdAt: -1 });
TenantSchema.index({ lastActiveAt: -1 });

// Virtual fields
TenantSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

TenantSchema.virtual('isSuspended').get(function() {
  return this.status === 'suspended';
});

TenantSchema.virtual('isInactive').get(function() {
  return this.status === 'inactive';
});

// Instance methods
TenantSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

TenantSchema.methods.suspend = function(reason?: string) {
  this.status = 'suspended';
  return this.save();
};

TenantSchema.methods.activate = function() {
  this.status = 'active';
  this.lastActiveAt = new Date();
  return this.save();
};

TenantSchema.methods.deactivate = function() {
  this.status = 'inactive';
  return this.save();
};

TenantSchema.methods.changePlan = function(newPlan: 'basic' | 'premium' | 'enterprise') {
  this.plan = newPlan;
  return this.save();
};

// Static methods
TenantSchema.statics.findBySubdomain = function(subdomain: string) {
  return this.findOne({ subdomain: subdomain.toLowerCase() });
};

TenantSchema.statics.findByOwner = function(ownerId: string, options: any = {}) {
  const query = this.find({ ownerId });
  
  if (options.status) {
    query.where({ status: options.status });
  }
  
  if (options.plan) {
    query.where({ plan: options.plan });
  }
  
  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ createdAt: -1 });
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  if (options.skip) {
    query.skip(options.skip);
  }
  
  return query;
};

TenantSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

TenantSchema.statics.findSuspended = function() {
  return this.find({ status: 'suspended' });
};

TenantSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$count' },
        statuses: {
          $push: {
            status: '$_id',
            count: '$count'
          }
        }
      }
    }
  ]);
};

TenantSchema.statics.getPlanStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Pre-save middleware
TenantSchema.pre('save', function(next) {
  if (this.isModified('subdomain')) {
    this.subdomain = this.subdomain.toLowerCase();
  }
  
  if (this.isModified('status') && this.status === 'active') {
    this.lastActiveAt = new Date();
  }
  
  next();
});

// Pre-remove middleware
TenantSchema.pre('remove', function(next) {
  // Clean up related data before removing tenant
  console.log(`Removing tenant: ${this.name} (${this.subdomain})`);
  next();
});

// Post-save middleware
TenantSchema.post('save', function(doc) {
  if (doc.isModified('status')) {
    console.log(`Tenant ${doc.name} status changed to: ${doc.status}`);
  }
});

export const Tenant = model<ITenant>('Tenant', TenantSchema);
