#!/usr/bin/env python3
"""
Beverage Competitor Intelligence workbook generator (Amazon.ca scope).

IMPORTANT HONESTY NOTE (read me):
This environment has NO live access to Amazon.ca. Every fetch of amazon.ca and of
brand storefronts returned HTTP 403, and WebSearch returns only US / secondary-source
*approximate* data. Therefore:
  - STABLE product attributes (brand, sku, size, flavours, nutrition, sweetener,
    claims, positioning) are filled from manufacturer + secondary sources and are
    flagged "approximate / NOT verified on Amazon.ca".
  - LIVE COMMERCIAL fields (price, S&S %, coupon, promo, star rating, #ratings,
    badge, BSR, product URL) are LEFT BLANK and highlighted as "REQUIRES LIVE
    CAPTURE". They are NOT fabricated. Formulas auto-compute the moment a real
    price is entered.
"""

import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, NamedStyle
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule

TODAY = datetime.date.today().isoformat()
FNAME = f"Amazon_ca_Beverage_Competitor_Intel_{TODAY}.xlsx"

# ---------- palette ----------
NAVY      = "1F3864"
BLUE      = "2E5496"
LTBLUE    = "D9E1F2"
GREY      = "F2F2F2"
AMBER     = "FFF2CC"   # needs-capture highlight
AMBER_BDR = "BF9000"
GREEN     = "E2EFDA"
RED       = "F8CBAD"
WHITE     = "FFFFFF"

thin = Side(style="thin", color="BFBFBF")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

HFONT = Font(name="Calibri", bold=True, color=WHITE, size=11)
HFILL = PatternFill("solid", fgColor=NAVY)
HALIGN = Alignment(horizontal="center", vertical="center", wrap_text=True)
WRAP = Alignment(vertical="top", wrap_text=True)
TOP = Alignment(vertical="top")

# ============================================================
# MASTER SHEET COLUMNS  (30 task fields + helpers/provenance)
# ============================================================
# key, header, width, kind
#   kind: 'text','num','money','pct','star','flavours','formula','blankmoney',
#         'blanknum','blanktext'
COLS = [
    ("brand",      "1. Brand", 16, "text"),
    ("sku",        "2. Product Line / SKU Name", 30, "text"),
    ("category",   "3. Category", 26, "text"),
    ("format",     "4. Format & Size", 16, "text"),
    ("pack",       "5. Pack Count", 9, "num"),
    ("price",      "6. One-Time Price (CAD)", 14, "blankmoney"),
    ("ppu",        "7. Price / Unit (CAD)", 13, "formula"),
    ("p100",       "8. Price / 100 mL (CAD)", 13, "formula"),
    ("ss_off",     "9. S&S Offered (Y/N)", 11, "blanktext"),
    ("ss_pct",     "10. S&S Discount %", 12, "blankpct"),
    ("ss_price",   "11. S&S Price After Disc.", 14, "formula"),
    ("coupon",     "12. Coupon on Listing (Y/N + value)", 18, "blanktext"),
    ("promo",      "13. Promotion Text", 22, "blanktext"),
    ("floor",      "14. Lowest Effective Price (stacked)", 16, "formula"),
    ("flavours",   "15. All Flavours in Listing", 40, "flavours"),
    ("caffeine",   "16. Caffeine / Serving (mg)", 12, "num"),
    ("sodium",     "17. Sodium / Serving (mg)", 12, "num"),
    ("potassium",  "18. Potassium / Serving (mg)", 12, "num"),
    ("sugar",      "19. Sugar / Serving (g)", 11, "num"),
    ("calories",   "20. Calories / Serving", 11, "num"),
    ("sweetener",  "21. Sweetener Type", 24, "text"),
    ("claims",     "22. Key Functional Claims", 34, "text"),
    ("star",       "23. Star Rating", 10, "blanknum"),
    ("nratings",   "24. Number of Ratings", 12, "blanknum"),
    ("badge",      "25. Amazon Badge", 16, "blanktext"),
    ("bsr",        "26. Bestseller Rank in Category", 14, "blanktext"),
    ("vband",      "27a. Est. Weekly Velocity (band)", 14, "text"),
    ("vsignal",    "27b. Velocity Signal Used", 34, "text"),
    ("message",    "28. Biggest Selling Message", 40, "text"),
    ("why",        "29. Why a Shopper Chooses This", 46, "text"),
    ("url",        "30. Direct Product URL", 22, "blanktext"),
    # ---- helpers / provenance ----
    ("unitml",     "H1. Unit Vol (mL) [calc helper]", 12, "num"),
    ("couponval",  "H2. Coupon Value (CAD) [calc helper]", 13, "blankmoney"),
    ("prov",       "P1. Attribute Provenance", 30, "text"),
    ("status",     "P2. Commercial-Field Status", 26, "text"),
    ("flag",       "P3. Row Flag", 22, "text"),
]
KEYIDX = {c[0]: i for i, c in enumerate(COLS)}
def col_letter(key):
    return get_column_letter(KEYIDX[key] + 1)

PROV = "Secondary/approx; NOT verified on Amazon.ca"
STATUS = "BLANK → requires live Amazon.ca capture"
FLAG = "⚠ Unverified commercial data"

# Category labels (the five)
C1 = "1) Sparkling electrolyte / functional sparkling"
C2 = "2) Electrolyte beverage (RTD)"
C3 = "3) Functional beverage (still/sparkling)"
C4 = "4) Caffeine & energy beverage"
C5 = "5) Sparkling water & soda"

# ============================================================
# PRODUCT DATA  (stable attributes; commercial fields intentionally blank)
# fields: brand, sku, category, format, pack, flavours, caffeine, sodium,
#         potassium, sugar, calories, sweetener, claims, vband, vsignal,
#         message, why, unitml
# Use None for "Not listed / not applicable" numeric; "Not listed" for text.
# ============================================================
P = []
def add(**k): P.append(k)

# ---------------- CATEGORY 4: CAFFEINE & ENERGY ----------------
add(brand="Red Bull", sku="Red Bull Energy Drink", category=C4, format="250 mL can", pack=24,
    flavours="Original", caffeine=80, sodium=105, potassium=None, sugar=27, calories=112,
    sweetener="Sucrose + glucose", claims="Energy, focus, taurine + B-vitamins",
    vband="Very High", vsignal="Global #1 energy brand; ubiquitous repeat purchase",
    message="The original wings-giving energy hit",
    why="Brand trust and ubiquity — the default energy can people already know.", unitml=250)
add(brand="Red Bull", sku="Red Bull Sugarfree", category=C4, format="250 mL can", pack=12,
    flavours="Original (sugarfree)", caffeine=80, sodium=105, potassium=None, sugar=0, calories=5,
    sweetener="Aspartame + acesulfame-K", claims="Energy, zero sugar, B-vitamins",
    vband="High", vsignal="Strong line extension of #1 brand",
    message="Red Bull energy, no sugar",
    why="No sugar without leaving the brand they trust.", unitml=250)
add(brand="Monster", sku="Monster Energy Original (Green)", category=C4, format="473 mL can", pack=15,
    flavours="Original", caffeine=160, sodium=370, potassium=None, sugar=54, calories=210,
    sweetener="Sugar + glucose", claims="Big energy blend, taurine, ginseng",
    vband="Very High", vsignal="#2 energy brand; huge can = value perception",
    message="A bigger, harder-hitting energy can",
    why="Pack economics and high dose — more caffeine and volume per dollar.", unitml=473)
add(brand="Monster", sku="Monster Energy Ultra Zero (White)", category=C4, format="473 mL can", pack=12,
    flavours="Zero Ultra, Ultra Paradise, Ultra Sunrise, Ultra Watermelon, Ultra Gold",
    caffeine=140, sodium=370, potassium=None, sugar=0, calories=10,
    sweetener="Erythritol + sucralose", claims="Zero sugar, light taste, full energy",
    vband="Very High", vsignal="Best-selling zero-sugar energy line",
    message="Full Monster energy, zero sugar, lighter taste",
    why="No sugar plus a lighter flavour than the green can.", unitml=473)
add(brand="Celsius", sku="Celsius Original Sparkling", category=C4, format="355 mL can", pack=12,
    flavours="Sparkling Orange, Wild Berry, Kiwi Guava, Cola, Fuji Apple Pear, Sparkling Cranberry",
    caffeine=200, sodium=10, potassium=50, sugar=0, calories=10,
    sweetener="Sucralose", claims="Accelerates metabolism, burns body fat (MetaPlus), zero sugar, vitamins",
    vband="Very High", vsignal="Fastest-growing energy brand; fitness crossover",
    message="Functional energy that claims to boost metabolism",
    why="No sugar plus a fitness/metabolism story, not just caffeine.", unitml=355)
add(brand="Celsius", sku="Celsius Essentials", category=C4, format="473 mL can", pack=12,
    flavours="Cosmic Blue, Sparkling Green, Dragonberry, Orange Mango",
    caffeine=270, sodium=10, potassium=None, sugar=0, calories=10,
    sweetener="Sucralose", claims="Higher caffeine, amino acids, zero sugar",
    vband="High", vsignal="Higher-dose line riding Celsius momentum",
    message="A bigger, stronger Celsius for serious energy",
    why="Highest caffeine dose in the Celsius family.", unitml=473)
add(brand="Prime", sku="Prime Energy", category=C4, format="355 mL can", pack=12,
    flavours="Blue Raspberry, Tropical Punch, Lemon Lime, Ice Pop, Strawberry Watermelon",
    caffeine=200, sodium=10, potassium=None, sugar=0, calories=10,
    sweetener="Sucralose + acesulfame-K", claims="Zero sugar, electrolytes, B-vitamins",
    vband="High", vsignal="Influencer-driven (Logan Paul/KSI); youth pull",
    message="Hype-brand energy with zero sugar",
    why="Social-media brand cachet with a zero-sugar profile.", unitml=355)
add(brand="C4", sku="C4 Energy (Performance)", category=C4, format="473 mL can", pack=12,
    flavours="Frozen Bombsicle, Cotton Candy, Strawberry Watermelon, Tropical Blast, Orange Slice",
    caffeine=200, sodium=45, potassium=None, sugar=0, calories=0,
    sweetener="Sucralose + acesulfame-K", claims="Pre-workout energy, beta-alanine (CarnoSyn)",
    vband="Medium", vsignal="Strong in fitness/pre-workout niche",
    message="Pre-workout performance in a ready-to-drink can",
    why="Performance/pre-workout positioning with beta-alanine.", unitml=473)
add(brand="Reign", sku="Reign Total Body Fuel", category=C4, format="473 mL can", pack=12,
    flavours="Razzle Berry, Melon Mania, Sour Apple, Orange Dreamsicle, Lemon HDZ",
    caffeine=300, sodium=10, potassium=None, sugar=0, calories=10,
    sweetener="Sucralose", claims="300 mg caffeine, BCAAs, CoQ10, zero sugar",
    vband="Medium", vsignal="Performance line under Monster umbrella",
    message="Maximum-dose fitness energy with BCAAs",
    why="Highest mainstream caffeine dose plus workout aminos.", unitml=473)
add(brand="Alani Nu", sku="Alani Nu Energy", category=C4, format="355 mL can", pack=12,
    flavours="Hawaiian Shaved Ice, Witch's Brew, Mimosa, Cosmic Stardust, Breezeberry, Watermelon Wave",
    caffeine=200, sodium=35, potassium=None, sugar=0, calories=10,
    sweetener="Sucralose", claims="Zero sugar, vitamins, female-fitness positioning",
    vband="High", vsignal="Fast-growing; strong female demographic & flavours",
    message="Stylish zero-sugar energy aimed at women",
    why="On-trend flavours and aesthetic plus zero sugar.", unitml=355)
add(brand="Bang", sku="Bang Energy", category=C4, format="473 mL can", pack=12,
    flavours="Rainbow Unicorn, Star Blast, Cotton Candy, Blue Razz, Peach Mango",
    caffeine=300, sodium=40, potassium=85, sugar=0, calories=0,
    sweetener="Sucralose", claims="300 mg caffeine, BCAAs, CoQ10, zero calorie",
    vband="Medium", vsignal="Declining vs peak but still high volume",
    message="Zero-calorie high-caffeine performance fuel",
    why="High caffeine at zero calories with aminos.", unitml=473)
add(brand="Rockstar", sku="Rockstar Energy", category=C4, format="473 mL can", pack=12,
    flavours="Original, Sugar Free, Punched Fruit Punch, Pure Zero Silver Ice",
    caffeine=160, sodium=65, potassium=None, sugar=31, calories=122,
    sweetener="Sugar (or sucralose on zero)", claims="Energy blend, taurine, guarana",
    vband="Medium", vsignal="Legacy brand; PepsiCo distribution",
    message="Value-priced legacy energy can",
    why="Familiar legacy brand, usually a lower price point.", unitml=473)
add(brand="GURU", sku="GURU Organic Energy", category=C4, format="355 mL can", pack=12,
    flavours="Original, Lite, Tropical Punch, Yerba Mate",
    caffeine=100, sodium=0, potassium=None, sugar=21, calories=80,
    sweetener="Organic cane sugar (or stevia on Lite)", claims="Certified organic, plant-based, natural caffeine (guarana/green tea)",
    vband="Medium", vsignal="Canadian brand; natural/organic niche leader at home",
    message="Clean, organic, plant-based energy (Canadian)",
    why="Organic, natural-caffeine alternative — a clean-label choice.", unitml=355)
add(brand="Guayakí", sku="Guayakí Yerba Mate", category=C4, format="458 mL can", pack=12,
    flavours="Revel Berry, Enlighten Mint, Bluephoria, Lemon Elation, Orange Exuberance",
    caffeine=150, sodium=10, potassium=None, sugar=28, calories=120,
    sweetener="Organic cane sugar", claims="Organic, Fair Trade yerba mate, clean energy",
    vband="Medium", vsignal="Strong natural-channel following",
    message="Organic yerba mate energy with an ethical story",
    why="Natural yerba-mate caffeine plus organic/Fair-Trade ethics.", unitml=458)
add(brand="NOS", sku="NOS Energy Drink", category=C4, format="473 mL can", pack=12,
    flavours="Original, Sugar Free",
    caffeine=160, sodium=200, potassium=None, sugar=54, calories=210,
    sweetener="Sugar (or sucralose on SF)", claims="High-performance energy blend, taurine",
    vband="Low", vsignal="Niche legacy brand, limited shelf share",
    message="Motorsport-styled high-octane energy",
    why="Legacy enthusiast brand at a value price.", unitml=473)
add(brand="Starbucks", sku="Starbucks Doubleshot Espresso", category=C4, format="444 mL can", pack=12,
    flavours="Espresso, Vanilla, Salted Caramel, White Chocolate",
    caffeine=135, sodium=170, potassium=None, sugar=29, calories=210,
    sweetener="Sugar", claims="Espresso + milk RTD coffee energy",
    vband="High", vsignal="Coffee-energy crossover; broad mainstream appeal",
    message="Café espresso energy in a grab-and-go can",
    why="Trusted coffee taste rather than a synthetic energy flavour.", unitml=444)

# ---------------- CATEGORY 2: ELECTROLYTE (RTD) ----------------
add(brand="Gatorade", sku="Gatorade Thirst Quencher", category=C2, format="591 mL bottle", pack=12,
    flavours="Cool Blue, Fruit Punch, Glacier Freeze, Lemon-Lime, Orange, Riptide Rush",
    caffeine=0, sodium=270, potassium=75, sugar=34, calories=140,
    sweetener="Sugar + dextrose", claims="Rehydrate, replenish electrolytes, sports performance",
    vband="Very High", vsignal="Category-defining sports drink; mass repeat purchase",
    message="The original sports hydration standard",
    why="Sodium-led rehydration with unmatched brand trust.", unitml=591)
add(brand="Gatorade", sku="Gatorade Zero Sugar", category=C2, format="591 mL bottle", pack=12,
    flavours="Glacier Cherry, Lemon-Lime, Orange, Berry, Glacier Freeze",
    caffeine=0, sodium=270, potassium=75, sugar=0, calories=5,
    sweetener="Sucralose + acesulfame-K", claims="Same electrolytes, zero sugar",
    vband="Very High", vsignal="Top zero-sugar sports drink",
    message="Gatorade electrolytes without the sugar",
    why="Full electrolytes minus the sugar load.", unitml=591)
add(brand="Powerade", sku="Powerade Mountain Berry Blast", category=C2, format="591 mL bottle", pack=12,
    flavours="Mountain Berry Blast, Fruit Punch, Grape, White Cherry, Lemon-Lime",
    caffeine=0, sodium=250, potassium=70, sugar=35, calories=130,
    sweetener="High-fructose corn syrup", claims="ION4 electrolytes, B-vitamins, hydration",
    vband="High", vsignal="Strong #2; Coca-Cola distribution & price",
    message="Value-priced electrolyte hydration",
    why="Cheaper electrolyte alternative to Gatorade.", unitml=591)
add(brand="Powerade", sku="Powerade Zero", category=C2, format="591 mL bottle", pack=12,
    flavours="Mixed Berry, Fruit Punch, Grape, White Cherry",
    caffeine=0, sodium=250, potassium=35, sugar=0, calories=0,
    sweetener="Sucralose + acesulfame-K", claims="Zero sugar/calorie, ION4 electrolytes, vitamins",
    vband="High", vsignal="Popular zero-sugar value option",
    message="Zero-calorie electrolytes at a value price",
    why="Cheapest zero-sugar electrolyte option.", unitml=591)
add(brand="BODYARMOR", sku="BODYARMOR Sports Drink", category=C2, format="473 mL bottle", pack=12,
    flavours="Fruit Punch, Strawberry Banana, Orange Mango, Mixed Berry, Tropical Punch",
    caffeine=0, sodium=30, potassium=350, sugar=21, calories=90,
    sweetener="Cane sugar", claims="Potassium-packed electrolytes, coconut water, vitamins, no artificial",
    vband="High", vsignal="Fast-growing premium sports drink (Coca-Cola owned)",
    message="Premium, natural sports hydration with potassium",
    why="Coconut-water electrolytes and a cleaner label than legacy brands.", unitml=473)
add(brand="BODYARMOR", sku="BODYARMOR LYTE", category=C2, format="473 mL bottle", pack=12,
    flavours="Blueberry Pomegranate, Peach Mango, Tropical Coconut, Berry Punch",
    caffeine=0, sodium=30, potassium=350, sugar=3, calories=20,
    sweetener="Stevia + erythritol", claims="Low sugar, potassium electrolytes, coconut water, vitamins",
    vband="Medium", vsignal="Low-sugar variant of fast-grower",
    message="Low-sugar premium hydration",
    why="High potassium with very little sugar.", unitml=473)
add(brand="Prime", sku="Prime Hydration", category=C2, format="500 mL bottle", pack=12,
    flavours="Blue Raspberry, Tropical Punch, Ice Pop, Lemon Lime, Strawberry Watermelon, Meta Moon",
    caffeine=0, sodium=10, potassium=700, sugar=0, calories=20,
    sweetener="Sucralose + acesulfame-K", claims="Zero sugar, BCAAs, electrolytes, coconut water, vitamins",
    vband="High", vsignal="Influencer hype; strong youth pull",
    message="Hype-brand zero-sugar hydration with BCAAs",
    why="Brand cachet plus zero sugar and added BCAAs.", unitml=500)
add(brand="Roar Organic", sku="Roar Organic Electrolyte Infusions", category=C2, format="532 mL bottle", pack=12,
    flavours="Cucumber Watermelon, Mango Clementine, Blueberry Acai, Georgia Peach",
    caffeine=0, sodium=45, potassium=100, sugar=2, calories=10,
    sweetener="Stevia + erythritol", claims="Coconut-water electrolytes, antioxidants, B-vitamins, low sugar, organic",
    vband="Low", vsignal="Emerging organic niche; modest shelf share",
    message="Organic, low-sugar coconut-water hydration",
    why="Organic and barely-sweetened for clean-label hydration seekers.", unitml=532)
add(brand="BioSteel", sku="BioSteel Sports Drink (RTD)", category=C2, format="500 mL bottle", pack=12,
    flavours="Blue Raspberry, White Freeze, Rainbow Twist, Mixed Berry, Peach Mango",
    caffeine=0, sodium=130, potassium=20, sugar=0, calories=0,
    sweetener="Stevia", claims="Zero sugar, electrolytes, no artificial, pro-sports endorsed",
    vband="Medium", vsignal="Canadian brand; strong domestic hockey/sports tie-ins",
    message="Zero-sugar clean sports hydration (Canadian, pro-endorsed)",
    why="Zero sugar plus pro-sports credibility, made in Canada.", unitml=500)
add(brand="CWENCH", sku="CWENCH Hydration", category=C2, format="500 mL bottle", pack=12,
    flavours="Blue Raspberry, Fruit Punch, Green Apple, Watermelon, Peach",
    caffeine=0, sodium=200, potassium=100, sugar=0, calories=15,
    sweetener="Sucralose", claims="Zero sugar, electrolytes, vitamins; Canadian challenger brand",
    vband="Low", vsignal="New Canadian entrant; limited reviews/footprint",
    message="Affordable Canadian zero-sugar hydration",
    why="Local challenger price and zero sugar.", unitml=500)
add(brand="Pedialyte", sku="Pedialyte Electrolyte Solution", category=C2, format="1 L bottle", pack=8,
    flavours="Unflavored, Fruit, Grape, Strawberry, Mixed Fruit",
    caffeine=0, sodium=370, potassium=280, sugar=9, calories=35,
    sweetener="Dextrose + sucralose + acesulfame-K", claims="Medical-grade rehydration, dehydration relief",
    vband="High", vsignal="Trusted clinical rehydration; year-round + flu season spikes",
    message="Doctor-trusted rehydration for illness/dehydration",
    why="Medical-grade electrolyte ratio trusted for genuine dehydration.", unitml=1000)
add(brand="Gatorade", sku="Gatorlyte Rapid Rehydration", category=C2, format="591 mL bottle", pack=12,
    flavours="Orange, Cherry Lime, Glacier Cherry, Strawberry Kiwi",
    caffeine=0, sodium=490, potassium=350, sugar=12, calories=50,
    sweetener="Sugar + sucralose", claims="5 electrolytes, rapid rehydration, specialized formula",
    vband="Medium", vsignal="Premium rapid-rehydration line",
    message="Higher-electrolyte rapid rehydration",
    why="Highest sodium/potassium load for serious rehydration.", unitml=591)
add(brand="Vita Coco", sku="Vita Coco Pure Coconut Water", category=C2, format="330 mL carton", pack=12,
    flavours="Original, Pineapple, Peach Mango, The Original (Pressed)",
    caffeine=0, sodium=25, potassium=470, sugar=11, calories=45,
    sweetener="None (naturally occurring)", claims="Natural electrolytes, potassium, no added sugar (Original)",
    vband="High", vsignal="Market-leading coconut water; mainstream",
    message="Natural hydration straight from coconuts",
    why="Naturally high potassium with no added sugar.", unitml=330)

# ---------------- CATEGORY 3: FUNCTIONAL (still/sparkling) ----------------
add(brand="OLIPOP", sku="OLIPOP Prebiotic Soda", category=C3, format="355 mL can", pack=12,
    flavours="Vintage Cola, Classic Root Beer, Cherry Cola, Strawberry Vanilla, Orange Squeeze, Ginger Ale, Doctor Goodwin, Lemon Lime, Watermelon Lime",
    caffeine=0, sodium=30, potassium=None, sugar=4, calories=45,
    sweetener="Stevia + cassava syrup", claims="9 g prebiotic fiber, gut/digestive health, low sugar",
    vband="Very High", vsignal="Category-leading prebiotic soda; viral DTC + retail",
    message="Soda nostalgia that's actually good for your gut",
    why="Classic soda taste with 9 g fiber and almost no sugar.", unitml=355)
add(brand="Poppi", sku="Poppi Prebiotic Soda", category=C3, format="355 mL can", pack=12,
    flavours="Strawberry Lemon, Raspberry Rose, Classic Cola, Cherry Limeade, Orange, Grape, Watermelon, Ginger Lime",
    caffeine=0, sodium=10, potassium=None, sugar=5, calories=25,
    sweetener="Agave + stevia", claims="Prebiotic, apple cider vinegar, gut health, low sugar",
    vband="Very High", vsignal="Viral brand; Super Bowl ad; strong Gen-Z pull",
    message="Pretty, prebiotic, apple-cider-vinegar soda",
    why="Trendy aesthetic plus a gut-health ACV story at low sugar.", unitml=355)
add(brand="Culture Pop", sku="Culture Pop Probiotic Soda", category=C3, format="355 mL can", pack=12,
    flavours="Ginger Lemon, Wild Berry, Orange Mango, Lime Watermelon, Cherry Pomegranate",
    caffeine=0, sodium=15, potassium=None, sugar=9, calories=40,
    sweetener="Fruit juice + a touch of cane", claims="Live probiotics, real juice, gut health, no stevia",
    vband="Medium", vsignal="Emerging; differentiates on real-juice/no-stevia",
    message="Probiotic soda with real juice, no stevia",
    why="Real-juice taste and live probiotics without stevia.", unitml=355)
add(brand="Mayawell", sku="Mayawell Prebiotic Soda", category=C3, format="355 mL can", pack=12,
    flavours="Strawberry Hibiscus, Prickly Pear, Mango Chili, Grapefruit Jalapeño",
    caffeine=0, sodium=20, potassium=None, sugar=6, calories=40,
    sweetener="Agave inulin", claims="Prebiotic agave fiber, gut health, low sugar, founder-led/Latino-owned",
    vband="Low", vsignal="Small emerging brand; limited footprint",
    message="Agave-fiber prebiotic soda with bold flavours",
    why="Distinctive agave-fiber prebiotic and adventurous flavours.", unitml=355)
add(brand="De La Calle", sku="De La Calle Tepache", category=C3, format="355 mL can", pack=12,
    flavours="Tamarindo, Mango Chili, Original, Guava, Pineapple Spice",
    caffeine=0, sodium=15, potassium=None, sugar=6, calories=45,
    sweetener="Fermented pineapple + agave", claims="Fermented prebiotic tepache, gut health, low sugar",
    vband="Low", vsignal="Niche fermented-soda entrant",
    message="Traditional Mexican fermented tepache, modernized",
    why="Authentic fermented tepache with a prebiotic angle.", unitml=355)
add(brand="GT's", sku="GT's Synergy Raw Kombucha", category=C3, format="480 mL bottle", pack=12,
    flavours="Trilogy, Gingerade, Gingerberry, Strawberry Lemonade, Cosmic Cranberry",
    caffeine=10, sodium=10, potassium=None, sugar=6, calories=30,
    sweetener="Naturally fermented (residual)", claims="Raw kombucha, billions of probiotics, gut health",
    vband="High", vsignal="Kombucha category leader",
    message="The original raw, probiotic kombucha",
    why="Authentic raw kombucha from the category pioneer.", unitml=480)
add(brand="Health-Ade", sku="Health-Ade Kombucha", category=C3, format="473 mL bottle", pack=12,
    flavours="Pink Lady Apple, Pomegranate, Ginger Lemon, Bubbly Rose, California Grape",
    caffeine=15, sodium=10, potassium=None, sugar=7, calories=35,
    sweetener="Naturally fermented (residual)", claims="Probiotics, organic, gut health, glass-bottle quality",
    vband="Medium", vsignal="Premium kombucha; strong natural channel",
    message="Premium small-batch organic kombucha",
    why="Premium organic kombucha taste and quality cues.", unitml=473)
add(brand="Remedy", sku="Remedy Kombucha", category=C3, format="250 mL can", pack=12,
    flavours="Raspberry Lemonade, Ginger Lemon, Peach, Cherry Plum, Passionfruit",
    caffeine=10, sodium=5, potassium=None, sugar=0, calories=8,
    sweetener="None (sugar-free fermented)", claims="Sugar-free kombucha, live cultures, organic acids",
    vband="Medium", vsignal="Sugar-free kombucha differentiator",
    message="Kombucha benefits with no sugar",
    why="Live-culture kombucha at zero sugar.", unitml=250)
add(brand="Recess", sku="Recess Mood", category=C3, format="355 mL can", pack=12,
    flavours="Blackberry Chai, Pomegranate Hibiscus, Blood Orange, Black Cherry, Coconut Lime",
    caffeine=0, sodium=10, potassium=None, sugar=1, calories=25,
    sweetener="Agave + stevia", claims="Adaptogens + magnesium + L-theanine, calm/de-stress",
    vband="Medium", vsignal="Leading calming/adaptogen sparkling brand",
    message="A sparkling drink designed to calm you down",
    why="Adaptogens and L-theanine for relaxation, not energy.", unitml=355)
add(brand="Protein2o", sku="Protein2o Protein Infused Water", category=C3, format="500 mL bottle", pack=12,
    flavours="Wild Cherry, Mixed Berry, Tropical Coconut, Peach Mango, Blueberry Raspberry",
    caffeine=0, sodium=120, potassium=None, sugar=1, calories=70,
    sweetener="Sucralose + acesulfame-K", claims="15 g whey protein isolate, electrolytes, low calorie",
    vband="Medium", vsignal="Leading protein-water; fitness shoppers",
    message="15 g of protein in a light, clear water",
    why="Real protein dose without a heavy milkshake texture.", unitml=500)
add(brand="vitaminwater", sku="vitaminwater (glacéau)", category=C3, format="591 mL bottle", pack=12,
    flavours="XXX Açai-Blueberry-Pomegranate, Power-C Dragonfruit, Focus Kiwi-Strawberry, Energy Tropical Citrus",
    caffeine=50, sodium=0, potassium=None, sugar=27, calories=120,
    sweetener="Cane sugar + crystalline fructose", claims="Added vitamins (B, C), function-by-flavour",
    vband="High", vsignal="Established functional water; mass distribution",
    message="Flavoured water with a vitamin function story",
    why="Familiar vitamin-enhanced water in many functional flavours.", unitml=591)
add(brand="vitaminwater", sku="vitaminwater zero sugar", category=C3, format="591 mL bottle", pack=12,
    flavours="XXX, Power-C, Squeezed Lemonade, Rise Orange",
    caffeine=0, sodium=0, potassium=None, sugar=0, calories=0,
    sweetener="Stevia + erythritol", claims="Vitamins, zero sugar",
    vband="High", vsignal="Strong zero-sugar variant",
    message="Vitamin water with zero sugar",
    why="The vitamin story without the sugar.", unitml=591)
add(brand="Bai", sku="Bai Antioxidant Infusion", category=C3, format="530 mL bottle", pack=12,
    flavours="Brasilia Blueberry, Costa Rica Clementine, Molokai Coconut, Ipanema Pomegranate",
    caffeine=35, sodium=10, potassium=None, sugar=1, calories=10,
    sweetener="Erythritol + stevia", claims="Antioxidants, low sugar, low calorie",
    vband="Medium", vsignal="Established low-sugar functional flavoured water",
    message="Antioxidant flavoured water, barely any sugar",
    why="Flavour with antioxidants and almost no sugar.", unitml=530)
add(brand="Hint", sku="Hint Water (fruit-infused)", category=C3, format="473 mL bottle", pack=12,
    flavours="Watermelon, Blackberry, Cherry, Pineapple, Peach, Crisp Apple",
    caffeine=0, sodium=0, potassium=None, sugar=0, calories=0,
    sweetener="None (fruit essence only)", claims="Zero sweetener, zero sugar, zero calorie, just fruit essence",
    vband="Medium", vsignal="Leading unsweetened flavoured water",
    message="Fruit-flavoured water with absolutely no sweetener",
    why="Real fruit essence with zero sweeteners of any kind.", unitml=473)

# ---------------- CATEGORY 5: SPARKLING WATER & SODA ----------------
add(brand="Spindrift", sku="Spindrift Sparkling Water", category=C5, format="355 mL can", pack=12,
    flavours="Lemon, Raspberry Lime, Grapefruit, Half-Tea Half-Lemon, Pineapple, Blackberry, Strawberry, Orange Mango",
    caffeine=0, sodium=0, potassium=None, sugar=2, calories=10,
    sweetener="None (real squeezed fruit)", claims="Real squeezed fruit, no added sugar/sweetener",
    vband="High", vsignal="Premium real-fruit seltzer; strong loyalty",
    message="Sparkling water made with real squeezed fruit",
    why="Tastes like real fruit because it is — not flavour essence.", unitml=355)
add(brand="LaCroix", sku="LaCroix Sparkling Water", category=C5, format="355 mL can", pack=12,
    flavours="Pamplemousse, Lime, Pure, Coconut, Berry, Passionfruit, Key Lime, CuréaLémon",
    caffeine=0, sodium=0, potassium=None, sugar=0, calories=0,
    sweetener="None (natural essence)", claims="Zero calorie/sugar/sweetener, naturally essenced",
    vband="Very High", vsignal="Iconic seltzer; huge mainstream base",
    message="The cult zero-everything sparkling water",
    why="Zero calories/sugar with cult brand status and price.", unitml=355)
add(brand="bubly", sku="bubly Sparkling Water", category=C5, format="355 mL can", pack=12,
    flavours="Cherry, Lime, Grapefruit, Mango, Strawberry, Blackberry, Raspberry, Watermelon",
    caffeine=0, sodium=0, potassium=None, sugar=0, calories=0,
    sweetener="None (natural flavours)", claims="Zero calorie/sugar/sweetener",
    vband="Very High", vsignal="PepsiCo muscle; aggressive pricing & distribution",
    message="Cheerful zero-calorie sparkling water at a sharp price",
    why="Mainstream zero-everything seltzer, usually well priced.", unitml=355)
add(brand="Waterloo", sku="Waterloo Sparkling Water", category=C5, format="355 mL can", pack=12,
    flavours="Black Cherry, Grape, Watermelon, Lemon-Lime, Peach, Mango Orange, Summer Berry",
    caffeine=0, sodium=0, potassium=None, sugar=0, calories=0,
    sweetener="None (natural flavours)", claims="Zero calorie/sugar, bold true-to-fruit flavour",
    vband="Medium", vsignal="Flavour-forward challenger; growing",
    message="Bolder, more flavour-true sparkling water",
    why="Stronger, more realistic flavour than the big seltzers.", unitml=355)
add(brand="Perrier", sku="Perrier Carbonated Mineral Water", category=C5, format="330 mL can", pack=10,
    flavours="Original, Lime, Lemon, Pink Grapefruit, Strawberry, Peach",
    caffeine=0, sodium=10, potassium=None, sugar=0, calories=0,
    sweetener="None", claims="Natural French mineral water, naturally carbonated, premium",
    vband="High", vsignal="Iconic premium mineral water; mainstream + horeca",
    message="Premium French sparkling mineral water",
    why="Premium imported mineral-water cachet and crisp bubbles.", unitml=330)
add(brand="San Pellegrino", sku="S.Pellegrino Sparkling Natural Mineral Water", category=C5, format="500 mL bottle", pack=12,
    flavours="Original (mineral)",
    caffeine=0, sodium=35, potassium=None, sugar=0, calories=0,
    sweetener="None", claims="Italian natural mineral water, fine perlage, premium dining",
    vband="High", vsignal="Premium mineral water; dining staple",
    message="Italy's fine-dining sparkling mineral water",
    why="Premium mineral profile and table-water prestige.", unitml=500)
add(brand="San Pellegrino", sku="Sanpellegrino Aranciata (Italian Sparkling Drink)", category=C5, format="330 mL can", pack=6,
    flavours="Aranciata, Aranciata Rossa, Limonata, Pompelmo, Melograno e Arancia",
    caffeine=0, sodium=10, potassium=None, sugar=16, calories=70,
    sweetener="Sugar + real fruit juice", claims="Real fruit juice Italian sparkling beverage",
    vband="Medium", vsignal="Premium imported fruit soda; recognizable",
    message="Italian fruit soda with real juice",
    why="Premium imported fruit-soda taste with real juice.", unitml=330)
add(brand="Liquid Death", sku="Liquid Death Sparkling Water", category=C5, format="500 mL can", pack=12,
    flavours="Severed Lime, Mango Chainsaw, Berry It Alive, Convicted Melon, Grape of Wrath",
    caffeine=0, sodium=20, potassium=None, sugar=0, calories=0,
    sweetener="None (natural flavours / agave on some)", claims="Mountain water, zero sugar, irreverent brand, recyclable tallboy",
    vband="High", vsignal="Viral brand; huge cultural pull beyond product",
    message="Edgy 'murder your thirst' sparkling water in a tallboy",
    why="Brand attitude and packaging as much as the water itself.", unitml=500)
add(brand="Liquid Death", sku="Liquid Death Mountain Water (Still)", category=C5, format="500 mL can", pack=12,
    flavours="Still (unflavoured)",
    caffeine=0, sodium=20, potassium=None, sugar=0, calories=0,
    sweetener="None", claims="Real mountain water, recyclable tallboy can, brand-driven",
    vband="High", vsignal="Viral brand halo on plain water",
    message="Plain mountain water made cool by branding",
    why="Buys the brand and the can, not just hydration.", unitml=500)
add(brand="Topo Chico", sku="Topo Chico Mineral Water", category=C5, format="355 mL bottle", pack=12,
    flavours="Original, Twist of Lime, Twist of Grapefruit, Tangerine",
    caffeine=0, sodium=20, potassium=None, sugar=0, calories=0,
    sweetener="None", claims="Mexican mineral water, strong carbonation, cult following",
    vband="Medium", vsignal="Cult mineral water; cocktail mixer crossover",
    message="Cult Mexican mineral water with serious fizz",
    why="Hard carbonation and mixer credibility.", unitml=355)
add(brand="Polar", sku="Polar Seltzer", category=C5, format="355 mL can", pack=8,
    flavours="Black Cherry, Ruby Red Grapefruit, Lime, Mandarin, Raspberry Lime, Vanilla",
    caffeine=0, sodium=0, potassium=None, sugar=0, calories=0,
    sweetener="None (natural flavours)", claims="Zero calorie/sugar, wide flavour range, value",
    vband="Medium", vsignal="Value seltzer with broad flavour range",
    message="Value seltzer with a huge flavour range",
    why="Lots of flavours at a value price.", unitml=355)
add(brand="AHA", sku="AHA Sparkling Water", category=C5, format="355 mL can", pack=8,
    flavours="Lime + Watermelon, Citrus + Green Tea (+caffeine), Black Cherry + Coffee, Peach + Honey",
    caffeine=30, sodium=0, potassium=None, sugar=0, calories=0,
    sweetener="None (natural flavours)", claims="Zero sugar, bold dual-flavour pairings, some with caffeine",
    vband="Medium", vsignal="Coca-Cola seltzer entry; broad distribution",
    message="Bold paired-flavour seltzer, some caffeinated",
    why="Unusual flavour pairings (and optional caffeine) at value price.", unitml=355)
add(brand="Montellier", sku="Montellier Carbonated Natural Spring Water", category=C5, format="355 mL can", pack=12,
    flavours="Original, Lime, Lemon, Mango, Cranberry, Raspberry",
    caffeine=0, sodium=5, potassium=None, sugar=0, calories=0,
    sweetener="None", claims="Canadian natural spring water, carbonated, zero everything",
    vband="Medium", vsignal="Established Canadian sparkling brand (domestic strength)",
    message="Canadian carbonated spring water",
    why="Local Canadian sparkling water, often value priced.", unitml=355)
add(brand="Eska", sku="Eska Sparkling Spring Water", category=C5, format="500 mL bottle", pack=12,
    flavours="Original, Lemon, Lime",
    caffeine=0, sodium=5, potassium=None, sugar=0, calories=0,
    sweetener="None", claims="Canadian glacial-era spring water, naturally pure",
    vband="Low", vsignal="Canadian regional brand; modest reach",
    message="Pure Canadian spring water, sparkling",
    why="Canadian-sourced purity story.", unitml=500)
add(brand="Coca-Cola", sku="Coca-Cola Classic", category=C5, format="355 mL can", pack=12,
    flavours="Classic",
    caffeine=34, sodium=45, potassium=None, sugar=39, calories=140,
    sweetener="High-fructose corn syrup / sugar", claims="Classic cola (no functional claim)",
    vband="Very High", vsignal="World's #1 soda; baseline mass volume",
    message="The classic cola benchmark",
    why="Universal taste and brand — the soda baseline.", unitml=355)
add(brand="Olipop", sku="(see Functional tab — cross-listed)", category=C5, format="—", pack=None,
    flavours="(cross-reference only)", caffeine=None, sodium=None, potassium=None, sugar=None, calories=None,
    sweetener="—", claims="Cross-listed: primary entry in Functional tab",
    vband="—", vsignal="Cross-reference placeholder", message="—",
    why="—", unitml=None)

# ---------------- CATEGORY 1: SPARKLING ELECTROLYTE / FUNCTIONAL SPARKLING ----------------
add(brand="Sparkling Ice", sku="Sparkling Ice (+ Antioxidants & Vitamins)", category=C1, format="503 mL bottle", pack=12,
    flavours="Black Raspberry, Cherry Limeade, Orange Mango, Kiwi Strawberry, Coconut Pineapple, Classic Lemonade",
    caffeine=0, sodium=25, potassium=None, sugar=0, calories=5,
    sweetener="Sucralose", claims="Zero sugar, vitamins A/D/B, antioxidants (green tea), bold flavour",
    vband="High", vsignal="Mass-market functional sparkling; strong shelf share",
    message="Bold zero-sugar sparkling with added vitamins",
    why="Big flavour and added vitamins at zero sugar.", unitml=503)
add(brand="BUBBL'R", sku="BUBBL'R Antioxidant Sparkling Water", category=C1, format="473 mL can", pack=12,
    flavours="Blackberribrilliance, Strawbeary Lemonade, Tropic'b''r, Raspberry Lemonade, Blue Crush'r",
    caffeine=69, sodium=15, potassium=None, sugar=0, calories=10,
    sweetener="Erythritol + stevia", claims="Natural caffeine (69 mg), antioxidants, B-vitamins, zero sugar",
    vband="Medium", vsignal="Mid-caffeine functional sparkling; growing",
    message="Sparkling water with a light caffeine + antioxidant lift",
    why="Light natural caffeine and antioxidants without an energy-drink dose.", unitml=473)
add(brand="Phocus", sku="Phocus Caffeinated Sparkling Water", category=C1, format="350 mL can", pack=12,
    flavours="Grapefruit, Yuzu Lime, Cucumber, Black Cherry, Natural, Lemon",
    caffeine=75, sodium=0, potassium=None, sugar=0, calories=0,
    sweetener="None (natural flavours)", claims="75 mg caffeine + L-theanine for smooth focus, zero sugar/calorie",
    vband="Medium", vsignal="Niche caffeinated sparkling; focus positioning",
    message="Sparkling water that wakes you up smoothly",
    why="Coffee-level caffeine plus L-theanine in a calorie-free seltzer.", unitml=350)
add(brand="Aura Bora", sku="Aura Bora Herbal Sparkling Water", category=C1, format="355 mL can", pack=12,
    flavours="Lavender Cucumber, Basil Berry, Lemongrass Coconut, Cactus Rose, Peppermint Watermelon",
    caffeine=0, sodium=0, potassium=None, sugar=0, calories=5,
    sweetener="None (herbal extracts)", claims="Herb/flower/fruit flavours, zero sugar, calm/unique sensory",
    vband="Low", vsignal="Emerging craft brand; small but loyal",
    message="Whimsical herbal sparkling water for the curious",
    why="Unusual herbal-botanical flavours you can't get elsewhere.", unitml=355)
add(brand="Sound", sku="Sound Sparkling Water (Tea/Botanical)", category=C1, format="355 mL can", pack=12,
    flavours="Blackberry + Lemon Verbena, Grapefruit + Hops, Lemon Ginger, Cucumber + Mint Green Tea",
    caffeine=15, sodium=0, potassium=None, sugar=0, calories=0,
    sweetener="None (unsweetened)", claims="Real brewed tea/botanicals, unsweetened, zero sugar/calorie",
    vband="Low", vsignal="Emerging unsweetened-botanical niche",
    message="Unsweetened sparkling brewed tea and botanicals",
    why="Genuinely unsweetened with real tea/botanical character.", unitml=355)
add(brand="Halo Sport", sku="Halo Sport Sparkling Electrolyte Water", category=C1, format="355 mL can", pack=12,
    flavours="Lemon Lime, Berry, Orange, Grapefruit",
    caffeine=0, sodium=110, potassium=40, sugar=0, calories=5,
    sweetener="Stevia", claims="Sparkling electrolytes, zero sugar, light hydration",
    vband="Low", vsignal="Small emerging sparkling-electrolyte entrant",
    message="Sparkling, lightly-mineralled hydration",
    why="Electrolytes in a fizzy, zero-sugar format.", unitml=355)
add(brand="Gorgie", sku="Gorgie Energy Sparkling Water", category=C1, format="355 mL can", pack=12,
    flavours="Watermelon, Tropical, Strawberry Lemonade, Cherry Limeade",
    caffeine=120, sodium=10, potassium=None, sugar=0, calories=10,
    sweetener="Stevia", claims="120 mg natural caffeine, L-theanine, biotin, zero sugar, 'pretty' energy",
    vband="Low", vsignal="New social-driven entrant; small footprint",
    message="A lighter, prettier caffeinated sparkling energy",
    why="Mid-dose caffeine with a clean, lifestyle aesthetic.", unitml=355)
add(brand="United Sodas", sku="United Sodas of America", category=C1, format="355 mL can", pack=12,
    flavours="Wild Berry, Black Cherry, Mango Chili, Lemon Lime, Peach Vanilla",
    caffeine=0, sodium=10, potassium=None, sugar=8, calories=30,
    sweetener="Cane sugar (small amount)", claims="Low calorie, light sparkling soda, minimalist branding",
    vband="Low", vsignal="Niche premium soda; design-led",
    message="A light, low-calorie modern soda",
    why="Low-calorie soda with a clean, design-forward identity.", unitml=355)

# ============================================================
# WORKBOOK BUILD
# ============================================================
wb = Workbook()

def style_header(ws, ncols, row=1):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.font = HFONT; cell.fill = HFILL; cell.alignment = HALIGN
        cell.border = BORDER
    ws.row_dimensions[row].height = 42

def set_widths(ws, widths):
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

# ---------- README ----------
def build_readme():
    ws = wb.active; ws.title = "README & Methodology"
    ws.sheet_view.showGridLines = False
    set_widths(ws, [3, 28, 110])
    A = ws.cell(row=2, column=2, value="Amazon.ca Beverage — Competitor Intelligence Master File")
    A.font = Font(bold=True, size=18, color=NAVY)
    ws.cell(row=3, column=2, value=f"Build date: {TODAY}").font = Font(italic=True, size=11, color=BLUE)

    rows = [
        ("", ""),
        ("⚠ CRITICAL — READ FIRST", ""),
        ("Data-access limitation",
         "This file was generated in an environment with NO live access to Amazon.ca. Every attempt to open "
         "amazon.ca (search + product pages) and brand storefronts returned HTTP 403 Forbidden. Web search returns "
         "only US / secondary-source APPROXIMATE data, not live Canadian listings. As a result, this workbook does "
         "NOT contain live Amazon.ca prices, Subscribe & Save terms, coupons, star ratings, review counts, badges, "
         "bestseller ranks, or product URLs. Those cells are intentionally LEFT BLANK and highlighted amber so they "
         "are filled by live capture — they are NOT fabricated."),
        ("What IS in the file (and its confidence)",
         "Stable product attributes — brand, SKU, format/size, typical pack, flavours, caffeine/sodium/potassium/"
         "sugar/calories, sweetener, functional claims, positioning, and an honest velocity ESTIMATE — are filled "
         "from manufacturer + secondary sources. Treat every one of these as APPROXIMATE and verify against the live "
         "listing. Nutrition is per single serving (usually one can/bottle) and varies by flavour."),
        ("What is BLANK and must be captured live",
         "Fields 6 (One-Time Price), 9-14 (S&S offered/%/price, coupon, promo, stacked floor), 23 (Star Rating), "
         "24 (# Ratings), 25 (Badge), 26 (BSR), 30 (URL), plus helper H2 (Coupon Value). These are amber-highlighted "
         "on every Master tab."),
        ("Built-in automation",
         "Fields 7 (Price/Unit), 8 (Price/100 mL), 11 (S&S Price after discount) and 14 (Lowest Effective/stacked) are "
         "LIVE FORMULAS. Enter One-Time Price (F), pack (E), S&S % (J) as a decimal e.g. 0.15, and coupon value (H2). "
         "Everything recomputes instantly and the amber flag logic clears."),
        ("Stacking model used for field 14",
         "Lowest Effective Price = (One-Time Price − Coupon Value) × (1 − S&S %). This assumes coupon and "
         "subscription stack on the same order, which is the usual Amazon behaviour but should be confirmed per listing."),
        ("Velocity estimate (field 27)",
         "Bands (Low/Medium/High/Very High) are an ESTIMATE only, inferred from brand prominence and category position "
         "because live review counts/BSR were not accessible. The signal used is recorded in column 27b. Re-derive bands "
         "from real # Ratings + BSR once captured. NEVER read these as hard unit numbers."),
        ("Scope rules applied",
         "Ready-to-drink only. Powders, drink-mix packets, and tablets (e.g. Liquid I.V., Nuun, Cure powder, LMNT) are "
         "EXCLUDED. Each product is assigned ONE primary category; functional sparkling overlaps (e.g. Poppi/OLIPOP) are "
         "filed under Functional, not Sparkling Water."),
        ("Category overlap note",
         "Several products legitimately fit two categories (e.g. Celsius = energy + functional; Phocus = sparkling + "
         "caffeine). Primary category chosen for the Master tab; cross-references noted where useful."),
        ("How to finish this file (workflow)",
         "1) Open each Amazon.ca listing.  2) Fill the amber cells (price, S&S, coupon, ratings, badge, BSR, URL).  "
         "3) Confirm/correct nutrition against the live label.  4) Update the Provenance/Status columns from 'Secondary' "
         "to 'Verified live YYYY-MM-DD'.  5) Re-sort the cross-tabs."),
        ("Tabs in this workbook",
         "README (this), Data Dictionary, 5 Master tabs (one per category), then cross-category tabs: Pricing & Promo "
         "Analysis, Subscription Strategy, Why They Win, Velocity Estimate, Flavour Map, Sources."),
        ("Integrity statement",
         "Nothing in the commercial columns is invented. Where a live figure could not be obtained it is blank and "
         "flagged. This protects the file from failing a fact-check against the live listings."),
    ]
    r = 5
    for title, body in rows:
        tc = ws.cell(row=r, column=2, value=title)
        if title.startswith("⚠"):
            tc.font = Font(bold=True, size=13, color="C00000")
        else:
            tc.font = Font(bold=True, size=11, color=NAVY)
        tc.alignment = WRAP
        bc = ws.cell(row=r, column=3, value=body); bc.alignment = WRAP
        if body:
            # estimate height
            ws.row_dimensions[r].height = max(28, 15 * (1 + len(body) // 95))
        r += 1
    return ws

# ---------- DATA DICTIONARY ----------
def build_dictionary():
    ws = wb.create_sheet("Data Dictionary")
    ws.sheet_view.showGridLines = False
    headers = ["Field #", "Field name", "Definition / how to read it", "Source class", "Status in this file"]
    set_widths(ws, [8, 30, 70, 24, 26])
    for i, h in enumerate(headers, 1):
        ws.cell(row=1, column=i, value=h)
    style_header(ws, len(headers))
    ws.freeze_panes = "A2"
    defn = [
        ("1","Brand","Manufacturer/brand name as marketed.","Stable","Filled (approx)"),
        ("2","Product Line / SKU Name","Exact product/line name; confirm spelling on listing.","Stable","Filled (approx)"),
        ("3","Category","One of the five scope categories (primary).","Assigned","Filled"),
        ("4","Format & Size","Container type and single-unit size.","Stable","Filled (approx)"),
        ("5","Pack Count","Units per multipack (typical Amazon pack).","Stable","Filled (typical — verify)"),
        ("6","One-Time Price (CAD)","List one-time purchase price.","LIVE Amazon.ca","BLANK — capture"),
        ("7","Price / Unit (CAD)","=Price ÷ Pack. Formula.","Calculated","Auto when 6 filled"),
        ("8","Price / 100 mL (CAD)","=Price ÷ (UnitVol × Pack) × 100. Formula.","Calculated","Auto when 6 filled"),
        ("9","S&S Offered (Y/N)","Whether Subscribe & Save is offered.","LIVE Amazon.ca","BLANK — capture"),
        ("10","S&S Discount %","Subscription discount (enter decimal 0.15 = 15%).","LIVE Amazon.ca","BLANK — capture"),
        ("11","S&S Price After Discount","=Price × (1 − S&S%). Formula.","Calculated","Auto when 6 & 10 filled"),
        ("12","Coupon on Listing (Y/N + value)","Clippable coupon presence and value.","LIVE Amazon.ca","BLANK — capture"),
        ("13","Promotion Text","Multi-buy / lightning / Prime-excl / bundle text.","LIVE Amazon.ca","BLANK — capture"),
        ("14","Lowest Effective Price (stacked)","=(Price − CouponVal) × (1 − S&S%). Formula.","Calculated","Auto when inputs filled"),
        ("15","All Flavours","Flavours offered in/around the listing.","Stable","Filled (approx)"),
        ("16","Caffeine / Serving (mg)","Per single serving; 'Not listed' if none.","Stable","Filled (approx)"),
        ("17","Sodium / Serving (mg)","Per single serving.","Stable","Filled (approx)"),
        ("18","Potassium / Serving (mg)","Per single serving; blank if not listed.","Stable","Filled (approx)"),
        ("19","Sugar / Serving (g)","Per single serving.","Stable","Filled (approx)"),
        ("20","Calories / Serving","Per single serving.","Stable","Filled (approx)"),
        ("21","Sweetener Type","Caloric/non-caloric sweetener(s) used.","Stable","Filled (approx)"),
        ("22","Key Functional Claims","Headline benefit claims.","Stable","Filled (approx)"),
        ("23","Star Rating","Average stars on listing.","LIVE Amazon.ca","BLANK — capture"),
        ("24","Number of Ratings","Count of ratings.","LIVE Amazon.ca","BLANK — capture"),
        ("25","Amazon Badge","Amazon's Choice / Best Seller / Overall Pick.","LIVE Amazon.ca","BLANK — capture"),
        ("26","Bestseller Rank in Category","BSR if shown.","LIVE Amazon.ca","BLANK — capture"),
        ("27a","Est. Weekly Velocity (band)","ESTIMATE band; not a unit count.","Estimate","Filled (estimate)"),
        ("27b","Velocity Signal Used","What the estimate is based on.","Estimate","Filled"),
        ("28","Biggest Selling Message","Paraphrased headline hook.","Interpretation","Filled"),
        ("29","Why a Shopper Chooses This","One-sentence buyer rationale.","Interpretation","Filled"),
        ("30","Direct Product URL","Listing URL.","LIVE Amazon.ca","BLANK — capture"),
        ("H1","Unit Vol (mL) helper","Single-unit volume in mL for 100 mL math.","Stable","Filled"),
        ("H2","Coupon Value (CAD) helper","Numeric coupon value for stacking formula.","LIVE Amazon.ca","BLANK — capture"),
        ("P1","Attribute Provenance","Source/confidence of stable attributes.","Meta","Filled"),
        ("P2","Commercial-Field Status","State of the live commercial cells.","Meta","Filled"),
        ("P3","Row Flag","Flags rows with unverified data.","Meta","Filled"),
    ]
    for ri, row in enumerate(defn, start=2):
        for ci, val in enumerate(row, start=1):
            c = ws.cell(row=ri, column=ci, value=val); c.alignment = WRAP; c.border = BORDER
            if ri % 2 == 0:
                c.fill = PatternFill("solid", fgColor=GREY)
        ws.row_dimensions[ri].height = 26
    return ws

# ---------- MASTER TABS ----------
BLANK_KINDS = {"blankmoney","blanknum","blanktext","blankpct"}
MONEY_FMT = '"$"#,##0.00'
PCT_FMT = '0%'

def build_master(sheet_name, category_label):
    ws = wb.create_sheet(sheet_name)
    headers = [c[1] for c in COLS]
    set_widths(ws, [c[2] for c in COLS])
    for i, h in enumerate(headers, 1):
        ws.cell(row=1, column=i, value=h)
    style_header(ws, len(headers))
    ws.freeze_panes = "C2"   # freeze header row + Brand/SKU columns

    prods = [p for p in P if p["category"] == category_label]
    r = 2
    for p in prods:
        excel_row = r
        for ci, (key, hdr, w, kind) in enumerate(COLS, start=1):
            cell = ws.cell(row=excel_row, column=ci)
            cell.border = BORDER; cell.alignment = WRAP
            if kind == "formula":
                F = f"$F{excel_row}"; E = f"$E{excel_row}"; J = f"$J{excel_row}"
                AF = f"${col_letter('unitml')}{excel_row}"
                AG = f"${col_letter('couponval')}{excel_row}"
                if key == "ppu":
                    cell.value = f'=IF(AND(ISNUMBER({F}),ISNUMBER({E}),{E}<>0),{F}/{E},"")'
                    cell.number_format = MONEY_FMT
                elif key == "p100":
                    cell.value = f'=IF(AND(ISNUMBER({F}),ISNUMBER({AF}),ISNUMBER({E}),({AF}*{E})<>0),{F}/({AF}*{E})*100,"")'
                    cell.number_format = MONEY_FMT
                elif key == "ss_price":
                    cell.value = f'=IF(AND(ISNUMBER({F}),ISNUMBER({J})),{F}*(1-{J}),"")'
                    cell.number_format = MONEY_FMT
                elif key == "floor":
                    cell.value = (f'=IF(ISNUMBER({F}),({F}-IF(ISNUMBER({AG}),{AG},0))*'
                                  f'(1-IF(ISNUMBER({J}),{J},0)),"")')
                    cell.number_format = MONEY_FMT
            elif kind in BLANK_KINDS:
                # leave blank, amber highlight + border
                cell.fill = PatternFill("solid", fgColor=AMBER)
                if kind == "blankmoney":
                    cell.number_format = MONEY_FMT
                elif kind == "blankpct":
                    cell.number_format = PCT_FMT
            else:
                # data
                val = None
                if key == "prov": val = PROV
                elif key == "status": val = STATUS
                elif key == "flag": val = FLAG
                else: val = p.get(key, "")
                if val is None: val = "Not listed"
                cell.value = val
                if kind == "money": cell.number_format = MONEY_FMT
                if key in ("caffeine","sodium","potassium","sugar","calories") and isinstance(val,(int,float)):
                    cell.alignment = Alignment(vertical="top", horizontal="center")
        ws.row_dimensions[excel_row].height = 60
        r += 1

    last_row = r - 1
    ncols = len(COLS)
    # autofilter for sortability
    ws.auto_filter.ref = f"A1:{get_column_letter(ncols)}{max(last_row,1)}"

    # Yes/No data validation on S&S offered + coupon (text Y/N portion)
    dv = DataValidation(type="list", formula1='"Yes,No"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"{col_letter('ss_off')}2:{col_letter('ss_off')}{last_row}")

    # conditional format: highlight blank price rows' flag column (red-ish) until filled
    if last_row >= 2:
        price_col = col_letter("price")
        rng = f"{col_letter('flag')}2:{col_letter('flag')}{last_row}"
        ws.conditional_formatting.add(
            rng,
            FormulaRule(formula=[f'ISBLANK(${price_col}2)'],
                        fill=PatternFill("solid", fgColor=RED)))
    return ws

# ---------- CROSS TABS ----------
def simple_sheet(name, headers, widths):
    ws = wb.create_sheet(name)
    set_widths(ws, widths)
    for i, h in enumerate(headers, 1):
        ws.cell(row=1, column=i, value=h)
    style_header(ws, len(headers))
    ws.freeze_panes = "A2"
    return ws

def fill_rows(ws, rows, money_cols=(), pct_cols=(), amber_cols=(), start=2, rowh=30):
    r = start
    for row in rows:
        for ci, val in enumerate(row, start=1):
            c = ws.cell(row=r, column=ci, value=val)
            c.alignment = WRAP; c.border = BORDER
            if ci in money_cols and val in (None, ""):
                c.fill = PatternFill("solid", fgColor=AMBER); c.number_format = MONEY_FMT
            elif ci in money_cols:
                c.number_format = MONEY_FMT
            if ci in pct_cols and val in (None, ""):
                c.fill = PatternFill("solid", fgColor=AMBER); c.number_format = PCT_FMT
            if ci in amber_cols and (val in (None, "") or val == "(capture)"):
                c.fill = PatternFill("solid", fgColor=AMBER)
            if r % 2 == 0 and not c.fill.fgColor.rgb in (f"00{AMBER}",):
                pass
        ws.row_dimensions[r].height = rowh
        r += 1
    ws.auto_filter.ref = f"A1:{get_column_letter(len(ws[1]))}{max(r-1,1)}"
    return ws

def build_pricing_promo():
    ws = simple_sheet("Pricing & Promo Analysis",
        ["Brand","SKU","Category","One-Time Price (CAD)","S&S Disc %","S&S Price (CAD)",
         "Coupon (CAD)","Lowest Effective / True Floor (CAD)","Promo text","Promotion-reliance read (qualitative)"],
        [16,32,26,15,11,14,12,16,24,46])
    promo_read = {
        "Red Bull":"Rarely discounts; relies on brand. Light S&S at most.",
        "Monster":"Pack-size value play; occasional multipack promos.",
        "Celsius":"Heavy S&S + frequent coupons to drive trial/subscription.",
        "Prime":"Hype-led; sporadic deals, scarcity over discount.",
        "Gatorade":"Volume + everyday-low-price; modest S&S.",
        "Powerade":"Undercuts Gatorade on price as core lever.",
        "BODYARMOR":"Premium price; promos to defend vs Gatorade.",
        "Poppi":"Trial-driving coupons + S&S; aggressive on first purchase.",
        "OLIPOP":"S&S to lock repeat; premium price held otherwise.",
        "LaCroix":"Everyday value; little need to promote.",
        "bubly":"PepsiCo price aggression is the lever.",
        "Liquid Death":"Brand premium; bundles/merch over price cuts.",
        "Spindrift":"Premium; selective S&S to retain.",
    }
    rows = []
    for p in P:
        if p["sku"].startswith("(see"): continue
        rows.append([p["brand"], p["sku"], p["category"], "", "", "", "", "",
                     "(capture)", promo_read.get(p["brand"], "Capture live promo to assess.")])
    fill_rows(ws, rows, money_cols=(4,6,7,8), pct_cols=(5,), amber_cols=(9,), rowh=30)
    note = ws.cell(row=len(rows)+3, column=1,
        value="Sort by column H (True Floor) once live prices are entered. Price/S&S/coupon cells are amber = capture live. "
              "Qualitative promo-reliance read is an analyst estimate pending live promo data.")
    note.font = Font(italic=True, color="C00000"); note.alignment = WRAP
    ws.merge_cells(start_row=len(rows)+3, start_column=1, end_row=len(rows)+3, end_column=10)
    return ws

def build_subscription():
    ws = simple_sheet("Subscription Strategy",
        ["Brand","SKU","Category","S&S Offered (Y/N) — verify","S&S Discount % — verify",
         "S&S Effective Price (CAD)","Notes"],
        [16,32,26,18,16,16,50])
    rows = []
    for p in P:
        if p["sku"].startswith("(see"): continue
        rows.append([p["brand"], p["sku"], p["category"], "", "", "",
                     "S&S availability and depth vary by listing and over time — confirm on the live page."])
    fill_rows(ws, rows, money_cols=(6,), pct_cols=(5,), amber_cols=(4,), rowh=26)
    note = ws.cell(row=len(rows)+3, column=1,
        value="Subscribe & Save availability is an Amazon listing fact that could not be verified in this environment. "
              "All S&S cells are amber = capture live. Once filled, filter column D = Yes to get the true S&S roster.")
    note.font = Font(italic=True, color="C00000"); note.alignment = WRAP
    ws.merge_cells(start_row=len(rows)+3, start_column=1, end_row=len(rows)+3, end_column=7)
    return ws

def build_why():
    ws = simple_sheet("Why They Win",
        ["Category","Brand","SKU","One-sentence buyer rationale","Primary draw"],
        [26,16,32,60,22])
    draw_map = {
        "price":"Price / value","taste":"Taste reputation","caffeine":"Caffeine level",
        "sodium":"Sodium/electrolytes","sugar":"No / low sugar","brand":"Brand trust",
        "sub":"Subscription value","pack":"Pack economics","function":"Functional benefit","clean":"Clean label",
    }
    def classify(p):
        w = p["why"].lower()
        if "ubiqu" in w or "trust" in w or "cachet" in w or "brand" in w: return draw_map["brand"]
        if "fiber" in w or "gut" in w or "probiotic" in w or "adaptogen" in w or "vitamin" in w or "metabolism" in w or "antioxidant" in w: return draw_map["function"]
        if "sodium" in w or "potassium" in w or "electrolyte" in w or "rehydrat" in w: return draw_map["sodium"]
        if "caffeine" in w or "dose" in w or "energy" in w: return draw_map["caffeine"]
        if "no sugar" in w or "zero sugar" in w or "without the sugar" in w or "low sugar" in w or "sweeten" in w: return draw_map["sugar"]
        if "organic" in w or "clean" in w or "natural" in w: return draw_map["clean"]
        if "pack" in w or "value" in w or "price" in w or "cheap" in w: return draw_map["price"]
        if "real fruit" in w or "taste" in w or "flavour" in w: return draw_map["taste"]
        return "Mixed"
    order = [C1, C2, C3, C4, C5]
    rows = []
    for cat in order:
        for p in P:
            if p["category"] != cat or p["sku"].startswith("(see"): continue
            rows.append([cat, p["brand"], p["sku"], p["why"], classify(p)])
    fill_rows(ws, rows, rowh=30)
    return ws

def build_velocity():
    ws = simple_sheet("Velocity Estimate",
        ["Est. Band","Brand","SKU","Category","Signal used (estimate basis)"],
        [12,16,32,26,46])
    order = {"Very High":0,"High":1,"Medium":2,"Low":3,"—":4}
    rows = []
    for p in P:
        if p["sku"].startswith("(see"): continue
        rows.append([p["vband"], p["brand"], p["sku"], p["category"], p["vsignal"]])
    rows.sort(key=lambda x: order.get(x[0], 9))
    fill_rows(ws, rows, rowh=28)
    # color bands
    band_fill = {"Very High":"C6E0B4","High":"E2EFDA","Medium":"FFF2CC","Low":"FCE4D6"}
    for ri in range(2, len(rows)+2):
        b = ws.cell(row=ri, column=1).value
        if b in band_fill:
            ws.cell(row=ri, column=1).fill = PatternFill("solid", fgColor=band_fill[b])
    note = ws.cell(row=len(rows)+3, column=1,
        value="ESTIMATE ONLY. Bands inferred from brand prominence and category position because live review counts and "
              "bestseller ranks were not accessible. Re-derive from real # Ratings + BSR once captured. Not a unit count.")
    note.font = Font(italic=True, color="C00000"); note.alignment = WRAP
    ws.merge_cells(start_row=len(rows)+3, start_column=1, end_row=len(rows)+3, end_column=5)
    return ws

def build_flavour_map():
    ws = wb.create_sheet("Flavour Map")
    # common flavour families
    families = ["Cola/Root Beer","Citrus (Lemon/Lime)","Orange/Mango","Berry/Raspberry",
                "Cherry","Grape","Watermelon","Peach","Tropical/Pineapple","Grapefruit",
                "Coconut","Ginger","Herbal/Botanical","Original/Unflavoured"]
    headers = ["Brand"] + families
    set_widths(ws, [20] + [13]*len(families))
    for i, h in enumerate(headers, 1):
        ws.cell(row=1, column=i, value=h)
    style_header(ws, len(headers))
    ws.freeze_panes = "B2"
    # build brand -> flavour text aggregate
    brand_flav = {}
    for p in P:
        if p["sku"].startswith("(see"): continue
        brand_flav.setdefault(p["brand"], "")
        brand_flav[p["brand"]] += " " + (p["flavours"] or "")
    keymap = {
        "Cola/Root Beer":["cola","root beer","doctor"],
        "Citrus (Lemon/Lime)":["lemon","lime","limon","limonata","yuzu","citrus"],
        "Orange/Mango":["orange","mango","aranciata","clementine","tangerine","mandarin"],
        "Berry/Raspberry":["berry","raspberry","blackberry","blueberry","razz","acai","pomegranate"],
        "Cherry":["cherry"],
        "Grape":["grape"],
        "Watermelon":["watermelon"],
        "Peach":["peach"],
        "Tropical/Pineapple":["tropical","pineapple","passion","guava","coconut pineapple","paradise"],
        "Grapefruit":["grapefruit","pamplemousse","pompelmo","pompel"],
        "Coconut":["coconut"],
        "Ginger":["ginger"],
        "Herbal/Botanical":["lavender","basil","hibiscus","rose","mint","cactus","hops","chai","verbena","lemongrass","theanine","botanical"],
        "Original/Unflavoured":["original","classic","pure","unflavored","unflavoured","still","natural"],
    }
    r = 2
    for brand in sorted(brand_flav):
        ws.cell(row=r, column=1, value=brand).border = BORDER
        ws.cell(row=r, column=1).font = Font(bold=True)
        text = brand_flav[brand].lower()
        for ci, fam in enumerate(families, start=2):
            mark = "X" if any(k in text for k in keymap[fam]) else ""
            c = ws.cell(row=r, column=ci, value=mark)
            c.alignment = Alignment(horizontal="center", vertical="center"); c.border = BORDER
            if mark: c.fill = PatternFill("solid", fgColor=GREEN)
        ws.row_dimensions[r].height = 20
        r += 1
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{r-1}"
    return ws

def build_sources():
    ws = simple_sheet("Sources",
        ["Product / Brand","Direct Amazon.ca Product URL","Reference source(s) used for stable attributes"],
        [40, 50, 70])
    rows = []
    # Secondary sources actually consulted this session
    rows.append(["— METHODOLOGY NOTE —",
                 "No Amazon.ca URLs could be captured (HTTP 403).",
                 "Amazon.ca and brand storefronts returned 403; only WebSearch secondary data was reachable."])
    # global secondary refs reachable this session
    refs = [
        ("OLIPOP (nutrition/ingredients)","(capture Amazon.ca URL)",
         "drinkolipop.com/blogs/digest/understanding-the-olipop-nutrition-label; drinkolipop.com/pages/ingredients"),
    ]
    for x in refs: rows.append(list(x))
    for p in P:
        if p["sku"].startswith("(see"): continue
        rows.append([f'{p["brand"]} — {p["sku"]}', "", "Manufacturer site + general market knowledge (verify on label)"])
    fill_rows(ws, rows, amber_cols=(2,), rowh=26)
    return ws

# ---- build everything ----
build_readme()
build_dictionary()
build_master("M1 — Sparkling Electrolyte", C1)
build_master("M2 — Electrolyte RTD", C2)
build_master("M3 — Functional Beverage", C3)
build_master("M4 — Caffeine & Energy", C4)
build_master("M5 — Sparkling Water & Soda", C5)
build_pricing_promo()
build_subscription()
build_why()
build_velocity()
build_flavour_map()
build_sources()

wb.save(FNAME)

# ---- self-check / audit print ----
ncat = {c: sum(1 for p in P if p["category"] == c and not p["sku"].startswith("(see")) for c in [C1,C2,C3,C4,C5]}
total = sum(ncat.values())
print("Saved:", FNAME)
print("Products by category:")
for c in [C1,C2,C3,C4,C5]:
    print(f"  {c}: {ncat[c]}")
print("TOTAL products:", total)
print("Sheets:", wb.sheetnames)
