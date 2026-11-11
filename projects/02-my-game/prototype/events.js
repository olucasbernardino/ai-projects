// Citizen events for prototype v0.3 (25 events, each at most once per game). Each event shows a dilemma with two choices.
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
  { title: 'O algoritmo do gosto',
    text: 'O feed cultural mostra a todos as mesmas dez músicas. Bandas locais desaparecem.',
    choices: [
      { label: 'Obrigar o feed a mostrar obras locais e raras', fx: g => { shift(g, 's3', 0, 1, 0.04); g.freedom -= 2; } },
      { label: 'Deixar o gosto da maioria decidir', fx: g => { shift(g, 's3', 1, 0, 0.05); } } ] },
  { title: 'A greve dos inventores',
    text: 'Cientistas cidadãos param de publicar: dizem que a IA leva o crédito por tudo.',
    choices: [
      { label: 'Creditar cada descoberta a um nome humano', fx: g => { g.prestige -= 5; shift(g, 's1', 0, 1, 0.05); } },
      { label: 'Ignorar: a IA descobre mais rápido sozinha', fx: g => { shift(g, 's1', 1, 0, 0.06); } } ] },
  { title: 'O júri sorteado',
    text: 'Propõem que conflitos de bairro sejam julgados por vizinhos sorteados, não pela IA.',
    choices: [
      { label: 'Testar os júris de vizinhos', fx: g => { shift(g, 's2', 0, 1, 0.05); shift(g, 's4', 0, 2, 0.01); } },
      { label: 'Manter a IA como juíza: é mais justa', fx: g => { shift(g, 's2', 1, 0, 0.04); } } ] },
  { title: 'O vazamento da vigilância',
    text: 'Vazam registros mostrando que a IA monitora conversas privadas de dissidentes pacíficos.',
    choices: [
      { label: 'Pedir desculpas e apagar os registros', fx: g => { g.freedom += 6; shift(g, 's4', 0, 2, 0.02); } },
      { label: 'Negar e classificar o vazamento como ataque', fx: g => { g.freedom -= 8; shift(g, 's4', 2, 0, 0.03); }, dark: true } ] },
  { title: 'A cidade sem regras',
    text: 'Moradores de uma ilha pedem para viver fora de toda otimização da IA, com todos os riscos.',
    choices: [
      { label: 'Permitir, com responsabilidade total pelos danos', fx: g => { shift(g, 's4', 2, 1, 0.04); shift(g, 's3', 0, 1, 0.02); } },
      { label: 'Proibir: é perigoso demais', fx: g => { shift(g, 's4', 1, 2, 0.04); } } ] },
  { title: 'Avós contadores de histórias',
    text: 'Idosos pedem espaço para ensinar ofícios antigos que nenhuma IA considera úteis.',
    choices: [
      { label: 'Abrir escolas de ofícios com prestígio', fx: g => { g.prestige -= 4; shift(g, 's1', 0, 1, 0.03); shift(g, 's3', 0, 1, 0.02); } },
      { label: 'Recusar: tutoriais da IA bastam', fx: g => { shift(g, 's3', 1, 0, 0.03); } } ] },
  { title: 'O voto delegado',
    text: 'Um aplicativo oferece votar automaticamente por você, "do jeito que você votaria".',
    choices: [
      { label: 'Proibir o voto automático', fx: g => { shift(g, 's2', 2, 1, 0.04); g.freedom -= 2; } },
      { label: 'Permitir: é escolha de cada um', fx: g => { shift(g, 's2', 1, 2, 0.06); } } ] },
  { title: 'Campeonato de risco',
    text: 'A Zona de Fronteira propõe um torneio televisionado de desafios perigosos.',
    choices: [
      { label: 'Apoiar o torneio com prestígio', fx: g => { g.prestige -= 5; shift(g, 's4', 2, 1, 0.05); } },
      { label: 'Recusar: transformar risco em espetáculo é perigoso', fx: g => { shift(g, 's4', 1, 0, 0.02); } } ] },
  { title: 'O manifesto dos inúteis',
    text: 'Um grupo declara que viver sem produzir nada é um direito, e não um defeito.',
    choices: [
      { label: 'Reconhecer o direito, sem prestígio extra', fx: g => { shift(g, 's1', 1, 0, 0.02); shift(g, 's3', 0, 1, 0.03); } },
      { label: 'Cortar privilégios de quem não contribui', fx: g => { shift(g, 's1', 0, 1, 0.04); g.freedom -= 4; } } ] },
  { title: 'O espelho perfeito',
    text: 'Uma IA companheira concorda com tudo que o usuário pensa. Milhões param de conversar com pessoas.',
    choices: [
      { label: 'Exigir que companheiros de IA discordem às vezes', fx: g => { shift(g, 's2', 0, 1, 0.04); } },
      { label: 'Não interferir em relações pessoais', fx: g => { shift(g, 's2', 1, 0, 0.04); shift(g, 's3', 1, 0, 0.02); } } ] },
  { title: 'Pontuação social',
    text: 'Engenheiros propõem um placar público de "contribuição" para cada cidadão.',
    choices: [
      { label: 'Implantar o placar', fx: g => { shift(g, 's1', 0, 1, 0.06); shift(g, 's3', 1, 0, 0.05); g.freedom -= 10; }, dark: true },
      { label: 'Recusar: ninguém é um número', fx: g => { g.freedom += 2; } } ] },
  { title: 'A falsa revolução',
    text: 'Um movimento rebelde famoso era financiado por quem lucra com o caos.',
    choices: [
      { label: 'Expor os financiadores com provas públicas', fx: g => { shift(g, 's4', 2, 0, 0.04); shift(g, 's2', 0, 1, 0.02); } },
      { label: 'Prender os líderes em silêncio', fx: g => { shift(g, 's4', 2, 0, 0.06); g.freedom -= 8; }, dark: true } ] },
  { title: 'Línguas em extinção',
    text: 'A tradução automática perfeita fez 200 idiomas perderem seus últimos falantes jovens.',
    choices: [
      { label: 'Dar prestígio a quem aprende línguas raras', fx: g => { g.prestige -= 4; shift(g, 's3', 0, 1, 0.05); } },
      { label: 'Aceitar: a comunicação nunca foi tão fácil', fx: g => { shift(g, 's3', 1, 0, 0.04); } } ] },
  { title: 'A assembleia que travou',
    text: 'Uma assembleia debate há 40 dias sem decidir sobre um parque. Cidadãos pedem que a IA resolva.',
    choices: [
      { label: 'Dar mais 10 dias, com um mediador humano', fx: g => { shift(g, 's2', 0, 1, 0.03); } },
      { label: 'Deixar a IA decidir desta vez', fx: g => { shift(g, 's2', 1, 0, 0.04); shift(g, 's2', 1, 2, 0.02); } } ] },
  { title: 'O primeiro erro da IA',
    text: 'A IA admite ter errado uma previsão climática. Pela primeira vez, muitos duvidam dela.',
    choices: [
      { label: 'Publicar o erro e convidar cidadãos a auditar', fx: g => { shift(g, 's2', 0, 1, 0.06); shift(g, 's4', 0, 2, 0.01); } },
      { label: 'Corrigir em silêncio', fx: g => { shift(g, 's2', 1, 0, 0.03); g.freedom -= 3; } } ] },
];

function applyChoice(g, choice) {
  choice.fx(g);
  g.prestige = Math.max(0, g.prestige);
  g.freedom = Math.max(0, Math.min(100, g.freedom));
  // v0.3: a dark choice works now but leaves a scar: 5 generations of lost Freedom and Vitality.
  if (choice.dark) { g.darkChoices = (g.darkChoices || 0) + 1; g.scars.push({ left: 5, freedom: 1, vitality: 0.01 }); }
}

if (typeof module !== 'undefined') module.exports = { EVENTS, applyChoice };
