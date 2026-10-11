/* Gráfico da página inicial: simulação ilustrativa de um objetivo (Monte Carlo). */
/* Monte Carlo ilustrativo: patrimônio em reais de hoje, passo mensal. */
function simularObjetivo(p) {
  var s = p.semente >>> 0;
  function rnd() { s += 0x6D2B79F5; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function normal() { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  var meses = p.anos * 12, passo = 3;
  var media = (Math.log(1 + p.retorno) - p.vol * p.vol / 2) / 12, desvio = p.vol / Math.sqrt(12);
  var cenarios = [];
  for (var c = 0; c < p.cenarios; c++) {
    var v = p.inicial, serie = [v];
    for (var m = 1; m <= meses; m++) {
      v = v * Math.exp(media + desvio * normal()) + p.aporte;
      if (m % passo === 0) serie.push(v);
    }
    cenarios.push(serie);
  }
  function percentil(q) {
    return cenarios[0].map(function (_, i) {
      var col = cenarios.map(function (x) { return x[i]; }).sort(function (a, b) { return a - b; });
      return col[Math.min(col.length - 1, Math.floor(q * col.length))];
    });
  }
  var fim = cenarios[0].length - 1;
  var chegaram = cenarios.filter(function (x) { return x[fim] >= p.meta; }).length;
  return { cenarios: cenarios, central: percentil(0.5), p10: percentil(0.1), p90: percentil(0.9), chegam: chegaram / p.cenarios, passo: passo };
}

(function(){
  var canvas=document.getElementById('chart-mc');
  if(!canvas||typeof Chart==='undefined') return;
  var META=1000000, ANOS=20, DESENHADOS=60;
  var r=simularObjetivo({inicial:100000,aporte:3000,anos:ANOS,retorno:0.045,vol:0.09,meta:META,cenarios:2000,semente:7});
  var TC='rgba(255,255,255,0.65)', GC='rgba(255,255,255,0.08)';
  var n=r.central.length;
  var labels=[]; for(var i=0;i<n;i++){labels.push(i*r.passo/12);}
  function reais(v){return v>=1e6?'R$ '+(v/1e6).toFixed(1).replace('.',',')+' mi':'R$ '+Math.round(v/1000)+' mil';}
  var fim=n-1, ordenados=r.cenarios.slice().sort(function(a,b){return a[fim]-b[fim];});
  var amostra=[]; for(var k=0;k<DESENHADOS;k++){amostra.push(ordenados[Math.floor((k+0.5)*ordenados.length/DESENHADOS)]);}
  var datasets=amostra.map(function(s){
    return {label:'cenario',data:s,borderColor:'rgba(250,249,246,0.28)',borderWidth:1,pointRadius:0,pointHoverRadius:0,fill:false,tension:0.2};
  });
  datasets.push({label:'Cenário central',data:r.central,borderColor:'#FAF9F6',borderWidth:2.5,pointRadius:0,pointHoverRadius:4,pointHoverBackgroundColor:'#FAF9F6',fill:false,tension:0.2});
  new Chart(canvas.getContext('2d'),{
    type:'line',
    data:{labels:labels,datasets:datasets},
    options:{
      responsive:true,maintainAspectRatio:false,layout:{padding:{right:14}},
      animation:{duration:window.SEM_ANIMACAO?0:1800,easing:'easeOutQuart',delay:400},
      plugins:{legend:{display:false},tooltip:{
        mode:'index',intersect:false,displayColors:false,
        filter:function(c){return c.dataset.label==='Cenário central';},
        callbacks:{
          title:function(it){if(!it.length)return '';var a=it[0].parsed.x!==undefined?labels[it[0].dataIndex]:0;return a===0?'Hoje':'Em '+(Math.round(a*10)/10).toString().replace('.',',')+(a===1?' ano':' anos');},
          label:function(c){return 'Cenário central: '+reais(c.raw);},
          afterLabel:function(c){return 'Entre '+reais(r.p10[c.dataIndex])+' e '+reais(r.p90[c.dataIndex])+' em 8 de cada 10 cenários';}
        }}},
      scales:{
        x:{type:'linear',min:0,max:ANOS,grid:{display:false},ticks:{color:TC,font:{size:8},stepSize:5,callback:function(v){return v===0?'Hoje':v+' anos';}}},
        y:{min:0,max:2500000,grid:{color:GC},ticks:{color:TC,font:{size:8},maxTicksLimit:5,callback:function(v){return v===0?'0':reais(v);}}}
      },
      interaction:{mode:'index',intersect:false}
    }
  });
})();
