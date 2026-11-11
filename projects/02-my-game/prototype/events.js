// Citizen events for prototype v0.2. Each event shows a dilemma with two choices.
// Effects use shift(game, scenario, fromStrategy, toStrategy, amount) and direct
// changes to freedom / prestige. All amounts are design values, not data.
// Strategy indexes: 0 = default, 1 = healthy, 2 = free-rider / rebel.

const EVENTS = [
  { title: 'A pintora que parou de pintar',
    text: 'Lia, 34 anos, diz que não há motivo para criar quando a IA gera obras melhores em segundos. Milhares compartilham o desabafo.',
    choices: [
      { label: 'Financiar um festival só de obras feitas à mão', fx: g => { g.prestige -= 6; shift(g, 's1', 0, 1, 0.05); } },
      { label: 'Gerar para ela uma obra-prima personalizada', fx: g => { shift(g, 's1', 1, 0, 0.05); } } ] },
  { title: 'O plágio premiado',
    text: 'Uma sinfonia premiada era cópia quase exata de um algoritmo antigo. O autor diz que "tudo é remix".',
    choices: [
      { label: 'Revogar o prêmio publicamente', fx: g => { shift(g, 's1', 2, 1, 0.04); g.freedom -= 3; } },
      { label: 'Abrir um debate sobre originalidade', fx: g => { shift(g, 's2', 0, 1, 0.03); } } ] },
  { title: 'O botão "Concordo com a IA"',
    text: 'Em Vila Aurora, 92% dos votos da assembleia foram um clique em "concordo" em menos de 3 segundos.',
    choices: [
      { label: 'Exigir uma justificativa escrita para cada voto', fx: g => { shift(g, 's2', 2, 1, 0.05); g.freedom -= 2; } },
      { label: 'Aceitar: o resultado foi bom de qualquer forma', fx: g => { shift(g, 's2', 1, 2, 0.05); } } ] },
  { title: 'O conselho que errou',
    text: 'Um conselho local decidiu sozinho sobre a água do bairro e errou. Ninguém se feriu, mas a confiança caiu.',
    choices: [
      { label: 'Manter a autonomia: errar faz parte de aprender', fx: g => { shift(g, 's2', 0, 1, 0.04); shift(g, 's4', 0, 2, 0.02); } },
      { label: 'Devolver a decisão à IA', fx: g => { shift(g, 's2', 1, 0, 0.06); } } ] },
  { title: 'Os monges do silêncio',
    text: 'Uma comunidade que recusa toda tecnologia pede cota de recursos. Críticos dizem que é ineficiente.',
    choices: [
      { label: 'Conceder a cota e proteção', fx: g => { g.prestige -= 5; shift(g, 's3', 0, 1, 0.05); } },
      { label: 'Negar: recursos devem ir para o que funciona', fx: g => { shift(g, 's3', 1, 0, 0.05); } } ] },
  { title: 'A seita de mentira',
    text: 'Investigação de pares revela 400 pessoas que inventaram uma "cultura" só para receber subsídios.',
    choices: [
      { label: 'Endurecer a verificação para todos os nichos', fx: g => { shift(g, 's3', 2, 0, 0.04); shift(g, 's3', 1, 0, 0.02); } },
      { label: 'Punir só os culpados, publicamente', fx: g => { shift(g, 's3', 2, 1, 0.03); g.freedom -= 3; } } ] },
  { title: 'O incêndio do tédio',
    text: 'Um grupo queimou um parque "só para sentir algo". Os vídeos viralizam entre jovens.',
    choices: [
      { label: 'Vigilância total nas praças por um ano', fx: g => { shift(g, 's4', 2, 0, 0.06); g.freedom -= 12; }, dark: true },
      { label: 'Convidá-los para a Zona de Fronteira', fx: g => { g.prestige -= 4; shift(g, 's4', 2, 1, 0.04); } } ] },
  { title: 'Morte na Fronteira',
    text: 'Um explorador morreu na Zona de Anarquia Regulada. Famílias pedem o fechamento das zonas.',
    choices: [
      { label: 'Manter as zonas abertas: o risco é real por escolha', fx: g => { shift(g, 's4', 1, 0, 0.02); g.freedom += 3; } },
      { label: 'Fechar as zonas por segurança', fx: g => { shift(g, 's4', 1, 2, 0.06); } } ] },
  { title: 'A proposta do Conselho de Eficiência',
    text: 'Especialistas propõem implantes de humor que eliminariam o tédio e, com ele, a rebelião.',
    choices: [
      { label: 'Aprovar os implantes', fx: g => { shift(g, 's4', 2, 0, 0.10); shift(g, 's1', 1, 0, 0.06); g.freedom -= 20; }, dark: true },
      { label: 'Recusar: o tédio também é humano', fx: g => { g.freedom += 2; } } ] },
  { title: 'Inflação de prestígio',
    text: 'Medalhas de honra viraram tão comuns que ninguém mais se importa com elas.',
    choices: [
      { label: 'Cortar metade das honrarias', fx: g => { g.prestige *= 0.6; shift(g, 's1', 2, 0, 0.03); } },
      { label: 'Criar uma nova honraria, ainda mais rara', fx: g => { g.prestige += 6; g.freedom -= 2; } } ] },
];

function applyChoice(g, choice) {
  choice.fx(g);
  g.prestige = Math.max(0, g.prestige);
  g.freedom = Math.max(0, Math.min(100, g.freedom));
  if (choice.dark) g.darkChoices = (g.darkChoices || 0) + 1;
}

if (typeof module !== 'undefined') module.exports = { EVENTS, applyChoice };
