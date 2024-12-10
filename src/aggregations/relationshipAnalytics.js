class RelationshipAnalytics {
  constructor(db) {
    this.db = db;
  }

  async analyze(options) {
    const {
      fromCollection,
      toCollection,
      localField,
      foreignField,
      type = 'count'
    } = options;

    switch (type) {
      case 'count':
        return await this.getRelationshipCounts(
          fromCollection, 
          toCollection, 
          localField, 
          foreignField
        );
      case 'distribution':
        return await this.getRelationshipDistribution(
          fromCollection, 
          toCollection, 
          localField, 
          foreignField
        );
      default:
        return { error: `Unknown relationship analysis type: ${type}` };
    }
  }

  async getRelationshipCounts(fromCollection, toCollection, localField, foreignField) {
    const pipeline = [
      {
        $lookup: {
          from: toCollection,
          localField: localField,
          foreignField: foreignField,
          as: 'joined'
        }
      },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          connectedRecords: {
            $sum: { $cond: [{ $gt: [{ $size: '$joined' }, 0] }, 1, 0] }
          }
        }
      }
    ];
    return await this.db.collection(fromCollection).aggregate(pipeline).toArray();
  }

  async getRelationshipDistribution(fromCollection, toCollection, localField, foreignField) {
    const pipeline = [
      {
        $lookup: {
          from: toCollection,
          localField: localField,
          foreignField: foreignField,
          as: 'joined'
        }
      },
      {
        $group: {
          _id: { $size: '$joined' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];
    return await this.db.collection(fromCollection).aggregate(pipeline).toArray();
  }
}

module.exports = RelationshipAnalytics;