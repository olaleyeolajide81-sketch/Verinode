import { MongoClient, Db, Collection } from 'mongodb';

export class DatabaseManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private url: string;
  private dbName: string;

  constructor(url?: string, dbName?: string) {
    this.url = url || process.env.DATABASE_URL || 'mongodb://localhost:27017';
    this.dbName = dbName || process.env.DATABASE_NAME || 'verinode';
  }

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    try {
      this.client = new MongoClient(this.url);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('Disconnected from MongoDB');
    }
  }

  /**
   * Get database instance
   */
  getDatabase(dbName?: string): Db {
    if (!this.client) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return dbName ? this.client.db(dbName) : this.db!;
  }

  /**
   * Create a new database
   */
  async createDatabase(dbName: string): Promise<void> {
    const db = this.getDatabase(dbName);
    
    // Create a dummy collection to ensure database is created
    await db.createCollection('__init__');
    
    // Drop the dummy collection
    await db.collection('__init__').drop();
    
    console.log(`Database ${dbName} created successfully`);
  }

  /**
   * Drop a database
   */
  async dropDatabase(dbName: string): Promise<void> {
    const admin = this.client?.db().admin();
    if (admin) {
      await admin.dropDatabase(dbName);
      console.log(`Database ${dbName} dropped successfully`);
    }
  }

  /**
   * List all databases
   */
  async listDatabases(): Promise<string[]> {
    const admin = this.client?.db().admin();
    if (admin) {
      const result = await admin.listDatabases();
      return result.databases.map((db: any) => db.name);
    }
    return [];
  }

  /**
   * Check if database exists
   */
  async databaseExists(dbName: string): Promise<boolean> {
    const databases = await this.listDatabases();
    return databases.includes(dbName);
  }

  /**
   * Create collection with indexes
   */
  async createCollectionWithIndexes(
    dbName: string, 
    collectionName: string, 
    indexes: Array<{ key: Record<string, 1 | -1>, name: string }>
  ): Promise<void> {
    const db = this.getDatabase(dbName);
    
    // Create collection if it doesn't exist
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some((col: any) => col.name === collectionName);
    
    if (!collectionExists) {
      await db.createCollection(collectionName);
    }
    
    // Create indexes
    const collection = db.collection(collectionName);
    for (const index of indexes) {
      await collection.createIndex(index.key, { name: index.name });
    }
    
    console.log(`Collection ${collectionName} created with indexes in database ${dbName}`);
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(dbName: string, collectionName: string): Promise<any> {
    const db = this.getDatabase(dbName);
    const stats = await db.collection(collectionName).stats();
    return stats;
  }

  /**
   * Backup database
   */
  async backupDatabase(dbName: string, backupPath: string): Promise<void> {
    // This would integrate with mongodump or similar backup tool
    console.log(`Backup database ${dbName} to ${backupPath}`);
    // Implementation would depend on your backup strategy
  }

  /**
   * Restore database
   */
  async restoreDatabase(backupPath: string, targetDbName?: string): Promise<void> {
    // This would integrate with mongorestore or similar restore tool
    const dbName = targetDbName || this.dbName;
    console.log(`Restore database from ${backupPath} to ${dbName}`);
    // Implementation would depend on your backup strategy
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  /**
   * Execute aggregation pipeline
   */
  async aggregate(dbName: string, collectionName: string, pipeline: any[]): Promise<any[]> {
    const db = this.getDatabase(dbName);
    const collection = db.collection(collectionName);
    return await collection.aggregate(pipeline).toArray();
  }

  /**
   * Execute find query
   */
  async find(
    dbName: string, 
    collectionName: string, 
    query: any = {}, 
    options: any = {}
  ): Promise<any[]> {
    const db = this.getDatabase(dbName);
    const collection = db.collection(collectionName);
    return await collection.find(query, options).toArray();
  }

  /**
   * Execute insert operation
   */
  async insertOne(dbName: string, collectionName: string, document: any): Promise<any> {
    const db = this.getDatabase(dbName);
    const collection = db.collection(collectionName);
    return await collection.insertOne(document);
  }

  /**
   * Execute update operation
   */
  async updateOne(
    dbName: string, 
    collectionName: string, 
    filter: any, 
    update: any, 
    options: any = {}
  ): Promise<any> {
    const db = this.getDatabase(dbName);
    const collection = db.collection(collectionName);
    return await collection.updateOne(filter, update, options);
  }

  /**
   * Execute delete operation
   */
  async deleteOne(dbName: string, collectionName: string, filter: any): Promise<any> {
    const db = this.getDatabase(dbName);
    const collection = db.collection(collectionName);
    return await collection.deleteOne(filter);
  }

  /**
   * Get database size
   */
  async getDatabaseSize(dbName: string): Promise<number> {
    const db = this.getDatabase(dbName);
    const stats = await db.stats();
    return stats.dataSize || 0;
  }

  /**
   * Optimize database
   */
  async optimizeDatabase(dbName: string): Promise<void> {
    const db = this.getDatabase(dbName);
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      await db.collection(collection.name).compact();
    }
    
    console.log(`Database ${dbName} optimized`);
  }
}
