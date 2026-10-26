async function carregarGraficos() {
  const resposta = await fetch(API + '/api/cliente/patrimonio', {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!resposta.ok) return;
  const dados = await resposta.json();
  if (dados.pontos.length < 2) return;

  const AZUL = '#0057FF';
  const VERDE = '#146c43';
  const CORES_BENCHMARK = { IPCA: '#98A2B3', CDI: '#F79009', Ibovespa: '#7A5AF8' };
  const benchmarks = Object.entries(dados.benchmarks || {});
  const cor = nome => CORES_BENCHMARK[nome] || '#667085';
  const estilo = nome => ({ color: cor(nome), width: 1.5, dash: 'dot' });
  const ligados = new Set(benchmarks.some(([nome]) => nome === 'IPCA') ? ['IPCA'] : []);
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
    showlegend: false,
  });
  const opcoes = { responsive: true, displayModeBar: false, doubleClick: false };

  const retorno = [
    { x: datas, y: dados.retorno_carteira, name: 'Carteira', mode: 'lines', line: { color: AZUL, width: 1.5 } },
  ];
  benchmarks.forEach(([nome, b]) => {
    retorno.push({ x: datas, y: b.retorno, name: nome, mode: 'lines', line: estilo(nome), visible: ligados.has(nome) });
  });
  Plotly.newPlot('grafico-retorno', retorno, layout('Retorno acumulado (%)', { ticksuffix: '%' }), opcoes);

  const atual = dados.pontos.map(p => p.valor);
  const fluxo = dados.investido.map((v, i) => i === 0 ? 0 : v - dados.investido[i - 1]);
  const comDegrau = valores => {
    const x = [], y = [];
    valores.forEach((v, i) => {
      if (fluxo[i] !== 0 && v != null) { x.push(datas[i]); y.push(v - fluxo[i]); }
      x.push(datas[i]); y.push(v);
    });
    return { x, y };
  };

  const reais = [
    { x: datas, y: dados.investido, name: 'Investido', mode: 'lines', hoverinfo: 'none', line: { color: VERDE, width: 1.5, shape: 'hv' }, fill: 'tozeroy', fillcolor: 'rgba(20, 108, 67, 0.12)' },
    { ...comDegrau(atual), name: 'Atual', mode: 'lines', hoverinfo: 'none', line: { color: AZUL, width: 1.5 }, fill: 'tonexty', fillcolor: 'rgba(0, 87, 255, 0.12)' },
  ];
  benchmarks.forEach(([nome, b]) => {
    reais.push({ ...comDegrau(b.reais), name: nome, mode: 'lines', hoverinfo: 'none', line: estilo(nome), visible: ligados.has(nome) });
  });
  const faixaReais = () => {
    const valoresY = reais.filter(t => t.visible !== false).flatMap(t => t.y).filter(v => v != null);
    const minY = Math.min(...valoresY);
    const maxY = Math.max(...valoresY);
    const folga = (maxY - minY) * 0.1 || maxY * 0.05;
    return [minY - folga, maxY + folga];
  };

  const traco = c => `<span style="display: inline-block; width: 18px; border-top: 2px solid ${c}; vertical-align: middle;"></span>`;
  const fixo = (nome, c) => `<span class="small text-secondary">${traco(c)} ${nome}</span>`;
  const pilulas = () => benchmarks.map(([nome]) => {
    const ligado = ligados.has(nome);
    return `<button type="button" class="btn btn-sm rounded-pill border py-0 px-2 ${ligado ? 'bg-light fw-semibold' : 'text-secondary'}" data-benchmark="${nome}" aria-pressed="${ligado}">`
      + `<i class="bi bi-${ligado ? 'circle-fill' : 'circle'}" style="color: ${cor(nome)};"></i> ${nome}</button>`;
  }).join('');
  const desenharLegendas = () => {
    document.getElementById('legenda-retorno').innerHTML = fixo('Carteira', AZUL) + pilulas();
    document.getElementById('legenda-reais').innerHTML = fixo('Investido', VERDE) + fixo('Atual', AZUL) + pilulas();
  };
  const alternar = nome => {
    if (ligados.has(nome)) ligados.delete(nome); else ligados.add(nome);
    const visiveis = benchmarks.map(([n]) => ligados.has(n));
    retorno.slice(1).forEach((t, i) => { t.visible = visiveis[i]; });
    reais.slice(2).forEach((t, i) => { t.visible = visiveis[i]; });
    Plotly.restyle('grafico-retorno', { visible: visiveis }, visiveis.map((_, i) => 1 + i));
    Plotly.restyle('grafico-reais', { visible: visiveis }, visiveis.map((_, i) => 2 + i));
    Plotly.relayout('grafico-reais', { 'yaxis.range': faixaReais() });
    desenharLegendas();
  };
  desenharLegendas();

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

  Plotly.newPlot('grafico-reais', reais, layout('', { tickprefix: 'R$ ', tickformat: ',.0f', automargin: true, range: faixaReais() }), opcoes).then(grafico => {
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
  carrossel.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
  carrossel.addEventListener('click', e => {
    const botao = e.target.closest('[data-benchmark]');
    if (botao) alternar(botao.dataset.benchmark);
  });
  carrossel.addEventListener('slide.bs.carousel', () => {
    requestAnimationFrame(() => {
      Plotly.Plots.resize('grafico-retorno');
      Plotly.Plots.resize('grafico-reais');
    });
  });
}