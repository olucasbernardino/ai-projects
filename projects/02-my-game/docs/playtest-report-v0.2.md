# Automated playtest report: prototype v0.2 (2026-11-11)

Made with `tools/playtest_sim.js` (500 games per bot, 4,500 games total) plus a
1,000-game follow-up per bot for the deeper checks. These are **bots, not people**:
they show what the rules reward, not whether the game is fun. Results vary a
little between runs because events are drawn at random.

## Results by bot

| Bot | Win | Lose | Dark ending | Main reason for losing |
|---|---|---|---|---|
| Idle (no sliders) | 0% | 100% | 0% | Vitality collapses by generation ~4 |
| Random fixed plan | 0% | 77% | 23% | Agency / Vitality collapse |
| Random every turn | 0% | 44% | 56% | Dictatorship (Freedom 0) |
| Adaptive (fixes the weakest crisis), good event choices | 9% | 91% | 0% | Reached gen 30 but missed a goal |
| Adaptive, random event choices | 15% | 85% | 0% | Missed a goal |
| Best fixed plan, good event choices | 99.8% | 0.2% | 0% | — |
| Best fixed plan, random event choices | 44% | 56% | 0% | Missed Agency or Diversity |
| Best fixed plan, worst event choices | 0.4% | 99.6% | 0% | Missed a goal |
| Tyrant (max punishment) | 0% | 1% | 99% | Dictatorship by generation ~6 |

## Event choices: win rate of the best fixed plan after each choice (1,000 games)

Lowest: "Negar cota aos monges" 31%, "Devolver a decisão à IA" 31%, "Aceitar o clique 'concordo'" 33%.
Highest: "Exigir justificativa escrita" 52%, "Manter a autonomia" 51%, "Conceder cota aos monges" 50%.
Problem cases: the dark choice "Vigilância total nas praças" (46%) beats the humane
"Convidá-los para a Zona de Fronteira" (38%), and approving mood implants (38%)
is barely worse than refusing (44%).

## Findings
1. **The game has one solution.** A single fixed plan wins 99.8% of games with good choices. Changing strategy turn by turn, the thing a strategy game should reward, does worse (9-15%).
2. **Events decide the game more than strategy.** With the same plan: good choices 99.8%, random 44%, worst 0.4%. Events are too strong.
3. **Shared prestige works as pressure.** Bots that spread spending ran short of prestige in ~20-26 of 30 generations. It is a real constraint now.
4. **The ending "Ordem Perfeita" was never reached** by any bot. Punishment drains Freedom so fast (−17/turn at max) that order never arrives first.
5. **Theme conflict:** the notes' central idea (send rebels to the Frontier, don't repress them) loses to the repressive event choice. The rules contradict the message.
6. **Agency and Diversity are the hardest goals**; Stability is the hardest for the adaptive bot.
7. **Losing from neglect is fast** (generation ~4 idle). Good: the player must act.
