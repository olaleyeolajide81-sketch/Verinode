import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  FileText, 
  Database, 
  Activity,
  Globe,
  Settings,
  BarChart3,
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TenantData {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'inactive';
  plan: 'basic' | 'premium' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  resourceUsage: {
    users: number;
    proofs: number;
    storage: number;
    apiCalls: number;
    bandwidth: number;
    customDomains: number;
  };
  config: {
    maxUsers: number;
    maxProofs: number;
    maxStorage: number;
    maxApiCalls: number;
    maxBandwidth: number;
    maxCustomDomains: number;
  };
}

interface TenantDashboardProps {
  tenantId: string;
}

export const TenantDashboard: React.FC<TenantDashboardProps> = ({ tenantId }) => {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTenantData();
  }, [tenantId]);

  const fetchTenantData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tenants/${tenantId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Tenant not found');
        } else {
          throw new Error('Failed to fetch tenant data');
        }
        return;
      }

      const result = await response.json();
      setTenant(result.data);
    } catch (error) {
      console.error('Error fetching tenant data:', error);
      setError('Failed to load tenant data');
      toast({
        title: "Error",
        description: "Failed to load tenant data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateUsagePercentage = (used: number, max: number) => {
    return max > 0 ? Math.round((used / max) * 100) : 0;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Tenant Not Found</h3>
        <p className="text-gray-500">The tenant you're looking for doesn't exist or you don't have access to it.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="text-gray-600 mt-2">{tenant.subdomain}.verinode.app</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(tenant.status)}>
            {tenant.status}
          </Badge>
          <Badge className={getPlanColor(tenant.plan)}>
            {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)} Plan
          </Badge>
        </div>
      </div>

      {/* Resource Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ResourceCard
          title="Users"
          used={tenant.resourceUsage.users}
          max={tenant.config.maxUsers}
          icon={Users}
          format="number"
        />
        <ResourceCard
          title="Proofs"
          used={tenant.resourceUsage.proofs}
          max={tenant.config.maxProofs}
          icon={FileText}
          format="number"
        />
        <ResourceCard
          title="Storage"
          used={tenant.resourceUsage.storage}
          max={tenant.config.maxStorage}
          icon={Database}
          format="bytes"
        />
        <ResourceCard
          title="API Calls"
          used={tenant.resourceUsage.apiCalls}
          max={tenant.config.maxApiCalls}
          icon={Activity}
          format="number"
        />
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Information</CardTitle>
                <CardDescription>Basic information about your tenant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Tenant ID</span>
                  <span className="text-sm text-gray-600">{tenant.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Created</span>
                  <span className="text-sm text-gray-600">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Last Updated</span>
                  <span className="text-sm text-gray-600">
                    {new Date(tenant.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Subdomain</span>
                  <span className="text-sm text-gray-600">{tenant.subdomain}.verinode.app</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tenant management tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Security Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Globe className="h-4 w-4 mr-2" />
                  Manage Domains
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Usage</CardTitle>
              <CardDescription>Detailed breakdown of resource consumption</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { name: 'Users', used: tenant.resourceUsage.users, max: tenant.config.maxUsers, icon: Users },
                { name: 'Proofs', used: tenant.resourceUsage.proofs, max: tenant.config.maxProofs, icon: FileText },
                { name: 'Storage', used: tenant.resourceUsage.storage, max: tenant.config.maxStorage, icon: Database, format: 'bytes' },
                { name: 'API Calls', used: tenant.resourceUsage.apiCalls, max: tenant.config.maxApiCalls, icon: Activity },
                { name: 'Bandwidth', used: tenant.resourceUsage.bandwidth, max: tenant.config.maxBandwidth, icon: Globe, format: 'bytes' },
                { name: 'Custom Domains', used: tenant.resourceUsage.customDomains, max: tenant.config.maxCustomDomains, icon: Globe }
              ].map((resource) => {
                const percentage = calculateUsagePercentage(resource.used, resource.max);
                const Icon = resource.icon;
                
                return (
                  <div key={resource.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">{resource.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {resource.format === 'bytes' ? formatBytes(resource.used) : resource.used} / 
                          {resource.format === 'bytes' ? formatBytes(resource.max) : resource.max}
                        </span>
                        <span className={`text-sm font-medium ${getUsageColor(percentage)}`}>
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>Usage trends and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
                <p className="text-gray-500">Detailed analytics and insights will be available here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Overview</CardTitle>
              <CardDescription>Tenant security status and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Data Encryption</p>
                      <p className="text-sm text-gray-600">All data is encrypted at rest and in transit</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Access Control</p>
                      <p className="text-sm text-gray-600">Role-based access control is active</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-600">2FA is available but not required</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Optional</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface ResourceCardProps {
  title: string;
  used: number;
  max: number;
  icon: React.ComponentType<{ className?: string }>;
  format?: 'number' | 'bytes';
}

const ResourceCard: React.FC<ResourceCardProps> = ({ 
  title, 
  used, 
  max, 
  icon: Icon, 
  format = 'number' 
}) => {
  const percentage = calculateUsagePercentage(used, max);
  const usageColor = getUsageColor(percentage);

  const calculateUsagePercentage = (used: number, max: number) => {
    return max > 0 ? Math.round((used / max) * 100) : 0;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  };

  const displayValue = format === 'bytes' ? formatBytes(used) : used.toLocaleString();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Progress value={percentage} className="flex-1 h-2" />
          <span className={`font-medium ${usageColor}`}>{percentage}%</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          of {format === 'bytes' ? formatBytes(max) : max.toLocaleString()} total
        </p>
      </CardContent>
    </Card>
  );
};
