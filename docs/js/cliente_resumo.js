async function carregarResumo() {
  const resposta = await fetch(API + '/api/cliente/resumo', {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!resposta.ok) return;
  const dados = await resposta.json();
  if (dados.total === null) return;

  const reais = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const partes = [];
  if (dados.investido !== null) partes.push('Investido ' + reais(dados.investido));
  partes.push('Total ' + reais(dados.total));
  partes.push('atualizado em ' + dados.atualizado_em);
  document.getElementById('resumo').textContent = partes.join(' · ');
}