import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {JSDOM} from 'jsdom';
import {createElement as h, act, useState} from 'react';

test('shared modal fixes legacy/default/admin form footers without resetting controls on errors',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
 const globals={window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true};
 const originals=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const[key,value]of Object.entries(globals))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,ws:false},appType:'custom'});
 let root;
 try{
  const{Modal}=await server.ssrLoadModule('/src/shared/components/Modal.tsx');
  const{Button}=await server.ssrLoadModule('/src/shared/components/Button.tsx');
  const{LanguageProvider}=await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
  const{createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
  let saves=0,cancels=0;
  function Fixture({mode}){
   const[error,setError]=useState(false);
   const fields=[error&&h('p',{key:'error',className:mode==='admin'?'admin-form-error':'form-error-banner',role:'alert'},'Rejected save'),h('label',{key:'label',htmlFor:'fixture-name'},'Name'),h('input',{key:'input',id:'fixture-name',defaultValue:'Initial'})];
   const actions=h('div',{className:mode==='admin'?'admin-modal-footer':'confirm-dialog-actions',style:{marginTop:8}},h(Button,{type:'button',onClick:()=>cancels++},'Cancel'),h(Button,{type:'submit',variant:'primary'},'Save'));
   let children=fields.concat(actions);
   if(mode==='existing'||mode==='admin')children=[h('div',{className:mode==='admin'?'admin-modal-body':'modal-body',key:'body'},fields),h('div',{className:'modal-footer',key:'footer'},actions)];
   const form=h('form',{className:mode==='custom'?'modal-body':undefined,onSubmit:event=>{event.preventDefault();saves++;setError(true);}},children);
   return h(Modal,{structured:true,open:true,title:'Fixture',customLayout:mode==='custom',variant:mode==='admin'?'admin':'default',onClose:()=>{}},mode==='custom'?h('div',{className:'modal-header'},h('h2',null,'Fixture')):null,mode==='nested'?h('div',null,form):form);
  }
  for(const mode of ['default','custom','existing','admin','nested']){
   await act(async()=>root.render(h(LanguageProvider,null,h(Fixture,{key:mode,mode}))));
   const dialog=document.querySelector('dialog');
   assert.ok(dialog.classList.contains('modal-form-layout'),mode);
   const form=dialog.querySelector('form');
   assert.ok(form.querySelector(':scope > .modal-body + .modal-footer'),mode);
   assert.equal(form.querySelectorAll('.modal-body').length,1,mode);
   const input=document.getElementById('fixture-name');input.value='User data must survive';
   await act(async()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
   assert.equal(document.getElementById('fixture-name'),input,'preserve control identity: '+mode);
   assert.equal(input.value,'User data must survive',mode);
   assert.equal(form.querySelector('.modal-body [role="alert"]'),null,mode);
   assert.match(form.querySelector('.modal-footer [role="alert"]').textContent,/Rejected save/,mode);
   await act(async()=>[...form.querySelectorAll('button')].find(button=>button.textContent==='Cancel').click());
  }
  assert.equal(saves,5);assert.equal(cancels,5);
  const {ChangePasswordPanel}=await server.ssrLoadModule('/src/features/auth/ChangePasswordPanel.tsx');
  await act(async()=>root.render(h(LanguageProvider,null,h(Modal,{open:true,structured:true,className:'modal-form-layout',title:'Password',onClose:()=>{}},h(ChangePasswordPanel,{embedded:true})))));
  const passwordForm=document.querySelector('form');
  assert.ok(passwordForm.querySelector(':scope > .modal-body + .modal-footer'));
  await act(async()=>passwordForm.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
  assert.ok(passwordForm.querySelector('.modal-footer [role="alert"]'));
 }finally{
  if(root)await act(async()=>root.unmount());await server.close();dom.window.close();
  for(const[key,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
 }
});
