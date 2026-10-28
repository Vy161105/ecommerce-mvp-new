'use strict';
// 25 E2E checks follow teacher file 25_TestCases_5_BoundedContexts.xlsx.
// Requires a healthy Docker Compose stack. All records are additive (no down -v).
require('dotenv').config();
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { Kafka, logLevel } = require('kafkajs');
const checkOrderEvent = require('../scripts/check-order-event.cjs');
const base = process.env.TEST_BASE_URL || 'http://localhost:3002';
const runs = []; const state = { username: `p3_${Date.now()}_${Math.floor(Math.random()*1e6)}`, password:'TestP3_123!'};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(method, path, body, token, headers={}) {
 const h = { ...headers }; if (token) h.Authorization = `Bearer ${token}`;
 if (body !== undefined) h['Content-Type']='application/json';
 const res = await fetch(base+path, {method, headers:h, body:body===undefined?undefined:JSON.stringify(body), signal:AbortSignal.timeout(45000)});
 const raw = await res.text(); let data; try {data=JSON.parse(raw)} catch { data=raw; }
 return {status:res.status,data, headers:res.headers};
}
function status(result, expected) {assert.equal(result.status,expected,JSON.stringify(result.data)); return result.data;}
async function check(id, name, fn) {
 try {await fn();runs.push({id,name,result:'PASS'});console.log(`PASS ${id}: ${name}`)}
 catch(e) {runs.push({id,name,result:'FAIL',reason:e.message});console.error(`FAIL ${id}: ${name} — ${e.message}`)}
}
async function poll(fn, timeout=20000) {
 const until=Date.now()+timeout; let last;
 do { try {const v=await fn();if(v)return v;}catch(e){last=e;}await sleep(400)}while(Date.now()<until);
 throw last || Error('Timeout waiting for asynchronous result');
}
function mongoCount(collection, filter) {
 const js=`print(db.getCollection(${JSON.stringify(collection)}).countDocuments(${JSON.stringify(filter)}))`;
 const out=execFileSync('docker',['compose','exec','-T','shipment-db','mongosh','--quiet',process.env.SHIPMENT_DB_NAME||'shipment_db','--eval',js],{encoding:'utf8',timeout:20000});
 const match=out.trim().match(/(\d+)\s*$/); if(!match)throw Error(`Unparseable Mongo response: ${out}`);
 return Number(match[1]);
}
async function withProducer(fn) {
 const producer=new Kafka({clientId:'test-p3-'+Date.now(),brokers:(process.env.TEST_KAFKA_BROKERS||'127.0.0.1:19092').split(','),logLevel:logLevel.ERROR}).producer();
 await producer.connect();try{await fn(producer)}finally{await producer.disconnect()}
}
async function main() {
 console.log('Teacher Prompt 3 — 25 case E2E. Base URL:',base);
 const health = await request('GET','/api/health');
 assert.equal(health.status,200,'Start Docker Compose and check GET /api/health before running E2E.');
 await check('TC-IAM-01','Register valid account (201)',async()=> {
  const o=await request('POST','/api/auth/register',{username:state.username,password:state.password,fullname:'Khach hang E2E'});
  state.uid=status(o,201).uid;assert.ok(state.uid>0);
 });
 await check('TC-IAM-02','Duplicate username (409)',async()=>status(await request('POST','/api/auth/register',{username:state.username,password:state.password}),409));
 await check('TC-IAM-03','Missing password (400)',async()=>status(await request('POST','/api/auth/register',{username:'bad_'+Date.now(),password:''}),400));
 await check('TC-IAM-04','Valid login returns JWT',async()=>{
  const d=status(await request('POST','/api/auth/login',{username:state.username,password:state.password}),200);
  assert.equal(typeof d.accessToken,'string');state.userToken=d.accessToken;
 });
 await check('TC-IAM-05','Invalid login (401)',async()=>status(await request('POST','/api/auth/login',{username:state.username,password:'wrong_password'}),401));
 const admin = status(await request('POST','/api/auth/login',{username:process.env.ADMIN_USERNAME||'demo_admin',password:process.env.ADMIN_PASSWORD||'DemoAdmin123!'}),200);
 state.adminToken=admin.accessToken;
 await check('TC-CUS-01','Get existing Customer',async()=>{
  const c=status(await request('GET',`/api/customers/${state.uid}`,undefined,state.userToken),200);
  assert.equal(c.uid,state.uid);state.mid=c.mid;state.score=c.membership.score;
 });
 await check('TC-CUS-02','Get missing Customer (404)',async()=>status(await request('GET','/api/customers/2147483647',undefined,state.adminToken),404));
 await check('TC-CUS-03','Update fullname',async()=>{
  const d=status(await request('PUT',`/api/customers/${state.uid}`,{fullname:'Khach hang E2E moi'},state.userToken),200);
  assert.equal(d.fullname,'Khach hang E2E moi');
 });
 await check('TC-CUS-04','Get Membership',async()=>{
  const d=status(await request('GET',`/api/memberships/${state.mid}`,undefined,state.adminToken),200);
  assert.equal(d.mid,state.mid);assert.equal(typeof d.mname,'string');assert.equal(d.score,state.score);
 });
 await check('TC-CUS-05','Get Customer without JWT (401)',async()=>status(await request('GET',`/api/customers/${state.uid}`),401));
 // Establish an existing product BEFORE PRO-01–03 without counting this as a teacher TC.
 const seeded = status(await request('POST','/api/products',{pname:`P3 preseed ${Date.now()}`,price:'100',quantity:10},state.adminToken),201);
 state.seedPid=seeded.pid;
 await check('TC-PRO-01','List Products',async()=>{
  const data=status(await request('GET','/api/products',undefined,state.adminToken),200);
  assert.ok(Array.isArray(data.items));assert.ok(data.items.some(i=>i.pid===state.seedPid));
 });
 await check('TC-PRO-02','Get existing Product',async()=>{
  const d=status(await request('GET',`/api/products/${state.seedPid}`,undefined,state.adminToken),200);
  assert.equal(d.pid,state.seedPid);
 });
 await check('TC-PRO-03','Get missing Product (404)',async()=>status(await request('GET','/api/products/2147483647',undefined,state.adminToken),404));
 await check('TC-PRO-04','Create Product (201)',async()=>{
  const d=status(await request('POST','/api/products',{pname:`P3 main ${Date.now()}`,price:'100',quantity:15},state.adminToken),201);
  state.pid=d.pid;assert.ok(state.pid>0);
 });
 await check('TC-PRO-05','Update Product quantity',async()=>{
  const d=status(await request('PUT',`/api/products/${state.pid}`,{quantity:20},state.adminToken),200);
  assert.equal(d.quantity,20);
 });
 await check('TC-ORD-01','Create Order and OrderDetail',async()=>{
  const d=status(await request('POST','/api/orders',{items:[{pid:state.pid,qty:2}]},state.userToken,{'Idempotency-Key':`e2e-ord1-${randomUUID()}`}),201);
  assert.equal(d.uid,state.uid);assert.equal(d.items[0].pid,state.pid);assert.equal(d.items[0].qty,2);state.oid1=d.oid;
 });
 await check('TC-ORD-02','Create Order without JWT (401)',async()=>status(await request('POST','/api/orders',{items:[{pid:state.pid,qty:1}]}),401));
 await check('TC-ORD-03','Order exceeds stock: no Order created',async()=>{
  const before=status(await request('GET','/api/orders',undefined,state.userToken),200).items.length;
  const res=await request('POST','/api/orders',{items:[{pid:state.pid,qty:2000}]},state.userToken,{'Idempotency-Key':`e2e-stock-${randomUUID()}`});
  assert.equal(res.status,409,JSON.stringify(res.data));
  const after=status(await request('GET','/api/orders',undefined,state.userToken),200).items.length;
  assert.equal(after,before,'An invalid order must not be saved');
 });
 await check('TC-ORD-04','Discount according to membership score',async()=>{
  const d=status(await request('POST','/api/orders',{items:[{pid:state.pid,qty:1}]},state.userToken,{'Idempotency-Key':`e2e-discount-${randomUUID()}`}),201);
  state.discountOid=d.oid;
  const expected = Math.min(100, state.score * Number(process.env.DISCOUNT_PER_POINT||1));
  assert.equal(Number(d.discount),expected);assert.equal(Number(d.total),100-expected);
 });
 await check('TC-ORD-05','OrderCreated published through Kafka Outbox',async()=>{
  const d=status(await request('POST','/api/orders',{items:[{pid:state.pid,qty:1}]},state.userToken,{'Idempotency-Key':`e2e-event-${randomUUID()}`}),201);
  state.eventOid=d.oid;await checkOrderEvent(state.eventOid);
 });
 await check('TC-SHP-01','Shipment created from OrderCreated event',async()=>{
  const s=await poll(async()=>{
    const r=await request('GET',`/api/shipments/by-order/${state.eventOid}`,undefined,state.userToken);
    return r.status===200?r.data:null;
  });
  state.shipid=s.shipid;assert.equal(s.oid,state.eventOid);assert.equal(s.status,'PENDING');
 });
 await check('TC-SHP-02','Invalid event missing oid is rejected',async()=>{
  const marker='invalid-'+randomUUID();
  await withProducer(async p=>p.send({topic:process.env.KAFKA_ORDER_TOPIC||'order-created',messages:[{value:JSON.stringify({type:'OrderCreated',version:1,eventId:marker,uid:state.uid})}]}));
  await poll(async()=>mongoCount('RejectedEvent',{body:{$regex:marker}}) >= 1);
 });
 await check('TC-SHP-03','Update Shipment to SHIPPING',async()=>{
  const d=status(await request('PATCH',`/api/shipments/${state.shipid}/status`,{status:'SHIPPING'},state.adminToken),200);
  assert.equal(d.status,'SHIPPING');
 });
 await check('TC-SHP-04','Update missing Shipment (404)',async()=>status(await request('PATCH','/api/shipments/2147483647/status',{status:'SHIPPING'},state.adminToken),404));
 await check('TC-SHP-05','Duplicate event does not create duplicate Shipment',async()=>{
  const e={type:'OrderCreated',version:1,eventId:'repeat-'+randomUUID(),oid:state.eventOid,uid:state.uid};
  await withProducer(async p=>p.send({topic:process.env.KAFKA_ORDER_TOPIC||'order-created',messages:[{key:String(state.eventOid),value:JSON.stringify(e)}]}));
  await sleep(3000);
  assert.equal(mongoCount('Shipment',{oid:state.eventOid}),1);
  const d=status(await request('GET',`/api/shipments/by-order/${state.eventOid}`,undefined,state.userToken),200);
  assert.equal(d.shipid,state.shipid);
 });
 const fs=require('node:fs');fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/e2e.json',JSON.stringify({base,checkedAt:new Date().toISOString(),results:runs},null,2));
 const passed=runs.filter(x=>x.result==='PASS').length;
 console.log(`\nTEACHER P3: ${passed}/${runs.length} PASS. Saved: test-results/e2e.json`);
 if (passed!==25 || runs.length!==25) process.exitCode=1;
}
main().catch(e=>{console.error('E2E setup/transport failed:',e.message);process.exitCode=1});
