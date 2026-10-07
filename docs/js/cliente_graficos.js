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
  const MIN_MESES = 12;
  const MAX_ROTULOS = 4;
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const eixo = [...datas];
  const nomes = [...dados.meses];
  while (eixo.length < MIN_MESES) {
    const [ano, mes] = eixo[eixo.length - 1].split('-').map(Number);
    nomes.push(MESES[mes - 1] + '/' + String(ano).slice(2));
    eixo.push(mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`);
  }
  const passo = Math.ceil(eixo.length / MAX_ROTULOS);
  const naMarca = (_, i) => (eixo.length - 1 - i) % passo === 0;
  const marcas = eixo.filter(naMarca);
  const rotulos = nomes.filter(naMarca);
  const DIA = 24 * 60 * 60 * 1000;
  const faixa = [new Date(eixo[0]).getTime() - 10 * DIA, new Date(eixo[eixo.length - 1]).getTime() + 10 * DIA];

  const layout = (titulo, eixoY) => ({
    title: titulo,
    hovermode: 'x unified',
    dragmode: false,
    separators: ',.',
    xaxis: { range: faixa, tickvals: marcas, ticktext: rotulos, hoverformat: '%d/%m/%Y' },
    yaxis: eixoY,
    margin: { t: 50, r: 30, l: 50, b: 40 },
    legend: { orientation: 'h', y: -0.2 },
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
  const carrossel = document.getElementById('carrossel-graficos');
  bootstrap.Carousel.getOrCreateInstance(carrossel);
  carrossel.addEventListener('slide.bs.carousel', () => {
    requestAnimationFrame(() => {
      Plotly.Plots.resize('grafico-retorno');
      Plotly.Plots.resize('grafico-reais');
    });
  });
}