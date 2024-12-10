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
    
    // Serve HTMX from node_modules
    this.app.use('/htmx', express.static(path.join(__dirname, '../../node_modules/htmx.org/dist')));
    
    this.setupRoutes();
  }

  setupRoutes() {
    // Main page
    this.app.get('/', async (req, res) => {
      const collections = await this.analyzer.getCollections();
      res.render('index', { collections });
    });

    // Collection selection triggers multiple updates
    this.app.get('/collection-selected', async (req, res) => {
      try {
        const collection = req.query.collection;
        if (!collection) {
          return res.status(400).send('Collection name is required');
        }
        
        const stats = await this.analyzer.getCollectionStats(collection);
        const fields = await this.analyzer.getCollectionFields(collection);
        
        // Add default dates and timeframe
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
        const endDate = new Date();
        const timeframe = 'daily'; // Default timeframe
        
        res.render('partials/collection-details', { 
          collection, 
          stats,
          fields,
          timeframe,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });
      } catch (error) {
        console.error('Error loading collection details:', error);
        res.status(500).send('Error loading collection details');
      }
    });

    // Time series data with different timeframes
    this.app.get('/timeseries/:collection', async (req, res) => {
      try {
        const timeframe = req.query.timeframe || 'daily';
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

        const data = await this.analyzer.timeSeries.analyze({
          collection: req.params.collection,
          timeField: 'createdAt',
          timeframe,
          startDate,
          endDate,
          metrics: ['count']
        });
        
        if (!data || !Array.isArray(data)) {
          return { error: 'Invalid time series data' };
        }
        
        res.render('partials/timeseries', { data });
      } catch (error) {
        console.error('Error in timeseries route:', error);
        res.status(500).send('Error generating time series data');
      }
    });

    // Field distribution analysis
    this.app.get('/distribution/:collection', async (req, res) => {
      try {
        const field = req.query.field;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

        if (!field) {
          return res.status(400).send('Field parameter is required');
        }

        const match = {
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        };

        const data = await this.analyzer.fields.analyze({
          collection: req.params.collection,
          field,
          type: 'distribution',
          match,
          limit: 20
        });

        res.render('partials/distribution', { 
          data, 
          field 
        });
      } catch (error) {
        console.error('Error in distribution route:', error);
        res.status(500).send('Error generating distribution data');
      }
    });

    // Date range update handler
    this.app.get('/update-date-range/:collection', async (req, res) => {
      try {
        const collection = req.params.collection;
        let startDate, endDate, timeframe;
        
        // Handle preset dates
        switch(req.query.preset) {
          case 'today':
            startDate = new Date();
            startDate.setHours(0,0,0,0);
            endDate = new Date();
            timeframe = 'hourly';
            break;
          case 'week':
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            endDate = new Date();
            timeframe = 'daily';
            break;
          case 'month':
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
            endDate = new Date();
            timeframe = 'daily';
            break;
          case 'year':
            startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 1);
            endDate = new Date();
            timeframe = 'monthly';
            break;
          default:
            // Handle custom date range
            startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
            timeframe = req.query.timeframe || 'daily'; // Use provided timeframe or default to daily
        }

        // Get fields for the selects
        const fields = await this.analyzer.getCollectionFields(collection);

        // Get initial time series data with calculated timeframe
        const timeSeriesData = await this.analyzer.timeSeries.analyze({
          collection,
          timeField: 'createdAt',
          timeframe,
          startDate,
          endDate,
          metrics: ['count']
        });

        // Render the analytics content with timeframe included
        res.render('partials/analytics-content', { 
          collection,
          fields,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          timeframe, // Added timeframe to the response
          timeSeriesData
        });
      } catch (error) {
        console.error('Error updating date range:', error);
        res.status(500).send('Error updating date range');
      }
    });

    // Advanced analytics
    this.app.get('/advanced-analytics/:collection', async (req, res) => {
      try {
        const { collection } = req.params;
        const { advancedField, analysisType = 'quality', secondaryField } = req.query;
        
        // Early return if no field selected
        if (!advancedField) {
          return res.render('partials/advanced-analytics', { 
            data: { error: 'Please select a field to analyze' },
            analysisType,
            field: '',
            secondaryField: ''
          });
        }

        let data = null;
        try {
          data = await this.analyzer.fields.analyze({
            collection,
            field: advancedField,
            type: analysisType,
            secondaryField,
            match: {}
          });
        } catch (error) {
          console.error('Analysis error:', error);
          data = { error: error.message || 'Error performing analysis' };
        }

        return res.render('partials/advanced-analytics', { 
          data,
          analysisType,
          field: advancedField,
          secondaryField: secondaryField || '',
        });

      } catch (error) {
        console.error('Error in advanced analytics:', error);
        return res.render('partials/advanced-analytics', { 
          data: { error: 'An unexpected error occurred' },
          analysisType: req.query.analysisType || 'quality',
          field: req.query.advancedField || '',
          secondaryField: req.query.secondaryField || '',
        });
      }
    });
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

module.exports = UIServer;