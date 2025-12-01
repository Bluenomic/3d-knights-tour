# 3D Knight's Tour Visualizer

Visual simulator for a 3D Knight's Tour with three algorithms running side by side: Backtracking, Warnsdorff, and Combined. You can set custom board sizes, choose the start position, block tiles, and compare speed/efficiency via the live performance panel.

## Run
```bash
npm install
npm run dev
```
Open the URL Vite prints (usually http://localhost:5173).

## Controls
- **Dimensions (X, Y, Z):** Size of the 3D board. Minimum 2.  
- **Start Position:** X/Y/Z coordinates where the knight begins (auto-clamped to the board).
- **Blocked Tiles:** Enter coordinates as `x,y,z` separated by semicolon or newline, e.g. `0,0,1; 1,2,3`. Invalid/out-of-bounds entries are ignored and counted.
- **Sim Speed:** Slider to slow down or speed up visualization.
- **Layer Gap:** Vertical spacing between layers in the 3D view.
- **Start / Stop:** Begin or end a run. If paused, Start/Resume will continue.
- **Pause / Resume:** Freeze and continue the current run without resetting paths.
- **Reset:** Rebuild boards and clear stats/paths.

## What You See
- **Three panels:** Backtracking (red), Warnsdorff (cyan), Combined (green).
- **Paths:** Active cell highlights and a line trail for each solver.
- **Stats Cards:** Ops count, elapsed time, and progress bar per solver.
- **Performance Panel:** Per-solver time (s), ops, and current step, sorted with the best time highlighted.

## Notes
- Backtracking is classic DFS: it can take a long time on larger boards or impossible setups; Warnsdorff and Combined generally finish faster.
- Total steps are based on unblocked cells (`availableCells`), so completion respects any blocked tiles.
