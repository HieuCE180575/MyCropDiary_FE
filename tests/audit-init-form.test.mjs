import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {JSDOM} from 'jsdom';
import {createElement as h,act} from 'react';

test('audit initialization retries season loading, docks save errors, and ignores stale farm responses',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
 const globals={window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true};
 const originals=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const[key,value]of Object.entries(globals))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 let attempts=0,failSave=true,releaseOld;
 const writes=[],successes=[];
 globalThis.__auditInitTest={
  seasons:async farmId=>{
   if(farmId===7&&attempts++===0)throw Error('Season service unavailable');
   if(farmId===8)return new Promise(resolve=>{releaseOld=resolve;});
   return [{cropSeasonId:farmId*10,seasonName:'Fixture season '+farmId,cropCategoryName:'Tomato'}];
  },
  save:async(...args)=>{writes.push(args);if(failSave)throw Error('Audit save rejected');return {runId:73};},
 };
 const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,ws:false},appType:'custom',plugins:[{
  name:'audit-init-test',enforce:'pre',
  resolveId(source,importer){if(!importer?.includes('VietGapInitRunModal'))return;if(source.endsWith('/cropSeasonService'))return '\0audit-init-seasons';if(source.endsWith('/vietgapComplianceService'))return '\0audit-init-save';},
  load(id){if(id==='\0audit-init-seasons')return 'export const fetchCropSeasonsByFarm=(...args)=>globalThis.__auditInitTest.seasons(...args);';if(id==='\0audit-init-save')return 'export const initVietGapAuditRunApi=(...args)=>globalThis.__auditInitTest.save(...args);';},
 }]});
 let root;
 try{
  const{VietGapInitRunModal}=await server.ssrLoadModule('/src/features/compliance/VietGapInitRunModal.tsx');
  const{LanguageProvider}=await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
  const{createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
  const render=farmId=>act(async()=>root.render(h(LanguageProvider,null,h(VietGapInitRunModal,{farmId,onClose:()=>{},onSuccess:run=>successes.push(run)}))));
  await render(7);
  assert.match(document.querySelector('[role="alert"]').textContent,/Season service unavailable/);
  assert.equal(document.querySelector('button[type="submit"]').disabled,true);
  const retry=[...document.querySelectorAll('button')].find(button=>/Retry|Th\u1eed l\u1ea1i/.test(button.textContent));
  await act(async()=>retry.click());
  assert.equal(document.querySelector('#audit-season').value,'70');
  const form=document.querySelector('form');
  const footer=form.querySelector(':scope > .modal-body + .modal-footer');assert.ok(footer);
  const notes=document.querySelector('#audit-notes');
  await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value').set.call(notes,'Keep notes');notes.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
  await act(async()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
  assert.match(footer.querySelector('[role="alert"]').textContent,/Audit save rejected/);
  assert.equal(document.querySelector('#audit-notes'),notes);
  assert.equal(notes.value,'Keep notes');assert.equal(successes.length,0);
  failSave=false;
  await act(async()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(writes[1][0],7);assert.equal(writes[1][1].cropSeasonId,70);assert.equal(writes[1][1].notes,'Keep notes');assert.equal(successes.length,1);
  await render(8);assert.equal(document.querySelector('#audit-season').disabled,true);
  await render(9);assert.equal(document.querySelector('#audit-season').value,'90');
  await act(async()=>releaseOld([{cropSeasonId:80,seasonName:'Stale farm season'}]));
  assert.equal(document.querySelector('#audit-season').value,'90');
  assert.doesNotMatch(document.querySelector('#audit-season').textContent,/Stale farm season/);
 }finally{
  if(root)await act(async()=>root.unmount());await server.close();dom.window.close();delete globalThis.__auditInitTest;
  for(const[key,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
 }
});
