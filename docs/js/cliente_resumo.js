async function carregarResumo() {
  const resposta = await fetch(API + '/api/cliente/resumo', {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!resposta.ok) return;
  const dados = await resposta.json();
  if (dados.total === null) return;

  const AZUL = '#0057FF';
  const VERDE = '#146c43';
  const reais = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const valor = (v, cor) => `<span class="fw-semibold" style="color:${cor}">${reais(v)}</span>`;

  const partes = ['(' + dados.atualizado_em + ')'];
  if (dados.investido !== null) partes.push('Investimento ' + valor(dados.investido, AZUL));
  partes.push('Total ' + valor(dados.total, VERDE));

  const pilula = document.getElementById('resumo');
  pilula.innerHTML = partes.join(' - ');
  pilula.classList.remove('d-none');
}