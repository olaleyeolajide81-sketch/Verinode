export interface BrandingConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  logo?: string;
  favicon?: string;
  theme?: 'light' | 'dark' | 'auto';
  customCSS?: string;
}

export interface BrandingValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class BrandingService {
  private defaultBranding: BrandingConfig = {
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    accentColor: '#10b981',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    fontFamily: 'Inter, system-ui, sans-serif',
    theme: 'light'
  };

  /**
   * Create branding for a tenant
   */
  async createBranding(tenantId: string, branding: BrandingConfig): Promise<{
    tenantId: string;
    branding: BrandingConfig;
    createdAt: Date;
    updatedAt: Date;
  }> {
    // Validate branding configuration
    const validation = await this.validateBrandingConfig(branding);
    if (!validation.valid) {
      throw new Error(`Invalid branding configuration: ${validation.errors.join(', ')}`);
    }

    // Apply defaults for missing values
    const finalBranding = { ...this.defaultBranding, ...branding };

    // Store branding configuration
    await this.storeBranding(tenantId, finalBranding);

    // Apply branding assets (logo, favicon, etc.)
    await this.applyBrandingAssets(tenantId, finalBranding);

    return {
      tenantId,
      branding: finalBranding,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get branding for a tenant
   */
  async getBranding(tenantId: string): Promise<BrandingConfig | null> {
    try {
      const branding = await this.fetchBranding(tenantId);
      return branding;
    } catch (error) {
      console.error('Error fetching branding:', error);
      return null;
    }
  }

  /**
   * Update branding for a tenant
   */
  async updateBranding(tenantId: string, updates: Partial<BrandingConfig>): Promise<BrandingConfig> {
    const existingBranding = await this.getBranding(tenantId);
    if (!existingBranding) {
      throw new Error('Branding not found for tenant');
    }

    // Validate updates
    const validation = await this.validateBrandingConfig(updates);
    if (!validation.valid) {
      throw new Error(`Invalid branding configuration: ${validation.errors.join(', ')}`);
    }

    // Merge with existing branding
    const updatedBranding = { ...existingBranding, ...updates };

    // Store updated branding
    await this.storeBranding(tenantId, updatedBranding);

    // Apply branding assets
    await this.applyBrandingAssets(tenantId, updatedBranding);

    return updatedBranding;
  }

  /**
   * Delete branding for a tenant
   */
  async deleteBranding(tenantId: string): Promise<void> {
    try {
      // Remove branding assets
      await this.removeBrandingAssets(tenantId);

      // Delete branding configuration
      await this.deleteStoredBranding(tenantId);
    } catch (error) {
      console.error('Error deleting branding:', error);
      throw new Error('Failed to delete branding');
    }
  }

  /**
   * Generate CSS from branding configuration
   */
  async generateCSS(tenantId: string): Promise<string> {
    const branding = await this.getBranding(tenantId);
    const config = branding || this.defaultBranding;

    const css = `
:root {
  --primary-color: ${config.primaryColor};
  --secondary-color: ${config.secondaryColor};
  --accent-color: ${config.accentColor};
  --background-color: ${config.backgroundColor};
  --text-color: ${config.textColor};
  --font-family: ${config.fontFamily};
}

body {
  background-color: var(--background-color);
  color: var(--text-color);
  font-family: var(--font-family);
}

.btn-primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.btn-secondary {
  background-color: var(--secondary-color);
  border-color: var(--secondary-color);
}

.btn-accent {
  background-color: var(--accent-color);
  border-color: var(--accent-color);
}

.header {
  background-color: var(--primary-color);
}

.sidebar {
  background-color: var(--secondary-color);
}

.card {
  border-color: var(--secondary-color);
}

.link {
  color: var(--primary-color);
}

.link:hover {
  color: var(--accent-color);
}

${config.customCSS || ''}
    `.trim();

    return css;
  }

  /**
   * Validate branding configuration
   */
  async validateBrandingConfig(config: Partial<BrandingConfig>): Promise<BrandingValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate colors
    if (config.primaryColor && !this.isValidColor(config.primaryColor)) {
      errors.push('Invalid primary color format');
    }

    if (config.secondaryColor && !this.isValidColor(config.secondaryColor)) {
      errors.push('Invalid secondary color format');
    }

    if (config.accentColor && !this.isValidColor(config.accentColor)) {
      errors.push('Invalid accent color format');
    }

    if (config.backgroundColor && !this.isValidColor(config.backgroundColor)) {
      errors.push('Invalid background color format');
    }

    if (config.textColor && !this.isValidColor(config.textColor)) {
      errors.push('Invalid text color format');
    }

    // Validate URLs
    if (config.logo && !this.isValidURL(config.logo)) {
      errors.push('Invalid logo URL');
    }

    if (config.favicon && !this.isValidURL(config.favicon)) {
      errors.push('Invalid favicon URL');
    }

    // Validate font family
    if (config.fontFamily && !this.isValidFontFamily(config.fontFamily)) {
      warnings.push('Font family may not be supported');
    }

    // Validate theme
    if (config.theme && !['light', 'dark', 'auto'].includes(config.theme)) {
      errors.push('Invalid theme value');
    }

    // Check color contrast
    if (config.primaryColor && config.backgroundColor) {
      if (!this.hasGoodContrast(config.primaryColor, config.backgroundColor)) {
        warnings.push('Primary color may not have good contrast with background');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate branding preview
   */
  async generatePreview(tenantId: string, config: Partial<BrandingConfig>): Promise<{
    html: string;
    css: string;
  }> {
    const finalConfig = { ...this.defaultBranding, ...config };
    const css = await this.generateCSSForConfig(finalConfig);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Branding Preview</title>
    <style>${css}</style>
</head>
<body>
    <div class="preview-container">
        <header class="header">
            <h1>Verinode</h1>
            <nav>
                <a href="#" class="link">Dashboard</a>
                <a href="#" class="link">Proofs</a>
                <a href="#" class="link">Settings</a>
            </nav>
        </header>
        
        <main>
            <div class="sidebar">
                <h3>Sidebar</h3>
                <ul>
                    <li><a href="#" class="link">Item 1</a></li>
                    <li><a href="#" class="link">Item 2</a></li>
                    <li><a href="#" class="link">Item 3</a></li>
                </ul>
            </div>
            
            <div class="content">
                <h2>Welcome to Verinode</h2>
                <p>This is a preview of your branding configuration.</p>
                
                <div class="card">
                    <h3>Sample Card</h3>
                    <p>This is how cards will look with your branding.</p>
                    <button class="btn-primary">Primary Button</button>
                    <button class="btn-secondary">Secondary Button</button>
                    <button class="btn-accent">Accent Button</button>
                </div>
            </div>
        </main>
    </div>
</body>
</html>
    `.trim();

    return { html, css };
  }

  /**
   * Store branding configuration
   */
  private async storeBranding(tenantId: string, branding: BrandingConfig): Promise<void> {
    // This would store in your database
    console.log(`Storing branding for tenant ${tenantId}:`, branding);
  }

  /**
   * Fetch branding configuration
   */
  private async fetchBranding(tenantId: string): Promise<BrandingConfig | null> {
    // This would fetch from your database
    console.log(`Fetching branding for tenant ${tenantId}`);
    return null; // Return null for now
  }

  /**
   * Delete stored branding
   */
  private async deleteStoredBranding(tenantId: string): Promise<void> {
    // This would delete from your database
    console.log(`Deleting branding for tenant ${tenantId}`);
  }

  /**
   * Apply branding assets
   */
  private async applyBrandingAssets(tenantId: string, branding: BrandingConfig): Promise<void> {
    // This would handle logo, favicon, and other assets
    if (branding.logo) {
      console.log(`Applying logo for tenant ${tenantId}: ${branding.logo}`);
    }
    if (branding.favicon) {
      console.log(`Applying favicon for tenant ${tenantId}: ${branding.favicon}`);
    }
  }

  /**
   * Remove branding assets
   */
  private async removeBrandingAssets(tenantId: string): Promise<void> {
    // This would remove logo, favicon, and other assets
    console.log(`Removing branding assets for tenant ${tenantId}`);
  }

  /**
   * Generate CSS for specific configuration
   */
  private async generateCSSForConfig(config: BrandingConfig): Promise<string> {
    const css = `
:root {
  --primary-color: ${config.primaryColor};
  --secondary-color: ${config.secondaryColor};
  --accent-color: ${config.accentColor};
  --background-color: ${config.backgroundColor};
  --text-color: ${config.textColor};
  --font-family: ${config.fontFamily};
}

body {
  background-color: var(--background-color);
  color: var(--text-color);
  font-family: var(--font-family);
  margin: 0;
  padding: 20px;
}

.preview-container {
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  background-color: var(--primary-color);
  color: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header nav a {
  color: white;
  margin-left: 20px;
  text-decoration: none;
}

main {
  display: flex;
  gap: 20px;
}

.sidebar {
  background-color: var(--secondary-color);
  color: white;
  padding: 20px;
  border-radius: 8px;
  width: 200px;
}

.sidebar ul {
  list-style: none;
  padding: 0;
}

.sidebar li {
  margin: 10px 0;
}

.content {
  flex: 1;
}

.card {
  border: 2px solid var(--secondary-color);
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}

.btn-primary, .btn-secondary, .btn-accent {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  margin-right: 10px;
  cursor: pointer;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-secondary {
  background-color: var(--secondary-color);
  color: white;
}

.btn-accent {
  background-color: var(--accent-color);
  color: white;
}

.link {
  color: var(--primary-color);
  text-decoration: none;
}

.link:hover {
  color: var(--accent-color);
}
    `.trim();

    return css;
  }

  /**
   * Validate color format
   */
  private isValidColor(color: string): boolean {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return colorRegex.test(color);
  }

  /**
   * Validate URL format
   */
  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate font family
   */
  private isValidFontFamily(fontFamily: string): boolean {
    const validFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New', 'Courier',
      'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact', 'system-ui', 'sans-serif',
      'serif', 'monospace', 'cursive', 'fantasy'
    ];

    return validFonts.some(font => fontFamily.includes(font));
  }

  /**
   * Check color contrast
   */
  private hasGoodContrast(color1: string, color2: string): boolean {
    // Simple contrast check - in production, use WCAG contrast calculation
    return color1 !== color2;
  }
}
