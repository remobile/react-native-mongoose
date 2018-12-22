# React Native mongoose (remobile)
An AsyncStorage based mongoose like storage for react-native

## Installation
```sh
npm install @remobile/react-native-mongoose --save
```

## Usage

### Example
```js
'use strict';

var React = require('react');
var ReactNative = require('react-native');
var {
    StyleSheet,
    View,
    Image
} = ReactNative;
var {
    StyleSheet,
    View,
    AsyncStorage,
} = ReactNative;


var Button = require('@remobile/react-native-simple-button');
var Mongoose = require('react-native-mongoose');

const DB_NAME = "fang";
const CLT_NAME = "number";
module.exports = React.createClass({
    componentDidMount() {
        this.db = new Mongoose(DB_NAME);
        this.collection = this.db.collection(CLT_NAME, {max:30, unique:['a']});
    },
    doClear() {
        AsyncStorage.removeItem(DB_NAME);
    },
    doShowList() {
        (async function(){
            var list =  await AsyncStorage.getItem(DB_NAME);
            console.log('result:', JSON.parse(list));

        })();
    },
    doShowKeys() {
        (async function(){
            var list = await AsyncStorage.getAllKeys();
            console.log('result:', list);
        })();
    },
    async doInsert() {
        var info = {
            a : 4,
            b : 3,
        };
        var collection = this.collection;
        var list = await collection.insert(info).catch(error=>console.log(error));;
        console.log("list");
        console.log(list);
    },
    async doFind() {
        var collection = this.collection;
        var req = await collection.find();
        console.log(req);
    },
    async doFindOne() {
        var collection = this.collection;
        var req = await collection.findOne({b:3,a:1});
        console.log(req);
    },
    async doRemove() {
        var collection = this.collection;
        var req = await collection.remove();
        console.log(req);
        var req = await collection.find();
        console.log(req);
    },
    async doUpsert() {
        var collection = this.collection;
        var info = {
            a : 4,
            b : 6,
        };
        var list = await collection.upsert(info, {a:4}).catch(error=>console.log(error));;
        console.log("list");
        console.log(list);
    },
    render() {
        return (
            <View style={styles.container}>
                <Button onPress={this.doClear}>清除</Button>
                <Button onPress={this.doShowList}>列表</Button>
                <Button onPress={this.doShowKeys}>键值</Button>
                <Button onPress={this.doInsert}>Insert</Button>
                <Button onPress={this.doFind}>Find</Button>
                <Button onPress={this.doFindOne}>findOne</Button>
                <Button onPress={this.doRemove}>Remove</Button>
                <Button onPress={this.doUpsert}>Upsert</Button>
            </View>
        );
    }
});


var styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'space-around',
        paddingVertical: 150,
    },
});
```

### method
* #### creat dataBase
```js
var db = new Mongoose(dbname);
```
    * dbname: the name of database, in AsyncStorage it is a item key

* #### clear memory
```js
    db.clear();
```
    * react-native-mongoose use memory chache database, when not use it, use it clear memory;


* #### creat collection
```js
var collection = this.db.collection(collectionName, capped);
```
    * collectionName: the name of collection
    * capped: {max: Number, unique:String|Array}
        * max: max rows in collection, if not set, have no limit
        * unique: set unique primary key, it can be a single String or a array for keys

* #### insert
```js
var doc = collection.insert(docs);
```
    * docs: to be insert docs, if set capped.max, when reach capped.max, will be replace oldest one, if set capped.unique, e.g: capped.unique is 'a', then a is unique.


* #### upsert
```js
var doc = collection.upsert(docs, query, params);
```
    * docs: need insert or update data
    * query: look Query help
    * params: {limit:Number, offset:Number, strict:bool};
        * limit: need upsert number
        * offset: need upsert start position
        * strict: set compare strict mode, look Query help


* #### update
```js
var doc = collection.upsert(docs, query, params);
```
    * docs: need update data
    * query: look Query help
    * params: {limit:Number, offset:Number, strict:bool};
        * limit: need update number
        * offset: need update start position
        * strict: set compare strict mode, look Query help


* #### remove
```js
var doc = collection.remove(query, params);
```
    * query: look Query help
    * params: {limit:Number, offset:Number, strict:bool};
        * limit: need remove number
        * offset: need remove start position
        * strict: set compare strict mode, look Query help


* #### find
```js
var docs = collection.find(query, params);
```
    * query: look Query help
    * params: {limit:Number, offset:Number, strict:bool};
        * limit: need find number
        * offset: need find start position
        * strict: set compare strict mode, look Query help


* #### findOne
```js
var doc = collection.findOne(query);
```
    * query: look Query help
    * params: {limit:Number, offset:Number, strict:bool};
        * limit: 1
        * offset: need findOne start position
        * strict: set compare strict mode, look Query help

 ### Query help
Query can be a object like {a:1, b:2}, or {a:{$eq:1}, b:{$eq:2}}
also can be a function lick {a:function(a){return a>1}}
operand like follows:
* '$gt':
```js
    return val1 > val2;
```
* '$lt':
```js
    return val1 < val2;
```
* '$gte':
```js
    return val1 >= val2;
```
* '$lte':
```js
    return val1 <= val2;
```
* '$ne':
```js
    return strict ? val1!==val2 : val1!=val2;
```
* '$eq':
```js
    return strict ? val1===val2 : val1==val2;
```
* '$like':
```js
    return new RegExp(val2).test(val1);
```
