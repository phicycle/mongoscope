class FieldAnalytics {
  constructor(db) {
    this.db = db;
  }

  async analyze(options) {
    const {
      collection,
      field,
      type = 'distribution',
      match = {},
      limit = 10,
      secondaryField
    } = options;

    switch (type) {
      case 'distribution':
        return await this.getValueDistribution(collection, field, match, limit);
      case 'cardinality':
        return await this.getCardinality(collection, field, match);
      case 'statistics':
        return await this.getFieldStatistics(collection, field, match);
      case 'percentiles':
        return await this.getPercentiles(collection, field, match);
      case 'quality':
        return await this.getDataQuality(collection, field, match);
      case 'growth':
        return await this.getGrowthRate(collection, field, match);
      case 'temporal':
        return await this.getTemporalPatterns(collection, field, match);
      case 'outliers':
        return await this.getOutlierAnalysis(collection, field, match);
      case 'patterns':
        return await this.getPatternAnalysis(collection, field, match);
      case 'health':
        return await this.getDataHealth(collection, field, match);
      default:
       return { error: `Unknown analysis type: ${type}` };
    }
  }

  async getValueDistribution(collection, field, match, limit) {
    const matchCriteria = match || {};
    
    const pipeline = [
      { 
        $match: {
          ...matchCriteria,
          createdAt: { 
            $exists: true,
            ...(matchCriteria.createdAt || {})
          }
        }
      },
      { 
        $group: { 
          _id: { $ifNull: [`$${field}`, null] },
          count: { $sum: 1 } 
        } 
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } }
    ];

    if (limit) {
      pipeline.push({ $limit: limit });
    }

    return await this.db.collection(collection).aggregate(pipeline).toArray();
  }

  async getCardinality(collection, field, match) {
    const pipeline = [
      { $match: { ...match, [field]: { $exists: true } } },
      { $group: { _id: null, distinct: { $addToSet: `$${field}` } } },
      { $project: { count: { $size: '$distinct' } } }
    ];
    const result = await this.db.collection(collection).aggregate(pipeline).toArray();
    return result[0]?.count || 0;
  }

  async getFieldStatistics(collection, field, match) {
    const pipeline = [
      { $match: { ...match, [field]: { $exists: true } } },
      {
        $group: {
          _id: null,
          avg: { $avg: `$${field}` },
          min: { $min: `$${field}` },
          max: { $max: `$${field}` },
          std: { $stdDevPop: `$${field}` }
        }
      }
    ];
    const result = await this.db.collection(collection).aggregate(pipeline).toArray();
    return result[0] || null;
  }

  async getPercentiles(collection, field, match) {
    const pipeline = [
      { $match: { ...match, [field]: { $exists: true, $type: 'number' } } },
      {
        $group: {
          _id: null,
          values: { $push: `$${field}` }
        }
      },
      {
        $project: {
          percentiles: {
            $percentile: {
              input: '$values',
              p: [0.25, 0.5, 0.75, 0.9, 0.95, 0.99],
              method: 'approximate'
            }
          }
        }
      },
      {
        $project: {
          p25: { $arrayElemAt: ['$percentiles', 0] },
          p50: { $arrayElemAt: ['$percentiles', 1] },
          p75: { $arrayElemAt: ['$percentiles', 2] },
          p90: { $arrayElemAt: ['$percentiles', 3] },
          p95: { $arrayElemAt: ['$percentiles', 4] },
          p99: { $arrayElemAt: ['$percentiles', 5] }
        }
      }
    ];
    const result = await this.db.collection(collection).aggregate(pipeline).toArray();
    return result[0] || null;
  }

  async getDataQuality(collection, field, match = {}) {
    const samplePipeline = [
      { $match: { [field]: { $exists: true, $ne: null } } },
      { $limit: 100 },
      { 
        $group: {
          _id: null,
          types: { $addToSet: { $type: `$${field}` } }
        }
      }
    ];
    
    const typeSample = await this.db.collection(collection).aggregate(samplePipeline).toArray();
    const expectedType = typeSample[0]?.types[0] || 'unknown';

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          
          nullCount: {
            $sum: { $cond: [{ $eq: [`$${field}`, null] }, 1, 0] }
          },
          emptyStringCount: {
            $sum: { $cond: [{ $eq: [`$${field}`, ""] }, 1, 0] }
          },
          
          validTypeCount: {
            $sum: {
              $cond: [
                { $eq: [{ $type: `$${field}` }, expectedType] },
                1,
                0
              ]
            }
          },
          
          typeDistribution: {
            $push: {
              $cond: [
                { $eq: [`$${field}`, null] },
                "null",
                { $type: `$${field}` }
              ]
            }
          },
          
          distinctValues: { $addToSet: `$${field}` }
        }
      },
      {
        $project: {
          _id: 0,
          totalRecords: "$totalCount",
          
          completeness: {
            totalMissing: { 
              $add: ["$nullCount", "$emptyStringCount"]
            },
            fillRate: {
              $multiply: [
                {
                  $divide: [
                    { $subtract: [
                      "$totalCount",
                      { $add: ["$nullCount", "$emptyStringCount"] }
                    ]},
                    "$totalCount"
                  ]
                },
                100
              ]
            }
          },

          validity: {
            expectedType: { $literal: expectedType },
            validCount: "$validTypeCount",
            validRate: {
              $multiply: [
                {
                  $divide: [
                    "$validTypeCount",
                    { $subtract: ["$totalCount", { $add: ["$nullCount", "$emptyStringCount"] }] }
                  ]
                },
                100
              ]
            }
          },

          uniqueness: {
            distinctCount: { $size: "$distinctValues" },
            uniquenessRate: {
              $multiply: [
                { $divide: [{ $size: "$distinctValues" }, "$totalCount"] },
                100
              ]
            }
          },

          debug: {
            typeDistribution: "$typeDistribution"
          }
        }
      }
    ];

    const result = await this.db.collection(collection).aggregate(pipeline).toArray();
    const baseResult = result[0] || {
      totalRecords: 0,
      completeness: { totalMissing: 0, fillRate: 0 },
      validity: { expectedType: 'unknown', validCount: 0, validRate: 0 },
      uniqueness: { distinctCount: 0, uniquenessRate: 0 }
    };

    if (baseResult.debug?.typeDistribution) {
      const distribution = {};
      baseResult.debug.typeDistribution.forEach(type => {
        distribution[type] = (distribution[type] || 0) + 1;
      });
      baseResult.validity.typeDistribution = distribution;
      delete baseResult.debug;
    }

    return baseResult;
  }

  async getGrowthRate(collection, field, match) {
    const pipeline = [
      { 
        $match: { 
          ...match,
          createdAt: { $exists: true },
          [field]: { $exists: true, $type: 'number' }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          value: { $sum: `$${field}` }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $group: {
          _id: null,
          periods: { 
            $push: {
              period: '$_id',
              value: '$value'
            }
          }
        }
      },
      {
        $project: {
          growthRates: {
            $map: {
              input: { $range: [1, { $size: '$periods' }] },
              as: 'idx',
              in: {
                period: { $arrayElemAt: ['$periods.period', '$$idx'] },
                growthRate: {
                  $multiply: [
                    {
                      $subtract: [
                        { $divide: [
                          { $arrayElemAt: ['$periods.value', '$$idx'] },
                          { $arrayElemAt: ['$periods.value', { $subtract: ['$$idx', 1] }] }
                        ]},
                        1
                      ]
                    },
                    100
                  ]
                }
              }
            }
          }
        }
      }
    ];
    const result = await this.db.collection(collection).aggregate(pipeline).toArray();
    return result[0]?.growthRates || [];
  }

  async getTemporalPatterns(collection, field, match) {
    // First check if the field is a date type by sampling
    const sampleDoc = await this.db.collection(collection).findOne({
      [field]: { $exists: true }
    });

    if (!sampleDoc || !sampleDoc[field] || !(sampleDoc[field] instanceof Date)) {
      return { error: 'Field must be a date type for temporal analysis' };
    }

    const pipeline = [
      { 
        $match: { 
          ...match,
          [field]: { 
            $exists: true,
            $type: 'date'
          } 
        } 
      },
      {
        $facet: {
          dayOfWeek: [
            {
              $group: {
                _id: { $dayOfWeek: `$${field}` },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],
          hourOfDay: [
            {
              $group: {
                _id: { $hour: `$${field}` },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],
          monthlyDistribution: [
            {
              $group: {
                _id: {
                  year: { $year: `$${field}` },
                  month: { $month: `$${field}` }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
          ]
        }
      }
    ];
    
    const result = await this.db.collection(collection).aggregate(pipeline).toArray();
    return result[0];
  }

  async getOutlierAnalysis(collection, field, match) {
    const pipeline = [
      { 
        $match: { 
          ...match,
          [field]: { $exists: true, $type: 'number' }
        } 
      },
      {
        $group: {
          _id: null,
          avg: { $avg: `$${field}` },
          stdDev: { $stdDevPop: `$${field}` },
          values: { $push: `$${field}` }
        }
      },
      {
        $project: {
          stats: {
            avg: '$avg',
            stdDev: '$stdDev'
          },
          outliers: {
            $filter: {
              input: '$values',
              as: 'value',
              cond: {
                $gt: [
                  { $abs: { $subtract: ['$$value', '$avg'] } },
                  { $multiply: ['$stdDev', 3] }
                ]
              }
            }
          }
        }
      }
    ];

    const result = await this.db.collection(collection).aggregate(pipeline).toArray();
    return result[0];
  }

  async getPatternAnalysis(collection, field, match) {
    // First check the field type by sampling
    const sampleDoc = await this.db.collection(collection).findOne({
      [field]: { $exists: true }
    });

    if (!sampleDoc || !sampleDoc[field]) {
      return { error: 'Field must exist for pattern analysis' };
    }

    const fieldType = typeof sampleDoc[field];

    const pipeline = [
      { 
        $match: { 
          ...match,
          [field]: { $exists: true }
        } 
      },
      {
        $facet: {
          // Frequency Analysis
          frequencies: [
            {
              $group: {
                _id: `$${field}`,
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],

          // Sequential Patterns (if numeric or date)
          sequences: [
            {
              $group: {
                _id: null,
                values: { $push: `$${field}` },
                count: { $sum: 1 }
              }
            }
          ],

          // Trend Analysis
          trends: [
            {
              $group: {
                _id: {
                  $cond: [
                    { $eq: [{ $type: `$${field}` }, 'date'] },
                    {
                      year: { $year: `$${field}` },
                      month: { $month: `$${field}` }
                    },
                    null
                  ]
                },
                avgValue: { 
                  $avg: {
                    $cond: [
                      { $eq: [{ $type: `$${field}` }, 'number'] },
                      `$${field}`,
                      null
                    ]
                  }
                },
                count: { $sum: 1 }
              }
            },
            { 
              $match: { 
                _id: { $ne: null } 
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
          ],

          // Value Range Analysis
          ranges: [
            {
              $group: {
                _id: null,
                min: { $min: `$${field}` },
                max: { $max: `$${field}` },
                avg: { $avg: `$${field}` },
                stdDev: { $stdDevPop: `$${field}` }
              }
            }
          ],

          // Pattern Detection
          patterns: [
            {
              $group: {
                _id: {
                  $switch: {
                    branches: [
                      // For numeric values, create range buckets
                      {
                        case: { $eq: [{ $type: `$${field}` }, 'number'] },
                        then: {
                          $concat: [
                            "Range: ",
                            {
                              $toString: {
                                $multiply: [
                                  { $floor: { $divide: [`$${field}`, 10] } },
                                  10
                                ]
                              }
                            },
                            " - ",
                            {
                              $toString: {
                                $add: [
                                  {
                                    $multiply: [
                                      { $floor: { $divide: [`$${field}`, 10] } },
                                      10
                                    ]
                                  },
                                  10
                                ]
                              }
                            }
                          ]
                        }
                      },
                      // For strings, get first character or pattern
                      {
                        case: { $eq: [{ $type: `$${field}` }, 'string'] },
                        then: {
                          $concat: [
                            "Pattern: ",
                            { $substr: [`$${field}`, 0, 1] }
                          ]
                        }
                      }
                    ],
                    default: "Other"
                  }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ],

          // Add seasonality analysis for date fields
          seasonality: [
            {
              $match: {
                $expr: {
                  $eq: [{ $type: `$${field}` }, 'date']
                }
              }
            },
            {
              $group: {
                _id: {
                  month: { $month: `$${field}` },
                  dayOfWeek: { $dayOfWeek: `$${field}` },
                  hour: { $hour: `$${field}` }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ],

          // Add value distribution quartiles
          quartiles: [
            {
              $match: {
                $expr: {
                  $eq: [{ $type: `$${field}` }, 'number']
                }
              }
            },
            {
              $group: {
                _id: null,
                values: { $push: `$${field}` }
              }
            },
            {
              $project: {
                quartiles: {
                  $percentile: {
                    input: '$values',
                    p: [0.25, 0.5, 0.75],
                    method: 'approximate'
                  }
                }
              }
            }
          ],

          // Add clustering tendency for numeric values
          clusters: [
            {
              $match: {
                $expr: {
                  $eq: [{ $type: `$${field}` }, 'number']
                }
              }
            },
            {
              $group: {
                _id: null,
                min: { $min: `$${field}` },
                max: { $max: `$${field}` },
                count: { $sum: 1 }
              }
            },
            {
              $project: {
                ranges: [
                  {
                    start: '$min',
                    end: { $add: ['$min', { $multiply: [{ $subtract: ['$max', '$min'] }, 0.33] }] }
                  },
                  {
                    start: { $add: ['$min', { $multiply: [{ $subtract: ['$max', '$min'] }, 0.33] }] },
                    end: { $add: ['$min', { $multiply: [{ $subtract: ['$max', '$min'] }, 0.66] }] }
                  },
                  {
                    start: { $add: ['$min', { $multiply: [{ $subtract: ['$max', '$min'] }, 0.66] }] },
                    end: '$max'
                  }
                ],
                count: 1
              }
            },
            {
              $unwind: '$ranges'
            },
            {
              $lookup: {
                from: collection,
                pipeline: [
                  {
                    $match: {
                      ...match,
                      [field]: { $exists: true, $type: 'number' }
                    }
                  },
                  {
                    $group: {
                      _id: null,
                      values: {
                        $push: {
                          value: `$${field}`,
                          inRange: {
                            $and: [
                              { $gte: [`$${field}`, '$$range.start'] },
                              { $lt: [`$${field}`, '$$range.end'] }
                            ]
                          }
                        }
                      }
                    }
                  }
                ],
                let: { range: '$ranges' },
                as: 'distribution'
              }
            },
            {
              $project: {
                range: '$ranges',
                count: {
                  $size: {
                    $filter: {
                      input: { $arrayElemAt: ['$distribution.values', 0] },
                      as: 'item',
                      cond: '$$item.inRange'
                    }
                  }
                }
              }
            },
            {
              $sort: { count: -1 }
            }
          ]
        }
      },
      {
        $project: {
          frequencies: 1,
          patterns: 1,
          trends: 1,
          ranges: { $arrayElemAt: ['$ranges', 0] },
          seasonality: 1,
          quartiles: { $arrayElemAt: ['$quartiles.quartiles', 0] },
          clusters: 1,
          analysis: {
            $let: {
              vars: {
                ranges: { $arrayElemAt: ['$ranges', 0] },
                quartiles: { $arrayElemAt: ['$quartiles.quartiles', 0] }
              },
              in: {
                type: { $literal: fieldType },
                insights: {
                  $concatArrays: [
                    // Frequency-based insights
                    [{
                      type: 'frequency',
                      description: {
                        $concat: [
                          'Most common value appears ',
                          { $toString: { $arrayElemAt: ['$frequencies.count', 0] } },
                          ' times'
                        ]
                      }
                    }],
                    // Range-based insights (for numeric fields)
                    {
                      $cond: [
                        { $eq: [{ $type: '$$ranges.avg' }, 'number'] },
                        [{
                          type: 'range',
                          description: {
                            $concat: [
                              'Values range from ',
                              { $toString: '$$ranges.min' },
                              ' to ',
                              { $toString: '$$ranges.max' }
                            ]
                          }
                        }],
                        []
                      ]
                    },
                    [{
                      type: 'distribution',
                      description: {
                        $concat: [
                          'Distribution shows ',
                          {
                            $cond: [
                              { $gt: ['$$ranges.stdDev', '$$ranges.avg'] },
                              'high variability',
                              'consistent values'
                            ]
                          }
                        ]
                      }
                    }],
                    {
                      $cond: [
                        { $eq: [{ $type: `$${field}` }, 'date'] },
                        [{
                          type: 'seasonality',
                          description: 'Temporal patterns detected in the data'
                        }],
                        []
                      ]
                    },
                    {
                      $cond: [
                        { $eq: [{ $type: `$${field}` }, 'number'] },
                        [{
                          type: 'clustering',
                          description: {
                            $concat: [
                              'Data shows ',
                              {
                                $cond: [
                                  { $gt: [{ $size: '$clusters' }, 2] },
                                  'multiple distinct clusters',
                                  'uniform distribution'
                                ]
                              }
                            ]
                          }
                        }],
                        []
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      }
    ];

    const result = await this.db.collection(collection).aggregate(pipeline).toArray();
    return result[0];
  }

  async getDataHealth(collection, field, match) {
    const pipeline = [
      { $match: { ...match, [field]: { $exists: true } } },
      {
        $group: {
          _id: null,
          // Count total documents
          totalCount: { $sum: 1 },
          
          // Analyze value distribution
          distinctValues: { $addToSet: `$${field}` },
          
          // Type consistency check
          typeDistribution: {
            $addToSet: { $type: `$${field}` }
          },
          
          // Basic statistics for numeric fields
          numericStats: {
            $push: {
              $cond: [
                { $eq: [{ $type: `$${field}` }, 'double'] },
                `$${field}`,
                null
              ]
            }
          },
          
          // String length distribution for string fields
          stringLengths: {
            $push: {
              $cond: [
                { $eq: [{ $type: `$${field}` }, 'string'] },
                { $strLenCP: `$${field}` },
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          totalCount: 1,
          distinctCount: { $size: '$distinctValues' },
          uniquenessScore: {
            $multiply: [
              { $divide: [{ $size: '$distinctValues' }, '$totalCount'] },
              100
            ]
          },
          typeConsistency: {
            types: '$typeDistribution',
            isConsistent: { $eq: [{ $size: '$typeDistribution' }, 1] }
          },
          valueStats: {
            numeric: {
              $cond: [
                { $in: ['double', '$typeDistribution'] },
                {
                  avg: { $avg: '$numericStats' },
                  min: { $min: '$numericStats' },
                  max: { $max: '$numericStats' }
                },
                null
              ]
            },
            string: {
              $cond: [
                { $in: ['string', '$typeDistribution'] },
                {
                  avgLength: { $avg: '$stringLengths' },
                  minLength: { $min: '$stringLengths' },
                  maxLength: { $max: '$stringLengths' }
                },
                null
              ]
            }
          }
        }
      }
    ];

    const result = await this.db.collection(collection).aggregate(pipeline).toArray();
    return result[0] || {
      totalCount: 0,
      distinctCount: 0,
      uniquenessScore: 0,
      typeConsistency: { types: [], isConsistent: true },
      valueStats: { numeric: null, string: null }
    };
  }
}

module.exports = FieldAnalytics;