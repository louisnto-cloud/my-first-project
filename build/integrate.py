# -*- coding: utf-8 -*-
"""v7 integration: gap fills + 20 new verified partners, regenerate PARTNERS dict."""
p="/tmp/build_tracker.py"
s=open(p,encoding="utf-8").read()

# ---- extract and exec the PARTNERS block ----
i=s.index("PARTNERS = {")
j=s.index("\n}\n", i)+len("\n}\n")
block=s[i:j]
ns={}
exec(block, ns)
P=ns["PARTNERS"]

def setp(typ,name,**kw):
    for d in P[typ]:
        if d["name"]==name: d.update(kw); return
    raise SystemExit("not found: "+name)

# ---- gap fills (sourced numbers) ----
setp("Wellness & Recovery","Tevah Wellness", ig="@tevahwellness", aud="7,690 IG",
     audsrc="Instagram @tevahwellness follower count, web search 2026. Address 955 Pacific Blvd")
setp("Run Clubs","Flight Crew Run Club", aud="4,426 IG",
     audsrc="Instagram @flightcrewrunclub follower count, web search 2026")
setp("Gyms & Studios","CrossFit BC", aud="6,164 IG",
     audsrc="Instagram @crossfitbc follower count, web search 2026")
setp("Gyms & Studios","CrossFit Zone", aud="2,250 IG",
     audsrc="Instagram @crossfit_zone_ follower count, web search 2026")
setp("Events & Festivals","Khatsahlano Street Party", aud="200,000 attendees",
     audsrc="CTV News and vancouversbestplaces, up to 200,000 at the 2025 edition")
setp("Events & Festivals","Canada Dry Victoria Dragon Boat Festival", aud="30 plus teams",
     audsrc="Westerly News and Parksville Qualicum News Jun 2026, more than 30 teams")
setp("Sports Teams & Leagues","Vancouver Pickleball Association", aud="1,065 IG",
     audsrc="Instagram @vancouverpickleballassociation follower count, web search 2026")
setp("Sports Teams & Leagues","False Creek Racing Canoe Club", aud="956 IG",
     audsrc="Instagram @falsecreekcanoeclub follower count, web search 2026")
setp("Gyms & Studios","Tantra Fitness", aud="17,000 IG", source="Verified Web",
     audsrc="Instagram @tantrafitness follower count, web search 2026")
setp("Gyms & Studios","604 Athletics", aud="6,148 IG", source="Verified Web",
     audsrc="Instagram @604_athletics follower count, web search 2026")
setp("Gyms & Studios","FAR Studio", aud="2,458 IG", source="Verified Web",
     audsrc="Instagram @farstudiogym follower count, web search 2026")
setp("Gyms & Studios","The Lab Victoria", aud="3,564 IG", source="Verified Web",
     audsrc="Instagram @thelabvictoria follower count, web search 2026")
setp("Gyms & Studios","CrossFit Okanagan", aud="4,711 IG", source="Verified Web",
     audsrc="Instagram @crossfitokanagan follower count, web search 2026")
setp("Wellness & Recovery","BioShack", ig="@bioshack.kelowna",
     notes="Self led contrast therapy suite at Sweat Studios. Brand account about 2,549 followers, the Kelowna only count was not retrievable.")

# ---- 20 new verified partners ----
P["Run Clubs"] += [
 dict(name="Notorious Run Club",city="Victoria",hood="Inner Harbour",prio="P2",ig="@notoriousrunclub",aud="1,703 IG",audsrc="Instagram @notoriousrunclub follower count, web search 2026",source="Verified Web",notes="Saturday 9am 5km social run downtown."),
 dict(name="NRG Kelowna",city="Kelowna",hood="Downtown",prio="P2",ig="@nrgkelowna",aud="4,785 IG",audsrc="Instagram @nrgkelowna follower count, web search 2026",source="Verified Web",notes="Run club that meets at Red Bird Brewing."),
 dict(name="the girls vancouver",city="Vancouver",prio="P2",ig="@thegirlsvancouver",aud="1,807 IG",audsrc="Instagram @thegirlsvancouver follower count, web search 2026",source="Verified Web",notes="Womens run and social community."),
 dict(name="Victoria Queer Run Club",city="Victoria",hood="Dallas Road",prio="P3",ig="@vicqueerrunclub",aud="1,357 IG",audsrc="Instagram @vicqueerrunclub follower count, web search 2026",source="Verified Web",notes="Monday 6pm run, inclusive community."),
]
P["Gyms & Studios"] += [
 dict(name="Sweat Studios",city="Kelowna",hood="Downtown",prio="P2",ig="@sweatkelowna",aud="5,330 IG",audsrc="Instagram @sweatkelowna follower count, web search 2026",source="Verified Web",notes="Multi format studio: barre, cycle, pilates, yoga and boot camp at 529 Lawrence Ave. Also home to BioShack recovery."),
 dict(name="Quantum Yoga and Pilates",city="Victoria",hood="Downtown",prio="P3",ig="@quantumyogapilates",aud="3,148 IG",audsrc="Instagram @quantumyogapilates follower count, web search 2026",source="Verified Web",notes="Yoga and pilates studio downtown."),
 dict(name="F45 Training Downtown Victoria",city="Victoria",hood="Downtown",prio="P3",ig="@f45_training_downtownvic",aud="1,912 IG",audsrc="Instagram @f45_training_downtownvic follower count, web search 2026",source="Verified Web",notes="HIIT studio at 595 Pandora Ave."),
]
P["Wellness & Recovery"] += [
 dict(name="Loyly Floating Sauna Kelowna",city="Kelowna",hood="City Park",prio="P1",ig="@loyly.kelowna",aud="14,000 IG",audsrc="Instagram @loyly.kelowna follower count, web search 2026",source="Verified Web",notes="Floating sauna and cold plunge on Okanagan Lake at the downtown marina."),
]
P["Events & Festivals"] += [
 dict(name="Harmony Arts Festival",city="West Vancouver",hood="Ambleside",prio="P1",ig="harmonyarts.ca",aud="140,000 attendees",audsrc="District of West Vancouver festival page, as many as 140,000 attend",source="Verified Web",notes="Runs Jul 31 to Aug 9 2026 on the Ambleside waterfront."),
 dict(name="Parks Alive Kelowna",city="Kelowna",hood="City Park",prio="P2",ig="festivalskelowna.com",aud="24,000 plus attendees",audsrc="Castanet and Festivals Kelowna, over 24,000 guests annually",source="Verified Web",notes="Free music and events series by Festivals Kelowna, opens Jul 3 2026, runs nine weeks."),
 dict(name="Victoria Pride Festival",city="Victoria",hood="James Bay",prio="P2",ig="victoriapridesociety.org",aud="10,000 festival, 80,000 spectators",audsrc="Tourism Victoria, upwards of 10,000 at the festival and 80,000 plus along the parade",source="Verified Web",notes="Festival in the Park at MacDonald Park Jul 12 2026."),
 dict(name="RBC GranFondo Whistler",city="Vancouver",hood="Sea to Sky",prio="P2",ig="rbcgranfondo.com",aud="5,000 cyclists",audsrc="event listings, about 5,000 cyclists ride the 122km route",source="Verified Web",notes="122km ride from downtown Vancouver to Whistler Sep 12 2026."),
 dict(name="Kelowna International Dragon Boat Festival",city="Kelowna",hood="Tugboat Bay",prio="P3",ig="kelownadragonboatclub.com",aud="TBD",audsrc="",source="Verified Web",notes="Jul 11 2026 at Tugboat Bay, supports the Central Okanagan Food Bank."),
]
P["Sports Teams & Leagues"] += [
 dict(name="Urban Rec Victoria",city="Victoria",hood="Multiple",prio="P2",ig="victoria.urbanrec.ca",aud="TBD",audsrc="",source="Verified Web",notes="Ten coed adult leagues across Greater Victoria, year round."),
 dict(name="Kelowna Rowing Club",city="Kelowna",hood="Waterfront Park",prio="P3",ig="@kelownarowingclub",aud="70 plus rowers",audsrc="kelownarowing.com, membership over 70 rowers",source="Verified Web",notes="Rows on Okanagan Lake, learn to row and competitive crews."),
]
P["Campus & Student Groups"] += [
 dict(name="Simon Fraser Student Society",city="Burnaby",hood="Burnaby Mountain",prio="P2",ig="sfss.ca",aud="TBD",audsrc="",source="Verified Web",notes="Represents the SFU undergraduate body, runs the Student Union Building."),
 dict(name="Okanagan College Students Union",city="Kelowna",prio="P2",ig="@ocsu.kelowna",aud="5,000 plus students",audsrc="ocsu.ca, membership of over 5,000 Okanagan College students",source="Verified Web",notes="Student union at the Kelowna campus, 1000 KLO Road."),
 dict(name="BCIT Student Association",city="Burnaby",prio="P3",ig="@bcitsa",aud="TBD",audsrc="",source="Verified Web",notes="Serves all BCIT students, Burnaby campus at 3700 Willingdon Ave."),
]
P["Charity & Causes"] += [
 dict(name="Ryder Hesjedal's Tour de Victoria",city="Victoria",hood="Downtown",prio="P2",ig="tourdevictoria.com",aud="TBD",audsrc="",source="Verified Web",notes="Mass participation cycling event Aug 15 2026, eight distances, 15th annual."),
]
P["Ambassadors & Creators"] += [
 dict(name="The Official Vancouver Fitness",city="Vancouver",prio="P3",ig="@vancouver.fitness",aud="24,000 IG",audsrc="Instagram @vancouver.fitness publicly visible follower count, web search 2026",source="Pending",notes="Vancouver fitness community account. Reconfirm the live follower count before outreach."),
]

# ---- regenerate the PARTNERS literal ----
out="PARTNERS = {\n"
for t,rows in P.items():
    out+=repr(t)+":[\n"
    for d in rows:
        out+=" "+repr(d)+",\n"
    out+="],\n"
out+="}\n"
s=s[:i]+out+s[j:]

# ---- bump version + add new neighbourhoods ----
s=s.replace("Tracker_v6.xlsx","Tracker_v7.xlsx")
s=s.replace('"Willows Beach","Yaletown"]',
            '"Willows Beach","Yaletown","Ambleside","City Park","Dallas Road","James Bay","Sea to Sky","Tugboat Bay"]')

open(p,"w",encoding="utf-8").write(s)
tot=sum(len(v) for v in P.values())
print("integrated. total partners:",tot, {k:len(v) for k,v in P.items()})
