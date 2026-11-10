// Simulador de aposentadoria (modelo do Cláudio). Tudo roda no navegador; nada é enviado.
// Os nomes das variáveis seguem o original dele, para facilitar comparar com versões futuras.
'use strict';
(function () {

const defaults = { age: 35, retire: 65, end: 95, initial: 150000, contribution: 2500, desired: 10000, other: 2000, rate: 4, postRate: 4 };
const config = [
  ['age', 'Idade atual', 'anos', 18, 99, 1],
  ['retire', 'Aposentadoria aos', 'anos', 19, 100, 1],
  ['end', 'Planejar até', 'anos', 20, 120, 1],
  ['initial', 'Patrimônio disponível', 'R$', 0, 1e9, 10000],
  ['contribution', 'Aporte mensal', 'R$', 0, 1e7, 100],
  ['desired', 'Renda mensal desejada', 'R$', 0, 1e7, 500],
  ['other', 'INSS + outras rendas mensais', 'R$', 0, 1e7, 500],
  ['rate', 'Retorno real na acumulação', '% ao ano', -10, 20, .1],
  ['postRate', 'Retorno real na aposentadoria', '% ao ano', -10, 20, .1],
];
const CORES = { plano: '#0057FF', consumo: '#F79009', perpetuacao: '#7A5AF8', marco: '#B78D4D', area: '#E6EEFF', grade: '#E7EAF0', texto: '#475467' };

const $ = (id) => document.getElementById('apos-' + id);
const money = (n) => Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : 'Não viável';

for (const [id, label, unit, min, max, step] of config) {
  const col = document.createElement('div');
  col.className = id === 'other' ? 'col-12' : 'col-6';
  col.innerHTML = `<label class="form-label" for="apos-${id}">${label} (${unit})</label>`
    + `<input class="form-control" id="apos-${id}" type="number" min="${min}" max="${max}" step="${step}" value="${defaults[id]}">`;
  $(id === 'rate' || id === 'postRate' ? 'premissas' : 'campos').append(col);
}

function annuity(r, n) { return Math.abs(r) < 1e-12 ? n : -Math.expm1(-n * Math.log1p(r)) / r; }

function calculate(p) {
  const n = (p.retire - p.age) * 12, k = (p.end - p.retire) * 12;
  const r = Math.expm1(Math.log1p(p.rate / 100) / 12), s = Math.expm1(Math.log1p(p.postRate / 100) / 12);
  const need = Math.max(0, p.desired - p.other), growth = Math.exp(n * Math.log1p(r)), factor = annuity(r, n) * growth;
  const goals = (p.goals || []).filter(g => g.value > 0).map(g => ({ ...g, month: (g.age - p.age) * 12 })).sort((a, b) => a.month - b.month);
  const target = p.mode === 'preserve'
    ? (need === 0 ? 0 : s > 0 ? need / s : Infinity)
    : need * annuity(s, k) + p.legacy * Math.exp(-k * Math.log1p(s));
  const goalCost = goals.reduce((sum, g) => sum + g.value * Math.pow(1 + r, n - g.month), 0);
  let required = Math.max(0, (target + goalCost - p.initial * growth) / factor);
  // O aporte também precisa cobrir cada objetivo na própria data.
  for (const g of goals) {
    const t = g.month, gr = Math.pow(1 + r, t);
    const cost = goals.filter(a => a.month <= t).reduce((sum, a) => sum + a.value * Math.pow(1 + r, t - a.month), 0);
    required = Math.max(required, (cost - p.initial * gr) / (annuity(r, t) * gr));
  }
  let balance = p.initial, depleted = null, wealth = 0;
  const unfunded = [], rows = [{ age: p.age, balance, phase: 'Acumulação' }];
  for (let m = 1; m <= n + k; m++) {
    if (m <= n) {
      balance = balance * (1 + r) + p.contribution;
      const total = goals.filter(g => g.month === m).reduce((sum, g) => sum + g.value, 0);
      if (total > balance + .005) unfunded.push({ age: p.age + m / 12, missing: total - balance });
      balance = Math.max(0, balance - total);
      if (m === n) wealth = balance;
    } else {
      const next = balance * (1 + s) - need;
      if (next < -.005 && depleted === null) depleted = p.age + m / 12;
      balance = Math.max(0, next);
    }
    if (m % 12 === 0) rows.push({ age: p.age + m / 12, balance, phase: m < n ? 'Acumulação' : 'Aposentadoria' });
  }
  const sustainable = p.mode === 'preserve'
    ? Math.max(0, wealth * s)
    : Math.max(0, (wealth - p.legacy * Math.exp(-k * Math.log1p(s))) / annuity(s, k));
  return { target, wealth, required, income: p.other + sustainable, rows, depleted, n, unfunded, goals };
}

function readInputs() {
  const p = {};
  let error = '';
  for (const [id, label, , min, max] of config) {
    p[id] = Number($(id).value);
    if ($(id).value.trim() === '' || !Number.isFinite(p[id]) || p[id] < min || p[id] > max) error = `Revise o campo “${label}” (entre ${min} e ${max}).`;
  }
  p.goals = [1, 2].map(i => ({ name: $('goalName' + i).value.trim() || 'Objetivo ' + i, value: Number($('goalValue' + i).value), age: Number($('goalAge' + i).value) }));
  for (const [i, g] of p.goals.entries()) {
    if ($('goalValue' + (i + 1)).value.trim() === '' || !Number.isFinite(g.value) || g.value < 0 || g.value > 1e9) error = 'Informe um valor entre zero e R$ 1 bilhão no objetivo ' + (i + 1) + '.';
    else if (g.value > 0 && (!Number.isInteger(g.age) || g.age <= p.age || g.age >= p.retire)) error = 'A idade do objetivo ' + (i + 1) + ' deve ser inteira, depois da idade atual e antes da aposentadoria.';
  }
  p.legacy = Number($('legacy').value);
  p.mode = $('mode').value;
  $('legacyField').hidden = p.mode === 'preserve';
  if (p.mode === 'consume' && ($('legacy').value === '' || !Number.isFinite(p.legacy) || p.legacy < 0 || p.legacy > 1e9)) error = 'Informe uma herança entre R$ 0 e R$ 1 bilhão.';
  if (![p.age, p.retire, p.end].every(Number.isInteger)) error = 'Informe as idades em anos inteiros.';
  if (p.retire <= p.age || p.end <= p.retire) error = 'A aposentadoria deve ser depois da idade atual, e a idade final deve ser depois da aposentadoria.';
  return { p, error };
}

function setStatus(ok, text) {
  $('status').className = 'alert mb-3 ' + (ok ? 'alert-success' : 'alert-warning');
  $('status').textContent = text;
}

function update() {
  const { p, error } = readInputs();
  $('error').hidden = !error;
  $('error').textContent = error;
  $('output').hidden = !!error;
  if (error) return;

  const c = calculate(p);
  $('wealth').textContent = money(c.wealth);
  $('target').textContent = money(c.target);
  $('horizon').textContent = `Aos ${p.retire} anos · ${p.retire - p.age} anos de acumulação`;
  $('targetHelp').textContent = p.mode === 'preserve' ? 'Para manter o principal em termos reais.' : `Para financiar a renda até os ${p.end} anos.`;
  $('required').textContent = money(c.required);
  $('income').textContent = money(c.income);
  const extra = Math.max(0, c.required - p.contribution);
  $('extra').textContent = Number.isFinite(extra)
    ? (extra > .5 ? `${money(extra)} a mais que o aporte atual.` : 'O aporte atual atende à meta simulada.')
    : 'Preservar o capital exige retorno real positivo para financiar retiradas.';

  const gap = c.target - c.wealth, ok = gap <= .5 && c.unfunded.length === 0;
  if (c.unfunded.length) setStatus(false, 'O aporte atual não cobre integralmente os objetivos nas datas informadas. O aporte necessário considera os objetivos e a aposentadoria.');
  else if (ok) setStatus(true, 'Seu plano alcança o patrimônio necessário nas premissas informadas.');
  else if (Number.isFinite(gap)) setStatus(false, `Faltam ${money(gap)} de patrimônio projetado para alcançar a meta. Veja o aporte necessário abaixo.`);
  else setStatus(false, 'Com retorno real nulo ou negativo, a renda desejada não pode ser financiada indefinidamente preservando o capital.');

  if (c.depleted !== null) {
    const anos = Math.floor(c.depleted), meses = Math.round((c.depleted % 1) * 12);
    $('depletion').textContent = `Com o aporte atual, o saldo se esgota por volta dos ${anos} anos` + (meses ? ` e ${meses} ${meses === 1 ? 'mês' : 'meses'}.` : '.');
  } else {
    $('depletion').textContent = `O saldo permanece suficiente para as retiradas até os ${p.end} anos. Saldo final: ${money(c.rows.at(-1).balance)}.`;
  }
  $('chartStart').textContent = `Hoje · ${p.age} anos`;
  $('chartEnd').textContent = `Horizonte · ${p.end} anos`;
  $('goalSummary').textContent = c.goals.length
    ? 'Objetivos: ' + c.goals.map(g => g.name + ' — ' + money(g.value) + ' aos ' + g.age + ' anos').join(' · ') + '. '
      + (c.unfunded.length
        ? 'Falta de recursos nas datas: ' + c.unfunded.map(g => money(g.missing) + ' aos ' + g.age + ' anos').join(' · ') + '. O gráfico desconta apenas o saldo disponível; o valor não coberto não é financiado.'
        : 'Os objetivos são cobertos pelo saldo nas datas previstas.')
    : 'Nenhum objetivo adicional informado.';
  draw(p, c);
}

function referencePlans(p) {
  return ['consume', 'preserve'].map(mode => {
    const input = { ...p, mode, legacy: mode === 'preserve' ? 0 : Number($('legacy').value) }, goal = calculate(input);
    return {
      label: mode === 'consume' ? 'Consumo' : 'Perpetuação',
      color: mode === 'consume' ? CORES.consumo : CORES.perpetuacao,
      goal,
      plan: Number.isFinite(goal.required) ? calculate({ ...input, contribution: goal.required }) : null,
    };
  });
}

function draw(p, c) {
  const refs = referencePlans(p), series = [{ label: 'Seu plano', color: CORES.plano, plan: c }, ...refs.filter(r => r.plan)];
  const w = 800, h = 330, left = 85, right = 18, top = 24, bottom = 34;
  const max = Math.max(1, ...series.flatMap(s => s.plan.rows.map(r => r.balance))) * 1.08;
  const x = a => left + (a - p.age) / (p.end - p.age) * (w - left - right), y = v => h - bottom - v / max * (h - top - bottom);
  const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
  let svg = '<title>Plano atual, consumo e perpetuação</title>';
  for (let i = 0; i <= 4; i++) {
    const v = max * i / 4;
    svg += `<line x1="${left}" x2="${w - right}" y1="${y(v)}" y2="${y(v)}" stroke="${CORES.grade}"/>`
      + `<text x="${left - 10}" y="${y(v) + 4}" text-anchor="end" fill="${CORES.texto}" font-size="12">${compacto.format(v)}</text>`;
  }
  for (const g of c.goals) {
    const row = c.rows.find(a => a.age === g.age);
    if (row) svg += `<circle cx="${x(g.age)}" cy="${y(row.balance)}" r="5" fill="${CORES.marco}"><title>Objetivo aos ${g.age} anos: ${money(g.value)}</title></circle>`;
  }
  const points = s => s.plan.rows.map(r => x(r.age) + ',' + y(r.balance)).join(' ');
  svg += `<polygon points="${left},${y(0)} ${points(series[0])} ${x(p.end)},${y(0)}" fill="${CORES.area}"/>`;
  series.forEach((s, i) => {
    svg += `<polyline points="${points(s)}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linejoin="round" stroke-dasharray="${['none', '9 4', '3 4'][i]}"><title>${s.label}</title></polyline>`;
  });
  svg += `<line x1="${x(p.retire)}" x2="${x(p.retire)}" y1="${top}" y2="${h - bottom}" stroke="${CORES.marco}" stroke-dasharray="5 5"/>`
    + `<text x="${Math.min(w - 150, x(p.retire) + 7)}" y="16" fill="#906D34" font-size="12">Aposentadoria · ${p.retire}</text>`;
  for (const a of [...new Set([p.age, Math.round((p.age + p.retire) / 2), p.retire, Math.round((p.retire + p.end) / 2), p.end])]) {
    svg += `<text x="${x(a)}" y="${h - 10}" text-anchor="middle" fill="${CORES.texto}" font-size="12">${a}</text>`;
  }
  $('chart').innerHTML = svg;
  $('references').textContent = 'Curvas de referência com os aportes mensais necessários: '
    + refs.map(r => r.label + ' — ' + (r.plan ? money(r.goal.required) : 'inviável com retorno real nulo ou negativo')).join(' · ')
    + '. Consumo considera a herança informada; perpetuação preserva o capital. Os objetivos estão incluídos nas curvas de referência. O aporte pode ser zero quando o patrimônio já cobre os objetivos e a meta.';
}

function showGoal2(show) {
  $('goal2').hidden = !show;
  $('addGoal2').hidden = show;
}

function clearGoal(i) {
  $('goalName' + i).value = '';
  $('goalValue' + i).value = 0;
  $('goalAge' + i).value = '';
}

$('form').addEventListener('submit', e => e.preventDefault());
$('form').addEventListener('input', update);
$('form').addEventListener('change', update);
$('addGoal2').addEventListener('click', () => { showGoal2(true); $('goalName2').focus(); });
$('removeGoal2').addEventListener('click', () => { clearGoal(2); showGoal2(false); update(); });
update();

})();
