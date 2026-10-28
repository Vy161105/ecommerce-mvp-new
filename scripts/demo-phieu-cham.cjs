'use strict';
// Demo assistance for 8 rubric items. Items 1–3 require spoken explanation / CLI.
require('dotenv').config();
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const checkOrderEvent=require('./check-order-event.cjs');
const base=process.env.TEST_BASE_URL||'http://localhost:3002';
const stateFile=path.join(__dirname,'../test-results/demo-state.json');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function api(method, route, body, token, extra={}) {
 const headers={...extra};if(token)headers.Authorization=`Bearer ${token}`;
 if(body!==undefined)headers['Content-Type']='application/json';
 const res=await fetch(base+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
 const data=await res.json();return {status:res.status,data};
}
function expect(res,code) {assert.equal(res.status,code,JSON.stringify(res.data));return res.data}
function output(label,result) {console.log(`\n${label} → HTTP ${result.status}`);console.log(JSON.stringify(result.data,null,2));}
async function setup() {
 const admin=expect(await api('POST','/api/auth/login',{username:process.env.ADMIN_USERNAME||'demo_admin',password:process.env.ADMIN_PASSWORD||'DemoAdmin123!'}),200);
 const product=expect(await api('POST','/api/products',{pname:`Demo Prompt3 ${Date.now()}`,price:'100',quantity:100},admin.accessToken),201);
 const username='demo_p3_'+Date.now();const password='DemoP3_123!';
 const reg=expect(await api('POST','/api/auth/register',{username,password,fullname:'Khach hang demo'},null),201);
 const login=expect(await api('POST','/api/auth/login',{username,password},null),200);
 const customer=expect(await api('GET',`/api/customers/${reg.uid}`,undefined,login.accessToken),200);
 const state={createdAt:new Date().toISOString(),adminToken:admin.accessToken,userToken:login.accessToken,uid:reg.uid,mid:customer.mid,score:customer.membership.score,pid:product.pid};
 fs.mkdirSync(path.dirname(stateFile),{recursive:true});fs.writeFileSync(stateFile,JSON.stringify(state,null,2),{mode:0o600});
 console.log('PASS setup: tạo Customer normal, Membership và Product mới.');
 console.log(JSON.stringify({uid:state.uid,mid:state.mid,score:state.score,pid:state.pid,username,password},null,2));
 console.log('Token lưu riêng tại test-results/demo-state.json (không đưa lên GitHub).');return state;
}
function load() {
 if(!fs.existsSync(stateFile)) throw Error('Chạy npm run demo:setup trước, hoặc npm run demo:all.');
 return JSON.parse(fs.readFileSync(stateFile,'utf8'));
}
async function shipment(oid,token) {
 let res;for(let i=0;i<35;i++) {
  res=await api('GET',`/api/shipments/by-order/${oid}`,undefined,token);
  if(res.status===200)return res;
  if(res.status!==404) throw Error(JSON.stringify(res));
  await wait(500);
 }throw Error('Shipment chưa xuất hiện sau khi tạo đơn: '+JSON.stringify(res));
}
async function item(n,s) {
 if(n==='4') {const r=await api('GET','/api/products',undefined,s.adminToken);output('TC-PRO-01',r);const d=expect(r,200);assert.ok(d.items.some(p=>p.pid===s.pid));}
 else if(n==='5') {
  const c=await api('GET',`/api/customers/${s.uid}`,undefined,s.adminToken);output('Customer',c);expect(c,200);
  const m=await api('GET',`/api/memberships/${s.mid}`,undefined,s.adminToken);output('TC-CUS-04 Membership',m);const d=expect(m,200);assert.equal(d.score,s.score);
 } else if(n==='6') {const r=await api('GET',`/api/customers/${s.uid}`);output('TC-CUS-05 (No Auth)',r);expect(r,401);}
 else if(n==='7') {
  const r=await api('POST','/api/orders',{items:[{pid:s.pid,qty:2}]},s.userToken,{'Idempotency-Key':'rubric-discount-'+randomUUID()});output('TC-ORD-04 discount',r);
  const d=expect(r,201);assert.equal(Number(d.discount),Math.min(200,s.score*Number(process.env.DISCOUNT_PER_POINT||1)));
  console.log(`subtotal=${d.subtotal}, discount=${d.discount}, total=${d.total}, oid=${d.oid}`);
  const r2=await api('GET',`/api/orders/${d.oid}`,undefined,s.userToken);output('Get order',r2);expect(r2,200);
 } else if(n==='8') {
  console.log('Gợi ý: mở Kafka consumer ở Terminal khác TRƯỚC khi chạy câu 8.');
  const r=await api('POST','/api/orders',{items:[{pid:s.pid,qty:1}]},s.userToken,{'Idempotency-Key':'rubric-event-'+randomUUID()});output('TC-ORD-05 CreateOrder',r);
  const d=expect(r,201);await checkOrderEvent(d.oid);
  console.log(`PASS: Outbox OrderCreated đã phát, oid=${d.oid}`);
  const sh=await shipment(d.oid,s.userToken);output('Shipment by order',sh);
 } else throw Error('Chọn câu 4, 5, 6, 7 hoặc 8');
 console.log(`\nPASS mục ${n}`);
}
(async()=>{
 const cmd=process.argv[2]||'all';
 if(cmd==='setup')return void await setup();
 if(cmd==='all') {const s=await setup();for(const n of ['4','5','6','7','8'])await item(n,s);return;}
 await item(cmd,load());
})().catch(e=>{console.error('DEMO FAIL:',e.message);process.exitCode=1});
