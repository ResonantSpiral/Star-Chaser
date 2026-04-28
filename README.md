# Star-Chaser

A bite-size HTML5 arcade clicker game.

Play now: https://resonantspiral.github.io/Star-Chaser/

## Gameplay

Tap or click drifting stars before they float away. Each run lasts 45 seconds.

Scoring rewards precision:

- Large, slow stars are worth 1 point.
- Smaller and faster stars scale up to 7 points.
- Streaks add a visible bonus point every five hits.
- Missing a star resets the streak.

Your best score is saved locally in the browser. The settings panel lets you toggle sound, vibration, and best-score display.

## How to run locally

No build tools are required.

```bash
git clone https://github.com/ResonantSpiral/Star-Chaser.git
cd Star-Chaser
python3 -m http.server 8766
```

Then open `http://127.0.0.1:8766/`.

You can also open `index.html` directly in a browser for quick local checks.

## Project shape

- `index.html`: page structure and HUD controls.
- `style.css`: responsive layout, panels, and visual treatment.
- `game.js`: canvas loop, scoring, settings, persistence, and input.

The core project stays plain HTML, CSS, and JavaScript so it remains easy to inspect, remix, and contribute to.

## Contributing

Pull requests are welcome. Keep changes focused, test on desktop and mobile-sized viewports when gameplay or layout changes, and check [AGENTS & GUIDELINES](AGENTS.md) before opening a PR.
