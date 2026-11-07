// Ferramenta de rebalanceamento: a posição fica só em memória; o alvo (%)
// fica no localStorage deste navegador.

const API = location.hostname.endsWith('geldfp.com.br')
  ? 'https://geld.pythonanywhere.com'
  : 'http://127.0.0.1:5000';

const CHAVE_ALVO = 'geld_rebalanceamento_alvo';

let ativos = [];
let cotacoes = null;

const $ = (id) => document.getElementById(id);
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v) => (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
// "1.234,5" e "12,5" (pt-BR) ou "12.5"; ponto só é milhar se vier em grupos de 3
const numero = (texto) => {
  let t = String(texto).trim().replace(/\s|R\$/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  return t === '' ? 0 : Number(t);
};

function mostrar(id, sim = true) { $(id).classList.toggle('d-none', !sim); }

function erro(id, mensagem) {
  $(id).textContent = mensagem || '';
  mostrar(id, Boolean(mensagem));
}

function lerAlvoSalvo() {
  try { return JSON.parse(localStorage.getItem(CHAVE_ALVO)) || {}; } catch (e) { return {}; }
}

function salvarAlvo() {
  const alvo = lerAlvoSalvo();
  document.querySelectorAll('.rebal-input-alvo').forEach((el) => { alvo[el.dataset.ticker] = el.value; });
  try { localStorage.setItem(CHAVE_ALVO, JSON.stringify(alvo)); } catch (e) { /* aba anônima */ }
}

function celula(tr, texto, classe) {
  const td = document.createElement('td');
  td.textContent = texto;
  if (classe) td.className = classe;
  tr.appendChild(td);
  return td;
}

function atualizarSoma() {
  let soma = 0;
  document.querySelectorAll('.rebal-input-alvo').forEach((el) => { soma += numero(el.value); });
  const ok = Math.abs(soma - 100) <= 0.5;
  const el = $('rebal-soma-alvo');
  el.textContent = soma.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
  el.classList.toggle('text-success', ok);
  el.classList.toggle('text-danger', !ok);
  return ok;
}

// Arredonda para 2 casas sem perder a soma de 100: os centésimos que faltam
// vão para quem teve a maior parte cortada no arredondamento.
function arredondarPara100(valores) {
  const centesimos = valores.map((v) => v * 100);
  const base = centesimos.map((v) => Math.floor(v + 1e-9));
  const falta = Math.round(10000 - base.reduce((s, v) => s + v, 0));
  if (falta > 0 && falta <= valores.length) {
    centesimos
      .map((v, i) => [v - base[i], i])
      .sort((a, b) => b[0] - a[0])
      .slice(0, falta)
      .forEach(([, i]) => { base[i] += 1; });
  }
  return base.map((v) => v / 100);
}

function preencher(funcao) {
  const valores = arredondarPara100(ativos.map(funcao));
  document.querySelectorAll('.rebal-input-alvo').forEach((el, i) => {
    el.value = valores[i].toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  });
  atualizarSoma();
  salvarAlvo();
}

function montarAlvo(dados) {
  ativos = dados.ativos;
  const total = ativos.reduce((s, a) => s + a.valor, 0);
  const salvo = lerAlvoSalvo();
  const corpo = $('rebal-corpo-alvo');
  corpo.replaceChildren();

  ativos.forEach((a) => {
    const tr = document.createElement('tr');
    celula(tr, a.ticker);
    celula(tr, a.classe);
    celula(tr, brl(a.valor), 'text-end');
    celula(tr, pct(total ? a.valor / total : 0), 'text-end');
    const td = celula(tr, '', 'text-end');
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.className = 'form-control form-control-sm text-end rebal-input-alvo';
    input.dataset.ticker = a.ticker;
    input.value = salvo[a.ticker] ?? '0';
    input.addEventListener('input', () => { atualizarSoma(); salvarAlvo(); });
    td.appendChild(input);
    corpo.appendChild(tr);
  });

  $('rebal-total-atual').textContent = brl(total);

  const avisos = [];
  if (dados.abas_ignoradas.length) avisos.push('Fora da análise: ' + dados.abas_ignoradas.join(', ') + '.');
  if (dados.direitos.length) avisos.push('Direitos de subscrição não entram: ' + dados.direitos.map((d) => d.ticker).join(', ') + '.');
  $('rebal-avisos-posicao').textContent = avisos.join(' ');

  if (!Object.keys(salvo).some((t) => ativos.find((a) => a.ticker === t))) {
    preencher(() => 100 / ativos.length);
  }
  atualizarSoma();
  mostrar('rebal-passo-alvo');
  mostrar('rebal-passo-opcoes');
  mostrar('rebal-passo-resultado', false);
}

async function enviarArquivo() {
  const arquivo = $('rebal-arquivo').files[0];
  erro('rebal-erro-arquivo');
  if (!arquivo) return;

  const form = new FormData();
  form.append('arquivo', arquivo);
  try {
    const resposta = await fetch(API + '/api/ferramentas/posicao', { method: 'POST', body: form });
    const dados = await resposta.json();
    if (!resposta.ok) return erro('rebal-erro-arquivo', dados.erro);
    if (!dados.ativos.length) return erro('rebal-erro-arquivo', 'Não encontramos ações, FIIs ou ETFs neste arquivo.');
    montarAlvo(dados);
  } catch (e) {
    erro('rebal-erro-arquivo', 'Não foi possível falar com o servidor. Tente de novo em instantes.');
  }
}

function montarResultado(plano) {
  const corpo = $('rebal-corpo-resultado');
  corpo.replaceChildren();
  plano.linhas.forEach((l) => {
    const tr = document.createElement('tr');
    celula(tr, l.ticker);
    celula(tr, pct(l.peso_atual), 'text-end');
    celula(tr, pct(l.peso_alvo), 'text-end');
    celula(tr, (l.desvio_pp > 0 ? '+' : '') + l.desvio_pp.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' p.p.', 'text-end');
    celula(tr, l.vender ? l.vender.toLocaleString('pt-BR') : '–', 'text-end');
    celula(tr, l.comprar ? l.comprar.toLocaleString('pt-BR') : '–', 'text-end');
    const mov = l.custo - l.receita;
    celula(tr, mov ? brl(mov) : '–', 'text-end ' + (mov > 0 ? 'text-success' : mov < 0 ? 'text-danger' : ''));
    corpo.appendChild(tr);
  });

  const partes = ['Carteira hoje: <strong>' + brl(plano.total_atual) + '</strong>'];
  if (plano.aporte) partes.push('Aporte: <strong>' + brl(plano.aporte) + '</strong>');
  if (plano.vendido) partes.push('Vendas: <strong>' + brl(plano.vendido) + '</strong>');
  partes.push('Compras: <strong>' + brl(plano.investido) + '</strong>');
  partes.push('Sobra: <strong>' + brl(plano.troco) + '</strong>');
  $('rebal-resumo').innerHTML = partes.join(' · ');

  $('rebal-avisos-resultado').textContent = plano.avisos.join(' ');
  mostrar('rebal-passo-resultado');
  $('rebal-passo-resultado').scrollIntoView({ behavior: 'smooth' });
}

async function calcular() {
  erro('rebal-erro-calculo');
  if (!atualizarSoma()) return erro('rebal-erro-calculo', 'As porcentagens desejadas precisam somar 100%.');

  const aporte = numero($('rebal-aporte').value);
  if (!Number.isFinite(aporte) || aporte < 0) return erro('rebal-erro-calculo', 'Aporte inválido.');

  const posicao = {};
  ativos.forEach((a) => { posicao[a.ticker] = { quantidade: a.quantidade, preco: a.preco }; });
  const alvo = {};
  document.querySelectorAll('.rebal-input-alvo').forEach((el) => { alvo[el.dataset.ticker] = numero(el.value) / 100; });

  try {
    const resposta = await fetch(API + '/api/ferramentas/rebalancear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posicao, alvo, aporte, permitir_venda: $('rebal-venda').checked }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) return erro('rebal-erro-calculo', dados.erro);
    montarResultado(dados);
  } catch (e) {
    erro('rebal-erro-calculo', 'Não foi possível falar com o servidor. Tente de novo em instantes.');
  }
}

$('rebal-arquivo').addEventListener('change', enviarArquivo);
$('rebal-1n').addEventListener('click', () => preencher(() => 100 / ativos.length));
$('rebal-atual').addEventListener('click', () => {
  const total = ativos.reduce((s, a) => s + a.valor, 0);
  preencher((a) => (total ? (a.valor / total) * 100 : 0));
});
$('rebal-calcular').addEventListener('click', calcular);

// ---- carteira digitada ---------------------------------------------

async function carregarCotacoes() {
  if (cotacoes) return cotacoes;
  const resposta = await fetch(API + '/api/ferramentas/cotacoes');
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro);
  cotacoes = dados;
  $('rebal-lista-tickers').replaceChildren(...Object.keys(dados.papeis).sort().map((t) => {
    const opcao = document.createElement('option');
    opcao.value = t;
    return opcao;
  }));
  const [ano, mes, dia] = dados.pregao.split('-');
  $('rebal-data-pregao').textContent = `Preços de fechamento de ${dia}/${mes}/${ano}.`;
  return dados;
}

function atualizarLinhaManual(tr) {
  const ticker = tr.querySelector('.rebal-manual-ticker').value.trim().toUpperCase();
  const papel = cotacoes && cotacoes.papeis[ticker];
  const classe = tr.querySelector('.rebal-manual-classe');
  classe.textContent = papel ? papel[1] : (ticker && cotacoes ? 'não encontrado' : '');
  classe.classList.toggle('text-danger', Boolean(ticker && cotacoes && !papel));
  tr.querySelector('.rebal-manual-preco').textContent = papel ? brl(papel[0]) : '';
}

function adicionarLinhaManual(ticker = '', quantidade = '') {
  const tr = document.createElement('tr');
  const campo = (classe, valor, attrs) => {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control form-control-sm ' + classe;
    input.value = valor;
    Object.assign(input, attrs);
    input.addEventListener('input', () => atualizarLinhaManual(tr));
    td.appendChild(input);
    tr.appendChild(td);
  };
  campo('rebal-manual-ticker', ticker, { placeholder: 'PETR4', autocomplete: 'off' });
  tr.querySelector('.rebal-manual-ticker').setAttribute('list', 'rebal-lista-tickers');
  campo('rebal-manual-qtd text-end', quantidade, { placeholder: '0', inputMode: 'decimal' });
  celula(tr, '', 'small rebal-manual-classe');
  celula(tr, '', 'text-end rebal-manual-preco');
  const td = document.createElement('td');
  const remover = document.createElement('button');
  remover.type = 'button';
  remover.className = 'btn btn-link btn-sm text-muted p-0';
  remover.setAttribute('aria-label', 'Remover');
  remover.innerHTML = '<i class="bi bi-x-lg"></i>';
  remover.addEventListener('click', () => tr.remove());
  td.appendChild(remover);
  tr.appendChild(td);
  $('rebal-corpo-manual').appendChild(tr);
  atualizarLinhaManual(tr);
}

function ativosDaCarteira(quantidades) {
  return Object.entries(quantidades).map(([ticker, quantidade]) => {
    const [preco, classe] = cotacoes.papeis[ticker];
    return { ticker, classe, quantidade, preco, valor: quantidade * preco };
  });
}

function usarCarteira(ativosNovos) {
  montarAlvo({ ativos: ativosNovos, direitos: [], abas_ignoradas: [] });
  $('rebal-passo-alvo').scrollIntoView({ behavior: 'smooth' });
}

function usarManual() {
  erro('rebal-erro-manual');
  if (!cotacoes) return erro('rebal-erro-manual', 'Cotações ainda não carregadas. Tente de novo em instantes.');
  const quantidades = {};
  for (const tr of $('rebal-corpo-manual').children) {
    const ticker = tr.querySelector('.rebal-manual-ticker').value.trim().toUpperCase();
    const textoQtd = tr.querySelector('.rebal-manual-qtd').value;
    if (!ticker && !textoQtd.trim()) continue;
    if (!cotacoes.papeis[ticker]) return erro('rebal-erro-manual', `Ticker não encontrado: ${ticker || '(vazio)'}.`);
    const qtd = numero(textoQtd);
    if (!Number.isFinite(qtd) || qtd <= 0) return erro('rebal-erro-manual', `Quantidade inválida para ${ticker}.`);
    quantidades[ticker] = (quantidades[ticker] || 0) + qtd;
  }
  if (!Object.keys(quantidades).length) return erro('rebal-erro-manual', 'Adicione pelo menos um ativo.');
  usarCarteira(ativosDaCarteira(quantidades));
}

async function abrirAba(aba) {
  document.querySelectorAll('.rebal-abas .nav-link').forEach((b) => b.classList.toggle('active', b.dataset.aba === aba));
  document.querySelectorAll('[data-painel]').forEach((p) => p.classList.toggle('d-none', p.dataset.painel !== aba));
  if (aba !== 'manual') return;
  if (!$('rebal-corpo-manual').children.length) for (let i = 0; i < 3; i++) adicionarLinhaManual();
  try {
    await carregarCotacoes();
    erro('rebal-erro-manual');
    for (const tr of $('rebal-corpo-manual').children) atualizarLinhaManual(tr);
  } catch (e) {
    erro('rebal-erro-manual', 'Não foi possível carregar as cotações. Tente de novo em instantes.');
  }
}

document.querySelectorAll('.rebal-abas .nav-link').forEach((b) => b.addEventListener('click', () => abrirAba(b.dataset.aba)));
$('rebal-adicionar').addEventListener('click', () => adicionarLinhaManual());
$('rebal-usar-manual').addEventListener('click', usarManual);
