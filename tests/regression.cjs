const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const code=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
function boot({date='2026-11-01T16:01:00Z',stored={},outfits=[]}={}){
 let now=date;const elements=new Map(),listeners={},storage=new Map(Object.entries(stored));
 function element(id){if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',dataset:{},style:{setProperty(){}},hidden:false,classList:{add(){},remove(){},toggle(){}},attrs:{},events:{},addEventListener(n,f){this.events[n]=f},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},removeAttribute(k){delete this.attrs[k]},hasAttribute(k){return k in this.attrs},focus(){},showModal(){this.open=true},close(){this.open=false}});return elements.get(id)}
 const document={querySelector:element,querySelectorAll:()=>[],addEventListener:(n,f)=>listeners[n]=f,body:element('body'),documentElement:element('html')};
 class FakeDate extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return new Date(now).getTime()}}
 const window={Y_NEW_OUTFITS:outfits,scrollTo(){},innerHeight:800,addEventListener(){},matchMedia:()=>({matches:true})};
 const context={document,window,Date:FakeDate,Intl,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setInterval(){},setTimeout(){},clearTimeout(){}};vm.createContext(context);
 const exposed=code.replace(/\}\)\(\);\s*$/,`globalThis.test={clock,addDays,weekday,outfitForDate,chooseOutfit,entry,dates,renderPlan,tick,selectDate,render,attendance, getPlan:d=>typeof planForDate==='function'?planForDate(d):plans[d], setPlanDate:d=>planDate=d,getState:()=>({today,selected,planDate,records,meta,manualOutfit})};})();`);
 vm.runInContext(exposed,context);return {...context.test,element,storage,setNow:d=>now=d,listeners};
}
const legacy={'2026-10-30':{weight:{value:90,at:'2026-10-30 09:00'},study:{value:'yes',at:'2026-10-30 09:00'},exercise:{value:'rest',at:'2026-10-30 09:00'}},'2026-11-01':{exercise:{value:'yes',at:'2026-11-01 15:00'}}};
const saved=JSON.stringify({records:legacy,meta:{gameStudyTarget:28,gameExerciseTarget:30}});
const app=boot({stored:{'y-small-steps-v2':saved}});
assert.equal(app.clock().date,'2026-11-02');assert.deepEqual(JSON.parse(app.storage.get('y-small-steps-v2')).records,legacy);assert.equal(app.getState().meta.gameStudyTarget,28);assert.equal(app.attendance().count,1);
for(const [d,n,out] of [['2026-11-01',1,'2026-11-02'],['2026-11-30',1,'2026-12-01'],['2026-12-31',1,'2027-01-01'],['2027-01-01',-1,'2026-12-31']])assert.equal(app.addDays(d,n),out);
app.selectDate('2026-10-30');app.setPlanDate('2026-11-01');app.setNow('2026-11-02T16:01:00Z');app.tick();assert.equal(app.getState().today,'2026-11-03');assert.equal(app.getState().selected,'2026-10-30');assert.equal(app.getState().planDate,'2026-11-01');
const rolling=boot();rolling.setNow('2026-11-02T16:01:00Z');rolling.tick();assert.equal(rolling.getState().selected,'2026-11-03');assert.equal(rolling.getState().planDate,'2026-11-03');
const expanded=boot({outfits:[{key:'new1',name:'新一',src:'assets/new1.png'},{key:'new2',name:'新二',src:'assets/new2.png'}]});
assert.equal(expanded.outfitForDate('2026-11-01').key,'sun');assert.equal(expanded.outfitForDate('2026-11-02').key,'new1');assert.equal(new Set(Array.from({length:9},(_,i)=>expanded.outfitForDate(expanded.addDays('2026-11-02',i)).key)).size,9);assert.equal(expanded.outfitForDate('2026-11-11').key,'new1');
expanded.chooseOutfit('fri');assert.equal(expanded.storage.get('y-small-steps-outfit-v1'),'fri');expanded.chooseOutfit(null);assert.equal(expanded.getState().manualOutfit,null);assert.equal(expanded.storage.has('y-small-steps-outfit-v1'),false);
// Exercise the original delegated save/edit/delete handler, not a duplicate model.
function click(app,dataset){app.element('#progress-cards').events.click({target:{closest:()=>({dataset,hasAttribute:k=>Object.hasOwn(dataset,k.replace(/^data-/,'')),disabled:false})}})}
app.selectDate('2026-10-30');click(app,{edit:'exercise'});click(app,{choice:'yes',kind:'exercise'});click(app,{save:'exercise'});assert.equal(app.entry('2026-10-30','exercise').value,'yes');assert.equal(app.attendance().count,2);click(app,{edit:'exercise'});click(app,{choice:'rest',kind:'exercise'});click(app,{save:'exercise'});assert.equal(app.attendance().count,1);click(app,{undo:'exercise'});assert.equal(app.entry('2026-10-30','exercise'),null);assert.equal(app.entry('2026-10-30','weight').value,90);assert.equal(app.entry('2026-10-30','study').value,'yes');
// Every referenced shipped avatar must exist; generated fixture entries above are logic-only.
const catalogContext={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/../wardrobe-catalog.js','utf8'),catalogContext);for(const o of catalogContext.window.Y_NEW_OUTFITS)assert.ok(fs.existsSync(__dirname+'/../'+o.src),o.src);
console.log('PASS: Shanghai dates, historical midnight preservation, navigation boundaries, 9-outfit rotation, auto/manual, legacy retention and original save/edit/delete flows.');
for(const d of ['2026-11-01','2026-11-02','2026-11-08'])assert.equal(app.getPlan(d).rest,true,d);
assert.equal(app.getPlan('2026-11-02').baseline,undefined);assert.equal(app.getPlan('2026-11-09').baseline,true);assert.match(app.getPlan('2026-11-09').title,/臀腿/);
assert.equal(app.getPlan('2026-11-10').rest,true);assert.equal(app.getPlan('2026-11-15').rest,true);
for(const [start,baseline] of [['2026-11-02',false],['2026-11-09',true]]){const week=Array.from({length:7},(_,i)=>app.getPlan(app.addDays(start,i)));assert.equal(week.filter(p=>p.rest).length,2);assert.equal(week.filter(p=>p.light).length,2);assert.equal(week.filter(p=>!p.rest&&!p.light).length,3);assert.equal(week.filter(p=>p.title.includes('上肢')).length,1)}
for(const d of ['2026-11-09','2026-12-01','2027-01-01','2028-02-29','2026-10-01']){app.setPlanDate(d);app.renderPlan();assert.match(app.element('#daily-plan').innerHTML,/每周基础安排/);assert.doesNotMatch(app.element('#daily-plan').innerHTML,/这一天还没有安排/)}
app.setPlanDate('2026-11-08');app.renderPlan();assert.match(app.element('#daily-plan').innerHTML,/日期专属安排/);assert.match(app.element('#daily-plan').innerHTML,/休息日/);
const lower=app.getPlan('2026-11-04');assert.deepEqual(Array.from(lower.items.slice(0,4),x=>x[0]),['哈克深蹲','髋外展','腿弯举','髋内收']);assert.match(lower.warning,/48 小时/);assert.doesNotMatch(JSON.stringify(lower),/臀推|腿举|推肩/);
console.log('PASS: dated Nov1/2/8 priority, perpetual Nov9/month/year/leap-day baseline, truthful labels, 3 strength + 2 light + 2 rest and familiar moves.');
const restored=boot({stored:{'y-small-steps-outfit-v1':'fri'}});assert.equal(restored.getState().manualOutfit,'fri');assert.equal(restored.element('#avatar-image').dataset.outfitKey,'fri');restored.element('#avatar-image').events.error();assert.notEqual(restored.element('#avatar-image').dataset.outfitKey,'fri');assert.equal(restored.getState().manualOutfit,'fri');
const visible=boot({date:'2026-11-01T15:59:59Z'});assert.equal(visible.getState().today,'2026-11-01');visible.setNow('2026-11-01T16:00:01Z');visible.listeners.visibilitychange();assert.equal(visible.getState().today,'2026-11-02');assert.equal(visible.getState().planDate,'2026-11-02');
const empty=boot();assert.equal(empty.getState().records&&Object.keys(empty.getState().records).length,0);assert.equal(empty.attendance().count,0);assert.match(empty.element('#hud-weight').innerHTML,/待记录/);
console.log('PASS: persistent manual outfit, safe image fallback, visibility midnight refresh, no fabricated fresh-device records.');
if(process.argv.includes('--release')){
 const shipped=catalogContext.window.Y_NEW_OUTFITS;
 const expected=['冬日双影','盘扣夜行','夜色短外套','雾灰长风','墨绿丝绒','银扣街头','冬夜骑士'];
 assert.equal(shipped.length,7,'Release requires seven verified new outfits');
 assert.deepEqual(Array.from(shipped,o=>o.name),expected);
 for(let i=0;i<7;i++){
  const path=i===0?'assets/y-polished-winter-20261102.png':'assets/y-new-'+String(i+1).padStart(2,'0')+'-v2.png';assert.equal(shipped[i].src,path);
  const data=fs.readFileSync(__dirname+'/../'+path);assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Valid PNG signature: '+path);assert.ok(data.length>10000,'Nonempty image: '+path);
 }
 const actual=boot({outfits:shipped});
 assert.equal(actual.outfitForDate('2026-11-02').src,'assets/y-polished-winter-20261102.png');
 const rotation=Array.from({length:14},(_,i)=>actual.outfitForDate(actual.addDays('2026-11-02',i)));
 assert.equal(new Set(rotation.map(o=>o.key)).size,14);assert.equal(new Set(rotation.map(o=>o.src)).size,14);
 for(const o of rotation)assert.ok(fs.existsSync(__dirname+'/../'+o.src),'Shipped asset exists: '+o.src);
 assert.equal(actual.outfitForDate('2026-11-16').key,rotation[0].key);
 assert.equal(actual.outfitForDate('2026-11-09').key,'sun');
 console.log('PASS RELEASE: actual 7 new + 7 original assets, 14 unique consecutive daily outfits, Nov2 new01 and Nov16 cycle restart.');
}
