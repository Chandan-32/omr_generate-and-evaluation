const fs = require('fs');
const path = require('path');
const { DATA_FILE } = require('../config/db');

class MockModel {
  constructor(collectionName, data = {}) {
    this._collection = collectionName;
    Object.assign(this, data);
  }

  static _readDb() {
    try {
      if (!fs.existsSync(DATA_FILE)) {
        return { users: [], facilities: [], bookings: [], payments: [] };
      }
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (err) {
      console.error('Error reading mock DB:', err);
      return { users: [], facilities: [], bookings: [], payments: [] };
    }
  }

  static _writeDb(data) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing mock DB:', err);
    }
  }

  static _matchesQuery(item, query) {
    if (!query) return true;
    for (const key in query) {
      let queryVal = query[key];
      let itemVal = item[key];

      // Handle MongoDB syntax like $or, $ne, $gte, $lte, $in if needed
      if (key === '$or' && Array.isArray(queryVal)) {
        return queryVal.some(subQuery => this._matchesQuery(item, subQuery));
      }

      if (queryVal && typeof queryVal === 'object' && !Array.isArray(queryVal)) {
        // Operators
        for (const op in queryVal) {
          const val = queryVal[op];
          if (op === '$ne' && itemVal === val) return false;
          if (op === '$gte' && itemVal < val) return false;
          if (op === '$lte' && itemVal > val) return false;
          if (op === '$gt' && itemVal <= val) return false;
          if (op === '$lt' && itemVal >= val) return false;
          if (op === '$in' && Array.isArray(val) && !val.includes(itemVal)) return false;
          if (op === '$nin' && Array.isArray(val) && val.includes(itemVal)) return false;
        }
      } else {
        // Simple comparison
        if (itemVal !== queryVal) return false;
      }
    }
    return true;
  }

  static async find(query = {}) {
    const db = this._readDb();
    const items = db[this._collectionName] || [];
    const results = items.filter(item => this._matchesQuery(item, query));
    return results.map(item => new this(item));
  }

  static async findOne(query = {}) {
    const db = this._readDb();
    const items = db[this._collectionName] || [];
    const found = items.find(item => this._matchesQuery(item, query));
    return found ? new this(found) : null;
  }

  static async findById(id) {
    return this.findOne({ id: id });
  }

  static async create(data) {
    const db = this._readDb();
    const items = db[this._collectionName] || [];
    
    // Generate mock ID if not provided
    const newId = data.id || data._id || `${this._collectionName.substring(0,3).toUpperCase()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const newItem = {
      id: newId,
      _id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };
    
    items.push(newItem);
    db[this._collectionName] = items;
    this._writeDb(db);
    return new this(newItem);
  }

  static async findByIdAndUpdate(id, update, options = {}) {
    const db = this._readDb();
    const items = db[this._collectionName] || [];
    const index = items.findIndex(item => item.id === id || item._id === id);
    
    if (index === -1) return null;
    
    let updateFields = update;
    if (update.$set) {
      updateFields = update.$set;
    }
    
    const updatedItem = {
      ...items[index],
      ...updateFields,
      updatedAt: new Date().toISOString()
    };
    
    items[index] = updatedItem;
    db[this._collectionName] = items;
    this._writeDb(db);
    return new this(updatedItem);
  }

  static async findByIdAndDelete(id) {
    const db = this._readDb();
    const items = db[this._collectionName] || [];
    const index = items.findIndex(item => item.id === id || item._id === id);
    
    if (index === -1) return null;
    
    const deleted = items.splice(index, 1)[0];
    db[this._collectionName] = items;
    this._writeDb(db);
    return new this(deleted);
  }

  async save() {
    const db = this.constructor._readDb();
    const items = db[this.constructor._collectionName] || [];
    
    // Check if item already exists
    const index = items.findIndex(item => item.id === this.id || item._id === this._id);
    
    const dataToSave = { ...this };
    delete dataToSave._collection;
    dataToSave.updatedAt = new Date().toISOString();
    
    if (index !== -1) {
      items[index] = dataToSave;
    } else {
      dataToSave.id = dataToSave.id || dataToSave._id || `${this.constructor._collectionName.substring(0,3).toUpperCase()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      dataToSave._id = dataToSave.id;
      dataToSave.createdAt = new Date().toISOString();
      items.push(dataToSave);
      // Update instance property
      this.id = dataToSave.id;
      this._id = dataToSave.id;
    }
    
    db[this.constructor._collectionName] = items;
    this.constructor._writeDb(db);
    return this;
  }
}

module.exports = MockModel;
