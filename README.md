# Moonpost

A tiny delivery puzzle set in three isometric pixel-art dioramas. Collect three letters on each island and deliver them to the cottage before you run out of steps.

## How to play

Open `index.html` in a modern browser. Moonpost uses HTML, CSS, and JavaScript and works offline.

- Use the arrow keys, **WASD**, or the on-screen buttons to move the courier.
- Click or tap a walkable tile to follow the shortest path to it. Each tile you cross costs one step.
- Press **Z** to undo a move or **R** to restart the island.
- Each delivery unlocks the next island. Your progress is saved when browser storage is available.

## Publish on GitHub Pages

1. Place the source files in the root of a GitHub repository, including the hidden `.nojekyll` file.
2. Open **Settings → Pages** and choose **Deploy from a branch**.
3. Select the **main** branch and **/(root)**, then click **Save**. GitHub will show the game's address on that page.

Moonpost has no dependencies and requires no installation or build step. All asset paths are relative, so the game can run from a GitHub Pages project site.
