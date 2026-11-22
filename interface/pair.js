'use strict';
if(/^#[0-9]{6}$/.test(location.hash))document.getElementById('pair-code').value=location.hash.slice(1);
history.replaceState(null,'',location.pathname);
document.getElementById('pair-button').onclick=async()=>{try{const response=await fetch('/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:document.getElementById('pair-code').value,name:document.getElementById('device-name').value})});const value=await response.json();if(!response.ok)throw new Error(value.detail);sessionStorage.setItem('octobre-session',value.token);location.href='/';}catch(error){document.getElementById('pair-result').textContent=error.message;}};
