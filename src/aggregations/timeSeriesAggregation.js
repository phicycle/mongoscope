const dayjs = require('dayjs');

class TimeSeriesAggregation {
  constructor(db) {
    this.db = db;
  }

  async analyze(options) {
    if (!options.collection || !options.timeField) {
      return { error: 'Collection and timeField are required' };
    }
    if (options.timeframe && !['hourly', 'daily', 'monthly', 'yearly'].includes(options.timeframe)) {
      return { error: 'Invalid timeframe specified' };
    }
    
    const {
      collection,
      timeField,
      timeframe = 'daily',
      metrics = ['count'],
      match = {},
      startDate,
      endDate
    } = options;

    const timeMatch = {};
    if (startDate || endDate) {
      timeMatch[timeField] = {};
      if (startDate) timeMatch[timeField].$gte = dayjs(startDate).toDate();
      if (endDate) timeMatch[timeField].$lte = dayjs(endDate).toDate();
    }

    const pipeline = [
      {
        $match: {
          ...match,
          [timeField]: {
            $exists: true,
            ...(timeMatch[timeField] || {})
          }
        }
      },
      {
        $group: {
          _id: this._getTimeGrouping(timeField, timeframe),
          ...this._buildMetrics(metrics)
        }
      },
      { $sort: { '_id': 1 } }
    ];


    const results = await this.db.collection(collection).aggregate(pipeline).toArray();
    
    // Format dates in the response if needed
    return results.map(result => ({
      ...result,
      timestamp: this._createTimestampFromGrouping(result._id, timeframe)
    }));
  }

  _getTimeGrouping(timeField, timeframe) {
    const groupings = {
      hourly: {
        year: { $year: `$${timeField}` },
        month: { $month: `$${timeField}` },
        day: { $dayOfMonth: `$${timeField}` },
        hour: { $hour: `$${timeField}` }
      },
      daily: {
        year: { $year: `$${timeField}` },
        month: { $month: `$${timeField}` },
        day: { $dayOfMonth: `$${timeField}` }
      },
      monthly: {
        year: { $year: `$${timeField}` },
        month: { $month: `$${timeField}` }
      },
      yearly: {
        year: { $year: `$${timeField}` }
      }
    };
    return groupings[timeframe] || groupings.daily;
  }

  _createTimestampFromGrouping(grouping, timeframe) {
    try {
      const year = grouping.year || 0;
      const month = (grouping.month || 1) - 1;
      const day = grouping.day || 1;
      const hour = grouping.hour || 0;

      return new Date(year, month, day, hour);
    } catch (error) {
      console.error('Error creating timestamp:', error);
      return new Date();
    }
  }

  _buildMetrics(metrics) {
    const metricOperators = {
      count: { $sum: 1 },
      sum: { $sum: '$value' },
      avg: { $avg: '$value' },
      min: { $min: '$value' },
      max: { $max: '$value' }
    };

    return metrics.reduce((acc, metric) => {
      acc[metric] = metricOperators[metric];
      return acc;
    }, {});
  }
}

module.exports = TimeSeriesAggregation;