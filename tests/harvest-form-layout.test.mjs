import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {JSDOM} from 'jsdom';
import {createElement,act} from 'react';

test('harvest form uses wrapping context and a fixed error footer for both edit and create',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
 const globals={window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true};
 const originals=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const[key,value]of Object.entries(globals))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 const record={harvestRecordId:73,cropSeasonId:17,farmId:1,blockId:3,harvestLotCode:'LOT-73',traceabilityCode:'TRACE-73',quantity:125.5,unit:'kg',harvestedAt:'2026-10-28T08:30:00',qualityGrade:'Grade 1 (Export Premium)',notes:'Keep notes'};
 const writes=[];
 globalThis.__harvestFormTest={request:async(url,options)=>{
  if(options?.method==='PUT'){writes.push([url,options.data]);throw Error('Harvest save rejected');}
  return{success:true,data:url.startsWith('/harvest-records?')?{items:[record]}:record};
 }};
 const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,ws:false},appType:'custom',plugins:[{
  name:'harvest-form-test',enforce:'pre',
  resolveId(source){for(const[name,key]of [['httpClient','http'],['FarmWorkspace','farm'],['cropSeasonService','seasons'],['realtimeSync','realtime']])if(source.endsWith('/'+name))return '\0harvest-form-'+key;},
  load(id){
   if(id==='\0harvest-form-http')return 'export const apiRequest=(...args)=>globalThis.__harvestFormTest.request(...args);';
   if(id==='\0harvest-form-farm')return 'export const useFarmWorkspace=()=>({selectedFarm:{id:1,farmName:"Fixture farm"}});';
   if(id==='\0harvest-form-seasons')return 'export const fetchCropSeasonsByFarm=async()=>[{cropSeasonId:17,seasonName:"Fixture long season name",seasonStatus:"active"}]; export const fetchBlocksInSeason=async()=>[{blockId:3,blockName:"Fixture block",plantedAt:"2026-01-01",plantedArea:500,areaUnit:"m2"}];';
   if(id==='\0harvest-form-realtime')return 'export const useRealtimeSync=()=>{};';
  },
 }]});
 let root;
 try{
  const{HarvestPage}=await server.ssrLoadModule('/src/features/operations/HarvestPage.tsx');
  const{LanguageProvider}=await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
  const{createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
  await act(async()=>root.render(createElement(LanguageProvider,null,createElement(HarvestPage))));
  assert.equal(document.querySelectorAll('thead th').length,6);
  const edit=[...document.querySelectorAll('button')].find(button=>/^(Edit|Ch\u1ec9nh s\u1eeda)$/.test(button.textContent.trim()));
  assert.ok(edit);await act(async()=>edit.click());
  const dialog=document.querySelector('dialog');
  assert.ok(dialog.classList.contains('modal-form-layout'));
  assert.match(dialog.querySelector('.ui-form-context').textContent,/Fixture long season name/);
  assert.equal(document.querySelector('#harvest-lot-code').tagName,'DIV');
  assert.equal(document.querySelector('#harvest-trace-code').textContent,'TRACE-73');
  const form=dialog.querySelector('form');const footer=form.querySelector(':scope > .modal-body + .modal-footer');
  assert.ok(footer?.querySelector('button[type="submit"]'));
  await act(async()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(writes.length,1);
  assert.match(footer.querySelector('[role="alert"]').textContent,/Harvest save rejected/);
  assert.equal(document.querySelector('[aria-label="Notes"], [aria-label="Ghi ch\u00fa"]').value,'Keep notes');
  await act(async()=>dialog.querySelector('.modal-close').click());
  const create=[...document.querySelectorAll('button')].find(button=>/Record Harvest Batch|Ghi nh\u1eadn \u0111\u1ee3t thu ho\u1ea1ch/.test(button.textContent));
  assert.ok(create);await act(async()=>create.click());
  assert.equal(document.querySelector('#harvest-lot-code').tagName,'INPUT');
  assert.equal(document.querySelector('#harvest-lot-code').required,true);
  assert.ok(document.querySelector('form > .modal-body + .modal-footer'));
 }finally{
  if(root)await act(async()=>root.unmount());await server.close();dom.window.close();delete globalThis.__harvestFormTest;
  for(const[key,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
 }
});
