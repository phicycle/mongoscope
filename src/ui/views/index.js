const express = require('express');
const path = require('path');

class UIServer {
  constructor(analyzer, config) {
    this.analyzer = analyzer;
    this.config = config;
    this.app = express();
    this.server = null;
    this.setupServer();
  }

  setupServer() {
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, 'views'));
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    this.app.use('/htmx', express.static(path.join(__dirname, '../../node_modules/htmx.org/dist')));
    
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.get('/', async (req, res) => {
      const collections = await this.analyzer.getCollections();
      res.render('index', { collections });
    });

    this.app.get('/collection-selected/:collection', async (req, res) => {
      const collection = req.params.collection;
      const stats = await this.analyzer.getCollectionStats(collection);
      const fields = await this.getCollectionFields(collection);
      
      res.render('partials/collection-details', { 
        collection, 
        stats,
        fields 
      });
    });

    this.app.get('/timeseries/:collection', async (req, res) => {
      const timeframe = req.query.timeframe || 'daily';
      const data = await this.analyzer.timeSeries.analyze({
        collection: req.params.collection,
        timeField: 'createdAt',
        timeframe,
        metrics: ['count']
      });
      
      res.render('partials/timeseries', { data });
    });

    this.app.get('/distribution/:collection', async (req, res) => {
      const field = req.query.field;
      const data = await this.analyzer.fields.analyze({
        collection: req.params.collection,
        field,
        type: 'distribution'
      });
      
      res.render('partials/distribution', { data, field });
    });
  }

  async getCollectionFields(collection) {
    const sample = await this.analyzer.db.collection(collection)
      .findOne({}, { projection: { _id: 0 } });
    return sample ? Object.keys(sample) : [];
  }
}

module.exports = UIServer;