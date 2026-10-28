'use strict';
// Optional: basic real MongoDB product repository integration test, using a temporary
// MongoDB instance so this does not touch the Docker data / live project database.
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
const { MongoClient } = require('mongodb');
const { ProductRepository } = require('../services/product-service/src/infrastructure/product-repository');
(async () => {
 const mongod = await MongoMemoryServer.create();
 const client = new MongoClient(mongod.getUri());
 try {
   await client.connect();
   const repo = new ProductRepository(client.db('test_product'));
   await repo.initialize();
   const p = await repo.create({pname:'Tôm',price:'100.00',quantity:10});
   assert.equal(p.pid,1);
   assert.equal((await repo.findByPid(p.pid)).quantity,10);
   await repo.update(p.pid,{quantity:5});
   assert.equal((await repo.findByPid(p.pid)).quantity,5);
   assert.equal((await repo.list()).length,1);
   await repo.delete(p.pid);
   assert.equal(await repo.findByPid(p.pid),null);
   console.log('PASS ProductRepository MongoDB integration');
 } finally {
   await client.close(); await mongod.stop();
 }
})().catch(e => {console.error(e);process.exitCode=1});
