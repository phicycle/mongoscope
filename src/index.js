const MongoAnalytics = require('./analyzer');
const UIServer = require('./ui/server');

class AnalyticsDashboard {
  constructor(config) {
    this.config = {
      mongoUrl: config.mongoUrl,
      port: config.port || 3000,
      ...config
    };

    if (!this.config.mongoUrl) {
      throw new Error('MongoDB connection string is required');
    }

    this.analyzer = new MongoAnalytics(this.config);
    this.server = new UIServer(this.analyzer, this.config);
  }

  async start() {
    await this.analyzer.connect();
    await this.server.start();
    console.log(`MongoScope running on http://localhost:${this.config.port}`);
  }

  async stop() {
    await this.analyzer.disconnect();
    await this.server.stop();
  }
}

module.exports = AnalyticsDashboard;