/* Gráfico da página inicial: simulação ilustrativa de aposentadoria (cenário único, em reais de hoje). */
function simularAposentadoria(p) {
  var s = p.semente >>> 0;
  function rnd() { s += 0x6D2B79F5; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function normal() { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  var mesesAcum = (p.idadeAposentadoria - p.idadeInicial) * 12, meses = (p.idadeFinal - p.idadeInicial) * 12;
  /* oscilações mensais com média zero em cada fase: o retorno médio de cada fase é exatamente p.retorno */
  function oscilacoes(n) {
    var z = [], soma = 0, i;
    for (i = 0; i < n; i++) { z.push(normal()); soma += z[i]; }
    return z.map(function (x) { return x - soma / n; });
  }
  var z = oscilacoes(mesesAcum).concat(oscilacoes(meses - mesesAcum));
  var media = Math.log(1 + p.retorno) / 12, desvio = p.vol / Math.sqrt(12);
  var v = p.inicial, pontos = [{ x: p.idadeInicial, y: v }];
  for (var m = 1; m <= meses; m++) {
    var idade = p.idadeInicial + m / 12;
    v = v * Math.exp(media + desvio * z[m - 1]) + (m <= mesesAcum ? p.aporte : -p.rendaMensal);
    p.saques.forEach(function (q) {
      if (m === (q.idade - p.idadeInicial) * 12) { pontos.push({ x: idade, y: Math.max(v, 0) }); v -= q.valor; }
    });
    if (v < 0) v = 0;
    pontos.push({ x: idade, y: v });
  }
  pontos.z = z;
  return pontos;
}

(function(){
  if (typeof document === 'undefined') return;
  var canvas=document.getElementById('chart-apos');
  if(!canvas||typeof Chart==='undefined') return;
  var P={inicial:100000,aporte:2000,rendaMensal:8100,retorno:0.035,vol:0.05,semente:5,idadeInicial:30,idadeAposentadoria:65,idadeFinal:90,
         saques:[{idade:40,valor:50000},{idade:50,valor:100000},{idade:60,valor:50000}]};
  var pontos=simularAposentadoria(P);
  var TC='rgba(255,255,255,0.65)', GC='rgba(255,255,255,0.08)';
  function reais(v){return v>=1e6?'R$ '+(v/1e6).toFixed(2).replace('.',',')+' mi':'R$ '+Math.round(v/1000)+' mil';}
  new Chart(canvas.getContext('2d'),{
    type:'line',
    data:{datasets:[{label:'Patrimônio',data:pontos,borderColor:'#FAF9F6',borderWidth:2,pointRadius:0,pointHoverRadius:4,pointHoverBackgroundColor:'#FAF9F6',
      fill:true,backgroundColor:'rgba(250,249,246,0.10)',tension:0}]},
    options:{
      responsive:true,maintainAspectRatio:false,layout:{padding:{right:14}},
      animation:{duration:window.SEM_ANIMACAO?0:1800,easing:'easeOutQuart',delay:400},
      plugins:{legend:{display:false},tooltip:{
        mode:'nearest',axis:'x',intersect:false,displayColors:false,
        callbacks:{
          title:function(it){return it.length?'Aos '+Math.floor(it[0].parsed.x+1e-9)+' anos':'';},
          label:function(c){return 'Patrimônio: '+reais(c.parsed.y);}
        }}},
      scales:{
        x:{type:'linear',min:P.idadeInicial,max:P.idadeFinal,grid:{display:false},ticks:{color:TC,font:{size:8},stepSize:10,callback:function(v){return v+' anos';}}},
        y:{min:0,grid:{color:GC},ticks:{color:TC,font:{size:8},maxTicksLimit:5,callback:function(v){return v===0?'0':(v>=1e6?'R$ '+(v/1e6).toFixed(1).replace('.',',')+' mi':'R$ '+Math.round(v/1000)+' mil');}}}
      },
      interaction:{mode:'nearest',axis:'x',intersect:false}
    }
  });
})();
if (typeof module !== 'undefined') module.exports = simularAposentadoria;
