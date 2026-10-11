---
id: ballistics-deep
phase: 2
num: 26
title: Ballistics deep dive: drop, wind, angles, energy
minutes: 25
checked: 2026-10-11
---
> [!why]
> Every miss and every wounded deer past 200 m has a number behind it. Learn the numbers and you know when to shoot and when to close the gap.

```anim ff-bl-arc The bullet crosses your line of sight twice, then falls.
```

- The scope looks straight. The bullet arcs (85%).
- 100 m zero: 13 cm low at 200 m, 48 cm at 300 m (75%).

```more what this deep dive adds
- The basics are in [.308 ballistics made simple](#/s/ballistics-308/0): Federal's tables, MPBR (maximum point blank range), the 20 inch barrel and the 1,000 ft lb rule. Read it first.
- This lesson adds: why the bullet crosses the crosshair twice, holds in MOA (minute of angle) and mils, the wind clock, uphill and downhill shots, time of flight, cold and altitude, and building your own dope card.
- Numbers marked "Hunt Mentor model" come from a point mass ballistic solver (py ballisticcalc 3.0, G1 drag model) fed with Federal's published data. It matches Federal's drop table within 1 cm at 300 yd (91 m to 274 m) and its wind drift within about 10% (75%). The wind tables below use the [simple session's](#/s/ballistics-308/0) Federal based numbers.
- Assumption: Federal Power Shok 150 gr (grain), 2,820 fps (feet per second), BC (ballistic coefficient) .313; scope 3.8 cm (1.5 in) above the bore, as Federal assumes.
```

## Three kinds of ballistics

```diagram ff-bl-three
```

- Internal: in the barrel. External: in the air. Terminal: in the animal (85%).
- You control external by knowing range, wind and angle.

```more the three in full
- **Internal ballistics:** pressure, the bullet engraving into the rifling, the twist. Covered in [how a rifle works](#/s/rifle-mechanics/0) and [how a cartridge works](#/s/cartridge-anatomy/0).
- **External ballistics:** gravity, air drag, wind, angle, temperature and altitude. This lesson.
- **Terminal ballistics:** what the bullet does in the animal: expansion, penetration. See the cartridge lesson and [shot placement](#/s/shot-placement/0).
- The hunter controls external ballistics mostly with three numbers: distance, wind and angle (Tip).
```

## Why it crosses twice

```anim ff-bl-arc Below, up through the line, back down at the zero.
```

- The bore points slightly up at the line of sight (85%).
- 100 m zero: first crossing near 25 m, peak about 1 cm high (75%).

```more the arc in full
- The scope sits above the bore, about 3.8 cm. To hit where the crosshair points at 100 m, the bore must tilt slightly upward (85%).
- So the bullet starts 3.8 cm below the line of sight, climbs through it, peaks, and falls back through it at your zero (85%).
- 100 m zero, Hunt Mentor model: crosses near 25 m, about 1 cm high at 60 to 75 m, 0 at 100 m (75%).
- That is why a 25 m target is a quick check for a 100 m zero: the bullet should hit near the aim point at 25 m (70%). Your [sighting in](#/s/sighting-in/0) session uses this.
- Gravity starts pulling the instant the bullet leaves. It never "rises" against gravity; the barrel was simply pointed up (85%).
```

## The full drop table, 100 m zero

```diagram ff-bl-drop-curve
```

- 150 m: 4 cm. 200 m: 13 cm. 250 m: 28 cm. 300 m: 48 cm (75%).
- Past 300 m the curve gets steep fast (75%).

```more the table in full
Drop below the crosshair in cm, 100 m zero, Hunt Mentor model (75%).

| Distance | 150 gr box speed | 150 gr, 20 in barrel | 165 gr Fusion |
|---|---|---|---|
| 150 m (164 yd) | 4 | 5 | 4 |
| 200 m (219 yd) | 13 | 14 | 13 |
| 250 m (273 yd) | 28 | 30 | 28 |
| 300 m (328 yd) | 48 | 52 | 47 |
| 350 m (383 yd) | 76 | 82 | 73 |
| 400 m (437 yd) | 112 | 121 | 106 |

- Cross check: Federal's own 100 yd zero table gives 3.9 in (9.9 cm) low at 200 yd and 14.7 in (37.3 cm) at 300 yd. The model gives 10.1 cm and 37.7 cm at those yard distances (85% for Federal, 75% for the model).
- The 20 inch barrel column assumes 2,730 fps, about 90 fps slower than the box, from the barrel test in the simple session (65%).
- 350 m and 400 m are here to show how fast the curve bends. They are not shots for this season (opinion).
```

## Holds: cm, MOA, mils, clicks

```diagram ff-bl-moa-mil
```

- 1 MOA is 2.9 cm at 100 m. 1 mil is 10 cm at 100 m (85%).
- 250 m on a 100 m zero: about 4 MOA or 1.1 mil up (75%).

```more holds in full
- MOA (minute of angle) "will always subtend 1.05 inches for each 100 yards", which is 2.9 cm at 100 m (85%, Vortex optics guide).
- A mil (milliradian) subtends 3.6 in per 100 yd, which is 10 cm at 100 m (85%, Vortex).
- Most hunting scopes click 1/4 MOA (about 0.73 cm at 100 m) or 0.1 mil (1 cm at 100 m) (85%, Vortex).

| Distance | Drop | MOA | Mil | 1/4 MOA clicks |
|---|---|---|---|---|
| 150 m | 4 cm | 1.0 | 0.3 | 4 |
| 200 m | 13 cm | 2.3 | 0.7 | 9 |
| 250 m | 28 cm | 3.8 | 1.1 | 15 |
| 300 m | 48 cm | 5.5 | 1.6 | 22 |

- Computed by Hunt Mentor from the model drops (75%).
- Hold or dial? A beginner with a capped turret should hold, not dial, and should stay inside his tested range (opinion). Hash marks on a second focal plane scope are only true at one power (70%, scope session).
```

## The wind clock

```diagram ff-bl-wind-clock
```

- Wind from 3 or 9 o'clock: full value (85%).
- From 1, 2, 4, 5, 7, 8, 10, 11: about 70% (85%).
- From 12 or 6: ignore at hunting range (Tip).

```more the wind clock in full
- Picture a clock on the ground, target at 12. Wind straight across, from 3 or 9, pushes hardest (85%).
- Wind at 45 degrees: about 70% of the full value table (85%, from the simple session; the sine of 45 degrees is 0.71).
- Wind from 1 or 11, 5 or 7 (30 degrees off the line): about half (85%, sine of 30 degrees is 0.5).
- Head or tail wind: changes drop very slightly. Ignore inside 300 m (Tip).
- Wind is measured over the full slope distance, not the flat distance (70%, NSSF, Ryan Cleckner).
- Wind at your position, halfway, and at the deer can differ. Watch grass and leaves near the deer (Tip).
```

## Wind drift table

```anim sk-wind-drift A 20 km/h crosswind pushes the bullet off the vitals.
```

- 10 km/h at 250 m: 13 cm. 20 km/h: 27 cm (75%).
- Double the distance: about 4 times the drift (75%).

```more drift in cm, 150 gr, full value crosswind
| Distance | 10 km/h | 20 km/h | 30 km/h |
|---|---|---|---|
| 100 m | 2 | 4 | 6 |
| 150 m | 5 | 9 | 14 |
| 200 m | 8 | 17 | 25 |
| 250 m | 13 | 27 | 40 |
| 300 m | 20 | 40 | 60 |

- 10 and 20 km/h columns: from the [simple session](#/s/ballistics-308/0), scaled from Federal's 10 mph data (75%).
- 30 km/h: 1.5 times the 20 km/h column, because drift grows in a straight line with wind speed (75%).
- 165 gr Fusion drifts about 30% less (75%).
- A deer's vital zone is about 20 to 25 cm across (70%). So at 250 m a 20 km/h crosswind you ignore puts you out of the vitals.
```

## Read wind speed

```diagram ff-bl-wind-cues
```

- 10 km/h: felt on the face, leaves rustle (65%).
- 20 km/h: small branches move, dust lifts (65%).

```more wind cues in full
- Cues based on the Beaufort wind scale, from memory (65%).
- A cheap wind meter teaches your face and eyes what 10 and 20 km/h feel like. Carry one for a season, then you rarely need it (Tip).
- Wind in timber is weaker and swirlier than wind on an open slope (Tip). The [wind and thermals](#/s/wind-thermals/0) lesson covers swirls.

> [!lean]
> No shot past 200 m in a 20 km/h crosswind this season. In real wind, get closer or let it walk.
```

## Uphill and downhill

```anim ff-bl-angle Gravity only works over the flat distance.
```

- Hold for the flat distance, not the slope distance (75%).
- Up or down hill, uncorrected shots hit high (75%).

```more the rifleman's rule in full
- "Only the horizontal range should be considered when adjusting a sight or performing hold over to account for bullet drop" (75%, rifleman's rule).
- Formula: flat distance = slope distance × cosine of the angle (75%, NSSF).
- Up or down, the bullet tends to hit high if you hold for the slope distance (75%, NSSF).
- The rule is an approximation. It works well at hunting ranges and moderate angles (70%).
- Natural slopes rarely exceed about 30 degrees, except near cliffs (70%, NSSF).
- Many laser rangefinders give the flat distance for you (for example, a "horizontal component distance" mode) (65%). See [judging distance](#/s/judging-distance/0).
```

## Angles, by the numbers

```diagram ff-bl-cosine
```

- Under 10 degrees: ignore it (75%).
- 30 degrees: the slope distance is 13% too long (95%, math).

```more a worked example
- Deer 250 m away, 30 degrees uphill, from a Heffley Creek style side hill (Assumption: an example, not a real spot).
- Flat distance: 250 × 0.866 = 217 m (95%, arithmetic).
- Drop at 217 m: about 17 cm. Drop at 250 m: about 28 cm (75%, Hunt Mentor model).
- Hold for 250 and you hit about 10 to 11 cm high. Enough to clip the spine or miss over the back of the vitals (70%).
- At 150 m and 30 degrees: flat 130 m, drop 2 cm instead of 4. It does not matter at that range (75%).

| Angle | Cosine | 250 m becomes |
|---|---|---|
| 10° | 0.985 | 246 m |
| 20° | 0.94 | 235 m |
| 30° | 0.866 | 217 m |
| 45° | 0.707 | 177 m |

- Cosines: math (95%). NSSF table: 5° 0.999, 10° 0.984, 30° 0.866, 45° 0.707 (75%).
```

## Angled shot, step by step

```steps An angled shot in 4 steps
anim:ff-bl-angle | Range it. Note the angle.
ff-bl-cosine | Use the flat distance, or the rangefinder's angle mode.
ff-bl-dope | Read your card for that flat distance.
sk-pos-2 | Get steady. Hold, squeeze, follow through.
```

- Steep and far? Close the distance instead (Tip).

## Energy and speed downrange

```diagram ff-bl-energy
```

- 300 m: 1,700 J (1,250 ft lb) for 150 gr (75%).
- Placement beats energy every time (70%).

```more energy and speed in full
| Distance | Speed 150 gr | Energy 150 gr | Energy 165 gr |
|---|---|---|---|
| 100 m | 762 m/s | 2,840 J | 3,060 J |
| 200 m | 671 m/s | 2,210 J | 2,570 J |
| 300 m | 587 m/s | 1,700 J | 2,140 J |
| 400 m | 510 m/s | 1,260 J | 1,750 J |

- 100 to 300 m from the simple session (75%). 400 m and speeds: Hunt Mentor model (75%).
- The 1,000 ft lb (1,356 J) "rule" is a rule of thumb with no clear origin (70%, Richard Mann).
- Bullet speed matters for expansion. Fusion lists 1,900 fps minimum; the 165 gr is above that at 400 yd (85%, simple session).
```

## Time of flight

```diagram ff-bl-tof
```

- 200 m takes about a quarter second (75%).
- Moving deer: wait for it to stop (Tip).

```more time of flight in full
- Hunt Mentor model, 150 gr: 0.12 s to 100 m, 0.26 s to 200 m, 0.42 s to 300 m, 0.61 s to 400 m (75%).
- Assumption: a walking deer moves about 1 m a second. In 0.26 s that is 26 cm, more than the vital zone.
- So a walking deer at 200 m needs either a lead you have never practised or a stop. A soft "bleat" or whistle often stops one (Tip).
- Running deer: no shot for a beginner (opinion).
```

## Cold, altitude and your barrel

```diagram ff-bl-conditions
```

- Thin air at altitude: slightly less drop (75%).
- Cold slows powder: slightly more drop (65%).

```more conditions in full
Drop at 300 m, 100 m zero set at sea level and 15 C (Hunt Mentor model).

| Condition | 250 m | 300 m |
|---|---|---|
| Sea level, 15 C | 28 cm | 48 cm |
| 1,200 m elevation, 15 C | 26 cm | 45 cm |
| Minus 10 C, plus 50 fps slower powder | 30 cm | 52 cm |
| 20 inch barrel, 15 C | 30 cm | 52 cm |

- Thinner air has less drag, so the bullet keeps speed (75%).
- Cold air is denser, and cold powder can burn slower. The 50 fps loss is an assumption; real loss depends on the powder (60%). VERIFY with your load.
- Inside 250 m these effects are 1 to 3 cm. Your own group at your hunting temperature beats every table (Tip).
- Zero confirmation after a big change of altitude or temperature is cheap insurance: three shots (Tip).
```

## Point blank, deeper

```diagram ff-bl-pbr
```

- 100 m zero: hold centre to about 170 m on a 15 cm zone (75%).
- 200 m zero: to about 235 m, but 7 cm high at 115 m (75%).

```more point blank by zero distance
15 cm (6 in) vital zone, 150 gr, Hunt Mentor model (75%).

| Zero | Highest point | Hold centre to |
|---|---|---|
| 100 m | 0.5 cm at 75 m | about 170 m |
| 150 m | 3 cm at 95 m | about 195 m |
| 175 m | 5 cm at 105 m | about 215 m |
| 200 m | 7 cm at 115 m | about 235 m |
| 225 m | 9 cm at 125 m | about 255 m |

- With a 20 cm zone add about 10 to 15 m to each (75%).
- The simple session's MPBR figure, about 245 m with a 210 m zero, agrees (70%).
- The trade: a longer point blank range means a higher bullet at 100 m. In timber, most shots are close (opinion).

> [!lean]
> Keep the 100 m zero this season, as the sighting in session says. Learn the 200 m hold instead of moving the zero.
```

## Build your dope card

```diagram ff-bl-dope
```

- Your group, your load, your rifle (Tip).
- Tape it inside the scope cap (Tip).

```more how to build it
1. Zero at 100 m with your hunting load ([sighting in](#/s/sighting-in/0)).
2. Shoot 3 shot groups at 150, 200 and 250 m from a solid rest. Measure how far each group's centre is below the aim point (Tip).
3. Compare with the table here. Use your numbers, not the table, where they differ (Tip).
4. Add the 10 and 20 km/h wind column from the drift table.
5. Write your max ethical range from the [range test](#/s/shooting-skills/0) at the bottom.
6. Redo it if you change load, scope, rings or rifle (Tip).
```

## Grandpa's rule and common mistakes

| Mistake | Fix |
|---|---|
| Holding for slope distance on a steep hill | Hold for the flat distance: hold lower |
| Ignoring a 20 km/h crosswind at 250 m | Get closer or pass |
| Trusting a table you never shot | Build your own dope card |

> [!rule]
> Grandpa's rule (wisdom): Every 50 m you close is worth more than every number you know.

```more the mistakes in full
- Shooting high on steep slopes by holding for the slope distance.
- Ignoring wind because it is calm where you sit. Look at the grass by the deer.
- Copying a box table into the scope cap without ever shooting at 200 m.
```

> [!field]
> On your next range day, shoot one group at 200 m and one at 250 m. Write the real drops on your card the same evening.

## Memory hooks

```diagram ff-bl-hooks
```

- **"Up or down, hold it down."** Angles hit high.
- **"3 and 9, full fine. 12 and 6, no fix."**
- **"One mil, ten centimetres, at one hundred metres."**

```more more memory tricks
- **Cosine 30 = 0.87:** "thirty takes off thirteen" percent.
- **4, 13, 28, 48:** drop in cm at 150, 200, 250, 300 m. "Four, thirteen, twenty eight, forty eight."
- **Quarter second to 200 m.** A walking deer moves a hand span.
```

## Sources

- Federal tables via the simple session (85%). Solver model (75%). Vortex and NSSF on angles and units (75 to 85%). Checked 2026-10-11.

```more all sources
- [Federal Power Shok .308 150 gr](https://www.federalpremium.com/rifle/power-shok/11-308A.html) and [Fusion 165 gr](https://www.federalpremium.com/rifle/fusion/11-F308FS2.html) data, as read in the simple session 2026-10-01 (85%)
- [py ballisticcalc 3.0](https://pypi.org/project/py-ballisticcalc/), point mass solver, G1 drag, run by Hunt Mentor 2026-10-11. Checked against Federal: 10.1 cm versus 9.9 cm at 200 yd, 37.7 versus 37.3 cm at 300 yd, energy 1,325 versus 1,341 ft lb at 300 yd (75%)
- [Vortex Optics, All About Optics brochure (2015)](https://308ar.com/wp-content/uploads/2016/01/All%20About%20Optics%20Brochure%20Vortex%20Optics%202015.pdf): MOA and mil definitions, clicks. Read directly 2026-10-11 (85%)
- [NSSF Let's Go Shooting: how to shoot uphill and downhill, with Ryan Cleckner](https://www.letsgoshooting.org/?p=50697): cosine formula, table, wind over true distance. Read 2026-10-11 (75%)
- [Wikipedia: rifleman's rule](https://en.wikipedia.org/wiki/Rifleman%27s_rule). Search preview 2026-10-11 (70%)
- [Richard Mann: the 1,000 foot pound fairy tale](https://empty-cases.com/blog/myth-busters-the-1000-foot-pound-fairy-tale/), via the simple session (70%)
- Wind feel cues: Beaufort scale, from memory (65%)
```

```quiz
[
  {"q": "Why does the bullet cross the line of sight twice?", "options": ["Wind lifts it", "The bore points slightly up because the scope sits above it", "The bullet rises against gravity"], "answer": 1, "why": "The scope is about 3.8 cm above the bore, so the bore tilts up to meet the aim point at the zero. The bullet climbs through the line, then falls back through it."},
  {"q": "Deer at 250 m slope distance, 30 degrees uphill. Hold for about:", "options": ["250 m", "217 m", "300 m"], "answer": 1, "why": "Flat distance = 250 × cos 30 = 217 m. Gravity works over the flat distance. Holding for 250 m hits about 10 cm high."},
  {"q": "Wind blowing from 1 o'clock (target at 12) counts as about:", "options": ["Full value", "Half value", "Nothing"], "answer": 1, "why": "Wind 30 degrees off the line of fire gives about half of the full crosswind drift. 3 and 9 are full value."},
  {"q": "How much does a 20 km/h full crosswind push a 150 gr .308 at 250 m?", "options": ["About 5 cm", "About 27 cm", "About 1 m"], "answer": 1, "why": "About 27 cm, more than a deer's vital zone. Close the distance or pass."},
  {"q": "1 mil at 100 m covers:", "options": ["2.9 cm", "10 cm", "1 cm"], "answer": 1, "why": "A milliradian is one thousandth of the distance: 10 cm at 100 m. One MOA is 2.9 cm at 100 m."}
]
```
