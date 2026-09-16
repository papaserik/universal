
(function(){
  var wrap = document.querySelector('[data-search]'); if(!wrap) return;
  var input = wrap.querySelector('.js-search-input'); var box = wrap.querySelector('[data-suggest-box]');
  if(!input||!box) return;
  var timer=null,lastQuery='',activeIdx=-1;
  function hide(){ box.hidden=true; box.innerHTML=''; activeIdx=-1; }
  function esc(s){ return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function render(items){
    if(!items.length) return hide();
    box.innerHTML = items.map(function(it,i){
      var cls = it.type==='product'?'ss-prod':(it.type==='category'?'ss-cat':'ss-post');
      var icon = it.type==='product'?'📦':(it.type==='category'?'📂':'📝');
      return '<a href="'+it.url+'" class="'+cls+'" data-idx="'+i+'"><span>'+icon+' '+esc(it.title)+'</span>'+(it.extra?'<span class="ss-price">'+esc(it.extra)+'</span>':'')+'</a>';
    }).join('');
    box.hidden=false; activeIdx=-1;
  }
  function fetchSuggest(q){
    fetch(input.dataset.suggestUrl+'?q='+encodeURIComponent(q))
      .then(function(r){return r.json();})
      .then(function(d){render(d.items||[]);})
      .catch(function(){hide();});
  }
  input.addEventListener('input',function(){
    var q=input.value.trim();
    if(q.length<2) return hide();
    if(q===lastQuery) return;
    lastQuery=q; clearTimeout(timer);
    timer=setTimeout(function(){fetchSuggest(q);},180);
  });
  input.addEventListener('keydown',function(e){
    var items=box.querySelectorAll('a'); if(!items.length) return;
    if(e.key==='ArrowDown'){ e.preventDefault(); activeIdx=Math.min(activeIdx+1,items.length-1); items.forEach(function(el,i){el.classList.toggle('active',i===activeIdx);}); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); activeIdx=Math.max(activeIdx-1,0); items.forEach(function(el,i){el.classList.toggle('active',i===activeIdx);}); }
    else if(e.key==='Enter'&&activeIdx>=0){ e.preventDefault(); items[activeIdx].click(); }
    else if(e.key==='Escape'){ hide(); }
  });
  document.addEventListener('click',function(e){ if(!wrap.contains(e.target)) hide(); });
})();
