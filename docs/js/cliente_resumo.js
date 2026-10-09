async function carregarResumo() {
  const resposta = await fetch(API + '/api/cliente/resumo', {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!resposta.ok) return;
  const dados = await resposta.json();
  if (dados.total === null) return;

  const AZUL = '#0057FF';
  const VERDE = '#146c43';
  const reais = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const valor = (v, cor) => `<span class="fw-semibold" style="color:${cor}">${reais(v)}</span>`;

  const partes = [];
  if (dados.investido !== null) partes.push('Investimento ' + valor(dados.investido, AZUL));
  partes.push('Total ' + valor(dados.total, VERDE));

  const pilula = document.getElementById('resumo');
  pilula.innerHTML = partes.join(' - ');
  pilula.tabIndex = 0;
  new bootstrap.Tooltip(pilula, { title: 'Atualizado em ' + dados.atualizado_em, placement: 'bottom' });
  pilula.classList.remove('d-none');
}