'use strict';

// Demo shipment ledger shared with the free-sale colour/size picker.
const fulfillmentStock = new Map();
const stockBeforeFulfillment = skuStock;
function stockKey(p,c,size){return `${p}:${c}:${size}`;}
function ensureShipmentStock(p){
  if(fulfillmentStock.has(stockKey(p,0,'S')))return;
  saleColors(p).forEach((_,c)=>saleSizes.forEach((size,s)=>fulfillmentStock.set(stockKey(p,c,size),stockBeforeFulfillment(p,c,s))));
}
products.forEach((_,p)=>ensureShipmentStock(p));
skuStock=function(p,c,s){ensureShipmentStock(p);return fulfillmentStock.get(stockKey(p,c,saleSizes[s]))||0;};
state.shipments=[];
const orderPick={query:'',status:'open',id:null,qty:[],note:''};
let pendingShipment=null;
function splitOrderQuantity(n){const out=[.2,.3,.3,.2].map(w=>Math.floor(n*w));for(let i=0,left=n-out.reduce((a,b)=>a+b,0);i<left;i++)out[i%4]++;return out;}
function fulfillmentLines(o){
  if(!o.lines){const quantities=splitOrderQuantity(o.qty),sent=quantities.map(q=>Math.floor(q*(o.sent||0)/o.qty));let left=(o.sent||0)-sent.reduce((a,b)=>a+b,0);for(let i=0;left>0;i=(i+1)%4){if(sent[i]<quantities[i]){sent[i]++;left--;}}o.lines=quantities.map((qty,s)=>({id:o.id+'-'+s,p:o.p,c:0,color:products[o.p].colorName,size:saleSizes[s],qty,done:sent[s],price:products[o.p].price}));}
  o.lines.forEach((l,i)=>{l.id??=o.id+'-'+i;l.c??=0;l.done??=0;});
  return o.lines;
}
orders.forEach(fulfillmentLines);
function fulfillmentRemaining(o){return fulfillmentLines(o).reduce((n,l)=>n+l.qty-l.done,0);}
function deliveryDate(o){return o.date.length===10?o.date:'2026-'+o.date;}
function orderModeTabs(){return tabs([['销售单列表','sales/records'],['自由开单','sales/new'],['按订货开单','sales/from-orders']]);}
const salesBeforeFulfillment=salesPage;
salesPage=function(){
  if(route[1]!=='from-orders')return salesBeforeFulfillment();
  const o=orders.find(o=>o.id===route[2]);
  return head('ORDER FULFILLMENT','按订货开单','',btn('客户订单',"nav('orders')",'','orders'))+
    (o?shipmentPage(o):`<div class="order-pick-toolbar"><label class="quick-search">${ic('search')}<input type="search" aria-label="搜索订货单" placeholder="客户 / 订单号 / 款号" value="${esc(orderPick.query)}" oninput="orderPick.query=this.value;refreshOrderChoices()"></label><div class="actions"><button onclick="orderPick.status='open';refreshOrderChoices();this.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('primary',b===this))" class="${orderPick.status==='open'?'primary':''}">待发订单</button><button onclick="orderPick.status='all';refreshOrderChoices();this.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('primary',b===this))" class="${orderPick.status==='all'?'primary':''}">全部订单</button></div></div><div id="orderChoices" class="order-choices">${orderChoices()}</div>`);
};
function orderChoices(){
  const q=orderPick.query.trim().toLowerCase();
  const rows=orders.filter(o=>!o.void&&!o.draft&&(orderPick.status==='all'||fulfillmentRemaining(o)>0)&&(o.id+customers[o.customer].name+fulfillmentLines(o).map(l=>products[l.p].id+products[l.p].name).join('')).toLowerCase().includes(q));
  return rows.length?rows.map(o=>{const left=fulfillmentRemaining(o),lines=fulfillmentLines(o);return `<article class="panel order-choice"><div class="order-choice-top"><div><b>${esc(customers[o.customer].name)}</b><small>${o.id} · 交期 ${deliveryDate(o)}</small></div>${pill(left?(o.sent?'部分发货':'待发货'):'已核销',left?'amber':'')}</div><div class="order-choice-goods">${[...new Set(lines.map(l=>l.p))].map(p=>productcell(products[p])).join('')}<p>${lines.map(l=>`${esc(l.color)} / ${l.size}：订 ${l.qty} · 欠 ${l.qty-l.done}`).join('　')}</p></div><div class="order-choice-bottom"><span>订货 <b>${o.qty}</b> · 已发 <b>${o.sent}</b> · 待发 <b>${left}</b></span>${btn(left?'选单发货':'查看订单',`selectFulfillmentOrder('${o.id}')`,left?'primary':'')}</div></article>`;}).join(''):'<div class="panel quick-empty">暂无匹配订货单</div>';
}
function refreshOrderChoices(){document.getElementById('orderChoices').innerHTML=orderChoices();}
function selectFulfillmentOrder(id){orderPick.id=null;nav('sales/from-orders/'+id);}
function fillShipment(o){
  const used=new Map();orderPick.qty=fulfillmentLines(o).map(l=>{const key=stockKey(l.p,l.c,l.size),available=Math.max(0,skuStock(l.p,l.c,saleSizes.indexOf(l.size))-(used.get(key)||0));const n=Math.min(l.qty-l.done,available);used.set(key,(used.get(key)||0)+n);return n;});
}
function shipmentPage(o){
  if(orderPick.id!==o.id){orderPick.id=o.id;orderPick.note='';fillShipment(o);}
  const lines=fulfillmentLines(o),remaining=fulfillmentRemaining(o);
  return `<section class="panel shipment-heading"><div><b>${esc(customers[o.customer].name)}</b><small>${o.id} · 交期 ${deliveryDate(o)} · 杭州总仓</small></div><div class="actions">${pill(remaining?'待发 '+remaining+' 件':'已全部核销',remaining?'amber':'')}${btn('重选订单',"nav('sales/from-orders')")}</div></section>
  <section class="panel shipment-lines"><div class="panelhead"><h2>订单商品与本次发货</h2>${btn('按可发数量填满',`fillCurrentShipment('${o.id}')`,'soft')}</div><p class="shipment-note">客户、款式和成交价沿用订货单。按本次实发核销待发数量，未发完的继续保留欠货。</p><div class="tablewrap"><table><thead><tr><th>款式 / 色码</th><th>订货</th><th>已发</th><th>待发</th><th>可售</th><th>本次发货</th></tr></thead><tbody>${lines.map((l,i)=>`<tr><td>${productcell(products[l.p])}<small>${esc(l.color)} / ${l.size} · ${money(l.price)}</small></td><td>${l.qty}</td><td>${l.done}</td><td>${l.qty-l.done}</td><td>${skuStock(l.p,l.c,saleSizes.indexOf(l.size))}</td><td><div class="shipment-stepper"><button aria-label="减少第 ${i+1} 行" onclick="stepShipment(${i},-1)"><svg class="ico" viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button><input aria-label="第 ${i+1} 行发货数量" type="number" inputmode="numeric" min="0" step="1" value="${orderPick.qty[i]||0}" oninput="setShipmentQty(${i},this)"><button aria-label="增加第 ${i+1} 行" onclick="stepShipment(${i},1)">${ic('plus')}</button></div></td></tr>`).join('')}</tbody></table></div><p class="shipment-note shipment-scroll-hint">左右滑动查看完整字段，本次发货数量固定在右侧。</p><label class="quick-note">发货备注<textarea aria-label="发货备注" placeholder="包装、物流单号等" oninput="orderPick.note=this.value">${esc(orderPick.note)}</textarea></label><p class="shipment-note">演示库存按色码限制可发数量；此页面的发货与核销仅在当前预览会话生效。</p></section>
  ${shipmentHistory(o)}<div class="shipment-dock"><div id="shipmentTotal" aria-live="polite"></div>${btn('确认发货并核销订单',`reviewShipment('${o.id}')`,'primary','check')}</div>`;
}
function shipmentHistory(o){const rows=state.shipments.filter(s=>s.sourceOrderId===o.id);return panel('本次会话发货记录',rows.length?table(['发货单','日期','实发','金额','核销结果',''],rows.map(s=>[s.id,s.date,s.qty+' 件',money(s.total),s.orderRemaining?'剩余 '+s.orderRemaining+' 件':'全部核销',btn('明细',`documentDetail('sales','${s.id}')`,'textbtn')])):'<p class="shipment-note">尚无新增发货记录。历史已发 '+o.sent+' 件已计入订单。</p>');}
function setShipmentQty(i,input){orderPick.qty[i]=input.value===''?0:Number(input.value);updateShipmentTotal();}
function stepShipment(i,delta){orderPick.qty[i]=Math.max(0,(Number.isInteger(orderPick.qty[i])?orderPick.qty[i]:0)+delta);document.querySelectorAll('.shipment-stepper input')[i].value=orderPick.qty[i];updateShipmentTotal();}
function fillCurrentShipment(id){const o=orders.find(o=>o.id===id);fillShipment(o);render();}
function shipmentSelection(o,qty=orderPick.qty){return fulfillmentLines(o).map((l,i)=>({...l,sourceLineId:l.id,qty:qty[i]||0,done:0})).filter(l=>l.qty!==0);}
function shipmentError(o,qty=orderPick.qty){
  if(o.void||o.draft)return '该订单当前不可发货';
  const used=new Map();let count=0;
  for(const [i,l] of fulfillmentLines(o).entries()){
    const n=qty[i];if(!Number.isFinite(n)||!Number.isInteger(n)||n<0)return '发货数量需为非负整数';
    if(n>l.qty-l.done)return '本次发货不能超过订单待发数量';
    const key=stockKey(l.p,l.c,l.size),total=(used.get(key)||0)+n;used.set(key,total);
    if(total>skuStock(l.p,l.c,saleSizes.indexOf(l.size)))return '本次发货超过该色码可售库存';count+=n;
  }
  return count?'':'请填写本次发货数量';
}
function updateShipmentTotal(){const el=document.getElementById('shipmentTotal');if(!el)return;const o=orders.find(o=>o.id===orderPick.id),error=shipmentError(o),t=saleTotals(shipmentSelection(o));el.innerHTML=`<small>${error||'本次实发 '+t.qty+' 件 · 发后欠货 '+(fulfillmentRemaining(o)-t.qty)+' 件'}</small><strong>${money(t.total)}</strong>`;el.classList.toggle('shipment-invalid',!!error);}
function reviewShipment(id){
  const o=orders.find(o=>o.id===id),error=shipmentError(o);if(error){toast(error);return;}
  const qty=[...orderPick.qty],lines=shipmentSelection(o,qty),t=saleTotals(lines);
  pendingShipment={id,qty,note:orderPick.note,prior:fulfillmentLines(o).map(l=>l.done)};
  openDrawer('核对本次发货',`<p class="shipment-note">${esc(customers[o.customer].name)} · ${o.id}</p>${table(['款号','颜色 / 尺码','本次实发'],lines.map(l=>[products[l.p].id,esc(l.color)+' / '+l.size,l.qty]))}<dl class="detailgrid"><div><dt>实发合计</dt><dd>${t.qty} 件 / ${money(t.total)}</dd></div><div><dt>发货后剩余</dt><dd>${fulfillmentRemaining(o)-t.qty} 件</dd></div></dl><div class="note">确认后生成关联销售发货单，扣减本次色码库存，并按实发数量核销订货单。${fulfillmentRemaining(o)===t.qty?'本单将全部核销。':'剩余欠货保留，可继续分批发货。'}</div>`,btn('返回修改','closeDrawer()')+btn('确认本次发货','commitShipment()','primary','check'),true);
}
function commitShipment(){
  const pending=pendingShipment;if(!pending)return;const o=orders.find(o=>o.id===pending.id);
  const error=shipmentError(o,pending.qty);if(error){toast(error);return;}
  if(fulfillmentLines(o).some((l,i)=>l.done!==pending.prior[i])){pendingShipment=null;closeDrawer();toast('订单发货数量已变化，请重新核对');return;}
  const lines=shipmentSelection(o,pending.qty),t=saleTotals(lines);pendingShipment=null;
  const n=state.sales.length+1;
  const sale={id:'XS261115F'+n,batch:String(38200+n),sourceOrderId:o.id,customer:o.customer,p:lines[0].p,qty:t.qty,total:t.total,done:t.qty,date:'2026-11-15',delivery:deliveryDate(o),store:'杭州总店',warehouse:0,note:pending.note,type:'订货发货',lines:lines.map(l=>({...l,done:l.qty})),orderRemaining:fulfillmentRemaining(o)-t.qty};
  // Validate the whole shipment before applying any ledger mutations.
  lines.forEach(l=>{const key=stockKey(l.p,l.c,l.size);fulfillmentStock.set(key,fulfillmentStock.get(key)-l.qty);products[l.p].stock-=l.qty;});
  fulfillmentLines(o).forEach((l,i)=>l.done+=pending.qty[i]);o.sent=fulfillmentLines(o).reduce((n,l)=>n+l.done,0);o.done=o.sent;o.status=o.sent===o.qty?'已发齐':'部分发货';
  state.sales.unshift(sale);state.shipments.unshift(sale);orderPick.qty=fulfillmentLines(o).map(()=>0);orderPick.note='';closeDrawer();render();toast(sale.orderRemaining?'已发货并核销本次数量，剩余欠货已保留':'已发货，订单已全部核销');
}
const orderDetailBeforeFulfillment=orderDetailPage;
orderDetailPage=function(o){const html=orderDetailBeforeFulfillment(o);if(route[2]==='packing')return html;return head('ORDER DETAIL',o.id,'',btn('返回订单',"nav('orders')")+btn('按此订单发货',`selectFulfillmentOrder('${o.id}')`,'primary','sales'))+tabs([['订单信息',`orders/${o.id}`],['欠货详情',`orders/${o.id}/shortage`,fulfillmentRemaining(o)],['定标包装要求',`orders/${o.id}/packing`]])+panel(customers[o.customer].name+' · 订货明细',table(['款式','颜色 / 尺码','订货','已发','欠货'],fulfillmentLines(o).map(l=>[productcell(products[l.p]),esc(l.color)+' / '+l.size,l.qty,l.done,l.qty-l.done])))+shipmentHistory(o);};
const renderBeforeFulfillment=render;
render=function(){renderBeforeFulfillment();if(route[0]!=='sales')return;const header=document.querySelector('.pagehead');header?.insertAdjacentHTML('afterend',orderModeTabs());const activeMode=route[1]==='from-orders'?'sales/from-orders':route[1]==='new'?'sales/new':'sales/records';document.querySelectorAll('.main>.tabs a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+activeMode));if(route[1]==='from-orders'&&route[2]){document.querySelector('.main').classList.add('shipment-page');updateShipmentTotal();}};
render();
