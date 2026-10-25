# **AFTERMOTION** 

#### _GAME MECHANICS & SYSTEMS SPECIFICATION_ 

Version 0.1 · Prototype specification · 25 October 2026 

Purpose: define gameplay rules, state models, algorithms, formulas, edge cases, balancing parameters and acceptance tests for a game built around delayed echo actions, temporary favour, autonomous echo behaviour and a changing puzzle environment. 

### **Document status** 

|**Label**|**Meaning**|
|---|---|
|Design direction|Core concept established in brainstorming.|
|Proposed default|A concrete rule proposed to make implementation possible; validate<br>in playtests.|
|Open decision|Requires testing or approval before production.|
|MVP|Required for the first playable prototype.|
|Later system|Deferred to prevent feature overload.|



Core thesis: the player moves through a world while creating a compressed movement history. Echoes process selected actions from that history at different cadences. Their specialties, favour states, cooldowns, hops, helpful interventions, hostile interference and environmental objects make future consequences of movement strategically important. 

AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

## **1. Product definition** 

Aftermotion is a grid-based action-puzzle game with optional real-time pressure. The player must reach an exit, escape alongside an echo, or use echoes to manipulate the environment. Complexity emerges from interactions between movement history, echo cadence, temporary abilities, environmental state and enemy interference. 

### **1.1 Design principles** 

- The player should understand the immediate input quickly; mastery requires predicting several interacting systems. 

- Echoes are distinct companions, not merely delayed followers. 

- Helpful random events may create optional advantages; mandatory puzzle solutions must remain deterministic. 

- Every failure must be explainable through visible rules and feedback. 

- No echo should dominate every level. Each needs strengths, weaknesses and counters. 

- Separate logical simulation time from wall-clock time in code. 

### **1.2 Modes and win conditions** 

|**Mode**|**Win condition**|**Primary challenge**|**Failure examples**|
|---|---|---|---|
|Escape Together|Player and every designated<br>required echo reach the exit.|Keep the echo route viable while<br>navigating the player route.|Required echo lost/trapped,<br>player captured, timer expires.|
|Escape Through the Echo|Player reaches exit after<br>satisfying all required<br>echo/environment conditions.|Use echoes as mechanisms:<br>plates, doors, blocks, helpers<br>and route changes.|Player trapped, required<br>mechanism becomes<br>impossible, timer expires.|
|Challenge|Complete the base objective<br>plus a level-specific condition.|Move budget, timed route, no-<br>hop or other skill constraint.|Challenge condition fails; base-<br>level failure is mode-specific.|



## **2. Core vocabulary and state** 

|**Term**|**Definition**|
|---|---|
|Accepted action|A valid directional input that moves the player. Invalid moves are not<br>recorded by default.|
|History H|Ordered list of accepted player directions, indexed from 1. Example<br>[UP, RIGHT, DOWN, LEFT].|
|Batch size B|Number of accepted player actions grouped before an echo<br>processes one action. Basic Trace default B=4.|
|Batch head|First direction in the current batch. Base echo executes only this<br>direction; remaining directions in the batch are discarded by that<br>echo.|
|Cadence|Number of accepted player actions needed to complete a batch.<br>Smaller B means more frequent echo actions.|
|Favour|Temporary state that can reduce batch size and enable an<br>archetype-specific bonus.|
|Cooldown|Recovery interval after favour or a powerful ability; may slow cadence<br>or restrict specialty use.|
|Hop|Bounded temporary displacement to a legal target tile, execution of<br>an allowed effect, then return/resumption under explicit rules.|
|World state W|Dynamic level data: actors, doors, plates, blocks, hazards,<br>collectibles, timers, exit state and hostile agents.|
|Simulation tick|Deterministic update unit. Puzzle state must not depend on<br>rendering frame rate.|
|Luck Meter L|Value in [0,100] charged by defined events and used to enable favour<br>or optional events.|



### **2.1 Coordinates** 

Each tile is integer (x,y). UP=(0,-1), RIGHT=(1,0), DOWN=(0,1), LEFT=(-1,0). A move is legal only when the destination is in bounds and passable for that actor under current world state. Every timer declares its unit: player actions, simulation ticks, or seconds. 

AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

## **3. Core echo algorithm: first direction per batch** 

### **3.1 The defining mechanic** 

The preferred design is not a conventional delayed movement queue. The player’s accepted movements are grouped into batches. At each completed batch, an echo attempts only the first direction from that batch. It does not replay the entire sequence. 

|**Player move index**|**Input**|**Echo result**|
|---|---|---|
|1|UP|Waiting|
|2|RIGHT|Waiting|
|3|DOWN|Waiting|
|4|LEFT|Attempts UP|
|5|RIGHT|Waiting|
|6|RIGHT|Waiting|
|7|DOWN|Waiting|
|8|UP|Attempts RIGHT|



For B=4, actions 1–4 produce one echo attempt using action 1; actions 5–8 produce one attempt using action 5. This creates a compressed movement instruction stream. The echo’s position and the current world determine whether the selected move succeeds. 

### **3.2 Formal algorithm** 

on_player_action(direction): if not legal_player_move(direction): emit_blocked_feedback() return 

move_player(direction) append H, direction 

for each active echo E in stable_id_order: append direction to E.current_batch E.batch_counter += 1 

if E.batch_counter >= E.active_batch_size: selected = E.current_batch[0] attempt_echo_move(E, selected) clear E.current_batch E.batch_counter = 0 

resolve_world_after_actions() 

### **3.3 Cadence boundary policy** 

- Each echo maintains its own batch buffer and counter. This allows a B=4 Trace and B=2 Flicker to select different actions. 

- Active batch size is sampled at the start of a batch. If Favour begins mid-batch, the current batch completes under the old size; the next batch uses the new size. 

- Invalid player moves do not enter history and do not advance any echo counter. 

- If an echo is removed before its batch completes, its incomplete batch is discarded. 

- The base rule consumes a batch even if the selected echo move is blocked. The echo stays in place and shows the obstruction. 

AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

- An advanced echo may explicitly skip a blocked action or choose a legal alternative, but this is a specialty, not a hidden default. 

### **3.4 Important distinction: discarded directions** 

The three non-selected directions in each batch are not replayed by that echo. This is intentional and defines the compressed-history mechanic. If later testing shows that discarding actions feels arbitrary, test a separate continuousqueue variant; do not silently mix both models in one echo. 

### **3.5 Pseudocode for blocked movement** 

attempt_echo_move(E, direction): target = E.position + delta(direction) if tile_is_legal_for_actor(target, E, world): E.position = target emit(ECHO_MOVED, E.id, direction, target) else: 

emit(ECHO_BLOCKED, E.id, direction, target, blocking_reason) 

consume_current_batch(E) 

## **4. Echo entities and archetypes** 

### **4.1 Data model** 

|**Field**|**Type**|**Purpose**|
|---|---|---|
|id|Unique ID|Stable identity for simulation, saves and<br>logs.|
|archetype|Enum|Trace, Flicker, Mason, Keeper, Oracle,<br>Gambit, hostile type.|
|position|Grid coordinate|Current tile or explicit transit state while<br>hopping.|
|base_batch_size|Integer >= 1|Normal cadence; lower is faster.|
|active_batch_size|Integer >= 1|Current cadence after<br>upgrades/favour/cooldown.|
|current_batch|Direction list|Actions accumulated for the current batch.|
|batch_counter|Integer 0..B-1|Progress toward next echo action.|
|state|Enum|NORMAL, FAVOURED, HOPPING,<br>COOLDOWN, RECOVERING, DISABLED,<br>REMOVED.|
|tier|Integer or named tier|Capability unlocks, not a universal power<br>score.<br>i|
|charges|Non-negative integers|Ability-specific uses.|
|favour_remaining|Timer|Time remaining in favour.|
|cooldown_remaining|Timer|Time remaining in cooldown.|
|hop_origin/target|Coordinates or null|Saved return point and target.|
|hop_remaining<br>l|Timer|Remaining travel/effect time.|
|flags|Set|Permissions, immunities, expiry and level<br>constraints.|



### **4.2 Archetype proposals** 

|**Echo**|**Role**|**Core ability**|**Trade-of**|
|---|---|---|---|
|Trace|Reliable baseline|B=4; activates compatible<br>switches.|Slow but predictable.|
|Flicker|Fast cadence|B=2; handles short windows.|Reduced stability, charges or<br>favour duration.|
|Mason|Construction|Creates temporary block/bridge<br>on a legal tile.|Limited charges, placement<br>rules and expiry.|



AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

|Keeper|Support|Sends a small helper to hold a<br>plate or door.|Helper has range/lifetime limits;<br>cap active helpers.|
|---|---|---|---|
|Oracle|Prediction|Previews a limited number of<br>upcoming deterministic actions.|Information only; no full solution<br>by default.|
|Gambit|Optional luck|May trigger a bounded helpful<br>event.|Never required for a mandatory<br>solution.|
|Blocker|Hostile disruption|Targets a useful junction and<br>places a temporary obstruction.|Telegraphed and obeys<br>placement rules.|
|Saboteur|Mechanism disruption|Targets a switch, door or<br>temporary structure.|Must have legal access and<br>wind-up tell.|
|Pursuer|Movement pressure|Moves toward player by a<br>defined pathfinding rule.|Can be baited, blocked or routed<br>around.|
|Trickster|Limited deception|Uses a readable decoy or<br>bounded rule alteration.|Must have tells; cannot<br>arbitrarily break rules.|



MVP recommendation: Trace, Flicker, Keeper, one Blocker enemy, one plate, one door and one temporary block. Add other archetypes only after the batch mechanic is fun and legible. 

## **5. Favour, Luck Meter and cooldown** 

### **5.1 Luck meter math** 

Luck L is normalized to [0,100]. For a gain ΔL: L_new = min(100, max(0, L_old + ΔL)). Each collectible must have a consumed flag to prevent duplicate charging. Luck gain and coin currency are separate systems. 

|**Event**|**Illustrative ΔL**|**Rule**|
|---|---|---|
|Ordinary coin|+8|Tune against average collectible count.|
|Rare fragment|+20|Optional exploration reward.|
|Level completion|+10|Granted once after validated completion.|
|Activate Favour|−100|Suggested full-meter consumption.|
|Failure/reset|Level-specific|Puzzle attempts reset to level-start state by<br>default.|



### **5.2 Favour behaviour** 

At L=100, the player can activate Favour manually. Suggested test values: 8 seconds of favour and 4 seconds of cooldown. During Favour, the echo’s batch size reduces to min(base_batch_size, favour_batch_size), with favour_batch_size=2 for the baseline design. Favour may also enable one archetype-specific bonus, but cadence and specialty are separate modifiers. 

### **5.3 State transitions** 

|**Current state**|**Trigger**|**Next state**|**Effect**|
|---|---|---|---|
|NORMAL|Player activates at L=100|FAVOURED|Consume meter; apply favour<br>cadence at next batch boundary.|
|FAVOURED|Duration reaches zero|COOLDOWN|Start cooldown; restore or slow<br>cadence per config.|
|COOLDOWN|Cooldown reaches zero|NORMAL|Restore base cadence and<br>ability availability.|
|NORMAL/FAVOURED|Hop begins|HOPPING|Pause or preserve batch state<br>per hop policy.|
|HOPPING|Hop effect/return ends|Prior eligible state|Resume with saved batch state;<br>do not duplicate actions.|



AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

### **5.4 Cadence formulas** 

Let B0 be initial batch size, U the number of cadence upgrades, r the reduction per upgrade, and Bmin the minimum batch size. Normal cadence: Bnormal = max(Bmin, B0 − r·U). Example: B0=4, r=1, Bmin=1 produces B=4,3,2,1. 

Favour cadence: Bfavour = max(Bmin, Bnormal − F), where F is a configured reduction (test F=1 or 2). If Bnormal already equals Bmin, Favour should grant a specialty effect rather than increasing cadence beyond one action per player move. 

Cooldown slowdown option: Bcooldown = min(BmaxCooldown, Bnormal + C), where C is a configured penalty (test C=1 or 2). Example: Bnormal=2 and C=2 yields Bcooldown=4. Use a cap so the echo never becomes functionally irrelevant. Alternative design: cooldown restricts specialty abilities but leaves cadence unchanged; playtest both. 

Approximate action rate relative to accepted player moves is R=1/B, ignoring blocked moves and state transitions. B=4 gives 0.25 echo attempts per player move; B=2 gives 0.5; B=1 gives 1.0. 

### **5.5 Exploit prevention** 

- An echo in COOLDOWN cannot reactivate Favour unless a specific upgrade permits it. 

- Favour does not reset a partially completed batch by default. 

- Repeated collection cannot grant repeated Luck from the same collectible. 

- Do not secretly change echo direction selection under Favour; only cadence and declared abilities change. 

- Removed echoes have no active timers. Disabled echoes follow a single documented pause/end policy. 

- Use per-echo cooldowns for echo abilities and global cooldowns only for player-level abilities. 

## **6. Hop ability** 

A hop lets a specialist echo temporarily leave its scheduled position, visit a favourable tile, perform a permitted action, then return or resume its schedule under a defined policy. It is bounded teleportation, not unrestricted relocation. 

### **6.1 Validity formula** 

can_hop(E, target): 

return E.has_hop and E.state not in {HOPPING, COOLDOWN, DISABLED, REMOVED} and manhattan(E.position, target) <= E.hop_range and in_bounds(target) 

and tile_is_legal_for_actor(target, E, world) 

and target not occupied by a blocking actor and target not forbidden by level rules and E.hop_charges > 0 

Manhattan distance: d((x1,y1),(x2,y2)) = |x1−x2| + |y1−y2|. Unless an archetype explicitly supports diagonal hopping, diagonals do not count as one tile. 

### **6.2 Hop lifecycle** 

1. Validate target, range, occupancy, permission and charge. 

2. Store hop origin, target, current batch buffer/counter and prior state. 

3. Enter HOPPING and show target, range and trajectory. 

4. On arrival, execute only the configured effect: activate plate, create block, remove eligible barrier or hold door. 

5. Run effect for configured duration or charge count. 

6. Return to origin if it remains legal. If origin is occupied or blocked, default to remaining at target with a clear warning; an alternate deterministic fallback may be configured. 

7. Resume batch processing without duplicating or deleting movement history. The hop action is consumed only under its declared trigger policy. 

AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

### **6.3 Hop edge cases** 

- A hop cannot activate through walls unless the ability explicitly says so. 

- Invalid target: no hop starts and charge is refunded under the default rule. 

- If target becomes invalid before arrival, cancel visibly and refund if no effect occurred. 

- Temporary objects created by the hop have owner, expiry and collision permissions. 

- A hop cannot bypass one-way, phase or actor-specific rules without explicit permission. 

- Return policy and whether the echo can be attacked/blocked during a hop must be configured per archetype. 

## **7. Plates, doors, blocks and tiles** 

|**Object**|**Rule**|**Interactions**|**Puzzle use**|
|---|---|---|---|
|Pressure plate|Active while at least one<br>accepted occupant is on it.|Accepted types: player, echo,<br>helper, block, hostile;<br>configurable.|Hold door/bridge.|
|Toggle plate|Flips state on a valid activation<br>edge.|One event per entry/activation,<br>not every tick while occupied.|Persistent route change; can<br>undo progress.|
|Timed plate|Activates an effect for duration<br>D.|Repeat policy: refresh, add time<br>up to cap, or ignore.|Timed traversal windows.|
|Inversion plate|Changes a named local rule or<br>paired mechanism.|No hidden global state changes.|Switch solidity/passability by<br>actor type.|
|Door|OPEN/CLOSED, optional timer.|Default: do not close while<br>occupied; delay until clear.|Route and timing control.|
|Push block|Occupies a tile; player pushes<br>but cannot pull by default.|Push is atomic; fails if<br>destination blocked.|Hold plates, block enemies, trap<br>routes.|
|Temporary echo block|Created by echo for duration D.|Owner, expiry, collision mask<br>and placement validation.|Bridge or barricade.|
|Corruption block|Hostile-created obstruction.|Removed only by permitted<br>abilities or expiry.|Enemy route disruption.<br>f|
|Phase tile|Passability varies by actor type<br>or switch state.|Use explicit passability matrix.<br>i|Player and echo use different<br>routes.|
|Exit|LOCKED/READY/COMPLETE.|Checks mode-specific win<br>conditions.|Level completion.|



### **7.1 Plate logic** 

PRESSURE: 

active = any(alive actor on tile AND plate accepts actor type) plate.state = ACTIVE if active else INACTIVE 

update_linked_mechanisms(plate.state) 

##### TOGGLE: 

if valid_activation_edge: plate.state = not plate.state 

##### TIMED: 

if valid_activation_edge: 

plate.remaining = apply_refresh_policy( plate.remaining, duration, max_duration ) 

### **7.2 Block placement validation** 

Before placement, validate board bounds, tile type, actor occupancy, other blocks, exit, required mechanisms, protected spawn tiles and level-specific restrictions. If invalid, show a failure reason and do not consume a charge by default. Hostile entities use the same legality checks. 

AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

### **7.3 Collision matrix** 

|**Pair**|**Default interaction**|**Configurable exceptions**|
|---|---|---|
|Player vs wall/block|Movement blocked.|Phase or push abilities.|
|Echo vs wall/block|Movement blocked.|Phase/hop/special recovery.|
|Player vs echo|May overlap.|Some levels can make echoes blocking.|
|Echo vs echo|May overlap; separate state.|Some puzzle types make them block each<br>other.|
|Actor vs plate|Triggers only if accepted.|Per-plate accepted-actor mask.|
|Hostile vs player/echo|Block, damage or disrupt per enemy.|Per-enemy rule.|
|Block vs plate|Activates only if accepted.|Per-plate mask.|
|Block vs door/exit|Cannot occupy forbidden tiles.|Explicit puzzle-specific rules only.|



## **8. Helpful echoes and autonomous helpers** 

A helper spawn must define trigger, target policy, lifetime, movement cadence, allowed interactions and expiry behaviour. It should be autonomous but legible: the player can see what it is trying to do and why it failed. 

spawn_helper(owner, config): candidates = legal_targets(config.target_policy) target = choose_target(candidates) if target is NONE: emit(NO_VALID_TARGET) return 

create_helper(owner_id=owner.id, 

target=target, lifetime=config.lifetime, range=config.range, interaction=config.interaction, state=SEEKING_TARGET) 

Recommended target ranking: (1) player-marked target, (2) objective relevance score, (3) shortest legal path, (4) stable coordinate tie-break. Do not choose an unreachable target if a valid reachable one exists. 

|**Helper state**|**Behaviour**|**Exit condition**|
|---|---|---|
|SPAWNING|Play spawn cue and register entity.|Spawn completes.|
|SEEKING_TARGET|Move toward target on a legal path.|Target reached, invalidated or lifetime<br>expires.<br>f|
|PERFORMING|Hold plate/door, build support or perform<br>configured action.|Effect duration/charge ends.|
|RETURNING|Optional return to owner/origin.|Return succeeds or fallback triggers.|
|EXPIRED|Clean up owned temporary effects and<br>remove entity.|Terminal state.|



A limited arrival window is measured in declared ticks or seconds. If the helper cannot reach the target in time, it expires or returns according to its archetype. Random helper spawns must be optional bonuses, never a requirement for maincampaign solvability. 

## **9. Hostile echo AI** 

### **9.1 Finite-state machine approach** 

|**Enemy**|**States**|**Behaviour**|
|---|---|---|
|Blocker|PATROL → SELECT_JUNCTION → TELEGRAPH|Select a legal junction that disrupts a known|
||→ PLACE_BLOCK → RECOVER|route; telegraph before placing.|
||AFTERMOTION · MECHANICS SPECIFICATION · V|0.1|



|Saboteur|PATROL → SELECT_MECHANISM →<br>TELEGRAPH → DISRUPT → RECOVER|Target a reachable mechanism affecting<br>current objective.|
|---|---|---|
|Pursuer|SEARCH → CHASE → REPATH → RECOVER|Move toward player by shortest legal path<br>with deterministic tie-break.|
|Trickster|IDLE → TELEGRAPH → DECOY/ALTER →<br>EXPOSED → RECOVER|Use bounded deception with a recognisable<br>tell.|



### **9.2 Blocker scoring** 

For each candidate legal tile t, calculate: Score(t) = w1·RouteCut(t) + w2·MechanismImpact(t) + 

w3·PlayerEchoSeparation(t) − w4·DistanceCost(t) − w5·SelfTrapRisk(t). Normalize feature values to [0,1]. Reject illegal tiles before scoring. Choose highest score and break ties by fixed (y,x) order. Weights are tunable parameters. 

The enemy uses current map topology and known objectives, not hidden future player inputs. It must not place blocks on actors, exit, protected spawn tiles, required mechanisms or any forbidden tile. 

### **9.3 Fairness constraints** 

- Telegraph hostile actions with target tile, effect and time to resolution. 

- If the target becomes invalid before resolution, recalculate once deterministically or cancel visibly. 

- Use the same pathfinding/passability rules for AI and player/echo movement. 

- Do not create unavoidable softlocks except in explicitly advertised high-risk challenge levels. 

- Enemy speed or intelligence must not increase without a readable change in behaviour. 

## **10. Time model** 

### **10.1 Separate clocks** 

Use a fixed simulation tick for game-state updates. Never decrement timers once per rendered frame. Real-time countdowns feed events into the simulation through one central timer service. Suggested initial real-time simulation rate: 10 ticks/second, subject to testing. 

|**Timer**|**Unit**|**At zero**|
|---|---|---|
|Level timer|Seconds in timed mode|Failure/restart or reduced score per mode.|
|Favour|Seconds or ticks|Transition to cooldown.|
|Cooldown|Seconds or ticks|Return to normal.|
|Timed plate/door|Seconds or ticks|Deactivate/close using occupancy-safe rule.|
|Helper arrival window|Seconds or ticks|Cancel/expire helper.|
|Helper effect|Seconds or ticks|Release plate/door or remove owned effect.|
|Temporary block|Seconds or ticks|Remove safely; never embed actor in solid<br>tile.|
|Enemy telegraph<br>f|Seconds or ticks|Resolve announced action if still legal.<br>f|
|Hop travel/effect|Seconds or ticks|Resolve arrival, effect and return.|



### **10.2 Time-pressure policy** 

- Show the global timer and each local opportunity timer. 

- Teach each timer type safely before combining it with hostile AI. 

- Campaign mode should use generous or optional timers; strict limits belong in challenge levels until playtesting proves otherwise. 

- Single-player pause pauses timers unless a clearly labelled challenge mode explicitly says otherwise. 

- Use novice and skilled playtest completion times to set limits; do not pick limits by intuition alone. 

- Failure feedback must state whether the cause was timer expiry, player capture, required echo loss or an unsatisfied mechanism. 

AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

First-pass tuning: record median novice completion T50 and a skilled-player percentile such as T90. Select T_limit based on the intended experience, then test. A limit near expert time creates execution pressure; a limit near novice median risks frustration. 

## **11. Fortune, rewards and probability** 

|**Resource**|**Purpose**|**Acquisition**|**Constraint**|
|---|---|---|---|
|Memory Coins/Shards|Cosmetics and selected<br>upgrades.|Level completion, optional coins<br>and exploration.|No repetitive grind required for<br>campaign access.|
|Temporal Fragments|Rare unlocks and capability<br>options.|Secrets and chapter challenges.|Avoid mandatory power gates.|
|Luck Meter|Temporary probability modifier /<br>Favour activation.|Coins and defined events.|Never required for mandatory<br>solutions.|
|Mastery Marks|Skill recognition.|Safe, efficient, hint-free or<br>challenge-specific play.|Multiple mastery paths should<br>be viable.|
|Collection records|Persistent<br>discovery/achievement.|Hidden routes, echo collection,<br>special interactions.|No pay-to-win assumptions.|



### **11.1 Probability function** 

For an optional event with base probability p0 and Luck L∈[0,100], use p(L)=min(pmax, p0 + k·L/100), where k is the maximum additive increase and pmax is a hard cap. Example: p0=0.10, k=0.15, pmax=0.30 gives 10% at L=0 and 25% at L=100. These are illustrative tuning values. 

- Use a seeded random number generator and log rolls for reproducibility. 

- Only eligible optional events can be influenced by luck; never alter collision checks, mandatory switches or required echo direction selection. 

- Show which events Luck affects. 

- Define whether collecting a coin spawns a helper immediately or only increases the chance of a later event. 

- Prevent collectible farming with unique consumed flags and explicit reset policy. 

## **12. Oracle: bounded future preview** 

Oracle reveals a few upcoming deterministic consequences without providing the entire solution. Suggested depth is 3–4 relevant actions/steps. Upgrades may extend depth or reveal more actors. 

8. Clone current world state, actor states, echo buffers, timers and RNG state into a temporary snapshot. 

9. Apply a proposed input sequence or current queued inputs to the snapshot. 

10. Run the same state-transition function as the live simulation for N steps. 

11. Collect predicted positions, blocked moves, plate/door states, timer expirations and win/failure flags. 

12. Render certain outcomes differently from uncertain/random outcomes. 

13. Discard snapshot without mutating live state, awarding rewards or consuming live RNG. 

The prediction and live engine must share the same transition code. A separate prediction implementation will drift. If future randomness cannot be known, display possible outcomes/probabilities rather than a false certainty. 

## **13. Win, failure, reset and softlocks** 

check_complete(level, state): 

if level.mode == ESCAPE_TOGETHER: return player_at_exit and all(required_echoes_at_exit) and all(required_objectives_complete) 

AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

if level.mode == ESCAPE_THROUGH_ECHO: 

return player_at_exit 

and all(required_mechanisms_satisfied) and all(required_objectives_complete) 

return evaluate_level_specific_conditions() 

- Failure conditions are declared per mode: timer reaches zero, player captured/destroyed, required echo lost, or objective becomes impossible. 

- Provide undo and restart. Do not claim general solvability detection unless implemented. 

- For small finite puzzle levels, optional softlock detection can use breadth-first search over a state tuple containing player position, echo positions/buffers, object positions, switch states, enemy state and relevant resources/timers. 

- The search is sound only when randomness and time are discretized and every legal transition is represented. 

- Restart clears attempt-local state and restores the level’s initial state/seed; persistent unlocks remain. 

## **14. Deterministic resolution order** 

Every simulation tick must resolve in the same order. Stable ordering and atomic operations are part of the game rules. 

14. Accept and validate player input. Invalid input emits feedback but does not enter history. 

15. Apply player movement; append direction to history and applicable echo buffers. 

16. Advance echo batch counters; resolve due echo actions in stable echo ID order. 

17. Resolve hop arrivals and valid on-arrival effects. 

18. Resolve helper movement and helper interactions. 

19. Resolve collisions and push operations atomically. 

20. Recompute pressure plates and linked mechanism states. 

21. Resolve timed plate/door expirations with occupancy-safe rules. 

22. Resolve hostile actions whose telegraphs expired; newly scheduled actions do not resolve immediately unless specified. 

23. Resolve temporary object expiry and cleanup. 

24. Update Favour, cooldown, ability and Luck timers according to the chosen timing model. 

25. Evaluate damage, echo loss, softlock flags, failure and completion. 

26. Commit state and emit UI/debug events. 

### **14.1 Atomicity rules** 

- Push succeeds entirely or not at all. 

- Block placement validates before mutating world state. 

- Plate state is recomputed after position-changing actions in the declared phase. 

- An expiring block cannot vanish while an actor is embedded in its solid tile; delay expiry, relocate deterministically or cancel according to object policy. 

- Exit checks happen after mechanisms have resolved. 

## **15. Upgrade and balance mathematics** 

### **15.1 Cadence upgrade** 

Bnormal = max(Bmin, B0 − rU). B0 is base batch size, U is cadence upgrade level, r is integer reduction per upgrade, and Bmin is minimum batch size. Example: B0=4, r=1, Bmin=1 yields 4→3→2→1. 

AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

### **15.2 Favour cadence** 

Bfavour = max(Bmin, Bnormal − F), where F is configured favour reduction. Test F=1 or F=2. If Bnormal=Bmin, favour must provide a specialty effect instead of exceeding one action per accepted player move. 

### **15.3 Cooldown slowdown** 

Option A: Bcooldown = min(BmaxCooldown, Bnormal + C), where C is a configured penalty (test 1 or 2) and BmaxCooldown is a cap. Example Bnormal=2, C=2 gives Bcooldown=4. Option B: cadence stays unchanged but special abilities are locked. Prototype both; choose the one players understand and enjoy. 

### **15.4 Timer tuning** 

For every timed level, measure completion time, resets, undo use and failure causes. Set time limits from observed distributions. Campaign levels should reward planning; challenge levels can test fast execution. Do not use the same time target for all skill levels without evidence. 

### **15.5 Enemy tile score** 

Score(t)=w_route·RouteCut(t)+w_mech·MechanismImpact(t)+w_sep·PlayerEchoSeparation(t)−w_dist·DistanceCost(t) −w_risk·SelfTrapRisk(t). Normalize each feature to [0,1], reject illegal tiles first, select maximum score, break ties by fixed (y,x) order. Tune weights using playtests. 

## **16. Level progression and teaching sequence** 

|**Stage**|**Introduce**|**Learning objective**|**Avoid initially combining with**|
|---|---|---|---|
|1|Movement, exit, reset|Basic movement and objective.|Timers, enemies, multiple<br>echoes.|
|2|Trace and batch display|Understand first direction per<br>batch.|Random interventions.|
|3|Pressure plate and door|Echo changes world state.|Multiple plate modes.|
|4|Push block|Objects can help or trap.|Hostile placement.|
|5|Favour and cooldown|Temporary power creates<br>recovery cost.|Hard timer.|
|6|Helper arrival window|Autonomous echo has target<br>and expiry.|Multiple hostile types.|
|7|Telegraphed Blocker|Enemy disrupts a route fairly.|Trickster deception.|
|8|Bounded hop|Temporary displacement with<br>limits.|Multiple hop targets.|
|9+|Combination levels|Plan across known systems.|Untaught rules.|



Each new rule should first appear in a low-risk room. Then combine it with known rules. Every puzzle must have at least one tested valid solution and should be checked for accidental trivial solutions, softlocks and unclear feedback. 

## **17. UI and feedback requirements** 

- Show each echo’s archetype, base/active batch size, current batch head, state, cooldown, Favour duration and charges. 

- Mark the batch boundary/progress so the player can predict when the echo acts. 

- When an echo is blocked, show the direction and obstruction reason. 

- For hops, show origin, target, range, legality, arrival time, effect duration and return policy. 

- Show expiry indicators on temporary blocks, doors, plates and helper effects. 

- Telegraph hostile target, effect and time to resolution. 

- Show Luck value, eligible effects and whether Favour can be activated. 

- Oracle distinguishes certain predictions from probabilistic outcomes. 

AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

- Never communicate critical state using colour alone; pair colour with shape, icon, animation or label. 

## **18. Persistence and reset** 

|**Data**|**On attempt reset**|**Across campaign**|
|---|---|---|
|Player/echo positions<br>f|Reset to level start.|Not retained as active positions.|
|Movement history and batch buffers|Clear.|Not retained.|
|Temporary blocks/helpers/hostile telegraphs|Clear.|Not retained.|
|Timers, Favour, cooldown|Reset to level-defined initial state.|Not retained unless a mode explicitly says<br>so.|
|Coins in current attempt|Follow declared checkpoint policy; default<br>reset until completion.|Earned currency persists after confirmed<br>completion.|
|Echo unlocks/upgrades/cosmetics|Preserve.|Persist.|
|Mastery/fragments|Preserve only when validated.|Persist.|
|Random seed|Reuse for deterministic retry in same<br>attempt/level.|Persist per challenge when needed.|



## **19. Acceptance tests** 

|**Test**<br>Batch 1|**Expected result**<br>B=4, inputs [UP,RIGHT,DOWN,LEFT] => echo attempts UP exactly<br>once after action 4.|
|---|---|
|Batch 2|Next inputs [RIGHT,RIGHT,DOWN,UP] => echo attempts RIGHT after<br>action 8.|
|Invalid player move|Wall-blocked input does not append history or advance batch<br>counters.|
|Blocked echo<br>f|Echo remains in place, consumes batch and emits a blocked event.<br>f|
|Different cadence|B=4 Trace and B=2 Flicker maintain separate buffers and boundaries.|
|Favour activation|At L=100, activating consumes configured meter exactly once and<br>enters FAVOURED.|
|Favour boundary|Mid-batch activation does not change the current batch size; next<br>batch uses favour cadence.<br>i|
|Cooldown|Favour expiry enters COOLDOWN for the configured duration and<br>restores normal state afterward.|
|No repeated activation|Echo cannot re-favour during cooldown unless explicitly upgraded.|
|Hop invalid target|Out-of-range/occupied/forbidden target does not start hop or<br>consume charge by default.|
|Hop return|Echo returns to legal origin or follows documented fallback without<br>duplicating/deleting history.|
|Pressure plate|Active only while an accepted occupant is on it.|
|Toggle plate|Flips once per activation edge, not every tick.|
|Door expiry|Door does not close through an occupant under default policy.|
|Temporary block expiry|Expiry never embeds an actor in a solid tile.|
|Helper timeout|Helper expires with feedback if it misses arrival deadline.|
|Hostile placement|Blocker never places on protected or illegal tiles.|
|Oracle parity|Predicted deterministic results match live simulation for same<br>state/input.|
|RNG isolation|Oracle preview does not mutate live random generator state.|
|Timer determinism|Timer result is independent of rendering frame rate.|
|Reset|Attempt-local state resets; persistent unlocks remain.|
|Win conditions|Escape Together requires all designated actors; Escape Through<br>Echo checks player exit plus required mechanisms.|



AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

## **20. Technical architecture** 

|**Module**|**Responsibility**|
|---|---|
|GameState|Authoritative level state and simulation tick.<br>f|
|InputRecorder|Valid player input, history and per-echo batch buffers.|
|EchoController|Cadence, archetype abilities, state transitions and lifecycle.|
|WorldRules|Passability, collision matrix, plates, doors, blocks and tiles.|
|AbilitySystem|Favour, hop, construction, disruption, helper spawn and charges.|
|AgentAI|Deterministic hostile finite-state machines and target scoring.|
|TimerService|Fixed-tick timers and real-time conversion.|
|PredictionService|Snapshot simulation for Oracle using shared transition code.|
|RewardService|Coins, Fortune, fragments, mastery, unlocks and idempotent<br>payouts.|
|LevelValidator|Level data, protected tiles, win/failure conditions and optional<br>reachability checks.|
|EventLog|Reproducible events for debugging, replay and balance telemetry.|



Gameplay logic must not live inside UI components. UI reads state and sends commands; simulation validates and applies commands. Keep level parameters data-driven so designers can tune cadence, timers, ranges, cooldowns and interactions without rewriting core logic. 

## **21. Telemetry and balancing** 

- Record starts, completions, failures, completion time, accepted/invalid moves, echo actions, blocked actions, hops, Favour activations, cooldown time, helper expirations, hostile disruptions, undo count and hint use. 

- Track repeated blocked actions and rapid resets as possible signs that cadence is unclear. 

- Track echo pick rates and level success by archetype; if one dominates, adjust trade-offs or level design. 

- Track optional collectible time cost so rewards do not require tedious detours. 

- Record enough state and input history to reproduce deterministic failures. 

## **22. Open decisions before production** 

|**Decision**|**Current default**<br>f|**Reason to validate**|
|---|---|---|
|Batch scope|Independent per-echo buffers.|Shared batches are simpler but reduce<br>distinct cadence behaviour.|
|Cadence change|Apply at next batch boundary.|Avoid mid-batch ambiguity.|
|Blocked echo move|Consume batch and remain in place.|Recovery behaviours are explicit exceptions.|
|Time model|Fixed simulation; optional real-time<br>challenge.|Strict real-time may undermine deliberate<br>reasoning.|
|Cooldown|Cadence penalty or specialty lock.|Playtest legibility and fun.|
|Favour trigger|Manual activation at full meter.|Avoid automatic waste.|
|Hop return failure|Remain at target with warning if origin<br>invalid.|Alternative deterministic fallback can be<br>tested.|
|Luck|Optional outcomes only.|Mandatory solutions must not rely on RNG.|
|Echo loss|Mode-specific.|Escape Together and Escape Through Echo<br>have different stakes.|
|Level timer|Generous/optional in campaign; strict in<br>challenges.|Avoid turning every puzzle into a reflex test.|



## **23. MVP implementation order** 

27. Grid, player movement, exit, reset and deterministic event log. 

AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

28. Movement history and first-direction-per-batch mechanic with B=4. 

29. Per-echo batch buffers; compare B=4 Trace with B=2 Flicker. 

30. One pressure plate, one door, one push block and one temporary block. 

31. Favour, cadence reduction, cooldown and readable HUD states. 

32. One bounded hop ability with validation and return behaviour. 

33. One Keeper helper and one telegraphed Blocker enemy. 

34. Optional timed challenge mode. 

35. Oracle preview using the shared deterministic simulation. 

36. Build and test 8–10 handcrafted levels before expanding archetypes, luck events or collection systems. 

## **24. Final implementation rule** 

Every interaction must be derivable from the documented state and resolution order. If an outcome cannot be predicted by a player who understands the rules, it must be clearly telegraphed as uncertain or redesigned. Aftermotion’s complexity should come from anticipating interactions among rules, not hidden exceptions. 

AFTERMOTION · MECHANICS SPECIFICATION · V0.1 

