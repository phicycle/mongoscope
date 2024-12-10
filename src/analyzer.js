const { MongoClient } = require('mongodb');
const TimeSeriesAggregation = require('./aggregations/timeSeriesAggregation');
const FieldAnalytics = require('./aggregations/fieldAnalytics');
const RelationshipAnalytics = require('./aggregations/relationshipAnalytics');

class MongoAnalytics {
  constructor(config) {
    this.mongoUrl = config.mongoUrl;
    this.client = null;
    this.db = null;
  }

  async connect() {
    this.client = await MongoClient.connect(this.mongoUrl);
    this.db = this.client.db();
    this.initializeAggregators();
  }

  initializeAggregators() {
    this.timeSeries = new TimeSeriesAggregation(this.db);
    this.fields = new FieldAnalytics(this.db);
    this.relationships = new RelationshipAnalytics(this.db);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
    }
  }

  // Get list of all collections
  async getCollections() {
    return await this.db.listCollections().toArray();
  }

  // Get basic collection stats
  async getCollectionStats(collectionName) {
    try {
      const stats = await this.db.command({
        collStats: collectionName,
        scale: 1
      });
      return {
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        nindexes: stats.nindexes
      };
    } catch (error) {
      console.error('Error getting collection stats:', error);
      return {
        count: 0,
        size: 0,
        avgObjSize: 0,
        nindexes: 0
      };
    }
  }

  // Add this method if it doesn't exist
  async getCollectionFields(collectionName) {
    const sample = await this.db.collection(collectionName).findOne();
    return sample ? Object.keys(sample) : [];
  }
}

module.exports = MongoAnalytics;