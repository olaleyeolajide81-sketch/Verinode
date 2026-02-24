import { Request, Response } from 'express';
import { TenantService } from '../tenant/tenantService';
import { ResourceManager } from '../tenant/resourceManager';
import { BrandingService } from '../tenant/brandingService';

export class TenantController {
  private tenantService: TenantService;
  private resourceManager: ResourceManager;
  private brandingService: BrandingService;

  constructor() {
    this.tenantService = new TenantService();
    this.resourceManager = new ResourceManager();
    this.brandingService = new BrandingService();
  }

  /**
   * Create a new tenant
   */
  createTenant = async (req: Request, res: Response) => {
    try {
      const { name, subdomain, plan, branding, config } = req.body;
      const ownerId = req.user?.id;

      if (!ownerId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      if (!name || !subdomain || !plan) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Name, subdomain, and plan are required'
        });
      }

      const tenantData = {
        name,
        subdomain,
        ownerId,
        plan,
        branding,
        config
      };

      const tenant = await this.tenantService.createTenant(tenantData);

      res.status(201).json({
        success: true,
        data: tenant,
        message: 'Tenant created successfully'
      });
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      res.status(400).json({
        error: 'Bad Request',
        message: error.message || 'Failed to create tenant'
      });
    }
  };

  /**
   * Get tenant by ID
   */
  getTenant = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const hasAccess = await this.tenantService.hasAccessToTenant(userId, tenantId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      const tenant = await this.tenantService.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Tenant not found'
        });
      }

      res.json({
        success: true,
        data: tenant
      });
    } catch (error: any) {
      console.error('Error getting tenant:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get tenant'
      });
    }
  };

  /**
   * Get tenant by subdomain
   */
  getTenantBySubdomain = async (req: Request, res: Response) => {
    try {
      const { subdomain } = req.params;

      const tenant = await this.tenantService.getTenantBySubdomain(subdomain);
      if (!tenant) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Tenant not found'
        });
      }

      res.json({
        success: true,
        data: tenant
      });
    } catch (error: any) {
      console.error('Error getting tenant by subdomain:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get tenant'
      });
    }
  };

  /**
   * Update tenant
   */
  updateTenant = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.id;
      const updates = req.body;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const hasAccess = await this.tenantService.hasAccessToTenant(userId, tenantId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      const tenant = await this.tenantService.updateTenant(tenantId, updates);

      res.json({
        success: true,
        data: tenant,
        message: 'Tenant updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      res.status(400).json({
        error: 'Bad Request',
        message: error.message || 'Failed to update tenant'
      });
    }
  };

  /**
   * Delete tenant
   */
  deleteTenant = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const hasAccess = await this.tenantService.hasAccessToTenant(userId, tenantId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      await this.tenantService.deleteTenant(tenantId);

      res.json({
        success: true,
        message: 'Tenant deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      res.status(400).json({
        error: 'Bad Request',
        message: error.message || 'Failed to delete tenant'
      });
    }
  };

  /**
   * List tenants for user
   */
  listTenants = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const result = await this.tenantService.listTenants(userId, page, limit);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error listing tenants:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to list tenants'
      });
    }
  };

  /**
   * Get tenant analytics
   */
  getTenantAnalytics = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const period = (req.query.period as string) || 'month';
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const hasAccess = await this.tenantService.hasAccessToTenant(userId, tenantId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      const analytics = await this.tenantService.getTenantAnalytics(tenantId, period as any);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      console.error('Error getting tenant analytics:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get tenant analytics'
      });
    }
  };

  /**
   * Check resource limit
   */
  checkResourceLimit = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const { resource, amount } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const hasAccess = await this.tenantService.hasAccessToTenant(userId, tenantId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      const result = await this.resourceManager.checkResourceLimit(tenantId, resource, amount);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error checking resource limit:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to check resource limit'
      });
    }
  };

  /**
   * Consume resource
   */
  consumeResource = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const { resource, amount } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const hasAccess = await this.tenantService.hasAccessToTenant(userId, tenantId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      await this.resourceManager.consumeResource(tenantId, resource, amount);

      res.json({
        success: true,
        message: 'Resource consumed successfully'
      });
    } catch (error: any) {
      console.error('Error consuming resource:', error);
      res.status(400).json({
        error: 'Bad Request',
        message: error.message || 'Failed to consume resource'
      });
    }
  };

  /**
   * Get branding settings
   */
  getBranding = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const hasAccess = await this.tenantService.hasAccessToTenant(userId, tenantId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      const tenant = await this.tenantService.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Tenant not found'
        });
      }

      res.json({
        success: true,
        data: tenant.branding
      });
    } catch (error: any) {
      console.error('Error getting branding:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get branding'
      });
    }
  };

  /**
   * Update branding settings
   */
  updateBranding = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const branding = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const hasAccess = await this.tenantService.hasAccessToTenant(userId, tenantId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      const tenant = await this.tenantService.updateTenant(tenantId, { branding });

      res.json({
        success: true,
        data: tenant.branding,
        message: 'Branding updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating branding:', error);
      res.status(400).json({
        error: 'Bad Request',
        message: error.message || 'Failed to update branding'
      });
    }
  };

  /**
   * Generate CSS from branding
   */
  generateCSS = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;

      const css = await this.brandingService.generateCSS(tenantId);

      res.setHeader('Content-Type', 'text/css');
      res.send(css);
    } catch (error: any) {
      console.error('Error generating CSS:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate CSS'
      });
    }
  };

  /**
   * Generate branding preview
   */
  generatePreview = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const branding = req.body;

      const preview = await this.brandingService.generatePreview(tenantId, branding);

      res.json({
        success: true,
        data: preview
      });
    } catch (error: any) {
      console.error('Error generating preview:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate preview'
      });
    }
  };

  /**
   * Suspend tenant
   */
  suspendTenant = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const hasAccess = await this.tenantService.hasAccessToTenant(userId, tenantId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      await this.tenantService.suspendTenant(tenantId, reason);

      res.json({
        success: true,
        message: 'Tenant suspended successfully'
      });
    } catch (error: any) {
      console.error('Error suspending tenant:', error);
      res.status(400).json({
        error: 'Bad Request',
        message: error.message || 'Failed to suspend tenant'
      });
    }
  };

  /**
   * Activate tenant
   */
  activateTenant = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const hasAccess = await this.tenantService.hasAccessToTenant(userId, tenantId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      await this.tenantService.activateTenant(tenantId);

      res.json({
        success: true,
        message: 'Tenant activated successfully'
      });
    } catch (error: any) {
      console.error('Error activating tenant:', error);
      res.status(400).json({
        error: 'Bad Request',
        message: error.message || 'Failed to activate tenant'
      });
    }
  };

  /**
   * Get resource alerts
   */
  getResourceAlerts = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const hasAccess = await this.tenantService.hasAccessToTenant(userId, tenantId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      const alerts = await this.resourceManager.getResourceAlerts(tenantId);

      res.json({
        success: true,
        data: alerts
      });
    } catch (error: any) {
      console.error('Error getting resource alerts:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get resource alerts'
      });
    }
  };
}
