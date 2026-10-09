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
  const MIN_MESES = 6;
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
    xaxis: { range: faixa, tickvals: marcas, ticktext: rotulos, hoverformat: 'Posição em %d/%m/%Y'},
    yaxis: eixoY,
    margin: { t: titulo ? 50 : 5, r: 30, l: 50, b: 40 },
    legend: { orientation: 'h', y: -0.2 },
  });
  const opcoes = { responsive: true, displayModeBar: false };

  const retorno = [
    { x: datas, y: dados.retorno_carteira, name: 'Carteira', mode: 'lines', line: { color: AZUL, width: 1.5 } },
  ];
  if (dados.retorno_cdi) {
    retorno.push({ x: datas, y: dados.retorno_cdi, name: 'CDI', mode: 'lines', line: { color: CINZA, width: 1.5, dash: 'dot' } });
  }
  Plotly.newPlot('grafico-retorno', retorno, layout('Retorno acumulado (%)', { ticksuffix: '%' }), opcoes);

  const atual = dados.pontos.map(p => p.valor);
  const fluxo = dados.investido.map((v, i) => i === 0 ? 0 : v - dados.investido[i - 1]);
  const comDegrau = valores => {
    const x = [], y = [];
    valores.forEach((v, i) => {
      if (fluxo[i] !== 0) { x.push(datas[i]); y.push(v - fluxo[i]); }
      x.push(datas[i]); y.push(v);
    });
    return { x, y };
  };

  const reais = [
    { x: datas, y: dados.investido, name: 'Investido', mode: 'lines', hoverinfo: 'none', line: { color: '#146c43', width: 1.5, shape: 'hv' }, fill: 'tozeroy', fillcolor: 'rgba(20, 108, 67, 0.12)' },
    { ...comDegrau(atual), name: 'Atual', mode: 'lines', hoverinfo: 'none', line: { color: AZUL, width: 1.5 }, fill: 'tonexty', fillcolor: 'rgba(0, 87, 255, 0.12)' },
  ];
  if (dados.cdi_reais) {
    reais.push({ ...comDegrau(dados.cdi_reais), name: 'CDI', mode: 'lines', hoverinfo: 'none', line: { color: CINZA, width: 1.5, dash: 'dot' } });
  }

  const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const pilula = document.getElementById('leitura-valor');
  pilula.style.fontVariantNumeric = 'tabular-nums';
  let mostrado = null;
  let quadro = null;
  const escrever = (rendimento, investido) => {
    mostrado = rendimento;
    const sobe = rendimento >= 0;
    let texto = brl(rendimento) + ' <i class="bi bi-arrow-' + (sobe ? 'up' : 'down') + '"></i>';
    if (investido > 0) texto += ' ' + (rendimento / investido * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    pilula.innerHTML = texto;
    pilula.style.color = sobe ? '#146c43' : '#b42318';
  };
  const leitura = i => {
    document.getElementById('leitura-titulo').textContent = 'Rendimento até ' + dados.meses[i];
    const destino = atual[i] - dados.investido[i];
    const origem = mostrado === null ? destino : mostrado;
    const inicio = performance.now();
    cancelAnimationFrame(quadro);
    const passo = agora => {
      const t = Math.min((agora - inicio) / 300, 1);
      escrever(origem + (destino - origem) * t, dados.investido[i]);
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    passo(inicio);
  };
  leitura(datas.length - 1);

  Plotly.newPlot('grafico-reais', reais, layout('', { tickprefix: 'R$ ', tickformat: ',.0f', automargin: true }), opcoes).then(grafico => {
    const apontar = e => {
      if (!e.points || !e.points.length) return;
      const i = datas.indexOf(e.points[0].x);
      if (i >= 0) leitura(i);
    };
    grafico.on('plotly_hover', apontar);
    grafico.on('plotly_click', apontar);
    grafico.on('plotly_unhover', () => leitura(datas.length - 1));
  });
  const carrossel = document.getElementById('carrossel-graficos');
  bootstrap.Carousel.getOrCreateInstance(carrossel);
  carrossel.addEventListener('slide.bs.carousel', () => {
    requestAnimationFrame(() => {
      Plotly.Plots.resize('grafico-retorno');
      Plotly.Plots.resize('grafico-reais');
    });
  });
}