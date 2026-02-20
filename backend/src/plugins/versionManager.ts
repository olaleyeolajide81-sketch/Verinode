export class VersionManager {
  private currentVersion: string;
  private versionCache: Map<string, string> = new Map();

  constructor(currentVersion: string = '1.0.0') {
    this.currentVersion = currentVersion;
  }

  async checkCompatibility(requiredVersion: string): Promise<void> {
    if (!this.isValidVersion(requiredVersion)) {
      throw new Error(`Invalid version format: ${requiredVersion}`);
    }

    if (!this.isCompatible(this.currentVersion, requiredVersion)) {
      throw new Error(
        `Plugin requires Verinode ${requiredVersion} but current version is ${this.currentVersion}`
      );
    }
  }

  isValidVersion(version: string): boolean {
    const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    return versionRegex.test(version);
  }

  isCompatible(current: string, required: string): boolean {
    const currentParsed = this.parseVersion(current);
    const requiredParsed = this.parseVersion(required);

    if (requiredParsed.major > currentParsed.major) {
      return false;
    }

    if (requiredParsed.major === currentParsed.major) {
      if (requiredParsed.minor > currentParsed.minor) {
        return false;
      }
    }

    return true;
  }

  parseVersion(version: string): {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
    build?: string;
  } {
    const mainVersion = version.split('-')[0];
    const [major, minor, patch] = mainVersion.split('.').map(Number);
    
    const prereleaseMatch = version.match(/-([a-zA-Z0-9.-]+)/);
    const buildMatch = version.match(/\+([a-zA-Z0-9.-]+)/);

    return {
      major,
      minor,
      patch,
      prerelease: prereleaseMatch ? prereleaseMatch[1] : undefined,
      build: buildMatch ? buildMatch[1] : undefined
    };
  }

  compareVersions(version1: string, version2: string): number {
    const v1 = this.parseVersion(version1);
    const v2 = this.parseVersion(version2);

    if (v1.major !== v2.major) {
      return v1.major - v2.major;
    }

    if (v1.minor !== v2.minor) {
      return v1.minor - v2.minor;
    }

    if (v1.patch !== v2.patch) {
      return v1.patch - v2.patch;
    }

    if (v1.prerelease && !v2.prerelease) {
      return -1;
    }

    if (!v1.prerelease && v2.prerelease) {
      return 1;
    }

    if (v1.prerelease && v2.prerelease) {
      return v1.prerelease.localeCompare(v2.prerelease);
    }

    return 0;
  }

  isNewerVersion(currentVersion: string, newVersion: string): boolean {
    return this.compareVersions(newVersion, currentVersion) > 0;
  }

  getLatestVersion(versions: string[]): string {
    if (versions.length === 0) {
      throw new Error('No versions provided');
    }

    return versions.reduce((latest, current) => {
      return this.isNewerVersion(latest, current) ? current : latest;
    });
  }

  filterCompatibleVersions(versions: string[], requiredVersion: string): string[] {
    return versions.filter(version => this.isCompatible(version, requiredVersion));
  }

  async getPluginUpdates(currentPluginVersion: string, availableVersions: string[]): Promise<{
    hasUpdate: boolean;
    latestVersion?: string;
    updateType?: 'patch' | 'minor' | 'major';
  }> {
    const compatibleVersions = this.filterCompatibleVersions(availableVersions, this.currentVersion);
    
    if (compatibleVersions.length === 0) {
      return { hasUpdate: false };
    }

    const latestVersion = this.getLatestVersion(compatibleVersions);
    const hasUpdate = this.isNewerVersion(currentPluginVersion, latestVersion);

    if (!hasUpdate) {
      return { hasUpdate: false };
    }

    const current = this.parseVersion(currentPluginVersion);
    const latest = this.parseVersion(latestVersion);
    let updateType: 'patch' | 'minor' | 'major';

    if (latest.major > current.major) {
      updateType = 'major';
    } else if (latest.minor > current.minor) {
      updateType = 'minor';
    } else {
      updateType = 'patch';
    }

    return {
      hasUpdate: true,
      latestVersion,
      updateType
    };
  }

  getVersionRange(version: string): string {
    const parsed = this.parseVersion(version);
    return `^${parsed.major}.${parsed.minor}.${parsed.patch}`;
  }

  satisfiesVersion(version: string, range: string): boolean {
    if (range.startsWith('^')) {
      const rangeVersion = range.substring(1);
      const rangeParsed = this.parseVersion(rangeVersion);
      const versionParsed = this.parseVersion(version);

      if (versionParsed.major !== rangeParsed.major) {
        return false;
      }

      if (versionParsed.minor < rangeParsed.minor) {
        return false;
      }

      if (versionParsed.minor === rangeParsed.minor && versionParsed.patch < rangeParsed.patch) {
        return false;
      }

      return true;
    }

    if (range.startsWith('~')) {
      const rangeVersion = range.substring(1);
      const rangeParsed = this.parseVersion(rangeVersion);
      const versionParsed = this.parseVersion(version);

      if (versionParsed.major !== rangeParsed.major) {
        return false;
      }

      if (versionParsed.minor !== rangeParsed.minor) {
        return false;
      }

      return versionParsed.patch >= rangeParsed.patch;
    }

    return version === range;
  }

  setCurrentVersion(version: string): void {
    if (!this.isValidVersion(version)) {
      throw new Error(`Invalid version format: ${version}`);
    }
    this.currentVersion = version;
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  cacheVersion(pluginId: string, version: string): void {
    this.versionCache.set(pluginId, version);
  }

  getCachedVersion(pluginId: string): string | undefined {
    return this.versionCache.get(pluginId);
  }

  clearVersionCache(): void {
    this.versionCache.clear();
  }

  generateVersionInfo(): {
    current: string;
    supportedRanges: string[];
    compatibilityMatrix: Record<string, string>;
  } {
    const parsed = this.parseVersion(this.currentVersion);
    
    return {
      current: this.currentVersion,
      supportedRanges: [
        `^${parsed.major}.${parsed.minor}.${parsed.patch}`,
        `~${parsed.major}.${parsed.minor}.${parsed.patch}`,
        `${parsed.major}.${parsed.minor}.x`,
        `${parsed.major}.x.x`
      ],
      compatibilityMatrix: {
        [`${parsed.major}.${parsed.minor}.${parsed.patch}`]: 'exact',
        [`^${parsed.major}.${parsed.minor}.${parsed.patch}`]: 'compatible',
        [`~${parsed.major}.${parsed.minor}.${parsed.patch}`]: 'patch-compatible',
        [`${parsed.major}.${parsed.minor}.x`]: 'minor-compatible',
        [`${parsed.major}.x.x`]: 'major-compatible'
      }
    };
  }
}
