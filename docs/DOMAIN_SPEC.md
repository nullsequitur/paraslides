# paraslides: Domain Specification & State Machine

## 1. Spatial Topology & Coordinate Model

The presentation does not use a dense, padded 3D matrix. Instead, it uses a
**sparse hierarchical tree** mapped across three logical dimensions:

- **Y-Axis (`y` — Sections):** Vertical sequence of top-level sections. Indexed
  `0` to `Y_max`.
- **X-Axis (`x` — Pages):** Horizontal sequence of primary slides within section
  `y`. Indexed `0` to `X_max(y)`.
- **Z-Axis (`z` — Detour / Backup Sequence):** Optional linear sequence of
  supplementary slides attached to a specific parent coordinate `(y, x)`.
  - `z = 0`: Represents the primary slide on the **Main Track**.
  - `z > 0`: Represents slide `z` (indexed `1` to `Z_max(y, x)`) inside that
    page's **Detour Track**.

---

## 2. Operating Modes

The state machine operates in one of two mutually exclusive modes based on the
`z` coordinate:

1. **`MAIN_MODE` (`z === 0`):**
   - The user is navigating the primary presentation grid (`Y` and `X` axes).
   - Visual state uses the active section's **Primary Hue**.
2. **`DETOUR_MODE` (`z > 0`):**
   - The user has stepped inside the supplementary sequence attached to parent
     page `(y, x)`.
   - Horizontal navigation (`LEFT` / `RIGHT`) is remapped to scrub through the
     detour slides (`z = 1 ... Z_max(y, x)`).
   - Vertical navigation (`UP` / `DOWN` across sections) is **locked**.
   - Visual state shifts to the **Detour Hue**.

---

## 3. State Variables & Memory

The Core State object maintains the following structure:

    State {
      y: Integer,                  // Current section index (0 <= y < sections.length)
      x: Integer,                  // Current page index within section y
      z: Integer,                  // 0 for Main Track; >= 1 for Detour index
      mode: 'MAIN' | 'DETOUR',     // Derived strictly from (z === 0 ? 'MAIN' : 'DETOUR')
      lastX: Array<Integer>,       // Memory array: last visited x index for each section y
      lastZ: Array<Array<Integer>> // Memory matrix: last visited z index (>0) for each (y, x)
    }

### Cursor Memory Rules

- **Section Memory (`lastX[y]`):** Whenever the user changes sections (`y`
  changes), the departing section's `x` index is already stored in
  `lastX[old_y]`, and the new `x` coordinate is restored from `lastX[new_y]`.
- **Detour Memory (`lastZ[y][x]`):** _(Open Config / Default Behavior)_ When
  exiting `DETOUR_MODE` back to `MAIN_MODE`, the last visited `z` index can
  optionally be stored in `lastZ[y][x]` or reset to `1` upon next entry. Default
  v0.1 behavior: store `lastZ[y][x]` during a session, with an explicit command
  available to reset to `z = 1`.

---

## 4. Navigation Commands & Transition Matrix

The Core Domain accepts abstract commands and executes the following
deterministic transitions:

| Command            | Default Keybind   | Behavior in `MAIN_MODE` (`z === 0`)                                   | Behavior in `DETOUR_MODE` (`z > 0`)                                                            |
| :----------------- | :---------------- | :-------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------- |
| **`MOVE_RIGHT`**   | `l`, `ArrowRight` | If `x < X_max(y)`: increment `x`, update `lastX[y] = x`. Else: no-op. | If `z < Z_max(y, x)`: increment `z`, update `lastZ[y][x] = z`. Else: no-op.                    |
| **`MOVE_LEFT`**    | `h`, `ArrowLeft`  | If `x > 0`: decrement `x`, update `lastX[y] = x`. Else: no-op.        | If `z > 1`: decrement `z`, update `lastZ[y][x] = z`. Else: no-op (use `EXIT_DETOUR` to leave). |
| **`MOVE_DOWN`**    | `j`, `ArrowDown`  | If `y < Y_max`: increment `y`, set `x = lastX[y]`. Else: no-op.       | **LOCKED** (No-op; emits locked-axis feedback event).                                          |
| **`MOVE_UP`**      | `k`, `ArrowUp`    | If `y > 0`: decrement `y`, set `x = lastX[y]`. Else: no-op.           | **LOCKED** (No-op; emits locked-axis feedback event).                                          |
| **`ENTER_DETOUR`** | `i`               | If `Z_max(y, x) > 0`: set `z = lastZ[y][x]                            |                                                                                                | 1`(switches to`DETOUR_MODE`). Else: no-op. | No-op (already in `DETOUR_MODE`). |
| **`EXIT_DETOUR`**  | `o`, `Escape`     | No-op (already in `MAIN_MODE`).                                       | Set `z = 0` (returns to parent `(y, x)` in `MAIN_MODE`).                                       |
| **`JUMP_START`**   | `0`               | Set `x = 0`, `lastX[y] = 0`.                                          | Set `z = 1`, `lastZ[y][x] = 1`.                                                                |
| **`JUMP_END`**     | `$`               | Set `x = X_max(y)`, `lastX[y] = x`.                                   | Set `z = Z_max(y, x)`, `lastZ[y][x] = z`.                                                      |

---

## 5. Outbound State Payload (For Renderers & HUD)

On every transition (and on initial load), the Core emits an immutable state
snapshot containing:

1. **Coordinates:** `{ y, x, z, mode }`
2. **Bounds & Capabilities (Used by HUD / Radar):**
   - `canMoveLeft`: Boolean (`x > 0` in MAIN, `z > 1` in DETOUR)
   - `canMoveRight`: Boolean (`x < X_max(y)` in MAIN, `z < Z_max(y, x)` in
     DETOUR)
   - `canMoveUp`: Boolean (`y > 0` in MAIN, `false` in DETOUR)
   - `canMoveDown`: Boolean (`y < Y_max` in MAIN, `false` in DETOUR)
   - `hasDetour`: Boolean (`Z_max(y, x) > 0`)
   - `detourCount`: Integer (`Z_max(y, x)`)
   - `isVerticalLocked`: Boolean (`mode === 'DETOUR'`)

---

## 6. Open Questions & Future Refinements

- **Detour Re-entry Behavior:** Confirm whether pressing `i` after previously
  exiting a detour mid-way should resume at `lastZ[y][x]` or always start fresh
  at `z = 1` (or bind `i` to resume and `I` to restart at `1`).
- **Boundary Wrapping:** Confirm that reaching the end of a section
  (`x === X_max(y)`) strictly stops rather than wrapping to `y + 1`. (Current
  decision: strict stop; axes are independent).
