'use strict';

// One sale contains independent product / colour / size lines.
const saleSizes = ['S', 'M', 'L', 'XL'];
const multiSale = {customer: 0, warehouse: 0, payment: 0, date: '2026-11-15', note: '', lines: [], query: '', type: 'all'};
let skuEditor = null;
function saleColors(p) {
  const product = products[p];
  return [{name: product.colorName, hex: product.color},
    product.colorName === '奶油白' ? {name: '燕麦色', hex: '#c5b9a5'} : {name: '奶油白', hex: '#e1d9c6'},
    {name: '炭灰色', hex: '#626764'}];
}
function skuStock(p, c, s) {
  const stock = products[p].stock, index = c * 4 + s;
  return Math.floor(stock / 12) + (index < stock % 12 ? 1 : 0);
}
function saleTotals(lines = multiSale.lines) {
  return {styles: new Set(lines.map(l => l.p)).size, qty: lines.reduce((n,l) => n+l.qty,0), total: lines.reduce((n,l) => n+l.qty*l.price,0)};
}
function multiField(label, key, options) {
  return `<label class="quick-field">${label}<select aria-label="${label}" onchange="multiSale.${key}=+this.value">${options.map((x,i)=>`<option value="${i}" ${multiSale[key]===i?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`;
}
const salesPageBeforeMulti = salesPage;
salesPage = function() {
  if (route[1] !== 'new') return salesPageBeforeMulti();
  return head('SALES WORKSPACE','销售开单','选款、选色、选码，多款一次开齐。',btn('销售单列表',"nav('sales/records')",'','list')) +
  `<section class="quick-customer panel">
    ${multiField('客户','customer',customers.map(c=>c.name))}
    ${multiField('出库仓库','warehouse',['杭州总仓','杭州展厅仓'])}
    ${multiField('结算方式','payment',['客户月结价','现款结算'])}
    <label class="quick-field">单据日期<input type="date" aria-label="单据日期" value="${multiSale.date}" onchange="multiSale.date=this.value"></label>
  </section>
  <div class="quick-sale-layout">
    <section class="quick-catalog panel">
      <div class="quick-section-title"><div><h2>快速选款</h2><p>点击款式，录入颜色与尺码</p></div><span class="pill gray">在售 ${products.filter(p=>!p.off).length} 款</span></div>
      <div class="quick-search">${ic('search')}<input type="search" aria-label="搜索款号或名称" placeholder="输入款号 / 商品名称" value="${esc(multiSale.query)}" oninput="multiSale.query=this.value;refreshSaleCatalog()"></div>
      <div class="quick-categories" role="group" aria-label="款式分类">${[['all','全部款式'],['0','圆领'],['1','开衫'],['2','条纹'],['3','裤装']].map(([v,t])=>`<button type="button" aria-pressed="${multiSale.type===v}" onclick="multiSale.type='${v}';refreshSaleCatalog();this.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===this))">${t}</button>`).join('')}</div>
      <div class="quick-product-grid" id="quickProducts">${saleCatalog()}</div>
    </section>
    <section class="quick-basket panel"><div class="quick-section-title"><div><h2>本单商品 <span id="basketCount"></span></h2><p>可选多个款式、多个颜色</p></div>${btn('继续选款',"document.querySelector('.quick-catalog').scrollIntoView({block:'start',behavior:'smooth'})",'textbtn')}</div><div id="quickBasket">${saleBasket()}</div>
      <label class="quick-note">订单备注<textarea aria-label="订单备注" placeholder="包装、发货等要求" oninput="multiSale.note=this.value">${esc(multiSale.note)}</textarea></label>
      <p class="quick-stock-note">示例色码库存；提交后待配货，出库过账才扣减库存。</p>
    </section>
  </div>`;
};
function saleCatalog() {
  const found = products.map((p,i)=>({p,i})).filter(({p})=>!p.off&&(multiSale.type==='all'||String(p.type)===multiSale.type)&& (p.id+p.name).toLowerCase().includes(multiSale.query.trim().toLowerCase()));
  return found.length ? found.map(({p,i})=>{
    const qty = multiSale.lines.filter(l=>l.p===i).reduce((n,l)=>n+l.qty,0);
    return `<button class="quick-product ${qty?'picked':''}" aria-label="选款 ${p.id} ${esc(p.name)}" onclick="openSkuEditor(${i})"><div class="quick-product-image">${garment(p)}${qty?`<span class="picked-count">已选 ${qty} 件</span>`:''}</div><div class="quick-product-info"><small>${p.id}</small><strong>${esc(p.name)}</strong><div class="quick-swatches">${saleColors(i).map(c=>`<i style="background:${c.hex}"></i>`).join('')}<span>3 色 · 4 码</span></div><div class="quick-product-price"><b>${money(p.price)}</b><span>可售 ${p.stock}</span></div></div></button>`;
  }).join('') : '<div class="quick-empty">没有匹配款式，请调整搜索或分类。</div>';
}
function refreshSaleCatalog() { const el=document.getElementById('quickProducts');if(el)el.innerHTML=saleCatalog(); }
function saleBasket() {
  const styles=[...new Set(multiSale.lines.map(l=>l.p))];
  if(!styles.length) return `<div class="quick-empty">${ic('product')}<h3>从第一款开始</h3><p>选好色码后添加到本单<br>继续选款，无需重复填写客户</p></div>`;
  return styles.map(p=>{
    const lines=multiSale.lines.filter(l=>l.p===p), t=saleTotals(lines);
    return `<article class="basket-style">${productcell(products[p])}<div class="basket-colors">${[...new Set(lines.map(l=>l.c))].map(c=>`<div><b><i style="background:${saleColors(p)[c].hex}"></i>${esc(saleColors(p)[c].name)}</b><p>${lines.filter(l=>l.c===c).map(l=>`${l.size} × ${l.qty}`).join('　')}</p></div>`).join('')}</div><div class="basket-style-footer"><span><b>${t.qty} 件</b> · ${money(t.total)}</span><div>${btn('修改',`openSkuEditor(${p})`,'textbtn')}${btn('移除',`removeSaleStyle(${p})`,'textbtn')}</div></div></article>`;
  }).join('');
}
function refreshSaleBasket() {
  const el=document.getElementById('quickBasket');if(el)el.innerHTML=saleBasket();
  const count=document.getElementById('basketCount');if(count)count.textContent=saleTotals().styles+' 款';
  refreshSaleCatalog();updateTouchDock();
}
function removeSaleStyle(p) {multiSale.lines=multiSale.lines.filter(l=>l.p!==p);refreshSaleBasket();}

function openSkuEditor(p) {
  if(products[p].off) {toast('该款已下架');return;}
  const existing=multiSale.lines.filter(l=>l.p===p);
  skuEditor={p,c:existing[0]?.c??0,qty:Array.from({length:3},()=>[0,0,0,0])};
  existing.forEach(l=>skuEditor.qty[l.c][saleSizes.indexOf(l.size)]=l.qty);
  openDrawer('选颜色与尺码',`<div class="sku-product">${productcell(products[p])}<strong>${money(products[p].price)}<small> / 件</small></strong></div>
    <div class="sku-label"><h3>选择颜色</h3><span>每种颜色的数量会分别保留</span></div>
    <div id="skuColors" class="sku-colors"></div>
    <div class="sku-label"><h3>尺码与数量</h3>${btn('每码 +1','addSizeRun()','soft')}</div>
    <div id="skuSizes" class="sku-sizes"></div>
    <div id="skuSelection" class="sku-selection" aria-live="polite"></div>
    <p class="quick-stock-note">可直接输入数量，也可以点按加减。不同颜色、尺码分别记录。</p>`, `<div id="skuTotal" class="sku-total"></div>${btn(existing.length?'保存色码修改':'加入本单，继续选款','saveSkuEditor()','primary','check')}`,true);
  document.querySelector('.drawer').classList.add('sku-drawer');
  refreshSkuEditor();
}
function refreshSkuEditor() {
  const {p,c,qty}=skuEditor;
  document.getElementById('skuColors').innerHTML=saleColors(p).map((color,i)=>`<button aria-pressed="${c===i}" onclick="selectSkuColor(${i})"><i style="background:${color.hex}"></i><span>${esc(color.name)}<small data-color-count="${i}">${qty[i].reduce((a,b)=>a+b,0)} 件</small></span>${c===i?ic('check'):''}</button>`).join('');
  document.getElementById('skuSizes').innerHTML=saleSizes.map((size,s)=>`<div class="sku-size"><div><strong>${size}</strong><small>可售 ${skuStock(p,c,s)}</small></div><div class="sku-stepper"><button aria-label="减少 ${size} 数量" onclick="stepSku(${s},-1)"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button><input aria-label="${size} 数量" type="number" inputmode="numeric" min="0" max="${skuStock(p,c,s)}" step="1" value="${qty[c][s]}" oninput="setSkuQty(${s},this)" onfocus="this.select()"><button aria-label="增加 ${size} 数量" onclick="stepSku(${s},1)">${ic('plus')}</button></div></div>`).join('');
  refreshSkuTotal();
}
function selectSkuColor(c) {
  if(document.querySelector('.sku-drawer input:invalid')){toast('请先修正当前颜色的尺码数量');return;}
  skuEditor.c=c;refreshSkuEditor();
}
function setSkuQty(s,input) {
  const n=Number(input.value), max=skuStock(skuEditor.p,skuEditor.c,s);
  if(!Number.isInteger(n)||n<0||n>max) {input.setCustomValidity('请输入 0 到 '+max+' 的整数');input.setAttribute('aria-invalid','true');document.getElementById('skuSelection').textContent='数量需为 0 到 '+max+' 的整数，请调整后再加入。';return;}
  input.setCustomValidity('');input.removeAttribute('aria-invalid');skuEditor.qty[skuEditor.c][s]=n;refreshSkuTotal();
}
function stepSku(s,delta) {
  const {p,c,qty}=skuEditor, n=qty[c][s]+delta;
  if(n<0)return;if(n>skuStock(p,c,s)){toast('数量超过该色码可售库存');return;}
  qty[c][s]=n;refreshSkuEditor();
}
function addSizeRun() {
  const {p,c,qty}=skuEditor;
  if(qty[c].some((n,s)=>n+1>skuStock(p,c,s))) {toast('部分尺码库存不足，请逐码选择');return;}
  qty[c]=qty[c].map(n=>n+1);refreshSkuEditor();
}
function refreshSkuTotal() {
  const {p,qty}=skuEditor, count=qty.flat().reduce((a,b)=>a+b,0);
  document.querySelectorAll('[data-color-count]').forEach(el=>el.textContent=qty[+el.dataset.colorCount].reduce((a,b)=>a+b,0)+' 件');
  document.getElementById('skuTotal').innerHTML=`<small>本款合计 ${count} 件</small><strong>${money(count*products[p].price)}</strong>`;
  document.getElementById('skuSelection').innerHTML=qty.map((sizes,c)=>sizes.some(n=>n)?`<div><b>${esc(saleColors(p)[c].name)}</b><span>${sizes.map((n,s)=>n?`${saleSizes[s]} × ${n}`:'').filter(Boolean).join('　')}</span></div>`:'').join('')||'请选择需要的颜色和尺码数量';
}
function saveSkuEditor() {
  if(document.querySelector('.sku-drawer input:invalid')) {toast('请先修正尺码数量');return;}
  const {p,qty}=skuEditor, lines=[];
  qty.forEach((sizes,c)=>sizes.forEach((n,s)=>{if(n)lines.push({p,c,color:saleColors(p)[c].name,size:saleSizes[s],qty:n,price:products[p].price,done:0});}));
  if(!lines.length){toast('请至少选择一件商品；移除款式可在本单商品中操作');return;}
  multiSale.lines=[...multiSale.lines.filter(l=>l.p!==p),...lines];
  closeDrawer();refreshSaleBasket();toast('已更新 '+products[p].id+'，可以继续选款');
}
updateTouchDock = function() {
  const el=document.querySelector('.docktotal');if(!el)return;
  const t=saleTotals();el.innerHTML=`<small>本单 ${t.styles} 款 · ${t.qty} 件</small><strong>${money(t.total)}</strong>`;
};
addSaleDock = function() {
  if(route[0]!=='sales'||route[1]!=='new')return;
  document.querySelector('.main').classList.add('sale-touch-page','multi-sale-page');
  const dock=document.createElement('div');dock.className='ipad-sale-dock';dock.setAttribute('aria-label','销售单主要操作');
  dock.innerHTML=`<div class="docktotal" aria-live="polite"></div><button class="basket-jump" onclick="document.querySelector('.quick-basket').scrollIntoView({block:'start',behavior:'smooth'})">查看本单</button>${btn('确认开单 · 生成配货任务','submitSale()','primary','check')}`;
  document.getElementById('app').append(dock);refreshSaleBasket();
};
submitSale = function() {
  const t=saleTotals();if(!t.qty){toast('请先选择商品与色码');return;}
  if(!multiSale.date){toast('请填写单据日期');return;}
  if(multiSale.lines.some(l=>products[l.p].off||!Number.isInteger(l.qty)||l.qty<1||l.qty>skuStock(l.p,l.c,saleSizes.indexOf(l.size)))){toast('请检查下架款式或色码库存');return;}
  const n=state.sales.length+1;
  state.sales.unshift({id:'XS261115N'+n,batch:String(38100+n),customer:multiSale.customer,p:multiSale.lines[0].p,qty:t.qty,total:t.total,done:0,date:multiSale.date,delivery:multiSale.date,store:multiSale.warehouse?'杭州展厅':'杭州总店',warehouse:multiSale.warehouse,payment:multiSale.payment,note:multiSale.note,lines:multiSale.lines.map(l=>({...l}))});
  multiSale.lines=[];multiSale.note='';listState.sales.filters={};listState.sales.view='batch';nav('sales/records');toast('多款销售单已生成，等待配货 · 演示');
};
render();
