'use strict';
const requested=new URLSearchParams(location.search).get('next')||'';
// Only allow the two local workspaces as return destinations.
const safeNext=/^(sales|index)\.html(?:#[A-Za-z0-9_\/-]*)?$/.test(requested)?requested:'sales.html#products';
let terminal=safeNext.startsWith('index.html')?'admin':'sales';
function chooseTerminal(value){terminal=value;for(const [id,key] of [['salesTab','sales'],['adminTab','admin']]){const button=document.getElementById(id);button.classList.toggle('active',key===value);button.setAttribute('aria-pressed',String(key===value))}}
chooseTerminal(terminal);
document.getElementById('showPassword').addEventListener('click',()=>{const input=document.getElementById('password'),button=document.getElementById('showPassword'),show=input.type==='password';input.type=show?'text':'password';button.setAttribute('aria-label',show?'隐藏密码':'显示密码');button.setAttribute('aria-pressed',String(show))});
document.getElementById('loginForm').addEventListener('submit',event=>{event.preventDefault();try{sessionStorage.setItem('wt-preview-entered','1')}catch{}document.getElementById('loginForm').reset();const same=terminal==='admin'?safeNext.startsWith('index.html'):safeNext.startsWith('sales.html');location.assign(same?safeNext:terminal==='admin'?'index.html':'sales.html#products')});
