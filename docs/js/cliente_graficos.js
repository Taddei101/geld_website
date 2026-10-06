async function carregarGraficos() {
  const resposta = await fetch(API + '/api/cliente/patrimonio', {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!resposta.ok) return;
  const dados = await resposta.json();
  if (dados.pontos.length < 2) return;

  const AZUL = '#0057FF';
  const CINZA = '#98A2B3';
  const datas = dados.pontos.map(p => p.data);
  const passo = Math.ceil(datas.length / 12);
  const marcas = datas.filter((_, i) => i % passo === 0);
  const rotulos = dados.meses.filter((_, i) => i % passo === 0);

  const layout = (titulo, eixoY) => ({
    title: titulo,
    hovermode: 'x unified',
    dragmode: false,
    separators: ',.',
    xaxis: { tickvals: marcas, ticktext: rotulos, hoverformat: '%d/%m/%Y' },
    yaxis: eixoY,
    margin: { t: 50, r: 10, l: 50, b: 40 },
    legend: { orientation: 'h' },
  });
  const opcoes = { responsive: true, displayModeBar: false };

  document.getElementById('patrimonio').classList.remove('d-none');

  const retorno = [
    { x: datas, y: dados.retorno_carteira, name: 'Carteira', mode: 'lines+markers', line: { color: AZUL, width: 3 } },
  ];
  if (dados.retorno_cdi) {
    retorno.push({ x: datas, y: dados.retorno_cdi, name: 'CDI', mode: 'lines+markers', line: { color: CINZA, width: 2, dash: 'dot' } });
  }
  Plotly.newPlot('grafico-retorno', retorno, layout('Retorno acumulado (%)', { ticksuffix: '%' }), opcoes);

  const reais = [
    { x: datas, y: dados.pontos.map(p => p.valor), name: 'Atual', mode: 'lines+markers', line: { color: AZUL, width: 3 } },
    { x: datas, y: dados.investido, name: 'Investido', mode: 'lines+markers', line: { color: '#475467', width: 2, dash: 'dash' } },
  ];
  if (dados.cdi_reais) {
    reais.push({ x: datas, y: dados.cdi_reais, name: 'CDI', mode: 'lines+markers', line: { color: CINZA, width: 2, dash: 'dot' } });
  }
  Plotly.newPlot('grafico-reais', reais, layout('Patrimônio (R$)', { tickprefix: 'R$ ', tickformat: ',.0f', automargin: true }), opcoes);
  document.getElementById('carrossel-graficos').addEventListener('slide.bs.carousel', () => {
    requestAnimationFrame(() => {
      Plotly.Plots.resize('grafico-retorno');
      Plotly.Plots.resize('grafico-reais');
    });
  });
}