# Frame list for scripts/sks-diagrams.py (SKS course). Each d_ function writes one or more diagrams.
# Every label and tap tip repeats a fact from the course lessons; no new facts here.

def build(g):
    globals().update(g)
    for name, fn in list(globals().items()):
        if name.startswith('d_') and callable(fn):
            fn()

def RIF():
    return Rifle(10, 100, 0.372)

def CLOSE():
    """Close up of the action: L 270 to 600 mm."""
    return Rifle(-246.5, 104, 0.95)

def MID():
    """Action and gas system: L 380 to 860 mm."""
    return Rifle(-294, 112, 0.8)

def mk(n, pt, at, key=False, t=None):
    return callout(n, pt[0], pt[1], at[0], at[1], '', key=key, t=t)

# ================================================================ chapter 1: before you fire
def d_roadmap():
    items = [('1', 'Inspect before you fire'), ('2', 'Controls and safety'), ('3', 'Load and unload'), ('4', 'Sights and zero'),
             ('5', 'Corrosive ammo cleaning'), ('6', 'Field strip and rebuild'), ('7', 'Deer rifle? BC rules'), ('8', 'Legal and illegal upgrades')]
    o = ''
    for i, (n, lab) in enumerate(items):
        x = 24; y = 42 + i * 29
        o += card(x, y, 352, 25, PAPER, BLAZE if n == '1' else SPRUCE, 1.5, 6)
        o += badge(n, x + 16, y + 12.5, key=(n == '1'), r=10)
        o += T(x + 36, y + 18, lab, 14, 'bold', 'start', INK)
    svg('sks-roadmap', 'Eight chapter cards for the SKS course: 1 inspect before you fire, 2 controls and safety, 3 load and unload, 4 sights and zero, 5 corrosive ammunition cleaning, 6 field strip and rebuild, 7 deer rifle and BC rules, 8 legal and illegal upgrades. Chapter 1 is highlighted.',
        o, title='SKS course: 8 chapters', foot='Start with chapter 1 before any live round.', h=300)

def d_legal_status():
    rows = [('Class', 'Non restricted', GREEN), ('Licence', 'PAL (Possession and', SPRUCE), ('', 'Acquisition Licence)', SPRUCE),
            ('Magazine', '5 rounds, by law', BLAZE), ('Ban lists', 'Not on 2020, 2024, 2025', GREEN), ('Review', 'Under federal review', BLAZE)]
    o = card(14, 44, 372, 222, PAPER, SPRUCE, 2, 12)
    y = 74
    for k, v, c in rows:
        if k:
            o += T(30, y, k, 14, 'bold', 'start', INK)
        o += T(130, y, v, 15, 'bold', 'start', c)
        y += 32 if k or True else 0
    o += T(200, 286, 'RCMP reference table, valid 19 Oct 2026', 14, 'normal', 'middle', INK)
    svg('sks-legal-status', 'Status card for a standard Chinese Type 56 SKS: class non restricted; licence PAL, Possession and Acquisition Licence; magazine limited to 5 rounds by law; not on the 2020, 2024 or 2025 prohibition lists; under federal review. Source line: RCMP Firearms Reference Table valid 19 October 2026.',
        o, title='Your SKS today: legal status', h=300)

def d_parts():
    R = RIF()
    b = R.draw()
    c = ''
    c += mk(1, R.P(380, -29), (130, 48), t=('Top cover', 'The sheet steel lid over the bolt. Comes off first in the field strip.'))
    c += mk(2, R.P(470, -6), (185, 58), t=('Operating handle', 'Part of the bolt carrier. Pull it fully back and let go to load or clear.'))
    c += mk(3, R.P(535, -31), (230, 48), t=('Rear sight', 'Tangent leaf with a slide. Numbers are hundreds of metres.'))
    c += mk(4, R.P(988, -40), (360, 48), t=('Front sight', 'Hooded post. Screws up or down to zero.'))
    c += mk(5, R.P(660, -22), (280, 58), t=('Gas tube and handguard', 'Holds the gas piston. Lifts off after the lock lever turns up.'))
    c += mk(6, R.P(860, 14), (320, 160), t=('Bayonet', 'Folds under the barrel on a spring hinge. Keep it folded.'))
    c += mk(7, R.P(445, 78), (190, 172), key=True, t=('Fixed magazine', 'Built in. Swings open to unload. By law it must hold no more than 5 rounds.'))
    c += mk(8, R.P(352, 68), (110, 172), key=True, t=('Safety', 'Lever behind the trigger. Forward and up is safe; it blocks the trigger.'))
    c += mk(9, R.P(400, 74), (150, 178), t=('Magazine catch', 'Just in front of the trigger guard. Pull it back to swing the magazine open.'))
    c += mk(10, R.P(15, 100), (30, 160), t=('Butt trap', 'Holds the combination tool kit for cleaning.'))
    lg = legend([(1, 'Top cover', False), (2, 'Operating handle', False), (3, 'Rear sight', False), (4, 'Front sight', False), (5, 'Gas tube', False),
                 (6, 'Bayonet (folded)', False), (7, 'Magazine: 5 max', True), (8, 'Safety', True), (9, 'Magazine catch', False), (10, 'Butt trap', False)], y0=204)
    svg('sks-parts', 'Right side of a Chinese Type 56 SKS with 10 numbered parts: 1 top cover, 2 operating handle, 3 rear sight, 4 front sight, 5 gas tube and handguard, 6 folded bayonet, 7 fixed magazine limited to 5 rounds, 8 safety behind the trigger, 9 magazine catch, 10 butt trap.',
        b + c + lg, title='Your SKS: the parts that matter')

def d_inspection():
    # 1 cosmoline
    R = RIF(); b = R.draw(hl=('cover', 'handle', 'gastube', 'trigger', 'mag'))
    o = stitle(1, 'Find the cosmoline') + b
    o += card(20, 180, 360, 72, PAPER, SPRUCE, 2, 8)
    o += T(200, 206, 'Orange parts hide old grease:', 14, 'bold', 'middle')
    o += T(200, 228, 'bolt, carrier, gas tube, trigger group,', 14, 'normal', 'middle')
    o += T(200, 246, 'magazine. Strip and degrease them.', 14, 'normal', 'middle')
    svg('sks-insp-1', 'Step 1. The SKS drawn with the bolt carrier area, gas tube, trigger and magazine coloured orange: these are where old storage grease, called cosmoline, hides. Strip and degrease them.', o, foot='Chapter 6 shows the field strip.')
    # 2 firing pin rattle
    o = stitle(2, 'Shake the bolt: hear the pin')
    o += bolt(90, 120, 220, pin=BLAZE)
    o += arrow(150, 100, 110, 100, BLAZE, 3) + arrow(250, 100, 290, 100, BLAZE, 3)
    o += T(200, 92, 'pin slides free', 14, 'bold', 'middle', BLAZE)
    o += check(60, 214, True) + T(80, 219, 'Rattles: the pin moves freely', 14, 'bold')
    o += check(60, 248, False) + T(80, 253, 'Silent or stuck: do not load', 14, 'bold', 'start', RED)
    svg('sks-insp-2', 'Step 2. A bolt drawn side on with the firing pin inside shown as an orange dashed line and arrows showing it should slide. A green tick: it rattles, the pin moves freely. A red cross: silent or stuck, do not load.', o, foot='A stuck pin can fire when the bolt closes.')
    # 3 bore and chrome
    o = stitle(3, 'Look down the bore')
    o += circ(200, 140, 70, '#DDE2DC', INK, 2)
    for k in range(4):
        import math as m
        a = k * m.pi / 2 + 0.4
        o += line(200 + 30 * m.cos(a), 140 + 30 * m.sin(a), 200 + 66 * m.cos(a), 140 + 66 * m.sin(a), STEELD, 6)
    o += circ(200, 140, 28, '#F7F9F6', INK, 1.5)
    o += T(200, 145, 'bright', 14, 'bold', 'middle', GREEN)
    o += T(30, 236, 'Want: bright, shiny, sharp lands.', 14, 'bold', 'start', GREEN)
    o += T(30, 258, 'Stop: dark pits, rust, a bulge or ring.', 14, 'bold', 'start', RED)
    svg('sks-insp-3', 'Step 3. Looking down the bore: a bright chrome lined bore with 4 rifling lands. Want bright, shiny, sharp lands. Stop if you see dark pits, rust, a bulge or a ring.', o, foot='Bolt out. Light at the breech. Look from the muzzle.')
    # 4 gas system
    o = stitle(4, 'Check the gas system')
    o += gas_tube(40, 80, 320)
    o += piston(60, 150, 290)
    o += callout(1, 340, 92, 340, 200, '', t=('Gas tube', 'Clean inside. Carbon and rust here slow the action.'))
    o += callout(2, 330, 150, 250, 200, '', t=('Piston head', 'Should be smooth and slide freely in the tube.'))
    o += legend([(1, 'Tube: clean, no rust', False), (2, 'Piston: slides free', False)], y0=236, cols=1)
    svg('sks-insp-4', 'Step 4. The gas tube with its wooden handguard and the gas piston drawn apart. 1: the tube should be clean with no rust. 2: the piston should slide freely.', o)
    # 5 magazine limit
    o = stitle(5, 'Prove the magazine stops at 5')
    for i in range(5):
        o += cartridge(70, 70 + i * 22, 60, 'sp', case='#C8CCC6')
        o += T(150, 75 + i * 22, str(i + 1), 14, 'bold', 'start', GREEN)
    o += cartridge(70, 70 + 5 * 22, 60, 'sp', case='#C8CCC6') + check(160, 70 + 5 * 22, False, 0.8)
    o += T(200, 80, 'Dummy rounds only.', 14, 'bold', 'start')
    o += T(200, 104, 'Exactly 5 go in.', 14, 'bold', 'start', GREEN)
    o += T(200, 128, 'A 6th fits? Stop.', 14, 'bold', 'start', RED)
    o += T(200, 152, 'Gunsmith before use.', 14, 'normal', 'start')
    o += T(200, 210, 'Look for the pin or', 14, 'normal', 'start')
    o += T(200, 228, 'rivet in the box.', 14, 'normal', 'start')
    svg('sks-insp-5', 'Step 5. Six dummy rounds: rounds 1 to 5 are counted in green; the 6th has a red cross. Use dummy rounds only. Exactly 5 should go in. If a 6th fits, stop and see a gunsmith before use. Look for the pin or rivet in the magazine box.', o, foot='The law: 5 rounds max in this magazine.')
    # 6 bayonet, stock and screws
    R = RIF(); b = R.draw(hl=('bayonet', 'stock'))
    o = stitle(6, 'Bayonet, stock, cracks') + b
    o += T(30, 200, 'Bayonet folds and locks under the barrel.', 14, 'bold')
    o += T(30, 222, 'Stock: no cracks behind the receiver.', 14, 'bold')
    o += T(30, 244, 'Nothing loose or rattling but the pin.', 14, 'bold')
    svg('sks-insp-6', 'Step 6. The SKS with the bayonet and stock in orange. Check the bayonet folds and locks under the barrel, the stock has no cracks behind the receiver, and nothing is loose except the firing pin.', o)

def d_slamfire():
    o = ''
    o += T(30, 62, 'Free pin', 15, 'bold', 'start', GREEN)
    o += bolt(30, 72, 200, pin=GREEN)
    o += cartridge(232, 98, 70, 'sp')
    o += T(320, 102, 'safe', 14, 'bold', 'start', GREEN)
    o += T(30, 162, 'Stuck forward', 15, 'bold', 'start', RED)
    o += bolt(30, 172, 200, pin=BLAZE, pinfwd=True)
    o += cartridge(232, 198, 70, 'sp')
    o += f'<polygon points="226,190 238,198 226,206 232,198" fill="{BLAZE}" stroke="{INK}" stroke-width="1"/>'
    o += T(320, 202, 'BANG', 15, 'bold', 'start', RED)
    o += T(200, 252, 'Pin stuck in old grease pokes the primer', 14, 'normal', 'middle')
    o += T(200, 272, 'as the bolt slams shut.', 14, 'normal', 'middle')
    svg('sks-slamfire', 'Slam fire. Top: a bolt with a free firing pin closing on a round: safe. Bottom: a pin stuck forward in old grease sticks out of the bolt face and hits the primer as the bolt closes: the round fires without the trigger.', o, title='Slam fire: why the pin matters', h=300)

def d_gunsmith():
    items = ['Pin silent or stuck after cleaning', 'Bore pitted, bulged or ringed', 'A 6th round fits the magazine', 'Bolt closes on a headspace doubt',
             'Fires, doubles or slam fires', 'Cracks, bulged or split cases', 'Safety does not block the trigger']
    o = ''
    for i, s in enumerate(items):
        y = 56 + i * 32
        o += circ(32, y, 11, BLAZE, PAPER, 2) + T(32, y + 5, '!', 15, 'bold', 'middle', PAPER)
        o += T(52, y + 5, s, 14, 'bold' if i < 3 else 'normal', 'start', INK)
    svg('sks-gunsmith', 'Take it to a gunsmith if: the firing pin is silent or stuck after cleaning; the bore is pitted, bulged or ringed; a 6th round fits the magazine; you have any headspace doubt; it fires on its own, doubles or slam fires; cases come out cracked, bulged or split; the safety does not block the trigger.',
        o, title='Take it to a gunsmith if', foot='Unload first. Never ship or carry it loaded.')

def d_headspace():
    o = ''
    o += rect(40, 110, 200, 60, STEEL, INK, 2)  # chamber block
    o += poly([(60, 124), (190, 124), (215, 132), (215, 148), (190, 156), (60, 156)], '#2A2F2B', INK, 1.5)
    o += cartridge(62, 140, 150, 'sp')
    o += rect(20, 110, 20, 60, '#D9DCD7', INK, 1.5)
    o += T(18, 100, 'Bolt face', 14, 'bold', 'start')
    o += line(40, 186, 190, 186, BLAZE, 3) + line(40, 178, 40, 194, BLAZE, 3) + line(190, 178, 190, 194, BLAZE, 3)
    o += T(115, 210, 'Headspace', 15, 'bold', 'middle', BLAZE)
    o += T(260, 120, 'Bolt face to', 14, 'normal', 'start') + T(260, 140, 'the point that', 14, 'normal', 'start') + T(260, 160, 'stops the case.', 14, 'normal', 'start')
    o += T(200, 244, 'Checked with gauges by a gunsmith.', 14, 'bold', 'middle')
    o += T(200, 266, 'Too much: cases can split or rupture.', 14, 'normal', 'middle')
    svg('sks-headspace', 'Headspace: a round in the chamber with the bolt face behind it. The orange bracket marks headspace, the space from the bolt face to the point in the chamber that stops the case. A gunsmith checks it with gauges. Too much can split or rupture cases.',
        o, title='Headspace: a gunsmith check')

# ================================================================ chapter 2: controls and safety
def d_controls():
    R = CLOSE(); b = R.draw(hl=('safety', 'handle', 'catch', 'coverpin', 'gaslever'))
    c = ''
    c += mk(1, R.P(352, 68), (90, 268), key=True, t=('Safety', 'Forward and up: safe, it blocks the trigger. Rearward and down: fire.'))
    c += mk(2, R.P(470, -6), (250, 60), t=('Operating handle', 'Pull fully back and let go. Bolt stays open on an empty magazine.'))
    c += mk(3, R.P(400, 74), (200, 268), t=('Magazine catch', 'Pull back: the magazine swings open and the rounds drop out.'))
    c += mk(4, R.P(298, -6), (40, 60), t=('Cover pin', 'Turn it up and pull it right to free the top cover.'))
    c += mk(5, R.P(552, -6), (340, 60), t=('Gas tube lock', 'Turn it up to free the gas tube. Down to lock it.'))
    svg('sks-controls', 'Close up of the SKS action, right side, with 5 numbered controls in orange: 1 safety behind the trigger, 2 operating handle, 3 magazine catch in front of the trigger guard, 4 top cover pin at the rear of the receiver, 5 gas tube lock lever at the rear sight.',
        b + c, title='The 5 controls')

def d_safety():
    o = T(100, 56, 'SAFE', 17, 'bold', 'middle', GREEN) + T(300, 56, 'FIRE', 17, 'bold', 'middle', RED)
    o += trigger_group(28, 120, 1.0, 'safe') + trigger_group(228, 120, 1.0, 'fire')
    o += curved_arrow(92, 150, 26, 120, 30, BLAZE, 3)
    o += T(100, 228, 'Forward and up.', 14, 'bold', 'middle')
    o += T(100, 248, 'Blocks the trigger.', 14, 'normal', 'middle')
    o += T(300, 228, 'Rearward and down,', 14, 'bold', 'middle')
    o += T(300, 248, 'against the guard.', 14, 'normal', 'middle')
    svg('sks-safety', 'The SKS safety lever, in orange, behind the trigger. Left, SAFE: lever turned forward and up, it blocks the trigger. Right, FIRE: lever turned rearward and down against the rear of the trigger guard.',
        o, title='The safety: two positions', foot='The safety is a part. Safe is a habit.')

def d_bolt_open():
    R = CLOSE(); b = R.draw(hl=('handle',), bolt='open')
    o = b + arrow(*R.P(470, -40), *R.P(405, -40))
    o += T(200, 228, 'Pull fully back, let go.', 15, 'bold', 'middle')
    o += T(200, 250, 'Empty magazine: the bolt stays open.', 14, 'normal', 'middle')
    svg('sks-bolt-open', 'Close up of the action. The operating handle, in orange, is pulled fully back and the bolt is held open over an empty magazine. Arrow shows the handle moving back.', o, title='Bolt hold open')

def d_mag_catch():
    R = CLOSE(); b = R.draw(hl=('catch', 'mag'), mag='open')
    o = b + arrow(*R.P(402, 100), *R.P(380, 100))
    o += T(200, 40, 'Pull the catch back: the magazine', 14, 'bold', 'middle')
    o += T(200, 58, 'swings open and rounds drop out.', 14, 'bold', 'middle')
    o += T(200, 272, 'Hand or a soft bag under it.', 14, 'normal', 'middle')
    svg('sks-mag-catch', 'Close up of the action with the magazine catch pulled back and the magazine swung open, both in orange. Rounds drop out, so hold a hand or soft bag under it.', o)

def d_function_check():
    steps = ['Unloaded. Muzzle safe.', 'Handle back and hold it.', 'Press the follower down.', 'Let the bolt go forward.',
             'Safety ON. Press trigger:', '  hammer must NOT fall.', 'Safety OFF. Press trigger:', '  hammer falls.']
    o = ''
    n = 0
    for i, s in enumerate(steps):
        y = 56 + i * 28
        if not s.startswith('  '):
            n += 1
            o += badge(n, 36, y - 4, key=(n in (5, 6)), r=11)
            o += T(56, y + 1, s, 14, 'bold' if n in (5, 6) else 'normal')
        else:
            o += T(56, y + 1, s.strip(), 14, 'bold', 'start', BLAZE)
    svg('sks-function-check', 'Function check in 6 steps: 1 unloaded, muzzle safe. 2 operating handle back and hold it. 3 press the magazine follower down. 4 let the bolt go forward. 5 safety on, press the trigger: the hammer must not fall. 6 safety off, press the trigger: the hammer falls.',
        o, title='Function check after every rebuild', foot='Hammer falls on SAFE? Gunsmith.')

# ================================================================ chapter 3: loading and unloading
def d_loading():
    R = CLOSE()
    o = stitle(1, 'Safety on. Handle back.') + R.draw(hl=('safety', 'handle'), bolt='open') + arrow(*R.P(470, -40), *R.P(405, -40))
    o += T(200, 272, 'Empty magazine: the bolt locks open.', 14, 'normal', 'middle')
    svg('sks-load-1', 'Loading step 1: safety on, muzzle safe, pull the operating handle fully back. With an empty magazine the bolt locks open.', o)
    o = stitle(2, 'Clip into the guides')
    o += rect(60, 120, 280, 70, STEEL, INK, 2, 6) + rect(150, 132, 140, 46, '#2A2F2B', INK, 1.5)
    o += rect(290, 128, 20, 54, '#C8CCC6', INK, 1.5)
    o += clip(196, 98, 5, 12, 5, hl=True)
    o += arrow(226, 66, 226, 92, BLAZE, 3)
    o += T(200, 222, 'Clip slides down into the guides', 14, 'bold', 'middle')
    o += T(200, 242, 'at the front of the bolt carrier.', 14, 'normal', 'middle')
    svg('sks-load-2', 'Loading step 2, seen from above: a stripper clip, in orange, slides down into the clip guides at the front of the open bolt carrier.', o, foot='Your magazine takes 5. Load 5.')
    o = stitle(3, 'Thumb presses rounds down')
    o += rect(60, 150, 280, 60, STEEL, INK, 2, 6) + rect(150, 160, 140, 40, '#2A2F2B', INK, 1.5)
    for i in range(5):
        o += cartridge(160, 120 - i * 4 + 0, 90, 'sp') if i == 0 else ''
    o += cartridge(160, 125, 90, 'sp') + cartridge(160, 145, 90, 'sp')
    o += hand(180, 110, 1.2)
    o += arrow(150, 90, 150, 140, BLAZE, 4)
    o += T(200, 240, 'Press near the clip base.', 14, 'bold', 'middle')
    o += T(200, 260, 'Rounds slide down into the magazine.', 14, 'normal', 'middle')
    svg('sks-load-3', 'Loading step 3: the thumb presses the rounds down off the clip into the magazine, pressing close to the base of the top round.', o)
    R = CLOSE()
    o = stitle(4, 'Clip out. Handle back, let go.') + R.draw(hl=('handle',)) + arrow(*R.P(405, -40), *R.P(470, -40))
    o += T(200, 252, 'The bolt runs forward and chambers', 14, 'bold', 'middle')
    o += T(200, 272, 'a round. It is loaded now.', 14, 'bold', 'middle', RED)
    svg('sks-load-4', 'Loading step 4: remove the empty clip, pull the operating handle back and let it go. The bolt runs forward and chambers a round. The rifle is loaded now.', o)
    R = CLOSE()
    o = stitle(5, 'Safety on until the shot') + R.draw(hl=('safety',))
    o += T(200, 252, 'Finger off the trigger.', 14, 'bold', 'middle')
    o += T(200, 272, 'Muzzle in a safe direction.', 14, 'bold', 'middle')
    svg('sks-load-5', 'Loading step 5: safety on, in orange, until you are ready to shoot. Finger off the trigger, muzzle in a safe direction.', o)

def d_load_single():
    o = rect(60, 130, 280, 60, STEEL, INK, 2, 6) + rect(150, 140, 140, 40, '#2A2F2B', INK, 1.5)
    o += rect(176, 150, 92, 26, '#C8CCC6', INK, 1.2) + T(222, 168, 'follower', 14, 'normal', 'middle')
    o += cartridge(170, 100, 100, 'sp')
    o += arrow(150, 80, 150, 140, BLAZE, 4)
    o += T(200, 228, 'One round on the follower.', 14, 'bold', 'middle')
    o += T(200, 248, 'Press down until it stays. Repeat to 5.', 14, 'normal', 'middle')
    svg('sks-load-single', 'Loading single rounds, seen from above the open action: lay one round on the magazine follower and press it down until it stays. Repeat up to 5.', o, title='No clip? Load one at a time')

def d_unloading():
    R = CLOSE()
    o = stitle(1, 'Muzzle safe. Safety on.') + R.draw(hl=('safety',)) + safe_dir(330, 70)
    o += T(200, 272, 'Finger off the trigger.', 14, 'bold', 'middle')
    svg('sks-unload-1', 'Unloading step 1: muzzle in a safe direction, finger off the trigger, safety on (in orange).', o)
    R = CLOSE()
    o = stitle(2, 'Open the magazine') + R.draw(hl=('catch', 'mag'), mag='open')
    o += T(200, 272, 'Catch back. Rounds drop into your hand.', 14, 'bold', 'middle')
    svg('sks-unload-2', 'Unloading step 2: pull the magazine catch back. The magazine swings open and the rounds drop into your hand. Remove all rounds, then close the magazine.', o)
    R = CLOSE()
    o = stitle(3, 'Close it. Handle back.') + R.draw(hl=('handle',), bolt='open') + arrow(*R.P(470, -40), *R.P(405, -40))
    o += T(200, 252, 'Any chambered round ejects.', 14, 'bold', 'middle')
    o += T(200, 272, 'Let go: the bolt stays open.', 14, 'normal', 'middle')
    svg('sks-unload-3', 'Unloading step 3: close the magazine, pull the operating handle fully back to eject any chambered round, then let go. The bolt stays open.', o)
    R = CLOSE()
    o = stitle(4, 'Look and feel: 3 places') + R.draw(bolt='open', hl=('mag',))
    o += mk(1, R.P(450, -10), (230, 64)) + mk(2, R.P(520, 0), (330, 64)) + mk(3, R.P(445, 70), (300, 228))
    o += legend([(1, 'Chamber', True), (2, 'Bore', False), (3, 'Magazine', True)], x0=20, y0=262, cols=3, colw=125)
    svg('sks-unload-4', 'Unloading step 4: with the bolt open, look and feel in 3 places: 1 the chamber, 2 the bore is clear, 3 the magazine is empty.', o)
    R = CLOSE()
    o = stitle(5, 'Close the bolt, pointing safe') + R.draw(hl=('handle', 'mag'), mag='open')
    o += T(200, 232, 'Open the magazine, handle back, let go.', 14, 'bold', 'middle')
    o += T(200, 252, 'Safety off, press the trigger,', 14, 'normal', 'middle')
    o += T(200, 272, 'safety on. Magazine closed.', 14, 'normal', 'middle')
    svg('sks-unload-5', 'Unloading step 5: close the bolt by opening the magazine, pulling the handle back and letting go. With the muzzle safe, safety off, press the trigger, safety on. Close the magazine.', o)

def d_vehicle():
    o = rect(40, 140, 320, 70, '#7E8C83', INK, 2, 16) + rect(80, 110, 160, 40, '#A9B5AD', INK, 2, 10)
    o += circ(110, 212, 20, INK, INK) + circ(300, 212, 20, INK, INK)
    o += T(200, 60, 'Chamber empty.', 16, 'bold', 'middle', BLAZE)
    o += T(200, 84, 'Fixed magazine empty too.', 16, 'bold', 'middle', BLAZE)
    o += T(200, 262, 'On the SKS the magazine is always attached.', 14, 'normal', 'middle')
    svg('sks-vehicle', 'A truck. In any vehicle: chamber empty and the fixed magazine empty too, because on the SKS the magazine is always attached.', o, title='In a vehicle', h=300, foot='BC synopsis page 11, item 28.')

def d_stoppage():
    steps = [('Click, no bang.', True), ('Muzzle safe. Count to 30.', True), ('Handle back: watch the round fly.', False), ('Let go: a new round chambers.', False), ('Aim and try again.', False), ('Again? Unload, strip, inspect.', True)]
    o = ''
    for i, (s, k) in enumerate(steps):
        y = 60 + i * 34
        o += badge(i + 1, 36, y - 4, key=k) + T(56, y + 1, s, 14, 'bold' if k else 'normal')
    svg('sks-stoppage', 'Click, no bang: 1 click, no bang. 2 keep the muzzle safe and count to 30. 3 pull the handle back and watch the round eject. 4 let go to chamber a new round. 5 aim and try again. 6 if it happens again, unload, strip and inspect.',
        o, title='Click, no bang', foot='Step 2 is a Tip. The rest is the army drill.')

# ================================================================ chapter 4: sights and zero
def d_sights():
    R = Rifle(10, 150, 0.372); b = R.draw(hl=('rsight', 'fsight'))
    o = b + mk(1, R.P(535, -31), (190, 70), t=('Rear sight', 'Open notch on a tangent leaf. A slide sets the range.'))
    o += mk(2, R.P(988, -40), (340, 70), t=('Front sight', 'Hooded post. Screws up or down for zero.'))
    o += legend([(1, 'Rear notch on a leaf', False), (2, 'Front post in a hood', False)], y0=230, cols=1)
    svg('sks-sights', 'The SKS with its two sights in orange: 1 the rear sight, an open notch on a tangent leaf with a range slide; 2 the front sight, a hooded post.', o, title='Two sights, one line')

def d_rear_leaf():
    o = poly([(40, 170), (360, 120), (360, 170)], '#C8CCC6', INK, 2)
    marks = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    for i in range(11):
        x = 70 + i * 27
        o += line(x, 170, x, 158 - i * 2.6, INK, 1.5)
        if i > 0:
            o += T(x, 196, marks[i], 14, 'bold', 'middle')
    o += line(70, 170, 70, 152, BLAZE, 4) + T(56, 214, 'first mark: battle', 14, 'bold', 'start', BLAZE)
    o += rect(150, 128, 30, 48, BLAZE, INK, 2, 3)
    o += T(165, 120, 'slide', 14, 'bold', 'middle', BLAZE)
    o += T(200, 240, '1 = 100 m, 3 = 300 m, 10 = 1000 m.', 14, 'bold', 'middle')
    o += T(200, 262, 'Battle setting: for up to 300 m.', 14, 'normal', 'middle')
    svg('sks-rear-leaf', 'The rear sight leaf drawn large: marks 1 to 10 for hundreds of metres, from 100 m to 1000 m. The first mark, in orange, is the battle setting for up to 300 m. The slide, in orange, is set by pressing its catch and moving it.',
        o, title='Rear sight leaf', foot='Press the slide catch, move, let go.', h=310)

def d_sight_picture():
    o = rect(60, 70, 280, 150, PAPER, SPRUCE, 2, 8)
    o += poly([(80, 200), (170, 200), (170, 150), (186, 150), (186, 200)], STEELD, INK, 1)
    o += poly([(214, 200), (214, 150), (230, 150), (230, 200), (320, 200)], STEELD, INK, 1)
    o += rect(193, 138, 14, 62, BLAZE, INK, 1.5)
    o += circ(200, 110, 26, '#C9B79C', INK, 1.5) + circ(200, 110, 8, RED, INK, 1)
    o += T(200, 244, 'Post centred in the notch.', 14, 'bold', 'middle')
    o += T(200, 264, 'Post top level with the notch top.', 14, 'normal', 'middle')
    svg('sks-sight-picture', 'The sight picture: the front post, in orange, centred in the rear notch with its top level with the top of the notch, held on the target.', o, title='Sight picture', h=300)

def d_front_elev():
    o = rect(140, 140, 120, 60, STEEL, INK, 2, 4) + rect(190, 70, 20, 72, BLAZE, INK, 2, 2)
    o += f'<path d="M150 140 Q150 52 200 50 Q250 52 250 140" fill="none" stroke="{STEELD}" stroke-width="6"/>'
    o += curved_arrow(200, 92, 40, 200, 340, SPRUCE, 3)
    o += T(70, 70, 'Post DOWN', 14, 'bold', 'middle', GREEN) + T(70, 90, '= hits HIGHER', 14, 'bold', 'middle', GREEN)
    o += T(330, 70, 'Post UP', 14, 'bold', 'middle', RED) + T(330, 90, '= hits LOWER', 14, 'bold', 'middle', RED)
    o += T(200, 232, 'Combination tool over the post.', 14, 'bold', 'middle')
    o += T(200, 252, 'Small turns. Shoot again to confirm.', 14, 'normal', 'middle')
    svg('sks-front-elev', 'The front sight post, in orange, inside its hood. Turning the post down makes the rifle hit higher; turning it up makes it hit lower. Use the combination tool over the post. Small turns, then shoot again to confirm.',
        o, title='Zero up and down: the front post', foot='Move the front sight opposite to the miss.')

def d_front_windage():
    o = rect(110, 150, 180, 50, STEEL, INK, 2, 4) + rect(170, 110, 60, 40, BLAZE, INK, 2, 3) + rect(194, 70, 12, 42, STEELD, INK, 1.5)
    o += arrow(160, 128, 110, 128, SPRUCE, 4)
    o += T(70, 70, 'Sight LEFT', 14, 'bold', 'middle') + T(70, 90, '= hits RIGHT', 14, 'bold', 'middle', GREEN)
    o += T(200, 232, 'The front sight drum drifts sideways.', 14, 'bold', 'middle')
    o += T(200, 252, 'Needs a sight tool. A gunsmith job', 14, 'normal', 'middle')
    o += T(200, 272, 'if you have no tool.', 14, 'normal', 'middle')
    svg('sks-front-windage', 'Windage on the SKS: the front sight drum, in orange, drifts sideways in its base. Moving the front sight left makes the rifle hit right. It needs a sight tool; a gunsmith job if you have none.', o, title='Zero left and right')

def d_zero_plan():
    o = line(40, 150, 370, 150, SPRUCE, 2, ' stroke-dasharray="6 4"') + T(370, 196, 'line of sight', 14, 'normal', 'end', SPRUCE)
    for x, lab in [(40, '0'), (150, '100 m'), (260, '200 m'), (370, '300 m')]:
        o += line(x, 144, x, 156, INK, 1.5) + T(x, 136, lab, 14, 'bold', 'middle' if x < 370 else 'end')
    o += '<path d="M40 166 Q95 136 150 150 Q230 166 300 205 Q340 228 370 250" fill="none" stroke="#FF6A13" stroke-width="4"/>'
    o += circ(150, 150, 6, BLAZE, INK, 1.5)
    o += T(30, 62, 'Zero at 100 m (Tip).', 15, 'bold')
    o += T(30, 84, 'Practise at 50, 100 and 150 m.', 14, 'normal')
    o += T(30, 106, 'Past 150 m: no shot at deer.', 14, 'bold', 'start', RED)
    o += T(200, 280, 'The bullet crosses the line at 100 m, then drops.', 14, 'normal', 'middle')
    svg('sks-zero-plan', 'A bullet path chart: the dashed line of sight and the orange bullet path, which rises, crosses the line at the 100 m zero, then drops more and more past 200 m. Plan: zero at 100 m (a Tip), practise at 50, 100 and 150 m, and no shot at deer past 150 m.', o, title='Zero plan for deer')

# ================================================================ chapter 5: corrosive ammunition
def d_corrosive():
    boxes = [('Primer', 'chlorate'), ('Fired', 'leaves salt'), ('Salt', 'pulls water'), ('Rust', 'in hours')]
    o = ''
    for i, (a, b2) in enumerate(boxes):
        x = 8 + i * 98
        o += card(x, 90, 88, 80, PAPER, BLAZE if i == 3 else SPRUCE, 2, 8)
        o += T(x + 44, 124, a, 14, 'bold', 'middle') + T(x + 44, 146, b2, 14, 'normal', 'middle')
        if i < 3:
            o += arrow(x + 88, 130, x + 98, 130, BLAZE, 3)
    o += T(200, 214, 'Water dissolves the salt. Oil does not.', 15, 'bold', 'middle')
    o += T(200, 238, 'Clean the same day you shoot it.', 14, 'normal', 'middle')
    svg('sks-corrosive', 'Why corrosive ammunition rusts: old primers contain chlorate; firing leaves salt; the salt pulls water from the air; rust follows within hours. Water dissolves the salt; oil does not. Clean the same day.', o, title='Corrosive ammo in 4 boxes')

def d_ammo_id():
    o = cartridge(40, 80, 130, 'fmj', case='#7E8580') + T(190, 85, 'Steel case, surplus FMJ', 14, 'bold')
    o += cartridge(40, 130, 130, 'sp') + T(190, 135, 'Brass case, soft point', 14, 'bold')
    o += circ(100, 210, 34, '#7E8580', INK, 2) + circ(92, 210, 5, '#2A2F2B', INK, 1) + circ(108, 210, 5, '#2A2F2B', INK, 1)
    o += T(150, 204, 'Inside: 2 flash holes', 14, 'bold') + T(150, 224, '(Berdan). Surplus sign.', 14, 'normal')
    o += T(200, 280, 'Unknown? Treat it as corrosive.', 15, 'bold', 'middle', BLAZE)
    svg('sks-ammo-id', 'Telling surplus ammunition: a steel cased full metal jacket surplus round and a brass cased soft point hunting round. A fired case with two flash holes inside (Berdan priming) is a surplus sign. If unknown, treat it as corrosive.', o, title='Spot surplus ammo', h=300)

def d_fmj_vs_sp():
    o = T(110, 60, 'FMJ', 17, 'bold', 'middle', RED) + T(300, 60, 'Soft point', 17, 'bold', 'middle', GREEN)
    o += cartridge(40, 100, 140, 'fmj') + cartridge(230, 100, 140, 'sp')
    o += poly([(80, 160), (140, 160), (150, 170), (140, 180), (80, 180)], '#B87333', INK, 1.5)
    o += f'<path d="M260 170 Q280 146 300 160 Q320 146 345 170 Q320 194 300 180 Q280 194 260 170 Z" fill="#B87333" stroke="{INK}" stroke-width="1.5"/>'
    o += T(110, 210, 'Stays narrow', 14, 'bold', 'middle') + T(300, 210, 'Opens up', 14, 'bold', 'middle')
    o += check(110, 244, False) + check(300, 244, True)
    o += T(200, 284, 'FMJ is illegal for hunting in BC.', 15, 'bold', 'middle', RED)
    svg('sks-fmj-vs-sp', 'Two bullets. Left, full metal jacket (FMJ): stays narrow after impact, red cross. Right, soft point: opens up, green tick. FMJ is illegal for hunting in BC.', o, title='', h=300)

def d_cleaning():
    o = stitle(1, 'Bore: wet, brush, dry')
    o += rect(40, 110, 320, 18, STEELD, INK, 1.5)
    o += line(10, 119, 300, 119, STEELL, 4) + rect(290, 112, 30, 14, BRASS, INK, 1)
    o += arrow(120, 90, 260, 90, BLAZE, 3) + arrow(260, 150, 120, 150, BLAZE, 3)
    o += T(200, 196, 'Wet patches first: water based cleaner.', 14, 'bold', 'middle')
    o += T(200, 218, 'Brush several passes. Dry patches', 14, 'normal', 'middle')
    o += T(200, 238, 'until they come out clean.', 14, 'normal', 'middle')
    svg('sks-clean-1', 'Cleaning step 1: the bore. A rod with a brush runs back and forth through the barrel. Wet patches first with a water based cleaner, brush several passes, then dry patches until they come out clean.', o)
    o = stitle(2, 'Bolt face and carrier')
    o += bolt(60, 90, 160) + carrier(230, 80, 130)
    o += T(200, 210, 'Scrub with a wet toothbrush.', 14, 'bold', 'middle')
    o += T(200, 232, 'Bolt face, extractor, carrier inside.', 14, 'normal', 'middle')
    svg('sks-clean-2', 'Cleaning step 2: the bolt and the bolt carrier side by side. Scrub the bolt face, extractor and inside of the carrier with a wet toothbrush.', o)
    o = stitle(3, 'Gas piston and gas tube')
    o += gas_tube(40, 76, 320) + piston(60, 150, 290)
    o += T(200, 210, 'The tube and piston get the most', 14, 'bold', 'middle')
    o += T(200, 230, 'carbon. Wet, scrub, dry, oil.', 14, 'normal', 'middle')
    svg('sks-clean-3', 'Cleaning step 3: the gas tube and gas piston. They get the most carbon. Wet, scrub, dry and oil them.', o)
    o = stitle(4, 'Dry everything. Oil lightly.')
    for i, lab in enumerate(['Bore', 'Bolt', 'Carrier', 'Piston', 'Tube']):
        x = 40 + i * 70
        o += card(x, 90, 58, 58, PAPER, SPRUCE, 2, 8) + check(x + 29, 112, True, 0.8) + T(x + 29, 140, lab, 14, 'bold', 'middle')
    o += T(200, 196, 'Water left inside rusts too.', 14, 'bold', 'middle', RED)
    o += T(200, 218, 'Dry fully, then a light oil coat.', 14, 'normal', 'middle')
    o += T(200, 240, 'Run a patch again over the next days.', 14, 'normal', 'middle')
    svg('sks-clean-4', 'Cleaning step 4: dry everything (bore, bolt, carrier, piston, tube), then a light coat of oil. Water left inside rusts too. Run a patch again over the next days.', o)

def d_tool_kit():
    R = Rifle(10, 110, 0.372); b = R.draw(hl=('trap', 'rod'))
    o = b + mk(1, R.P(15, 100), (40, 200), t=('Butt trap', 'Press the cover in the butt plate: the combination tool case pops out.'))
    o += mk(2, R.P(900, 21), (300, 200), t=('Cleaning rod', 'Under the barrel. Unlock the bayonet, let it hang, free the rod head from the front sight base, pull it out.'))
    o += legend([(1, 'Tool kit in the butt', False), (2, 'Rod under the barrel', False)], y0=236, cols=1)
    svg('sks-tool-kit', 'The SKS with its cleaning kit in orange: 1 the combination tool case in a trap in the butt, 2 the cleaning rod under the barrel.', o, title='The built in cleaning kit')

# ================================================================ chapter 6: field strip and reassembly
def d_strip_overview():
    o = ''
    o += top_cover(20, 50, 170) + badge(1, 205, 58)
    o += recoil_spring(220, 58, 160) + badge(2, 300, 82)
    o += carrier(20, 96, 150) + badge(3, 186, 112)
    o += bolt(210, 100, 120) + badge(4, 345, 112)
    o += gas_tube(20, 170, 220) + badge(5, 256, 182)
    o += piston(20, 225, 210) + badge(6, 244, 225)
    o += trigger_group(280, 200, 0.6) + badge(7, 380, 205)
    o += legend([(1, 'Top cover', False), (2, 'Recoil spring', False), (3, 'Bolt carrier', False), (4, 'Bolt', False),
                 (5, 'Gas tube', False), (6, 'Gas piston', False), (7, 'Trigger group', False)], y0=262, cols=2, colw=190, rowh=20)
    svg('sks-strip-overview', 'The 7 parts of an SKS field strip laid out: 1 top cover, 2 recoil spring assembly, 3 bolt carrier, 4 bolt, 5 gas tube with handguard, 6 gas piston, 7 trigger group (only if needed).', o, title='Field strip: 7 parts', h=340)

def d_strip_steps():
    R = CLOSE()
    o = stitle(1, 'Unload and prove it') + R.draw(bolt='open', hl=('mag',))
    o += T(200, 252, 'Chapter 3 steps. Safety on.', 14, 'bold', 'middle')
    o += T(200, 272, 'No ammunition on the bench.', 14, 'bold', 'middle', RED)
    svg('sks-strip-1', 'Strip step 1: unload and prove it using the chapter 3 steps, safety on, no ammunition on the bench.', o)
    R = CLOSE()
    o = stitle(2, 'Cover pin: up, then right') + R.draw(hl=('coverpin',)) + curved_arrow(*R.P(298, -6), 34, 100, 250, BLAZE, 3)
    o += T(200, 252, 'Turn the pin up and pull it out', 14, 'bold', 'middle')
    o += T(200, 272, 'to the right as far as it goes.', 14, 'normal', 'middle')
    svg('sks-strip-2', 'Strip step 2: turn the top cover pin, in orange, up to vertical and pull it out to the right as far as it goes. It may need prying from the receiver first.', o)
    R = CLOSE()
    o = stitle(3, 'Slide the cover off to the rear') + R.draw(cover=False) + top_cover(30, 60, 150, BLAZE) + arrow(40, 52, 10, 52, BLAZE, 3)
    o += T(200, 272, 'Lift and slide it back.', 14, 'bold', 'middle')
    svg('sks-strip-3', 'Strip step 3: slide the top cover, in orange, off to the rear.', o)
    R = CLOSE()
    o = stitle(4, 'Pull out the recoil spring') + R.draw(cover=False) + recoil_spring(40, 60, 200) + arrow(40, 82, 10, 82, BLAZE, 3)
    o += T(200, 252, 'It comes out of the back of the', 14, 'bold', 'middle')
    o += T(200, 272, 'bolt carrier. Spring under light tension.', 14, 'normal', 'middle')
    svg('sks-strip-4', 'Strip step 4: pull the recoil spring assembly out of the back of the bolt carrier. It is under light spring tension.', o)
    R = CLOSE()
    o = stitle(5, 'Handle back, lift out') + R.draw(cover=False, carrier=False, mag='open')
    o += carrier(90, 52, 150, BLAZE) + arrow(170, 120, 170, 90, BLAZE, 3)
    o += T(200, 272, 'Magazine open. Bolt and carrier lift up.', 14, 'bold', 'middle')
    svg('sks-strip-5', 'Strip step 5: open the magazine, pull the operating handle fully back and lift the bolt carrier and bolt, in orange, up and out of the receiver.', o)
    o = stitle(6, 'Bolt off the carrier')
    o += carrier(60, 90, 220) + bolt(110, 170, 160, BLAZE)
    o += arrow(190, 145, 190, 165, BLAZE, 3)
    o += T(200, 252, 'The bolt lifts off the carrier.', 14, 'bold', 'middle')
    o += T(200, 272, 'Firing pin stays inside the bolt.', 14, 'normal', 'middle')
    svg('sks-strip-6', 'Strip step 6: separate the bolt, in orange, from the bolt carrier. The firing pin stays inside the bolt.', o)
    R = MID()
    o = stitle(7, 'Gas tube: lever up, lift off') + R.draw(hl=('gaslever', 'gastube', 'handguard'))
    o += curved_arrow(*R.P(556, -12), 30, 120, 260, BLAZE, 3)
    o += T(200, 232, 'Lever up. Lift the handguard rear,', 14, 'bold', 'middle')
    o += T(200, 252, 'slide the tube off the gas block.', 14, 'normal', 'middle')
    o += T(200, 272, 'Tip the tube: the piston slides out.', 14, 'normal', 'middle')
    svg('sks-strip-7', 'Strip step 7: turn the gas tube lock lever up, lift the rear of the handguard and take the gas tube off; tip the tube and the gas piston slides out. Parts in orange.', o)

def d_bolt_detail():
    o = bolt(40, 100, 320, pin=BLAZE)
    o += callout(1, 220, 140, 220, 210, '', key=True, t=('Firing pin', 'Floats free inside the bolt with no spring. Must rattle when you shake the bolt.'))
    o += callout(2, 345, 182, 340, 210, '', t=('Extractor', 'Claw at the front right. Pulls the case out.'))
    o += callout(3, 365, 140, 380, 90, '', t=('Bolt face', 'Clean it after every corrosive shoot.'))
    o += legend([(1, 'Firing pin: free, no spring', True), (2, 'Extractor', False), (3, 'Bolt face', False)], y0=236, cols=1)
    svg('sks-bolt-detail', 'The SKS bolt side on: 1 the firing pin, in orange, floating free with no spring; 2 the extractor at the front right; 3 the bolt face.', o, title='Inside the bolt')

def d_trigger_group():
    o = trigger_group(100, 140, 1.3, 'safe')
    o += T(200, 64, 'Safety ON first. Press the catch', 14, 'bold', 'middle')
    o += T(200, 84, 'behind the guard. Swing it out.', 14, 'normal', 'middle')
    o += T(200, 254, 'Only when needed. Hammer under', 14, 'bold', 'middle', RED)
    o += T(200, 274, 'spring force. No further strip.', 14, 'normal', 'middle', RED)
    svg('sks-trigger-group', 'The trigger group with the safety lever in orange in the safe position. Put the safety on first, press the catch behind the trigger guard and swing the group out. Only when needed: the hammer is under spring force; no further disassembly.', o, title='Trigger group: only if needed', h=300)

def d_reassembly():
    o = stitle(1, 'Piston into the tube') + gas_tube(40, 90, 320) + piston(10, 180, 200)
    o += arrow(220, 180, 300, 140, BLAZE, 3)
    o += T(200, 262, 'Small end first, into the front.', 14, 'bold', 'middle')
    svg('sks-re-1', 'Reassembly step 1: slide the gas piston, small end first, into the gas tube.', o)
    R = MID()
    o = stitle(2, 'Tube on, lever down') + R.draw(hl=('gaslever',)) + curved_arrow(*R.P(556, -12), 30, 260, 120, BLAZE, 3)
    o += T(200, 232, 'Front over the gas block. Rear into', 14, 'bold', 'middle')
    o += T(200, 252, 'the rear sight base. Lever down', 14, 'normal', 'middle')
    o += T(200, 272, 'into its notch.', 14, 'normal', 'middle')
    svg('sks-re-2', 'Reassembly step 2: fit the large end of the gas tube over the gas block, swing the rear into the rear sight base and turn the lock lever down into its notch.', o)
    R = CLOSE()
    o = stitle(3, 'Bolt in: extractor right, front') + R.draw(cover=False, carrier=False) + bolt(*R.P(330, -30), 120, BLAZE)
    o += T(200, 252, 'Rear of the bolt about 10 mm', 14, 'bold', 'middle')
    o += T(200, 272, '(3/8 in) from the receiver back wall.', 14, 'normal', 'middle')
    svg('sks-re-3', 'Reassembly step 3: place the bolt, in orange, in the receiver with the extractor at the right front and its rear about 10 mm (three eighths of an inch) from the back wall of the receiver.', o)
    R = CLOSE()
    o = stitle(4, 'Carrier on: press, wiggle, slide') + R.draw(cover=False, carrier=False) + carrier(*R.P(330, -60), 160, BLAZE)
    o += arrow(150, 50, 150, 68, BLAZE, 3) + arrow(210, 104, 260, 104, BLAZE, 3)
    o += T(200, 252, 'Press down, rock until it mates,', 14, 'bold', 'middle')
    o += T(200, 272, 'then slide both fully forward.', 14, 'normal', 'middle')
    svg('sks-re-4', 'Reassembly step 4: lay the bolt carrier, in orange, on the bolt, press down and move it slightly back and forth until it mates, then slide both fully forward.', o)
    R = CLOSE()
    o = stitle(5, 'Spring in, stepped end first') + R.draw(cover=False) + recoil_spring(*R.P(300, -30), 180)
    o += f'<rect x="{R.P(300,-30)[0]-3:.1f}" y="{R.P(300,-30)[1]-9:.1f}" width="24" height="18" fill="none" stroke="{BLAZE}" stroke-width="3" rx="3"/>'
    o += T(200, 272, 'Stepped end goes into the carrier.', 14, 'bold', 'middle')
    svg('sks-re-5', 'Reassembly step 5: insert the recoil spring assembly, stepped end first (outlined in orange), into the bolt carrier.', o)
    R = CLOSE()
    o = stitle(6, 'Cover on, pin in, pin down') + R.draw(hl=('cover', 'coverpin'))
    o += T(200, 232, 'Pin pulled out first. Slide the cover', 14, 'bold', 'middle')
    o += T(200, 252, 'on from the rear. Push the pin in,', 14, 'normal', 'middle')
    o += T(200, 272, 'turn it down. Close the magazine.', 14, 'normal', 'middle')
    svg('sks-re-6', 'Reassembly step 6: with the pin pulled out, slide the top cover on from the rear, push the pin in and turn it down to lock. Close the magazine. Then do the function check.', o)

# ================================================================ chapter 7: deer rifle
def d_energy():
    data = [('Muzzle', 1508, 2648), ('100 yd', 1136, 2090), ('200 yd', 842, 1630)]
    o = ''
    base = 252; sc = 0.058
    o += line(30, base, 380, base, INK, 1.5)
    yk = base - 1000 * sc
    o += line(30, yk, 380, yk, BLAZE, 2, ' stroke-dasharray="6 4"')
    o += line(70, 76, 96, 76, BLAZE, 2, ' stroke-dasharray="6 4"') + T(102, 81, '1,000 ft lb rule of thumb', 14, 'bold', 'start', BLAZE)
    for i, (lab, a, b2) in enumerate(data):
        x = 40 + i * 116
        o += rect(x, base - a * sc, 50, a * sc, SPRUCE, INK, 1) + rect(x + 54, base - b2 * sc, 50, b2 * sc, SAGE, INK, 1)
        o += T(x + 52, base + 18, lab, 14, 'bold', 'middle')
        o += T(x + 25, base - 8, f'{a:,}', 14, 'normal', 'middle', PAPER) + T(x + 79, base - 8, f'{b2:,}', 14, 'normal', 'middle', INK)
    o += rect(70, 44, 14, 14, SPRUCE, INK, 1) + T(90, 56, '7.62x39 123 gr', 14, 'bold')
    o += rect(230, 44, 14, 14, SAGE, INK, 1) + T(250, 56, '.308 150 gr', 14, 'bold')
    svg('sks-energy', 'Bar chart of energy in foot pounds: 7.62x39 123 grain soft point: 1508 at the muzzle, 1136 at 100 yards, 842 at 200 yards. .308 Winchester 150 grain: 2648, about 2090 at 100 m and 1630 at 200 m. A dashed line marks the 1,000 ft lb rule of thumb; the 7.62x39 drops under it past about 130 m.',
        o, title='Energy: 7.62x39 vs your .308', h=300, foot='SKS load in yards (Hornady). .308 in metres.')

def d_range():
    o = circ(200, 260, 210, '#DCE5D3', SPRUCE, 1.5) + circ(200, 260, 150, '#C9D8BE', SPRUCE, 1.5) + circ(200, 260, 80, '#B2C7A4', SPRUCE, 1.5)
    o += circ(200, 255, 8, BLAZE, INK, 1.5)
    o += T(200, 196, '50 m', 14, 'bold', 'middle') + T(200, 124, '100 m', 14, 'bold', 'middle') + T(200, 44, '150 m: your limit', 14, 'bold', 'middle', RED)
    o += T(330, 230, 'Most coastal', 14, 'normal', 'middle') + T(330, 250, 'deer shots', 14, 'normal', 'middle') + T(330, 270, 'are close (Tip)', 14, 'normal', 'middle')
    svg('sks-range', 'Range rings around the hunter: 50 m, 100 m, and 150 m marked as your limit with the SKS. Most coastal deer shots are close (a Tip).', o, title='SKS deer range', h=290)

def d_bc_legal():
    rows = [(True, 'Centrefire rifle: legal for deer'), (True, 'No minimum calibre in the table'), (False, 'No FMJ: expanding bullets only'),
            (True, 'Magazine 5 max (federal law)'), (False, 'Loaded in a vehicle: illegal'), (False, 'No lights, no night shooting'), (False, 'No rifles: Harrison Mills flats')]
    o = ''
    for i, (ok, s) in enumerate(rows):
        y = 58 + i * 31
        o += check(30, y, ok, 0.9) + T(50, y + 5, s, 14, 'bold' if not ok else 'normal')
    svg('sks-bc-legal', 'BC deer rules for the SKS: centrefire rifle legal for deer; no minimum calibre in the table; no full metal jacket, expanding bullets only; magazine 5 maximum by federal law; loaded in a vehicle is illegal; no lights and no night shooting; no rifles on the Harrison Mills flats.',
        o, title='SKS for deer: BC checklist', foot='Study aid only. The regulations are the law.')

def d_group_test():
    o = rect(110, 50, 180, 180, PAPER, INK, 2)
    o += circ(200, 140, 75, '#F3E3D3', INK, 1.5) + T(200, 236, '', 14)
    import random
    random.seed(4)
    for dx, dy in [(-14, -10), (12, -18), (4, 14), (-20, 18), (22, 6)]:
        o += circ(200 + dx, 140 + dy, 5, INK, INK, 1)
    o += T(200, 254, 'Plate 15 cm (6 in) at 100 m.', 14, 'bold', 'middle')
    o += T(200, 274, '5 shots inside? That is your range.', 14, 'normal', 'middle')
    svg('sks-group-test', 'A paper target with a 15 cm (6 inch) paper plate and a 5 shot group inside it at 100 m. If all 5 shots land inside, that distance is within your range.', o, title='The paper plate test (Tip)', h=290)

# ================================================================ chapter 8: upgrades and the law
def d_upgrade_lights():
    cols = [(GREEN, 'GO', ['Sling', 'Recoil pad', 'Fixed stock', 'Soft points']), (BLAZE, 'ASK', ['Scope mount', 'Stock swap', 'Trigger work', 'Bayonet off']),
            (RED, 'NO', ['Cut barrel', 'Unpin mag', 'Bullpup', 'Suppressor'])]
    o = ''
    for i, (c, h, items) in enumerate(cols):
        x = 10 + i * 128
        o += card(x, 46, 124, 216, PAPER, c, 3, 10) + rect(x, 46, 124, 34, c, c, 1, 10) + T(x + 62, 70, h, 16, 'bold', 'middle', PAPER)
        for j, s in enumerate(items):
            o += T(x + 62, 110 + j * 38, s, 14, 'bold', 'middle')
    svg('sks-upgrade-lights', 'Three columns. GO, green: sling, recoil pad, fixed stock, soft point ammunition. ASK a gunsmith, orange: scope mount, a stock swap, trigger work, removing the bayonet. NO, red: cutting the barrel, unpinning the magazine, a bullpup stock, a suppressor.',
        o, title='Upgrades: go, ask, no', foot='ASK means a qualified gunsmith.')

def d_barrel_length():
    o = ''
    marks = [(520, '520 mm standard', GREEN, 'Non restricted'), (478, '478 mm', GREEN, 'Non restricted'), (419, '419 mm', BLAZE, 'Restricted'), (400, '400 mm cut', RED, 'Prohibited')]
    for i, (mm, lab, c, cls) in enumerate(marks):
        y = 66 + i * 46
        w = mm * 0.42
        o += rect(20, y, w, 16, STEELD if c != RED else RED, INK, 1)
        o += T(20 + w + 8, y + 13, lab, 14, 'bold')
        o += T(20, y + 34, cls, 14, 'bold', 'start', c)
    x470 = 20 + 470 * 0.42
    o += line(x470, 56, x470, 250, BLAZE, 2, ' stroke-dasharray="5 4"') + T(x470, 266, '470 mm line', 14, 'bold', 'middle', BLAZE)
    svg('sks-barrel-length', 'Barrel lengths from the RCMP reference table for Type 56 SKS records: standard 520 mm non restricted; 478 mm non restricted; 419 mm restricted; a 400 mm cut barrel prohibited. A dashed line marks 470 mm, the restricted line for semi automatic centrefire rifles.',
        o, title='Barrel length decides the class', foot='Never cut the barrel.')

def d_mag_law():
    o = rect(70, 70, 120, 150, STEEL, INK, 2, 6)
    for i in range(5):
        o += cartridge(82, 92 + i * 18, 96, 'sp')
    o += rect(70, 186, 120, 10, BLAZE, INK, 1.5) + circ(130, 191, 6, BLAZE, INK, 1.5)
    o += T(130, 244, 'Pin or rivet', 14, 'bold', 'middle', BLAZE)
    o += T(214, 90, '5 rounds max for a', 14, 'bold') + T(214, 110, 'semi auto centrefire', 14, 'bold') + T(214, 130, 'rifle magazine.', 14, 'bold')
    o += T(214, 164, 'Removing the pin', 14, 'bold', 'start', RED) + T(214, 184, 'makes it a prohibited', 14, 'bold', 'start', RED) + T(214, 204, 'device. A crime.', 14, 'bold', 'start', RED)
    svg('sks-mag-law', 'A magazine box holding 5 rounds with a pin or rivet, in orange, that blocks more. Text: 5 rounds maximum for a semi automatic centrefire rifle magazine. Removing the pin makes it a prohibited device, a crime.', o, title='The 5 round magazine law', foot='SOR/98-462 Part 4. Criminal Code s. 84.')

def d_stock_rules():
    o = line(20, 120, 380, 120, INK, 1.5)
    x660 = 20 + 660 * 0.35
    o += rect(20, 100, 1020 * 0.35, 40, '#D9DCD7', INK, 1.5, 4) + T(200, 125, 'Standard: about 1020 mm', 14, 'bold', 'middle')
    o += rect(20, 170, 600 * 0.35, 40, '#F3D1C4', RED, 2, 4) + T(20 + 300 * 0.35, 195, 'Folded under 660', 14, 'bold', 'middle', RED)
    o += line(x660, 86, x660, 222, BLAZE, 2, ' stroke-dasharray="5 4"') + T(x660 + 6, 82, '660 mm', 14, 'bold', 'start', BLAZE)
    o += T(30, 252, 'Fires when folded under 660 mm: restricted.', 14, 'bold', 'start', RED)
    o += T(30, 274, 'Bullpup stock: prohibited device.', 14, 'bold', 'start', RED)
    svg('sks-stock-rules', 'Overall length bars: the standard SKS is about 1020 mm. A folding or telescoping stock that lets it fire when shorter than 660 mm makes it restricted. A bullpup stock is a prohibited device.', o, title='Stocks: the 660 mm line', h=300)

def d_red_list():
    rows = ['Full auto or bump fire parts', 'Trigger device for rapid fire', 'Suppressor (silencer)', 'Barrel cut short', 'Magazine over 5 rounds', 'Bullpup stock']
    o = ''
    for i, s in enumerate(rows):
        y = 60 + i * 34
        o += check(32, y, False, 0.9) + T(54, y + 5, s, 14, 'bold')
    svg('sks-red-list', 'Never: full auto or bump fire parts; a trigger device for rapid fire; a suppressor; cutting the barrel short; a magazine over 5 rounds; a bullpup stock.', o, title='Never do these', foot='Each makes it restricted or prohibited.')

def d_upgrade_ladder():
    steps = [('1', 'Gunsmith check', 'safety first'), ('2', 'Soft point ammo', 'legal for deer'), ('3', 'Sling', 'carry hands free'), ('4', 'Peep or scope', 'ask a gunsmith'), ('5', 'Practice', 'rounds at 100 m')]
    o = ''
    for i, (n, a, b2) in enumerate(steps):
        x = 14 + i * 74; y = 220 - i * 34
        o += rect(x, y, 70, 260 - y, SPRUCE if i else BLAZE, INK, 1, 4)
        o += T(x + 35, y + 22, n, 16, 'bold', 'middle', PAPER)
    o += legend([(1, 'Gunsmith check first', True), (2, 'Soft point hunting ammo', False), (3, 'A good sling', False), (4, 'Better sights (ask)', False), (5, 'Practice ammunition', False)], x0=14, y0=56, cols=1, rowh=21)
    svg('sks-upgrade-ladder', 'Upgrade order as steps: 1 gunsmith check first, 2 soft point hunting ammunition, 3 a good sling, 4 better sights after asking a gunsmith, 5 practice ammunition.', o, title='Money order (Tip)', h=290)

def d_check_status():
    steps = [('Read the marks', 'left side of the receiver'), ('Find the record', 'RCMP reference table'), ('Read the news', 'federal SKS review'), ('Ask', 'gunsmith or RCMP')]
    o = ''
    for i, (a, b2) in enumerate(steps):
        y = 56 + i * 52
        o += card(40, y, 320, 42, PAPER, SPRUCE, 2, 8) + badge(i + 1, 62, y + 21)
        o += T(84, y + 18, a, 14, 'bold') + T(84, y + 36, b2, 14, 'normal')
    svg('sks-check-status', 'Before every season: 1 read the marks on the left side of the receiver, 2 find the record in the RCMP Firearms Reference Table, 3 read the news on the federal SKS review, 4 ask a gunsmith or the RCMP.',
        o, title='Check the status each season', foot='Laws change. VERIFY each season.')
