(()=>{
'use strict';
const cfg=window.ekConfig;if(!cfg)return;
const $=id=>document.getElementById(id),root=cfg.root;
let types=cfg.types,selection=null,ticket='',busy=false,editRows=[];
const createForm=$('ekCreate'),editForm=$('ekEditForm'),filterForm=$('ekFilters');
const settingsDialog=$('ekSettingsDialog'),passwordDialog=$('ekPasswordDialog'),editDialog=$('ekEditDialog'),deleteDialog=$('ekDeleteDialog');
const msg=(id,text='',ok=false)=>{const el=$(id);el.textContent=text;el.classList.toggle('ok',ok);};
if(cfg.success)msg('ekMessage','Приймання кег успішно записано.',true);
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
const button=(text,fn,cls='btn secondary',label)=>{const b=node('button',text,cls);b.type='button';if(label)b.setAttribute('aria-label',label);b.addEventListener('click',fn);return b;};
const key=()=>{const b=new Uint8Array(16);crypto.getRandomValues(b);return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');};
let requestKey=key(),lastAttempt=null;
async function post(endpoint,data){const r=await fetch(root+endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,csrf:cfg.csrf})});let j;try{j=await r.json();}catch{throw Error('Не вдалося отримати відповідь сервера. Спробуйте ще раз.');}if(!r.ok||!j.ok)throw Error(j.error||'Не вдалося виконати операцію.');return j;}
function readQty(container){const v={};for(const el of container.querySelectorAll('input[data-type]'))v[el.dataset.type]=el.value;return v;}
function rows(container,list,values={}){container.replaceChildren();if(!list.length){container.append(node('p','Додайте види кег у налаштуваннях списку.','muted'));return;}
 for(const t of list){const row=node('div',undefined,'ekRow'),name=node('span',t.name),input=node('input');input.type='number';input.inputMode='numeric';input.min='0';input.max='999999';input.step='1';input.value=values[t.id]??'0';input.dataset.type=t.id;input.setAttribute('aria-label','Кількість: '+t.name);
  const change=d=>{const n=Number(input.value);input.value=String(Math.max(0,Math.min(999999,(Number.isInteger(n)?n:0)+d)));input.dispatchEvent(new Event('input'));};
  const minus=button('−',()=>change(-1),'btn secondary','Зменшити: '+t.name),plus=button('+',()=>change(1),'btn secondary','Збільшити: '+t.name);
  const update=()=>{minus.disabled=!(Number(input.value)>0);plus.disabled=Number(input.value)>=999999;};input.addEventListener('input',update);update();row.append(name,minus,input,plus);container.append(row);
 }
}
function refreshCreate(){rows($('ekQty'),types.filter(t=>!t.hidden),readQty($('ekQty')));}
refreshCreate();
function formData(form,container){const items=[];for(const el of container.querySelectorAll('input[data-type]')){const v=el.value.trim();if(v==='')continue;if(!/^\d+$/.test(v)||Number(v)>999999)throw Error('Кількість має бути цілим числом від 0 до 999999.');if(Number(v)>0)items.push({typeId:el.dataset.type,qty:Number(v)});}
 if(!items.length)throw Error('Вкажіть кількість хоча б одного виду кег.');if(!form.elements.shopId.value)throw Error('Оберіть магазин.');if(!form.elements.date.value)throw Error('Оберіть дату.');return {date:form.elements.date.value,shopId:form.elements.shopId.value,items};}
function reload(saved=false){const q=new URLSearchParams(cfg.filter);if(saved)q.set('saved','1');window.location.assign(root+'?'+q.toString());}
createForm.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;msg('ekMessage');let data;try{data=formData(createForm,$('ekQty'));}catch(err){msg('ekMessage',err.message);return;}
 const serialized=JSON.stringify(data);if(lastAttempt!==null&&lastAttempt!==serialized){if(!confirm('Попереднє відправлення не було підтверджено. Якщо ви змінили дані, перевірте історію перед новим записом. Продовжити?'))return;requestKey=key();}lastAttempt=serialized;busy=true;$('ekSave').disabled=true;
 try{await post('/create',{...data,key:requestKey});createForm.reset();refreshCreate();reload(true);}catch(err){msg('ekMessage',err.message);}finally{busy=false;$('ekSave').disabled=false;}});
let typeBusy=false;
async function typeAction(data){if(typeBusy)return;typeBusy=true;msg('ekTypeMsg');try{const j=await post('/types',data);types=j.types;renderTypes();refreshCreate();return true;}catch(err){msg('ekTypeMsg',err.message);return false;}finally{typeBusy=false;}}
function renderTypes(){const box=$('ekTypes');box.replaceChildren();for(let i=0;i<types.length;i++){const t=types[i],row=node('div',undefined,'ekSettingRow'),info=node('div'),actions=node('div',undefined,'ekActions');info.append(node('b',t.name));if(t.hidden)info.append(node('div','Приховано','muted'));const up=button('↑',()=>typeAction({action:'up',id:t.id}),'btn secondary ekTiny','Перемістити вище'),down=button('↓',()=>typeAction({action:'down',id:t.id}),'btn secondary ekTiny','Перемістити нижче');up.disabled=i===0;down.disabled=i===types.length-1;actions.append(up,down,button('Назва',()=>{const name=prompt('Нова назва кеги',t.name);if(name!==null)typeAction({action:'rename',id:t.id,name});},'btn secondary ekTiny'),button(t.hidden?'Активувати':'Приховати',()=>typeAction({action:'toggle',id:t.id}),'btn secondary ekTiny'));row.append(info,actions);box.append(row);}}
$('ekSettings').addEventListener('click',()=>{msg('ekTypeMsg');renderTypes();settingsDialog.showModal();});
$('ekTypeAdd').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;if(await typeAction({action:'add',name:form.elements.name.value}))form.reset();});
for(const b of document.querySelectorAll('.ekPage [data-close]'))b.addEventListener('click',()=>b.closest('dialog').close());
function begin(id,action){selection={record:cfg.records.find(r=>r.id===id),action};if(!selection.record)return;ticket='';$('ekPasswordForm').reset();msg('ekPasswordMsg');$('ekPasswordTitle').textContent=action==='edit'?'Введіть пароль для редагування запису.':'Введіть пароль для видалення запису.';passwordDialog.showModal();}
for(const b of document.querySelectorAll('[data-edit]'))b.addEventListener('click',()=>begin(b.dataset.edit,'edit'));
for(const b of document.querySelectorAll('[data-delete]'))b.addEventListener('click',()=>begin(b.dataset.delete,'delete'));
function setupEdit(r){editForm.elements.date.value=r.date;const shops=cfg.shops.slice();if(!shops.some(s=>s.id===r.shopId))shops.push({id:r.shopId,name:r.shopName});const select=editForm.elements.shopId;select.replaceChildren();for(const s of shops){const o=node('option',s.name);o.value=s.id;select.append(o);}select.value=r.shopId;
 editRows=types.filter(t=>!t.hidden).map(t=>({...t}));for(const i of r.items){const t=editRows.find(t=>t.id===i.typeId);if(t)t.name=i.name;else editRows.push({id:i.typeId,name:i.name});}rows($('ekEditQty'),editRows,Object.fromEntries(r.items.map(i=>[i.typeId,i.qty])));msg('ekEditMsg');editDialog.showModal();}
$('ekPasswordForm').addEventListener('submit',async e=>{e.preventDefault();if(busy||!selection)return;const form=e.currentTarget,b=form.querySelector('[type=submit]');busy=true;b.disabled=true;msg('ekPasswordMsg');try{const j=await post('/unlock',{id:selection.record.id,action:selection.action,password:form.elements.password.value});ticket=j.ticket;form.reset();passwordDialog.close();if(selection.action==='edit')setupEdit(selection.record);else{msg('ekDeleteMsg');deleteDialog.showModal();}}catch(err){msg('ekPasswordMsg',err.message);form.elements.password.value='';}finally{busy=false;b.disabled=false;}});
editForm.addEventListener('submit',async e=>{e.preventDefault();if(busy||!ticket)return;let data;try{data=formData(editForm,$('ekEditQty'));}catch(err){msg('ekEditMsg',err.message);return;}busy=true;const b=editForm.querySelector('[type=submit]');b.disabled=true;try{await post('/edit',{...data,id:selection.record.id,ticket});ticket='';reload();}catch(err){msg('ekEditMsg',err.message);}finally{busy=false;b.disabled=false;}});
$('ekConfirmDelete').addEventListener('click',async()=>{if(busy||!ticket)return;busy=true;$('ekConfirmDelete').disabled=true;try{await post('/delete',{id:selection.record.id,ticket});ticket='';reload();}catch(err){msg('ekDeleteMsg',err.message);}finally{busy=false;$('ekConfirmDelete').disabled=false;}});
const shift=(d,n)=>{const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10);};
function updatePeriod(){const f=filterForm.elements,p=f.period.value;let from='',to='';if(p==='custom'){f.from.readOnly=f.to.readOnly=false;return;}if(p==='today')from=to=cfg.today;else if(p==='yesterday')from=to=shift(cfg.today,-1);else if(/^days/.test(p)){from=shift(cfg.today,1-Number(p.slice(4)));to=cfg.today;}else if(p==='month'||p==='previous'){const first=cfg.today.slice(0,7)+'-01';if(p==='previous'){to=shift(first,-1);from=to.slice(0,7)+'-01';}else{from=first;const next=new Date(first+'T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);to=shift(next.toISOString().slice(0,10),-1);}}f.from.value=from;f.to.value=to;f.from.readOnly=f.to.readOnly=true;}
filterForm.elements.period.addEventListener('change',updatePeriod);updatePeriod();
function report(mode){msg('ekFilterMsg');const f=filterForm.elements;if(f.period.value==='custom'&&(!f.from.value||!f.to.value||f.from.value>f.to.value)){msg('ekFilterMsg','Вкажіть коректні початкову та кінцеву дати.');return;}const q=new URLSearchParams(new FormData(filterForm));q.set('mode',mode);const link=root+'/document?'+q.toString();if(mode==='print')window.open(link,'_blank','noopener');else window.location.assign(link);}
$('ekPrint').addEventListener('click',()=>report('print'));$('ekPdf').addEventListener('click',()=>report('pdf'));
})();
