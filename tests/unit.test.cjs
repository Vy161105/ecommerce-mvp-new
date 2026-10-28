'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCredentials, validateContact } = require('../services/auth-service/src/domain/credentials');
const { validateUid, validateFullname, validateMid } = require('../services/customer-service/src/domain/customer');
const { validatePid, validatePname, validatePrice, validateQuantity } = require('../services/product-service/src/domain/product');
const { normalize, totals } = require('../services/order-service/src/domain/order');
const { validateEvent, access, transition } = require('../services/shipment-service/src/domain/shipment');
const goodEvent = { eventId: 'e1', type: 'OrderCreated', version: 1, oid: 1, uid: 2 };
const cases = [
  ['IAM: valid credentials', () => assert.deepEqual(validateCredentials({username:' demo ',password:'1234'}), {username:'demo',password:'1234'})],
  ['IAM: missing username', () => assert.throws(() => validateCredentials({password:'a'}))],
  ['IAM: blank password', () => assert.throws(() => validateCredentials({username:'abc',password:'   '}))],
  ['IAM: password UTF-8 >72 bytes', () => assert.throws(() => validateCredentials({username:'abc',password:'😀'.repeat(20)}))],
  ['IAM: password 72 bytes accepted', () => assert.equal(validateCredentials({username:'abc',password:'x'.repeat(72)}).password.length,72)],
  ['IAM: contact optional', () => assert.deepEqual(validateContact({}),{email:null,phone:null})],
  ['IAM: valid email/phone', () => assert.equal(validateContact({email:' test@example.com ', phone:'0901234567'}).email,'test@example.com')],
  ['IAM: invalid email', () => assert.throws(() => validateContact({email:'no-email'}))],
  ['IAM: invalid phone', () => assert.throws(() => validateContact({phone:'123'}))],
  ['CUS: uid positive', () => assert.equal(validateUid(1),1)],
  ['CUS: uid zero rejected', () => assert.throws(() => validateUid(0))],
  ['CUS: fullname trimmed', () => assert.equal(validateFullname('  Demo  '),'Demo')],
  ['CUS: fullname empty rejected', () => assert.throws(() => validateFullname('  '))],
  ['CUS: mid positive', () => assert.equal(validateMid(1),1)],
  ['CUS: mid negative rejected', () => assert.throws(() => validateMid(-1))],
  ['PRO: valid pid', () => assert.equal(validatePid(1),1)],
  ['PRO: pid must be int32', () => assert.throws(() => validatePid(2147483648))],
  ['PRO: valid pname', () => assert.equal(validatePname(' Demo '),'Demo')],
  ['PRO: empty pname rejected', () => assert.throws(() => validatePname(''))],
  ['PRO: valid price', () => assert.equal(validatePrice('12.5'),'12.50')],
  ['PRO: zero price rejected', () => assert.throws(() => validatePrice('0'))],
  ['PRO: excessive decimals rejected', () => assert.throws(() => validatePrice('1.234'))],
  ['PRO: valid quantity zero', () => assert.equal(validateQuantity(0),0)],
  ['PRO: negative quantity rejected', () => assert.throws(() => validateQuantity(-1))],
  ['ORD: normalize order sorted by pid', () => assert.deepEqual(normalize({uid:1,request_id:'key_1',items:[{pid:3,qty:1},{pid:2,qty:2}]}),[{pid:2,qty:2},{pid:3,qty:1}])],
  ['ORD: duplicate product rejected', () => assert.throws(() => normalize({uid:1,request_id:'abc',items:[{pid:1,qty:1},{pid:1,qty:1}]}))],
  ['ORD: empty order rejected', () => assert.throws(() => normalize({uid:1,request_id:'abc',items:[]}))],
  ['ORD: invalid idempotency key', () => assert.throws(() => normalize({uid:1,request_id:'key space',items:[{pid:1,qty:1}]}))],
  ['ORD: discount by score', () => assert.deepEqual(totals([{unit_price:'100',qty:2}],10),{subtotal:'200.00',discount:'10.00',total:'190.00'})],
  ['ORD: discount capped by subtotal', () => assert.equal(totals([{unit_price:'2',qty:1}],10).total,'0.00')],
  ['ORD: negative score rejected', () => assert.throws(() => totals([{unit_price:'100',qty:1}],-1))],
  ['SHP: valid OrderCreated event', () => assert.equal(validateEvent(goodEvent).oid,1)],
  ['SHP: missing oid rejected', () => assert.throws(() => validateEvent({...goodEvent,oid:undefined}))],
  ['SHP: wrong version rejected', () => assert.throws(() => validateEvent({...goodEvent,version:2}))],
  ['SHP: owner can read', () => assert.doesNotThrow(() => access({uid:2},{requester_uid:2,requester_role:'normal'}))],
  ['SHP: other user cannot read', () => assert.throws(() => access({uid:2},{requester_uid:3,requester_role:'normal'}))],
  ['SHP: normal user cannot update', () => assert.throws(() => access({uid:2},{requester_uid:2,requester_role:'normal'},true))],
  ['SHP: shipment_staff can update', () => assert.doesNotThrow(() => access({uid:2},{requester_uid:3,requester_role:'shipment_staff'},true))],
  ['SHP: pending to shipping', () => assert.equal(transition('PENDING','SHIPPING'),'SHIPPING')],
  ['SHP: shipping to delivered', () => assert.equal(transition('SHIPPING','DELIVERED'),'DELIVERED')],
  ['SHP: pending to delivered rejected', () => assert.throws(() => transition('PENDING','DELIVERED'))],
  ['SHP: delivered cannot revert', () => assert.throws(() => transition('DELIVERED','PENDING'))],
];
for (const [name, fn] of cases) test(name, fn);
