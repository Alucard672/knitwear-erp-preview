function leavePreview(){try{sessionStorage.removeItem('wt-preview-entered')}catch{}location.assign('login.html')}
const renderBeforeAccount=render;
render=function(){renderBeforeAccount();const actions=document.querySelector('.topactions');if(actions){const button=document.createElement('button');button.className='iconbtn';button.title='退出演示';button.setAttribute('aria-label','退出演示');button.innerHTML=ic('logout');button.onclick=leavePreview;actions.append(button)}};
render();
