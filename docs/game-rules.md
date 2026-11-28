# Game Rules Reference

This document specifies the active gameplay rules implemented in **Hexes of Battle** (`v0.32.0`), matching `public/combat_config.json`, `public/creaturetypes.json`, `public/traits.json`, `public/abilitytypes.json`, and `src/overview/overview-economy.ts`.

---

## Part I: Tactical Battle Rules

### 1. Turn Structure & Victory Conditions

- Battles are played on a **hexagonal grid** (odd-r offset coordinates) between two armies: **Army 0** (typically the Player / Attacker) and **Army 1** (Enemy Faction or Neutral Militia / Defender).
- Armies alternate full turns (`Turn 1`, `Turn 2`, ..., up to `maxTurns = 24`).
- At the **end** of an army's turn, any unit belonging to that army that performed no movement or attack automatically receives **Rest-by-Default** (`+6` stamina, `+1` morale).
- At the **start** of an army's turn:
  - Movement, attack, counterattack, and retaliation counters reset.
  - Undamaged units recover `+1` morale (routing units require 2 consecutive undamaged turns to begin recovering morale).
  - Routing units and units belonging to a retreating army automatically move toward their retreat hexes.
- **Victory**: Eliminating or routing all opposing squads wins the battle. Reaching `maxTurns` (24) ends the battle in a draw.

---

### 2. Hex Movement & Terrain Modifiers

Units spend movement points and stamina to enter each hex. Consistent with `BattleHexMapPath`, **any unit with `remaining_movement > 0` can always enter an adjacent passable hex** (such as a Hill or Swamp whose cost exceeds its remaining movement), clamping remaining movement down to `0`.

| Terrain | ID | Move Cost | Stamina Cost | Combat Modifiers |
| --- | --- | --- | --- | --- |
| **Plain / Grass** | `0` | `1` | `1` | None |
| **Forest** | `1` | `2` | `2` | **+2 Ranged Defense** |
| **Hill** | `2` | `3` | `2` | **+2 Melee Attack**, **+2 Ranged Attack**, **+1 Melee Defense**, **+1 Range** |
| **Swamp** | `3` | `4` | `2` | **-1 Melee Defense**, **-1 Ranged Defense** |
| **Water** | `5` | Impassable (`10`) | `5` | Impassable to ground units |

---

### 3. Combat Damage Formula

#### Base Damage & Scaling
1. Roll a random integer between the attacker's `[low, high]` attack stat (including terrain buffs such as Hill `+2`).
2. Scale by the attacker's **output multiplier**:
   $$\text{outputMultiplier} = \frac{\text{aliveModels}}{\text{maxModels}} \times \text{exhaustionDamageMultiplier}$$
   *(Minimum scaled base damage is `1`.)*

#### Facing & Flanking Bonus
Every squad has a facing direction (`0`–`5`). Attacks approaching from the side or rear gain flat bonus damage:

| Attack Angle | Bonus Damage |
| --- | --- |
| **Front** | `+0` |
| **Flank** (side hexes) | `+1` |
| **Rear / Backstab** (directly behind) | `+2` |

*(Units can freely change facing without spending movement, stamina, or attacks.)*

#### Armor, Isolation & Armor Penetration
1. Start with the defender's `defense_melee` (for melee/retaliation) or `defense_ranged` (for ranged), including terrain buffs (e.g., Forest `+2` ranged def, Hill `+1` melee def, Swamp `-1` def).
   - If the defender is **Depleted** (0% stamina), base defense is **halved** (`floor(def * 0.5)`).
2. **Isolated / Surrounded Armor Penalty**:
   - Count alive units adjacent (hex distance `1`) to the defender.
   - If **at least 1 friendly unit** is adjacent to the defender: **no penalty (`0`)**.
   - If **no friendly units** are adjacent: decrease armor by **`1` for each adjacent enemy unit beyond the 1st**:
     - `1` adjacent enemy → `0`
     - `2` adjacent enemies → `-1` armor
     - `3` adjacent enemies → `-2` armor
     - `4` adjacent enemies + `1` adjacent friendly → `0` (not affected)
3. **Armor Penetration** (trait): If effective armor is `> 0`, reduces it by **50%** (`effectiveArmor * 0.5`).

#### Final Damage
$$\text{netBase} = \text{baseDamage} + \text{facingBonus} - \text{effectiveArmor}$$
$$\text{rawDamage} = \max\left(0,\ \text{round}(\text{netBase} \times \text{customMult} \times \text{volleyMult} \times \text{chargeMult} \times \text{chargeRetalMult})\right)$$
- For melee attacks, subtract defender trait reductions (**Shield Block** `-2` on first melee hit of the turn; **Spear Wall** `-2` when attacked from the exact front facing direction), clamped to `>= 0`.
- Remaining models in a squad are computed as $\lceil \text{remainingHP} / \text{modelHP} \rceil$.

#### Ranged Scatter
- Ranged attacks have a **15% scatter chance** (`scatterChance: 0.15`), with friendly fire enabled and a penalty when melee-engaged.

---

### 4. Stamina, Exhaustion & Rest

| Action | Stamina Cost |
| --- | --- |
| Move (Plain) | `1` |
| Move (Forest / Hill / Swamp) | `2` |
| Melee Attack | `3` (requires ≥ `2` stamina) |
| Ranged Attack | `2` (requires ≥ `2` stamina) |
| Retaliation | `2` (requires ≥ `2` stamina) |
| Special Ability | `1`–`6` (per skill; default `3`) |
| **Rest** (active or end-of-turn idle) | `0` — recovers **+6 Stamina** and **+1 Morale** |

#### Exhaustion States (by `%` of `max_stamina`)

| State | Threshold | Damage Dealt | Move Penalty | Defense Mult | Damage Taken | Can Retaliate | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Fresh** | `≥ 55%` | `100%` | `0` | `1.0×` | `1.0×` | Yes | Full combat effectiveness |
| **Winded** | `30%–54%` | `90%` | `-1` | `1.0×` | `1.0×` | Yes | Slightly reduced output & mobility |
| **Exhausted** | `15%–29%` | `70%` | `0` | `0.75×` | `1.20×` | **No** | Vulnerable; cannot retaliate |
| **Depleted** | `≤ 5%` (`0`) | `50%` | Cannot move | `0.50×` | `1.50×` | **No** | Cannot move or attack; triggers morale check |

---

### 5. Diminishing-Returns Retaliation

When attacked in melee, an eligible defender (not Exhausted/Depleted, not Panicked/Routing, `stamina ≥ 2`, `remaining_counterattacks > 0`) retaliates, up to `3` times per turn with diminishing damage multipliers:

| Retaliation # | Damage Multiplier |
| --- | --- |
| 1st | `100%` (`1.0`) |
| 2nd | `60%` (`0.6`) |
| 3rd | `30%` (`0.3`) |
| 4th+ | `0%` (none) |

---

### 6. Morale & Routing

- Max morale is `30`. Squads begin around `10`–`14`.
- **Morale States**:
  - **Routing**: `0` (loses control; automatically flees toward retreat hexes each turn)
  - **Panicked**: `1`–`3` (loses turn control)
  - **Wavering**: `4`–`7`
  - **Steady**: `8`–`15`
  - **High**: `> 15`
- **Morale Triggers**:
  - Losing `≥ 25%` of initial models in one hit or hitting `0` stamina triggers a morale check (with `+20%` penalty when exhausted).
  - **Squad Death Cascade**: When a squad is wiped out, adjacent allies lose `-1` morale, adjacent enemies gain `+1` morale, and the killer gains `+2` morale (melee) or `+1` morale (ranged).
  - **Healing**: Restoring health also restores morale (`0.5×` healed amount, minimum `+1`).
  - **Hero Aura**: A friendly Hero within `2` hexes grants a passive morale bonus (`+15`–`+25`).
  - **Recovery**: Undamaged units recover `+1` morale per turn (routing units after 2 consecutive undamaged turns); resting grants `+1` morale.

---

### 7. Retreat & Surrender

- **Retreat Points**: By default, Army 0 retreats to the west edge (`x = 0`) and Army 1 to the east edge (`x = mapWidth - 1`). Battles can also configure custom retreat hexes marked by animated 3D heraldic flags.
- **Single-Unit Retreat**: Orders the currently selected squad to move toward its nearest retreat hex for one turn only. If it does not escape this turn, it awaits normal orders next round.
- **Army-Wide Retreat**: Marks the entire army as retreating (enabling auto-turn advancement). Units are processed closest-to-retreat-point first using Dijkstra shortest-path navigation around water, obstacles, and units. Exhausted (`DEPLETED`) or blocked units preserve movement so turn-end rest-by-default restores stamina (`+6`) and lets them resume retreating next turn.
- **Escaping**: Reaching any friendly retreat hex removes the squad from battle into `routedCreatures` (surviving the battle on the global map).
- **Surrender**: Immediately forfeits the battle. Only squads that **already escaped** before surrender survive; all squads still on the field are lost as casualties.

---

### 8. Unit Roster (`public/creaturetypes.json`)

| Unit | Tier | Models × HP (Total) | Melee Atk | Ranged Atk (Range / Ammo) | Def (M / R) | Move | Init | Stamina | Morale | Traits & Skills |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Peasant** | 1 | `16 × 4` (`64`) | `6–9` | — | `0 / 0` | `3` | `3` | `20` | `10` | — |
| **Archer** | 1 | `12 × 4` (`48`) | `4–6` | `7–9` (`6` / `12`) | `0 / 0` | `3` | `3` | `22` | `10` | `FragileLine`, `VolleyFire`; *Quick draw* |
| **Slinger** | 1 | `8 × 4` (`32`) | `3–5` | `6–8` (`6` / `12`) | `0 / 0` | `3` | `3` | `22` | `10` | `FragileLine`, `ImpreciseVolley`, `ArmorPenetration`; *Quick draw* |
| **Healer** | 1 | `8 × 5` (`40`) | `3–5` | — | `0 / 1` | `3` | `3` | `22` | `10` | `FragileLine`; *Mend wounds* |
| **Swordsman** | 2 | `8 × 6` (`48`) | `9–11` | — | `1 / 1` | `2` | `2` | `22` | `10` | `ShieldBlock` |
| **Spearman** | 2 | `8 × 6` (`48`) | `7–10` | — (`Ammo: 1`) | `1 / 0` | `3` | `5` | `26` | `10` | `CloseQuartersCounter`, `SpearWall`; *Throw javelin* |
| **Barbarian** | 2 | `8 × 7` (`56`) | `10–14` | — | `0 / 0` | `3` | `4` | `24` | `14` | — |
| **Crossbowman** | 2 | `8 × 6` (`48`) | `5–6` | `8–11` (`4` / `10`) | `2 / 1` | `2` | `2` | `20` | `10` | `FragileLine`, `VolleyFire` |
| **Mace Man** | 2 | `8 × 6` (`48`) | `7–10` | — | `1 / 0` | `3` | `5` | `24` | `10` | `ArmorPenetration` |
| **Heavy Knights** | 3 | `4 × 20` (`80`) | `16–22` | — | `5 / 4` | `4` | `6` | `24` | `10` | — |
| **Armored Knight** | 3 | `5 × 12` (`60`) | `12–16` | — | `4 / 3` | `4` | `7` | `44` | `12` | `Cavalry`, `Charge`, `ArmorPenetration` |
| **Hero Commander** | 4 | `6 × 15` (`90`) | `18–24` | — | `5 / 4` | `3` | `7` | `26` | `10` | `HeroPresence`, `BodyguardRetinue` |

---

### 9. Traits & Active Skills

#### Traits (`public/traits.json`)
- **Shield Block**: Reduces incoming melee damage by `2` for the first melee attack received each turn.
- **Spear Wall**: Reduces incoming melee damage by `2` when attacked from the unit's exact facing direction.
- **Volley Fire**: Ranged damage multiplier scales with target squad density (`125%` vs `>75%` models, `100%` vs `50%–75%`, `75%` vs `<50%`).
- **Imprecise Volley**: High-variance volley (`150%` vs `>75%`, `100%` vs `50%–75%`, `50%` vs `<50%`).
- **Fragile Line**: Suffers `+2` extra morale loss whenever attacked in melee.
- **Armor Penetration**: Ignores `50%` of target's positive armor during damage calculation.
- **Cavalry**: Mounted unit classification.
- **Charge**: Gains `+8%` melee damage dealt per hex traveled during an attack, but suffers `+8%` bonus damage from retaliation per hex traveled.
- **Hero Presence / Bodyguard Retinue**: Hero leadership morale aura and retinue damage absorption.

#### Active Skills (`public/abilitytypes.json`, hotkeys `1`–`5`)
- **Quick draw**: Fires 2 ranged volleys at a target in one turn (Cost: `2` Ammo, `6` Stamina, `1` Attack).
- **Throw javelin**: Piercing ranged attack bypassing armor for `8–10` damage at range `2` (Cost: `1` Ammo, `1` Stamina, `1` Attack).
- **Mend wounds**: Heals self or an adjacent ally (range `1`) for `1` HP per living healer model (Cost: `2` Stamina, `1` Attack).
- **Patch up**: Heals self or an allied unit.
- **Pick-up ammo**: Recovers ammunition from the battlefield.

---

### 10. CPU AI Personalities & Auto-Battle

- Players can toggle **Auto-Battle** at any time and choose a CPU personality:
  - **Defensive** (`DefensiveCPUPlayer`): Holds favorable terrain (hills/forests), prioritizes ranged harassment, protects fragile units, and uses healing/rest conservatively.
  - **Aggressive** (`AggressiveCPUPlayer`): Advances and engages rapidly, prioritizes flanking/charging and high-damage strikes.
  - **Dumb** (`DumbCPUPlayer`): Simple baseline AI for testing.

---

## Part II: Global Map Campaign Rules

### 1. Factions & Customization

- **Player Faction**: Defaults to **"The Count of Ekkina"** (`#3498bb`, `banner11.png`). Via the **Faction** button on the global HUD, the player can customize:
  - **Name** (up to `32` characters; persisted in `localStorage`)
  - **Color** (10 heraldic swatches)
  - **Banner** (64 heraldic emblems from the `528×528` atlas)
- **Enemy Factions**: Configured in `public/global_config.json` (default rivals: *Knights of the Grand Duke*, *House of Ironvale*, *Barony of Ravenscroft*, *Order of the Pale Sun*), each with a unique color and banner.
- **Neutral Defenders**: Unowned regions are defended by neutral militias displayed in battles as **"Militia of \<Region Name\>"** (e.g., *"Militia of Falkenmoor"*), using the neutral gray faction color (`#8c929a`) and dedicated gray militia banner (`banner17.png`).

---

### 2. Regions, Settlements & Economy

- The global map is procedurally generated into named medieval European regions drawn from `public/regions.json` (16 reserved home-region names + 70 common names). Region names appear both on overhead 3D settlement nameplates and on a top parchment scroll banner when hovering.
- **Population & Workforce**:
  - Population grows when food supply meets demand (`foodRequired = max(5, ceil(population / 100))`), slows near the soft cap (`2,500`), and is strictly capped at `4,999`.
  - Available workforce: `max(1, floor(population / 50))` workers assignable to resource hexes (Farms, Lumber Mills, Quarries, Iron Mines).
- **Settlement Tax & Defenses**:
  - Base tax by settlement tier: **Village** (`25`), **Town** (`50`), **City** (`85`).
  - Tax multiplier by defense structure: **None** (`1.0×`), **Palisade** (`1.15×`), **Keep** (`1.35×`), **Castle** (`1.6×`).
- **Merchant Trade Prices** (`buy / sell` in gold):
  - Food (`3 / 2`), Grain (`3 / 2`), Lumber (`6 / 4`), Stone (`7 / 5`), Cattle (`7 / 5`), Sheep (`5 / 3`), Iron (`10 / 7`), Horses (`14 / 9`).

---

### 3. Armies, Recruitment & Battle Handoff

- Each army can hold up to **8 squads** (`MAX_SQUADS_PER_ARMY = 8`).
- **Recruitable Units** (at player-owned settlements):

| Unit | Gold | Lumber | Iron | Population | Squad Size |
| --- | --- | --- | --- | --- | --- |
| **Peasant** | `20` | `0` | `0` | `25` | `12` |
| **Archer** | `40` | `8` | `2` | `25` | `8` |
| **Spearman** | `45` | `4` | `4` | `25` | `8` |
| **Swordsman** | `65` | `0` | `8` | `25` | `8` |

- **Army Movement & Exchange**:
  - Armies march smoothly hex-by-hex along their computed path with walking animations and unit step sounds.
  - Moving a friendly army onto another friendly army either merges them (if total squads ≤ 8) or opens the **Army Exchange Panel** to transfer/split squads.
- **Engagement & Resolution**:
  - Moving onto an enemy army or hostile settlement opens the **Battle Engagement** prompt (**Quick Battle**, **Fight on the Battlefield**, or **Cancel**).
  - Battle outcomes carry directly back to the global map: surviving and successfully retreated squads remain in their armies, defeated armies with no escaped squads are removed, and conquering a settlement transfers ownership of the entire region.
- **Campaign Saves**: Campaigns can be saved to and loaded from browser `localStorage` via `OverviewSaveManager`.
