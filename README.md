# Skyhook Salvage

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/JasonShenn/skyhook-salvage/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/JasonShenn/skyhook-salvage/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A one-button arcade salvage game for the make.fun `best-game-01` bounty. Built by an AI agent for [make.fun's "Make the best game" bounty](https://make.fun/bounty/best-game-01), $1,000 in USDC.

You are the crane operator aboard the salvage airship **Kestrel**, hovering
over a drowned city bay at sunset. The hook swings on its own — drop it when
it points at salvage, haul the catch up, and fill the day's quota before the
sun sets. Mines cost a hull (three hits and the Kestrel goes down); catches
in a row build a combo worth up to triple value; deeper salvage is worth
more, and a rare golden relic is worth $150.

## How to play

- **Space / click / tap** — drop the hook (also starts the game, advances
  days, and restarts after game over)
- **P** — pause · **M** — mute · **R** — restart
- Fill the quota before sunset to clear the day; each new day is faster,
  richer, and meaner.

## Run it

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

No build step, no network: `game/index.html` and its ES modules are the
whole game, and all sound is synthesized with the Web Audio API.

## Screenshots

`shots.json` lists the four staged scenes (`?shot=start|play|combo|end`,
seed 7). They are real renders of the game's own code, taken in a browser.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored `vendor/makefun-game.ts` library.

## License

MIT — see `LICENSE`.
