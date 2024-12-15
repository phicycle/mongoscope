declare module 'mongoscope' {
  export interface MongoScopeConfig {
    /**
     * MongoDB connection string
     * @example 'mongodb://localhost:27017/your-database'
     */
    mongoUrl: string;

    /**
     * Port number for the dashboard server
     * @default 3000
     */
    port?: number;

    /**
     * Additional configuration options
     */
    [key: string]: any;
  }

  export interface CollectionStats {
    /**
     * Name of the collection
     */
    name: string;

    /**
     * Total size of the collection in bytes
     */
    size?: number;

    /**
     * Number of documents in the collection
     */
    count: number;

    /**
     * Average object size in bytes
     */
    avgObjSize: number;

    /**
     * Storage size in bytes
     */
    storageSize: number;

    /**
     * Total index size in bytes
     */
    totalIndexSize: number;
  }

  export interface AnalyticsResult {
    /**
     * Collection statistics
     */
    stats: CollectionStats;

    /**
     * Field distribution analysis
     */
    fieldAnalysis: {
      [fieldName: string]: {
        count: number;
        types: { [type: string]: number };
        samples?: any[];
      };
    };

    /**
     * Time-based metrics
     */
    timeMetrics: {
      insertions: { [date: string]: number };
      updates: { [date: string]: number };
      deletions: { [date: string]: number };
    };
  }

  export class MongoAnalytics {
    constructor(config: MongoScopeConfig);

    /**
     * Connect to MongoDB instance
     */
    connect(): Promise<void>;

    /**
     * Disconnect from MongoDB instance
     */
    disconnect(): Promise<void>;

    /**
     * Get list of all collections
     */
    getCollections(): Promise<{ name: string; size?: number }[]>;

    /**
     * Get detailed analytics for a specific collection
     */
    getCollectionAnalytics(collectionName: string): Promise<AnalyticsResult>;
  }

  export class UIServer {
    constructor(analyzer: MongoAnalytics, config: MongoScopeConfig);

    /**
     * Start the dashboard server
     */
    start(): Promise<void>;

    /**
     * Stop the dashboard server
     */
    stop(): Promise<void>;
  }

  export default class AnalyticsDashboard {
    constructor(config: MongoScopeConfig);

    /**
     * Start both MongoDB connection and dashboard server
     */
    start(): Promise<void>;

    /**
     * Stop both MongoDB connection and dashboard server
     */
    stop(): Promise<void>;

    /**
     * MongoDB Analytics instance
     */
    analyzer: MongoAnalytics;

    /**
     * Dashboard UI Server instance
     */
    server: UIServer;
  }
}
