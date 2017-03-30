'use strict';
let ReactNative = require('react-native');
let {
    AsyncStorage,
} = ReactNative;

class Collection {
    constructor (collectionName, dbName, capped, memory) {
        this.collectionName = collectionName;
        this.dbName = dbName;
        this.capped = capped || {};
        this.strict = true;
        this.memory = memory;
    }
    checkMatch (item, query, strict) {
        let match = true;
        let self = this;
        query = this.parseQuery(query);
        if (query) {
            query.forEach((cond) => {
                match = match && self.evaluate(item[cond.field], cond.operand, cond.value, strict);
            });
        }
        return match;
    }
    parseQuery (query) {
        let res = [];
        if (!Array.isArray(query)) {
            query = [query];
        }
        query.forEach((cond) => {
            for (let key in cond) {
                let item = cond[key];
                if (typeof item === 'object') {
                    let condition = Object.keys(item);
                    res.push({
                        field: key,
                        operand: condition[0],
                        value: item[condition],
                    });
                } else {
                    res.push({
                        field: key,
                        operand: '$eq',
                        value: item,
                    });
                }
            }
        });
        return res;
    }
    evaluate (val1, op, val2, strict) {
        switch (op) {
            case '$gt':
                return val1 > val2;
            case '$lt':
                return val1 < val2;
            case '$gte':
                return val1 >= val2;
            case '$lte':
                return val1 <= val2;
            case '$ne':
                return strict ? val1 !== val2 : val1 != val2;
            case '$eq':
                return (typeof val2 === 'function') ? val2(val1) : (strict ? val1 === val2 : val1 == val2);
            case '$like':
                return new RegExp(val2).test(val1);
        }
    }
    async createDatabase () {
        await AsyncStorage.setItem(this.dbName, JSON.stringify({}));
        return this.getDatabase();
    }
    async getDatabase () {
        return new Promise(async(resolve, reject) => {
            let database = await AsyncStorage.getItem(this.dbName);
            if (database) {
                resolve(Object.assign({}, JSON.parse(database)));
            } else {
                resolve(this.createDatabase());
            }
        });
    }
    async initCollection () {
        if (!this.memory.database) {
            this.memory.database = await this.getDatabase();
        }
        const database = this.memory.database;
        const capped = this.capped;
        this.collection = database[this.collectionName] ? database[this.collectionName] : {
            'totalrows': 0,
            'autoinc': 0,
            'maxrows': capped.max || Number.MAX_VALUE,
            'unique': capped.unique && (Array.isArray(capped.unique) ? capped.unique : [capped.unique]),
            'rows': {},
        };
        database[this.collectionName] = database[this.collectionName] || this.collection;
    }
    async insert (data) {
        await this.initCollection();
        return new Promise(async(resolve, reject) => {
            try {
                let col = this.collection;
                let rows = col['rows'];
                let canInsert = true;

                if (col.unique) {
                    let query = {};
                    col.unique.forEach((ii) => { query[ii] = { $ne: data[ii] }; });
                    for (let _id in rows) {
                        let row = rows[_id];
                        if (!this.checkMatch(row, query, true)) {
                            canInsert = false;
                            reject({ message: 'unique reject', query: query });
                            break;
                        }
                    }
                }
                if (canInsert) {
                    let autoinc = col.autoinc++;
                    data._id = autoinc;
                    if (col.totalrows >= col.maxrows) {
                        let key = Object.keys(col.rows)[0];
                        delete col.rows[key];
                        col.totalrows--;
                    }
                    col.rows[autoinc] = data;
                    col.totalrows++;

                    let database = this.memory.database;
                    database[this.collectionName] = col;
                    await AsyncStorage.setItem(this.dbName, JSON.stringify(database));
                    resolve(data);
                }
            } catch (error) {
                console.error('Mongoose error: ' + error.message);
            }
        });
    }
    async update (data, query, params) {
        params = params || {};
        await this.initCollection();
        return new Promise(async(resolve, reject) => {
            let results = [];
            let rows = this.collection['rows'];
            let limit = params.limit || Number.MAX_VALUE;
            let offset = params.offset || 0;
            let strict = params.strict || this.strict;
            let cnt = 0;
            try {
                for (let row in rows) {
                    let item = rows[row];
                    if (this.checkMatch(item, query, strict)) {
                        if (++cnt > offset) {
                            rows[row] = Object.assign({}, item, data);
                            results.push(item);
                            if (--limit === 0) {
                                break;
                            }
                        }
                    }
                }

                let database = this.memory.database;
                database[this.collectionName] = this.collection;
                await AsyncStorage.setItem(this.dbName, JSON.stringify(database));
                resolve(results);
            } catch (error) {
                console.error('Mongoose error: ' + error.message);
            }
        });
    }
    async upsert (data, query, params) {
        params = params || {};
        await this.initCollection();
        return new Promise(async(resolve, reject) => {
            try {
                const docs = await this.update(data, query, params);
                if (docs.length === 0) {
                    await this.insert(data);
                }
                resolve(docs);
            } catch (error) {
                console.error('Mongoose error: ' + error.message);
            }
        });
    }
    async remove (query, params) {
        params = params || {};
        await this.initCollection();
        return new Promise(async(resolve, reject) => {
            let results = [];
            let rows = this.collection['rows'];
            let limit = params.limit || Number.MAX_VALUE;
            let offset = params.offset || 0;
            let strict = params.strict || this.strict;
            let cnt = 0;

            try {
                for (let row in rows) {
                    let item = rows[row];
                    if (this.checkMatch(item, query, strict)) {
                        if (++cnt > offset) {
                            results.push(item);
                            delete rows[row];
                            this.collection['totalrows']--;
                            if (--limit === 0) {
                                break;
                            }
                        }
                    }
                }
                let database = this.memory.database;
                database[this.collectionName] = this.collection;
                await AsyncStorage.setItem(this.dbName, JSON.stringify(database));
                resolve(results);
            } catch (error) {
                console.error('Mongoose error: ' + error.message);
            }
        });
    }
    async find (query, params) {
        params = params || {};
        await this.initCollection();
        return new Promise((resolve, reject) => {
            let results = [];
            let rows = this.collection['rows'];
            let limit = params.limit || Number.MAX_VALUE;
            let offset = params.offset || 0;
            let strict = params.strict || this.strict;
            let cnt = 0;
            for (let row in rows) {
                let item = rows[row];
                if (this.checkMatch(item, query, strict)) {
                    if (++cnt > offset) {
                        results.push(item);
                        if (--limit === 0) {
                            break;
                        }
                    }
                }
            }
            resolve(results);
        });
    }
    async findOne (query, params) {
        params = params || {};
        params.limit = 1;
        let docs = await this.find(query, params);
        return docs ? docs[0] : null;
    }

}

class Mongoose {
    constructor (dbName) {
        this.dbName = dbName;
        this.memory = { database: false };
    }
    collection (collectionName, capped) {
        return new Collection(collectionName, this.dbName, capped, this.memory);
    }
    clear () {
        this.memory.database = false;
    }
}

module.exports = Mongoose;
