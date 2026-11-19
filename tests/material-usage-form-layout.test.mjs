import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {JSDOM} from 'jsdom';
import {createElement, act} from 'react';

test('material editor shows wrapping fixed context and preserves rejected saves beside its actions', async () => {
  const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
  const globals={window:dom.window, document:dom.window.document, IS_REACT_ACT_ENVIRONMENT:true};
  const originals=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value] of Object.entries(globals)) Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  const record={materialUsageId:73,farmingActivityId:18,activityName:'A long linked cultivation activity name',cropSeasonId:17,materialId:5,materialName:'Material A',materialType:'organic',quantity:20,appliedArea:500,appliedAreaUnit:'m?',unit:'kg',usedAt:'2026-10-28T08:30:00',dosage:'20 ml/bình',method:'Phun lá',safetyIntervalDays:7,notes:'Preserve notes',materialForm:'Dạng rắn / hạt'};
  const writes=[];
  globalThis.__usageLayoutTest={request:async(url,options)=>{
    if(options?.method==='PUT'){writes.push([url,options.data]);throw Error('Fixture save rejected');}
    const data=url.startsWith('/material-usages?')?{items:[record],totalElements:1,totalPages:1,page:0,size:50}
      :url.startsWith('/material-usages/materials?')?[{id:5,materialName:'Material A',unit:'kg'}]
      :url==='/material-usages/73'?record
      :url==='/farming-activities/18'?{farmingActivityId:18,seasonName:'A long linked season name',blockName:'Fixture block'}:null;
    if(data===null)throw Error('Unexpected request '+url);
    return {success:true,data};
  }};
  const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,ws:false},appType:'custom',plugins:[{
    name:'usage-layout-test',enforce:'pre',
    resolveId(source){
      if(source.endsWith('/httpClient'))return '\0usage-layout-http';
      if(source.endsWith('/FarmWorkspace'))return '\0usage-layout-farm';
      if(source.endsWith('/realtimeSync'))return '\0usage-layout-realtime';
    },
    load(id){
      if(id==='\0usage-layout-http')return 'export const apiRequest=(...args)=>globalThis.__usageLayoutTest.request(...args);';
      if(id==='\0usage-layout-farm')return 'export const useFarmWorkspace=()=>({selectedFarm:{id:7}});';
      if(id==='\0usage-layout-realtime')return 'export const useRealtimeSync=()=>{};';
    },
  }]});
  let root;
  try{
    const {MaterialUsagePage}=await server.ssrLoadModule('/src/features/operations/MaterialUsagePage.tsx');
    const {LanguageProvider}=await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
    const {createRoot}=await import('react-dom/client');
    root=createRoot(document.getElementById('root'));
    await act(async()=>root.render(createElement(LanguageProvider,null,createElement(MaterialUsagePage))));
    const edit=[...document.querySelectorAll('button')].find(button=>/^(Edit|Ch\u1ec9nh s\u1eeda)$/.test(button.textContent.trim()));
    assert.ok(edit);
    await act(async()=>edit.click());
    const dialog=document.querySelector('dialog');
    assert.ok(dialog.classList.contains('modal-form-layout'));
    assert.equal(document.querySelector('#usage-activity').tagName,'DIV');
    assert.equal(document.querySelector('#usage-activity').textContent,record.activityName);
    assert.match(document.querySelector('#usage-season-readonly').textContent,/A long linked season name/);
    assert.match(document.querySelector('.mu-linked-block').closest('.ui-form-context').textContent,/Fixture block/);
    assert.equal(dialog.querySelector('input[readonly]#usage-activity'),null);
    const form=dialog.querySelector('form');
    const footer=form.querySelector(':scope > .modal-body + .modal-footer');
    assert.ok(footer?.querySelector('button[type="submit"]'));
    await act(async()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
    assert.equal(writes.length,1);
    assert.equal(writes[0][0],'/material-usages/73');
    assert.match(footer.querySelector('[role="alert"]').textContent,/Fixture save rejected/);
    assert.equal(document.querySelector('#usage-notes').value,'Preserve notes');
    assert.ok(document.querySelector('dialog'));
  }finally{
    if(root)await act(async()=>root.unmount());
    await server.close();dom.window.close();delete globalThis.__usageLayoutTest;
    for(const [key,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  }
});
