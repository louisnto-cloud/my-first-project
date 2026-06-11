# -*- coding: utf-8 -*-
"""Builds Organika RTD Community Partnerships Tracker_v2.xlsx, styled to match the BC Tracker.

v2 changes per Louis:
- No proposed activations anywhere. Activation Type, Activation Date and idea text all blank.
  The Activation Calendar stays live but starts empty and fills as the team books real dates.
- Sales Team is Maddie only. Maddie is the one owner on the dropdown and is prefilled as
  Primary Owner on every researched partner row.
- New Suggested Events tab: an empty, structured parking lot for event ideas farther out.
- Review pass: auto numbering and auto type label formulas, List Health block on the
  Dashboard, % to Target on Type Summary, stale amber rule applies to P1 rows only,
  corrected apostrophes in three partner names, rewritten Guide.
"""
import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.workbook.defined_name import DefinedName

OUT = "/home/user/my-first-project/Organika RTD Community Partnerships Tracker_v2.xlsx"

# ---------- palette ----------
C_TITLE   = "FF2E5A4E"   # dark green title bar + KPI numbers
C_HEADER  = "FF4F8A78"   # header green
C_TOTAL   = "FFEAF2ED"   # total row
C_DATA    = "FF2B3A33"   # data text
C_SUB     = "FF5A6B62"   # subtitle text
WHITE     = "FFFFFFFF"
# status / state fills
F_GREEN   = "FFDCFCE7"
F_AMBER   = "FFFEF3C7"
F_BLUE    = "FFDBEAFE"
F_PALEBLU = "FFE0F2FE"
F_RED     = "FFFEE2E2"
F_GREY    = "FFF4F6F8"
F_SLATE   = "FFE2E8F0"
F_P1      = "FFFFEDD5"
F_P2      = "FFDBEAFE"
F_P3      = "FFF1F5F9"

BORDER_CLR = "FFCFD8D4"
thin = Side(style="thin", color=BORDER_CLR)
BORD = Border(left=thin, right=thin, top=thin, bottom=thin)

def font(sz=12, b=False, color=C_DATA):
    return Font(name="Arial", size=sz, bold=b, color=color)
def fill(c):
    return PatternFill(fill_type="solid", fgColor=c)
A_C = Alignment(horizontal="center", vertical="center", wrap_text=True)
A_L = Alignment(horizontal="left", vertical="center", wrap_text=False)
A_CL = Alignment(horizontal="center", vertical="center", wrap_text=False)
A_LW = Alignment(horizontal="left", vertical="center", wrap_text=True)

FMT_MONEY = "$#,##0"
FMT_CENTS = "$#,##0.00"
FMT_PCT   = "0.0%"
FMT_DATE  = "yyyy/mm/dd"
FMT_INT   = "0"

wb = openpyxl.Workbook()

# =====================================================================
# TYPE TAB COLUMNS
# =====================================================================
HEADERS = ["#","Partner Name","Partnership Type","City","Neighbourhood","Priority","Status",
"Primary Owner","Contact Name","Role","Contact Email","Contact Phone","Instagram or Website",
"Audience Size","Audience Source","Source","Warm","Last Contacted","Days Since Activity",
"Next Action","Next Action Date","Activation Type","Activation Date","Cases Committed",
"Cases Delivered","Cost ($)","Cost Per Can","Contra Value ($)","Deliverables Promised",
"Deliverables Received","What They Want","Risks","Nearby Retail Doors","In BC Tracker?",
"Raspberry 4338","Lemon Lime 4336","Pineapple Passion Fruit 4340","Notes"]
NCOL = len(HEADERS)                       # 38
LASTCOL = get_column_letter(NCOL)         # AL
DATA_ROWS = 30                            # rows 3..32 per type tab
FIRST = 3
LASTROW = FIRST + DATA_ROWS - 1           # 32

WIDTHS = {1:5,2:30,3:20,4:14,5:18,6:10,7:16,8:16,9:20,10:16,11:26,12:15,13:26,14:16,15:30,
16:14,17:12,18:15,19:13,20:28,21:15,22:18,23:15,24:13,25:13,26:12,27:13,28:14,29:26,30:26,
31:18,32:18,33:22,34:13,35:15,36:15,37:22,38:44}

# key -> column number
KEYCOL = {"name":2,"city":4,"hood":5,"prio":6,"status":7,"owner":8,"contact":9,"role":10,
"email":11,"phone":12,"ig":13,"aud":14,"audsrc":15,"source":16,"warm":17,"last":18,
"nextact":20,"nextdate":21,"acttype":22,"actdate":23,"cases_c":24,"cases_d":25,"cost":26,
"contra":28,"deliv_p":29,"deliv_r":30,"want":31,"risks":32,"doors":33,"inbc":34,
"rasp":35,"lime":36,"pine":37,"notes":38}
DATECOLS = {18,21,23}
MONEYCOLS = {26,28}
CENTERCOLS = {1,4,6,7,8,10,12,14,16,17,18,19,21,22,23,24,25,26,27,28,34,35,36,37}

# =====================================================================
# PARTNER DATA  (60 verified rows, Tevah first on Wellness & Recovery)
# Notes hold research facts only. No activation is proposed anywhere.
# =====================================================================
TYPES = ["Run Clubs","Gyms & Studios","Events & Festivals","Sports Teams & Leagues",
         "Campus & Student Groups","Wellness & Recovery","Ambassadors & Creators","Charity & Causes"]

PARTNERS = {
"Run Clubs":[
 dict(name="East Van Run Crew",city="Vancouver",hood="East Vancouver",prio="P1",ig="@eastvanruncrew",aud="11,000 IG",audsrc="Instagram @eastvanruncrew follower count, web search 2026",source="Verified Web",notes="Monday night runs starting from a rotating East Van brewery."),
 dict(name="Social Run Club YVR",city="Vancouver",hood="Yaletown",prio="P1",ig="@socialrunclub.yvr",aud="12,000 IG",audsrc="Instagram @socialrunclub.yvr follower count, web search 2026",source="Verified Web",notes="Saturday 9:30am Form Focus run that ends with a coffee social."),
 dict(name="Slow Girls Run Club",city="Vancouver",hood="Downtown",prio="P1",ig="@slowgirlsrunclub",aud="9,400 IG",audsrc="Instagram @slowgirlsrunclub follower count, web search 2026",source="Verified Web",notes="Saturday 8am Social Saturdays 5km. Women focused community."),
 dict(name="One Run Club",city="Vancouver",hood="West End",prio="P2",ig="@onerunclubvan",aud="7,950 IG",audsrc="Instagram @onerunclubvan follower count, web search 2026. About 1,536 active members on Heylo",source="Verified Web",notes="Wednesday 6:30pm run with a social wrap at English Bay."),
 dict(name="Striderz Run Club",city="Vancouver",hood="Olympic Village",prio="P2",ig="@striderzrunclub",aud="1,120 IG",audsrc="Instagram @striderzrunclub follower count, web search 2026",source="Verified Web",notes="Free Sunday 8:30am social run from Athletes Way, all paces regroup."),
 dict(name="North Shore Women's Trail Running Club",city="North Vancouver",hood="Lynn Valley",prio="P2",ig="@northshore__runclub",aud="2,930 IG",audsrc="Instagram @northshore__runclub follower count, web search 2026",source="Verified Web",notes="Trail runs meeting at the End of the Line General Store."),
 dict(name="North Burnaby Runners",city="Burnaby",hood="North Burnaby",prio="P2",ig="@northburnabyrunners",aud="2,370 IG",audsrc="Instagram @northburnabyrunners follower count, web search 2026",source="Verified Web",notes="Wednesday 6:30pm social run from Dageraad Brewing."),
 dict(name="Flight Crew Run Club",city="Vancouver",hood="Kitsilano",prio="P2",ig="@flightcrewrunclub",aud="TBD",audsrc="",source="Verified Web",notes="Thursday 6:15pm Kitsilano road run with 3km, 5km and 10km options. Run by Vancouver Running Company."),
 dict(name="Capital City Run Crew",city="Victoria",hood="Downtown",prio="P2",ig="@capitalcityruncrew",aud="2,820 IG",audsrc="Instagram @capitalcityruncrew follower count, web search 2026",source="Verified Web",notes="Thursday evening downtown run."),
 dict(name="Kelowna Running Club",city="Kelowna",hood="Waterfront Park",prio="P3",ig="@kelownarunningclub",aud="990 IG",audsrc="Instagram @kelownarunningclub follower count, web search 2026",source="Verified Web",notes="Saturday long runs from rotating spots plus Tuesday speed work. 2026 schedule on the club site."),
],
"Gyms & Studios":[
 dict(name="RIDE Cycle Club",city="Vancouver",hood="Yaletown",prio="P1",ig="@ridecycleclub",aud="23,000 IG",audsrc="Instagram @ridecycleclub follower count, web search 2026. Account covers Vancouver and Toronto",source="Verified Web",notes="Spin studio on Hamilton Street, part of a multi city brand."),
 dict(name="The Hive Bouldering Gym",city="Vancouver",hood="Strathcona",prio="P1",ig="@hiveclimbing",aud="21,000 IG",audsrc="Instagram @hiveclimbing follower count, web search 2026. Brand account, several BC sites",source="Verified Web",notes="Bouldering gym on Industrial Avenue, brand has several BC locations."),
 dict(name="Progression Bouldering",city="Vancouver",hood="Mount Pleasant",prio="P1",ig="@progressionbouldering",aud="9,700 IG",audsrc="Instagram @progressionbouldering follower count, web search 2026",source="Verified Web",notes="18,000 sq ft bouldering gym with a licensed cafe on site."),
 dict(name="Tantra Fitness",city="Vancouver",hood="Kitsilano",prio="P2",ig="@tantrafitness",aud="17,000 IG",audsrc="Instagram @tantrafitness follower count, web search 2026 (single snippet, reverify)",source="Pending",notes="Pole and aerial fitness across three Vancouver locations."),
 dict(name="604 Athletics",city="Vancouver",hood="Mount Pleasant",prio="P2",ig="@604_athletics",aud="6,100 IG",audsrc="Instagram @604_athletics follower count, web search 2026 (single snippet, reverify)",source="Pending",notes="CrossFit box on Main Street, runs HYROX prep classes."),
 dict(name="FAR Studio",city="Vancouver",hood="Gastown",prio="P2",ig="@farstudiogym",aud="2,450 IG",audsrc="Instagram @farstudiogym follower count, web search 2026 (single snippet, reverify)",source="Pending",notes="Kickboxing and strength studio on Powell Street."),
 dict(name="The Lab Victoria",city="Victoria",hood="Downtown",prio="P2",ig="@thelabvictoria",aud="3,500 IG",audsrc="Instagram @thelabvictoria follower count, web search 2026 (single snippet, reverify)",source="Pending",notes="Yoga and pilates studio on Fort Street."),
 dict(name="CrossFit BC",city="Vancouver",hood="Olympic Village",prio="P3",ig="@crossfitbc",aud="TBD",audsrc="",source="Verified Web",notes="CrossFit box on East 1st Avenue."),
 dict(name="CrossFit Zone",city="Victoria",hood="Downtown",prio="P3",ig="@crossfit_zone_",aud="TBD",audsrc="",source="Verified Web",notes="One of the oldest CrossFit boxes in Victoria, operating since 2008."),
 dict(name="CrossFit Okanagan",city="Kelowna",hood="Kelowna",prio="P3",ig="@crossfitokanagan",aud="4,700 IG",audsrc="Instagram @crossfitokanagan follower count, web search 2026 (single snippet, reverify)",source="Pending",notes="CrossFit box, also runs a ForeverFit 55 plus program."),
],
"Events & Festivals":[
 dict(name="Richmond Night Market",city="Richmond",hood="Bridgeport",prio="P1",ig="richmondnightmarket.com",aud="1,000,000+ per year",audsrc="vancouversbestplaces and official market materials, over a million visitors annually",source="Verified Web",notes="Runs Apr 24 to Sep 20 2026, Friday to Sunday evenings, near Bridgeport station."),
 dict(name="Vancouver Pride Parade and Festival",city="Vancouver",hood="West End",prio="P1",ig="@vancouverpride",aud="600,000+ attendees (press estimate)",audsrc="misterbandb and Destination Vancouver listings cite 600,000 plus, press estimate not official",source="Verified Web",notes="Pride week Jul 25 to Aug 2 2026, main parade Sunday Aug 2 ending at Sunset Beach."),
 dict(name="Concord Pacific Dragon Boat Summer Regatta",city="Vancouver",hood="False Creek",prio="P1",ig="dragonboatbc.ca",aud="TBD",audsrc="",source="Verified Web",notes="One day regatta Aug 22 2026 at False Creek. Downsized for 2026 due to the FIFA security cordon, full festival returns 2027."),
 dict(name="Italian Day on The Drive",city="Vancouver",hood="Commercial Drive",prio="P2",ig="@italiandayonthedrive",aud="300,000 (press estimate)",audsrc="Vancouver Is Awesome 2026 coverage cites 300,000, press estimate not official",source="Verified Web",notes="Sunday Jun 14 2026, noon to 8pm, 14 blocks of Commercial Drive."),
 dict(name="Khatsahlano Street Party",city="Vancouver",hood="Kitsilano",prio="P2",ig="@khatsahlano",aud="TBD",audsrc="",source="Verified Web",notes="Saturday Jul 11 2026 on West 4th Ave, 10 blocks, free street festival."),
 dict(name="Summer Lights in English Bay",city="Vancouver",hood="West End",prio="P2",ig="vancouver.ca",aud="TBD",audsrc="",source="Verified Web",notes="Friday Jul 31 2026 fireworks at English Bay, BC Day long weekend. City replacement for Celebration of Light."),
 dict(name="Canada Dry Victoria Dragon Boat Festival",city="Victoria",hood="Inner Harbour",prio="P2",ig="victoriadragonboatfestival.com",aud="TBD",audsrc="",source="Verified Web",notes="Saturday Jun 20 2026 at the Inner Harbour, more than 30 teams. Moved to June for 2026 only, back to August in 2027."),
 dict(name="Kelowna Wine Country Half Marathon",city="Kelowna",hood="Waterfront Park",prio="P2",ig="kelownamarathon.ca",aud="1,800 runners (cap)",audsrc="Event materials note registration normally limited to about 1,800 runners, confirm on site",source="Verified Web",notes="Saturday Jun 13 2026, finish at Waterfront Park with a post run festival."),
],
"Sports Teams & Leagues":[
 dict(name="Urban Rec Vancouver",city="Vancouver",hood="Mount Pleasant",prio="P1",ig="@urbanrec",aud="56,000 members (self stated)",audsrc="Urban Rec Vancouver website states over 56,000 members, brand self stated figure",source="Verified Web",notes="Largest sport and social club in Western Canada. Leagues across Vancouver, Richmond and Burnaby."),
 dict(name="Vancouver Dodgeball League",city="Vancouver",hood="Multiple",prio="P2",ig="@vdldodgeball",aud="2,000+ players, 260+ teams",audsrc="VDL sources describe over 260 teams and 2,000 plus players at peak",source="Verified Web",notes="Non profit dodgeball league playing in school and community gyms."),
 dict(name="Vancouver Pickleball Association",city="Vancouver",hood="Multiple",prio="P2",ig="@vancouverpickleballassociation",aud="TBD",audsrc="",source="Verified Web",notes="Box league runs Apr to Sep 2026 across community centres and outdoor courts."),
 dict(name="False Creek Racing Canoe Club",city="Vancouver",hood="Granville Island",prio="P2",ig="@falsecreekcanoeclub",aud="TBD",audsrc="",source="Verified Web",notes="Dragon boat, outrigger and sprint paddling club based on Granville Island."),
 dict(name="Victoria Sport and Social Club",city="Victoria",hood="Multiple",prio="P2",ig="@vicsportnsocial",aud="TBD",audsrc="",source="Verified Web",notes="Mixed adult leagues, 9 plus sports running for summer 2026."),
 dict(name="Pickleball Kelowna Club",city="Kelowna",hood="Parkinson Rec Centre",prio="P2",ig="@pickleballkelownaclub",aud="700 members",audsrc="Instagram @pickleballkelownaclub states the club is home to 700 members",source="Verified Web",notes="Plays on 12 fenced outdoor courts, May to Sep season, hosts the Kelowna Open."),
],
"Campus & Student Groups":[
 dict(name="UBC Thunderbirds Athletics",city="Vancouver",hood="UBC",prio="P1",ig="@ubctbirds",aud="33,000 IG",audsrc="Instagram @ubctbirds follower count, web search 2026. 26 varsity teams per gothunderbirds.ca",source="Verified Web",notes="26 varsity teams across 15 sports at the Point Grey campus."),
 dict(name="AMS of UBC",city="Vancouver",hood="UBC",prio="P1",ig="ams.ubc.ca",aud="60,000 students",audsrc="AMS represents more than 60,000 students per ams.ubc.ca, operates 200 plus clubs",source="Verified Web",notes="Student society running the Nest student union building and 200 plus clubs."),
 dict(name="SFU Recreation",city="Burnaby",hood="Burnaby Mountain",prio="P2",ig="@sfurecreation",aud="4,500 IG",audsrc="Instagram @sfurecreation follower count, web search 2026",source="Verified Web",notes="Intramural leagues open to students, staff and faculty."),
 dict(name="UVic Vikes Recreation",city="Victoria",hood="UVic",prio="P2",ig="vikesrec.ca",aud="22,000 students",audsrc="UVic enrolment over 22,000 students per uvic.ca, Vikes Recreation open to all students",source="Verified Web",notes="Campus recreation programs based at the CARSA centre."),
 dict(name="Students' Union Okanagan of UBC",city="Kelowna",hood="UBC Okanagan",prio="P2",ig="@suo_ubc",aud="12,000 students",audsrc="SUO represents over 12,000 students per suo.ca",source="Verified Web",notes="Runs The Well student pub and The Green Bean cafe. New recreation facility broke ground May 2026."),
 dict(name="Camosun College Student Society",city="Victoria",hood="Lansdowne",prio="P3",ig="camosunstudent.org",aud="9,000+ students",audsrc="CCSS represents the 9,000 plus students of Camosun College per camosunstudent.org",source="Verified Web",notes="Student society across the Lansdowne and Interurban campuses."),
],
"Wellness & Recovery":[
 dict(name="Tevah Wellness",city="Vancouver",hood="Yaletown",prio="P1",source="Verified Web",inbc="Yes",aud="TBD",audsrc="",notes="Imported from the BC Tracker Community tab so it is tracked once. Sauna and recovery. Address 955 Pacific Blvd."),
 dict(name="HAVN Saunas",city="Victoria",hood="Inner Harbour",prio="P1",ig="@havn.saunas",aud="34,000 IG",audsrc="Instagram @havn.saunas follower count, web search 2026",source="Verified Web",notes="Floating sauna barge on the Inner Harbour with cold plunge circuits."),
 dict(name="Kolm Kontrast Nordic Spa",city="Vancouver",hood="Cambie Village",prio="P1",ig="@kolmkontrast",aud="12,000 IG",audsrc="Instagram @kolmkontrast follower count, web search 2026",source="Verified Web",notes="Nordic spa at 525 W 8th Ave with heat and cold cycles."),
 dict(name="RITUAL Nordic Spa",city="Victoria",hood="Harris Green",prio="P2",ig="@ritualnordicspa",aud="9,400 IG",audsrc="Instagram @ritualnordicspa follower count, web search 2026",source="Verified Web",notes="Nordic spa with an onsite cafe and salt lounge."),
 dict(name="Float House Vancouver",city="Vancouver",hood="Gastown",prio="P2",ig="@float_house",aud="9,000 IG",audsrc="Instagram @float_house follower count, web search 2026",source="Verified Web",notes="Float and cold plunge studio at 70 W Cordova St."),
 dict(name="Regen Recovery",city="Vancouver",hood="Downtown",prio="P2",ig="@regenrecovery",aud="3,900 IG",audsrc="Instagram @regenrecovery follower count, web search 2026",source="Verified Web",notes="Recovery lounge with sauna, cold plunge and IV services."),
 dict(name="BioShack",city="Kelowna",hood="Kelowna",prio="P3",ig="@bioshack",aud="TBD",audsrc="",source="Verified Web",notes="Self led contrast therapy suite located at Sweat Studios."),
],
"Ambassadors & Creators":[
 dict(name="Angela Liguori",city="Vancouver",prio="P1",ig="@angelaliggs",aud="908,000 IG",audsrc="Instagram @angelaliggs follower count, web search 2026",source="Verified Web",notes="Outdoor and hiking creator covering BC trails."),
 dict(name="Bailey Campbell",city="Kelowna",prio="P1",ig="@basicswithbails",aud="641,000 IG",audsrc="Instagram @basicswithbails follower count, web search 2026. A tracker listed 394,700, reverify",source="Verified Web",notes="Kelowna Foodie. Recipe and lifestyle content."),
 dict(name="Twin Coast",city="Vancouver",prio="P1",ig="@twincoast",aud="537,000 IG",audsrc="Instagram @twincoast follower count, web search 2026. Also large on TikTok and YouTube",source="Verified Web",notes="Twin sisters, plant based recipe creators with a cookbook brand."),
 dict(name="Vancouver Dietitians",city="Vancouver",hood="South Granville",prio="P2",ig="@vancouverdietitians",aud="64,000 IG",audsrc="Instagram @vancouverdietitians follower count, web search 2026",source="Verified Web",notes="Registered dietitian duo with a South Granville clinic."),
 dict(name="Cam Lee",city="Vancouver",prio="P2",ig="@camleeyoga",aud="47,000 IG",audsrc="Instagram @camleeyoga follower count, web search 2026",source="Verified Web",notes="Yoga and wellness creator."),
 dict(name="Caroline Doucet",city="Vancouver",prio="P2",ig="@nourishedbycaroline",aud="38,000 IG",audsrc="Instagram @nourishedbycaroline follower count, web search 2026",source="Verified Web",notes="Registered dietitian, plant based recipes, non diet approach."),
 dict(name="Trudy Leung",city="Vancouver",prio="P2",ig="@missvancityfoodie",aud="37,000 IG",audsrc="Instagram @missvancityfoodie follower count, web search 2026",source="Verified Web",notes="Miss Vancity Foodie. Local food and lifestyle content."),
 dict(name="Hilary Ann Yang",city="Vancouver",prio="P2",ig="@thehilaryann",aud="31,000 IG",audsrc="Instagram @thehilaryann follower count, web search 2026",source="Verified Web",notes="Trail running creator tied to Squamish, runs a women's trail running community."),
],
"Charity & Causes":[
 dict(name="BC Children's Hospital Foundation",city="Vancouver",hood="Queen Elizabeth Park",prio="P1",ig="fundraise.bcchf.ca",aud="10,000 runners target 2026",audsrc="runguides and BCCHF pages, 2026 aims to welcome more than 10,000 runners",source="Verified Web",notes="Hosts RBC Race for the Kids, Jun 8 2026 at Queen Elizabeth Park. 5k plus 2k fun run and a family carnival."),
 dict(name="Greater Vancouver Food Bank",city="Burnaby",hood="Swangard Stadium",prio="P2",ig="foodbank.bc.ca",aud="TBD",audsrc="",source="Verified Web",notes="Hosts Foodstock, Jun 23 2026 at Swangard Stadium. A 19 plus outdoor music and food festival."),
 dict(name="Backpack Buddies",city="Vancouver",hood="Multiple",prio="P2",ig="@backpackbuddiesbc",aud="4,347 IG, 6,800 kids weekly",audsrc="Web search, 4,347 Instagram followers and over 6,800 kids reached weekly, 1.8 million meals in 2025 and 2026",source="Verified Web",notes="Hosts the Birdies and Buddies golf tournament Jun 8 2026. School food programs across 83 BC communities."),
 dict(name="Victoria Hospice",city="Victoria",hood="Oak Bay",prio="P3",ig="victoriahospice.org",aud="TBD",audsrc="",source="Verified Web",notes="Hosts Hike for Hospice, May 3 2026 at Willows Beach. A Goddess Run charity of choice."),
 dict(name="Wild One Run for Youth Mental Health",city="Kelowna",hood="Wilden",prio="P3",ig="wildonerun.ca",aud="TBD",audsrc="",source="Verified Web",notes="Trail run and walk Oct 3 2026 on the Wilden trails. Proceeds to Foundry Kelowna."),
],
}

# =====================================================================
# LOOKUPS DATA
# =====================================================================
OWNERS = ["Maddie"]
PRIORITY = ["P1","P2","P3"]
STATUS = ["Open","Outreach Sent","In Conversation","Proposal Sent","Agreed","Activated",
"Repeat Partner","Lost","On Hold"]
WARM = ["Warm","Cold","Past Contact","Unknown"]
SOURCE = ["Verified Web","Verified Phone","Verified In Person","Pending","Unverified"]
ACTIVATION = ["Sampling","Event Booth","Sponsorship","Ambassador","Contra Product",
"Co Branded Content","Hydration Station"]
WANT = ["Free Product","Sampling Budget","Sponsorship Fee","Social Posts From Us",
"Co Branded Giveaway","Discount Code","Long Term Deal"]
RISKS = ["Competitor Locked In","Audience Mismatch","High Fee","Slow To Respond",
"One Off Only","Logistics"]
INBC = ["Yes","No"]
SKU = ["Requested","Sampled","Stocked"]
ROLE = ["Owner or Founder","Director","Manager","General Manager","Marketing Lead",
"Community Manager","Events Lead","Coach","Run Lead","Studio Owner","Coordinator",
"President","Board Member","Sponsorship Lead","Athletic Director","Creator"]
CITY = ["Vancouver","Burnaby","North Vancouver","West Vancouver","Richmond","Surrey",
"Langley","Coquitlam","New Westminster","Victoria","Kelowna","Nanaimo","Online"]
HOOD = ["Cambie Village","Coal Harbour","Commercial Drive","Downtown","Dunbar","East Vancouver",
"Fairview","False Creek","Gastown","Granville Island","Harris Green","Inner Harbour",
"Jericho Beach","Kitsilano","Lansdowne","Lower Lonsdale","Lynn Valley","Main Street",
"Mount Pleasant","Multiple","North Burnaby","Oak Bay","Olympic Village","Parkinson Rec Centre",
"Queen Elizabeth Park","South Granville","Strathcona","Swangard Stadium","UBC","UBC Okanagan",
"UVic","Bridgeport","Burnaby Mountain","Waterfront Park","West End","Wilden","Willows Beach","Yaletown"]
EVENTSTATUS = ["Idea","Scoping","Approved","Moved To Events Tab","Passed"]

LU_COLS = [   # (header, list, defined_name)
 ("Owner", OWNERS, "LU_Owner"),
 ("Partnership Type", TYPES, "LU_Type"),
 ("Priority", PRIORITY, "LU_Priority"),
 ("Status", STATUS, "LU_Status"),
 ("Warm", WARM, "LU_Warm"),
 ("Source", SOURCE, "LU_Source"),
 ("Activation Type", ACTIVATION, "LU_Activation"),
 ("What They Want", WANT, "LU_Want"),
 ("Risks", RISKS, "LU_Risks"),
 ("In BC Tracker", INBC, "LU_InBC"),
 ("SKU Status", SKU, "LU_SKU"),
 ("Role", ROLE, "LU_Role"),
 ("City", CITY, "LU_City"),
 ("Neighbourhood", HOOD, "LU_Neighbourhood"),
 ("Event Status", EVENTSTATUS, "LU_EventStatus"),
]

# =====================================================================
# helpers for styling
# =====================================================================
def title_row(ws, text, span_last):
    ws.merge_cells(f"A1:{span_last}1")
    c = ws.cell(1,1,text)
    c.font = font(20, True, WHITE); c.fill = fill(C_TITLE); c.alignment = A_C
    ws.row_dimensions[1].height = 34

def subtitle(ws, row, text):
    c = ws.cell(row,1,text); c.font = font(11, False, C_SUB); c.alignment = A_L

def hcell(ws, row, col, text):
    c = ws.cell(row,col,text); c.font = font(12, True, WHITE); c.fill = fill(C_HEADER)
    c.alignment = A_C; c.border = BORD; return c

print("building lookups...")
# ---------------- LOOKUPS ----------------
lu = wb.active; lu.title = "Lookups"
title_row(lu, "Lookups : edit any column here to update the dropdowns across the file.", "O")
for i,(hdr,vals,nm) in enumerate(LU_COLS):
    col = i+1
    hc = lu.cell(2,col,hdr); hc.font = font(12, True, WHITE); hc.fill = fill(C_HEADER)
    hc.alignment = A_C; hc.border = BORD
    lu.column_dimensions[get_column_letter(col)].width = 22
    for j,v in enumerate(vals):
        cc = lu.cell(3+j,col,v); cc.font = font(11, False, C_DATA); cc.alignment = A_L
    # defined name (dynamic OFFSET range)
    L = get_column_letter(col)
    dn = DefinedName(nm, attr_text=f"OFFSET(Lookups!${L}$3,0,0,MAX(1,COUNTA(Lookups!${L}$3:${L}$1000)),1)")
    wb.defined_names[nm] = dn
lu.freeze_panes = "A3"; lu.row_dimensions[2].height = 30
lu.sheet_properties.tabColor = "B7C9C1"

# =====================================================================
# TYPE TABS
# =====================================================================
def add_validations(ws):
    def mk(name):
        dv = DataValidation(type="list", formula1=name, allow_blank=True); ws.add_data_validation(dv); return dv
    rng = lambda col: f"{col}{FIRST}:{col}{LASTROW}"
    mk("LU_Type").add(rng("C"))
    mk("LU_City").add(rng("D"))
    mk("LU_Neighbourhood").add(rng("E"))
    mk("LU_Priority").add(rng("F"))
    mk("LU_Status").add(rng("G"))
    mk("LU_Owner").add(rng("H"))
    mk("LU_Role").add(rng("J"))
    mk("LU_Source").add(rng("P"))
    mk("LU_Warm").add(rng("Q"))
    mk("LU_Activation").add(rng("V"))
    mk("LU_Want").add(rng("AE"))
    mk("LU_Risks").add(rng("AF"))
    mk("LU_InBC").add(rng("AH"))
    sku = mk("LU_SKU"); sku.add(f"AI{FIRST}:AK{LASTROW}")

def add_cond_formats(ws):
    cf = ws.conditional_formatting.add
    # Status colours G
    smap = [("Activated",F_GREEN),("Repeat Partner",F_GREEN),("Agreed",F_AMBER),
            ("Proposal Sent",F_AMBER),("In Conversation",F_AMBER),("Outreach Sent",F_PALEBLU),
            ("Open",F_GREY),("Lost",F_RED),("On Hold",F_SLATE)]
    for val,clr in smap:
        cf(f"G{FIRST}:G{LASTROW}", CellIsRule(operator="equal", formula=[f'"{val}"'], fill=fill(clr)))
    # Priority F
    for val,clr in [("P1",F_P1),("P2",F_P2),("P3",F_P3)]:
        cf(f"F{FIRST}:F{LASTROW}", CellIsRule(operator="equal", formula=[f'"{val}"'], fill=fill(clr)))
    # Warm Q
    cf(f"Q{FIRST}:Q{LASTROW}", CellIsRule(operator="equal", formula=['"Warm"'], fill=fill(F_AMBER)))
    # Source P
    for val,clr in [("Verified Web",F_GREEN),("Verified Phone",F_GREEN),("Verified In Person",F_GREEN),
                    ("Pending",F_AMBER),("Unverified",F_P3)]:
        cf(f"P{FIRST}:P{LASTROW}", CellIsRule(operator="equal", formula=[f'"{val}"'], fill=fill(clr)))
    # Days since activity S : red over 14 for any row, amber over 7 on P1 rows
    cf(f"S{FIRST}:S{LASTROW}", CellIsRule(operator="greaterThan", formula=["14"], fill=fill(F_RED)))
    cf(f"S{FIRST}:S{LASTROW}", FormulaRule(formula=[f'AND($F{FIRST}="P1",$S{FIRST}>7)'], fill=fill(F_AMBER)))
    # Next Action Date past due U
    cf(f"U{FIRST}:U{LASTROW}", FormulaRule(formula=[f'AND($U{FIRST}<>"",$U{FIRST}<TODAY())'], fill=fill(F_RED)))
    # SKU AI:AK
    for val,clr in [("Stocked",F_GREEN),("Sampled",F_BLUE),("Requested",F_PALEBLU)]:
        cf(f"AI{FIRST}:AK{LASTROW}", CellIsRule(operator="equal", formula=[f'"{val}"'], fill=fill(clr)))

def build_type_tab(tname):
    ws = wb.create_sheet(tname)
    title_row(ws, tname, LASTCOL)
    # headers
    for c,h in enumerate(HEADERS, start=1):
        hcell(ws, 2, c, h)
        ws.column_dimensions[get_column_letter(c)].width = WIDTHS[c]
    ws.row_dimensions[2].height = 50
    rows = PARTNERS.get(tname, [])
    for i in range(DATA_ROWS):
        r = FIRST + i
        ws.row_dimensions[r].height = 20
        # default styling for every cell in row
        for c in range(1, NCOL+1):
            cell = ws.cell(r,c)
            cell.font = font(); cell.border = BORD
            cell.alignment = A_CL if c in CENTERCOLS else A_L
        d = rows[i] if i < len(rows) else None
        if d:
            for k,col in KEYCOL.items():
                if k in d and d[k] not in (None,""):
                    ws.cell(r,col, d[k])
            # defaults for researched rows
            if "status" not in d: ws.cell(r,7,"Open")
            if "owner" not in d: ws.cell(r,8,"Maddie")
            if "warm" not in d: ws.cell(r,17,"Cold")
            if "inbc" not in d: ws.cell(r,34,"No")
        # live formulas on every row so new entries behave the same
        ws.cell(r,1, f'=IF($B{r}="","",ROW()-2)')                                   # auto number
        ws.cell(r,3, f'=IF($B{r}="","","{tname}")')                                 # auto type label
        ws.cell(r,19, f'=IF(ISBLANK(R{r}),"",TODAY()-R{r})')                        # Days Since Activity
        ws.cell(r,27, f'=IF(OR($Z{r}="",$Y{r}="",$Y{r}=0),"",$Z{r}/($Y{r}*24))')    # Cost Per Can
        # number formats
        for c in DATECOLS: ws.cell(r,c).number_format = FMT_DATE
        for c in MONEYCOLS: ws.cell(r,c).number_format = FMT_MONEY
        ws.cell(r,27).number_format = FMT_CENTS
        ws.cell(r,19).number_format = FMT_INT
    ws.freeze_panes = "C3"
    ws.auto_filter.ref = f"A2:{LASTCOL}{LASTROW}"
    ws.sheet_properties.tabColor = "4F8A78"
    add_validations(ws)
    add_cond_formats(ws)
    return ws

print("building type tabs...")
for t in TYPES:
    build_type_tab(t)

# =====================================================================
# MASTER LIST  (read only, auto pulls every partner from every type tab)
# =====================================================================
print("building master list...")
SRCCOLS = [c for c in range(2, NCOL+1) if c != 3]   # all type-tab cols except # and Partnership Type
ML_LAST = get_column_letter(1 + len(SRCCOLS))        # AK (37 cols)
SRCFMT = {18:FMT_DATE,21:FMT_DATE,23:FMT_DATE,26:FMT_MONEY,28:FMT_MONEY,27:FMT_CENTS,19:FMT_INT}
def ml_letter(src):  # master-list column letter for a given source col
    return get_column_letter(2 + SRCCOLS.index(src))
ML_ACT = ml_letter(23)  # Activation Date column on Master List

ml = wb.create_sheet("Master List")
title_row(ml, "Master List   (read only, auto updates from the type tabs)", ML_LAST)
ml.cell(2,1,"Partnership Type"); h = ml.cell(2,1)
h.font = font(12, True, WHITE); h.fill = fill(C_HEADER); h.alignment = A_C; h.border = BORD
ml.column_dimensions["A"].width = 20
for m,src in enumerate(SRCCOLS, start=2):
    hcell(ml, 2, m, HEADERS[src-1])
    ml.column_dimensions[get_column_letter(m)].width = WIDTHS[src]
ml.row_dimensions[2].height = 50
mr = 3
for t in TYPES:
    for tr in range(FIRST, LASTROW+1):
        ml.row_dimensions[mr].height = 18
        a = ml.cell(mr,1, "=IF('{T}'!B{r}=\"\",\"\",\"{T}\")".format(T=t, r=tr))
        a.font = font(); a.border = BORD; a.alignment = A_L
        for m,src in enumerate(SRCCOLS, start=2):
            L = get_column_letter(src)
            cell = ml.cell(mr,m, "=IF('{T}'!{L}{r}=\"\",\"\",'{T}'!{L}{r})".format(T=t, L=L, r=tr))
            cell.font = font(); cell.border = BORD
            cell.alignment = A_CL if src in CENTERCOLS else A_L
            if src in SRCFMT: cell.number_format = SRCFMT[src]
        k = ml.cell(mr, NCOL, "=IF({A}{r}=\"\",\"\",{A}{r}+ROW()/100000)".format(A=ML_ACT, r=mr))
        k.font = font(9, color="FFB7C9C1")
        mr += 1
ML_ROWS_END = mr-1
ml.column_dimensions[get_column_letter(NCOL)].hidden = True
ml.freeze_panes = "C3"; ml.auto_filter.ref = "A2:{}{}".format(ML_LAST, ML_ROWS_END)
ml.sheet_properties.tabColor = "6FA392"
MLR = "'Master List'!"   # shorthand for formulas, ranges $3:$500

# =====================================================================
# ACTIVATION CALENDAR  (chronological, soonest first, formula driven)
# Starts empty on purpose. Fills itself as the team enters Activation Dates.
# =====================================================================
print("building activation calendar...")
cal = wb.create_sheet("Activation Calendar")
CAL_HDRS = ["Activation Date","Partner","Type","Owner","Cases Committed","Status","Nearby Retail Doors"]
title_row(cal, "Activation Calendar   (every booked activation, soonest first)", "G")
subtitle(cal, 2, "Starts empty on purpose. Enter an Activation Date on any type tab and that row appears here automatically, in date order. This tab is the heartbeat of the file.")
for c,htext in enumerate(CAL_HDRS, start=1):
    hcell(cal, 2, c, htext)
calw = {1:16,2:30,3:22,4:18,5:14,6:18,7:34}
for c,w in calw.items(): cal.column_dimensions[get_column_letter(c)].width = w
cal.row_dimensions[2].height = 50
SRCMAP = {1:ml_letter(23),2:ml_letter(2),3:"A",4:ml_letter(8),5:ml_letter(24),6:ml_letter(7),7:ml_letter(33)}
CAL_DATA = 120
for i in range(CAL_DATA):
    r = 3+i
    cal.row_dimensions[r].height = 18
    cal.cell(r,9, "=IFERROR(MATCH(SMALL({M}$AL$3:$AL$500,ROW()-2),{M}$AL$3:$AL$500,0),\"\")".format(M=MLR))
    for c in range(1,8):
        col = SRCMAP[c]
        cell = cal.cell(r,c, "=IFERROR(INDEX({M}${col}$3:${col}$500,$I{r}),\"\")".format(M=MLR, col=col, r=r))
        cell.font = font(); cell.border = BORD
        cell.alignment = A_CL if c in (1,3,4,5,6) else A_L
    cal.cell(r,1).number_format = FMT_DATE
    cal.cell(r,9).font = font(9, color="FFB7C9C1")
cal.column_dimensions["I"].hidden = True
cal.freeze_panes = "C3"; cal.auto_filter.ref = "A2:G{}".format(2+CAL_DATA)
cal.sheet_properties.tabColor = "246B5A"
# conditional formatting: status colours + date proximity
calcf = cal.conditional_formatting.add
for val,clr in [("Activated",F_GREEN),("Repeat Partner",F_GREEN),("Agreed",F_AMBER),("Proposal Sent",F_AMBER),
                ("In Conversation",F_AMBER),("Outreach Sent",F_PALEBLU),("Open",F_GREY),("Lost",F_RED),("On Hold",F_SLATE)]:
    calcf("F3:F{}".format(2+CAL_DATA), CellIsRule(operator="equal", formula=['"{}"'.format(val)], fill=fill(clr)))
calcf("A3:A{}".format(2+CAL_DATA), FormulaRule(formula=['AND($A3<>"",$A3<TODAY())'], fill=fill(F_SLATE)))
calcf("A3:A{}".format(2+CAL_DATA), FormulaRule(formula=['AND($A3<>"",$A3>=TODAY(),$A3<=TODAY()+14)'], fill=fill(F_AMBER)))

# =====================================================================
# DASHBOARD
# =====================================================================
print("building dashboard...")
dash = wb.create_sheet("Dashboard")
dash.sheet_view.showGridLines = False
title_row(dash, "Organika RTD  ·  Community Partnerships Command Centre", "N")
subtitle(dash, 2, "Live overview. Every number updates on its own as the team works the type tabs.")
for c in range(1,15): dash.column_dimensions[get_column_letter(c)].width = 12
def kpi(col, label, formula, numfmt=None):
    L1 = get_column_letter(col); L2 = get_column_letter(col+1)
    dash.merge_cells("{}4:{}4".format(L1,L2)); dash.merge_cells("{}5:{}5".format(L1,L2))
    a = dash.cell(4,col,label); a.font=font(11,True,WHITE); a.fill=fill(C_HEADER); a.alignment=A_C; a.border=BORD
    b = dash.cell(5,col,formula); b.font=font(18,True,WHITE); b.fill=fill(C_TITLE); b.alignment=A_C; b.border=BORD
    if numfmt: b.number_format = numfmt
dash.row_dimensions[4].height=26; dash.row_dimensions[5].height=40
ML=MLR
kpi(1,"Total Partners","=SUM(E8:E15)")
kpi(3,"P1 Partners","=COUNTIF({M}$E$3:$E$500,\"P1\")".format(M=ML))
kpi(5,"Active Conversations","=COUNTIF({M}$F$3:$F$500,\"Outreach Sent\")+COUNTIF({M}$F$3:$F$500,\"In Conversation\")+COUNTIF({M}$F$3:$F$500,\"Proposal Sent\")+COUNTIF({M}$F$3:$F$500,\"Agreed\")".format(M=ML))
kpi(7,"Activations Booked","=COUNT({M}$V$3:$V$500)".format(M=ML))
kpi(9,"Cans Sampled to Date","=24*SUM({M}$X$3:$X$500)".format(M=ML),"#,##0")
kpi(11,"Cost Per Can Sampled","=IFERROR(SUM({M}$Y$3:$Y$500)/(24*SUM({M}$X$3:$X$500)),0)".format(M=ML),FMT_CENTS)
kpi(13,"Days Until Costco Road Show","=MAX(0,DATE(2026,8,1)-TODAY())","#,##0")

def sect(row,col,title,w2="Count"):
    hcell(dash,row,col,title); hcell(dash,row,col+1,w2)
def line(row,col,label,formula,numfmt=None,bold=False):
    a=dash.cell(row,col,label); a.font=font(11,bold,C_DATA); a.alignment=A_L
    b=dash.cell(row,col+1,formula); b.font=font(11,bold,C_DATA); b.alignment=A_CL
    if numfmt: b.number_format=numfmt
# Pipeline by Stage (A7)
sect(7,1,"Pipeline by Stage")
for i,s in enumerate(STATUS):
    line(8+i,1,s,"=COUNTIF({M}$F$3:$F$500,\"{s}\")".format(M=ML,s=s))
# List Health (A18)
sect(18,1,"List Health")
line(19,1,"Overdue Next Actions",'=COUNTIF({M}$T$3:$T$500,"<"&TODAY())'.format(M=ML))
line(20,1,"Stale P1 Over 7 Days",'=COUNTIFS({M}$E$3:$E$500,"P1",{M}$R$3:$R$500,">7")'.format(M=ML))
line(21,1,"Verified Rows","=COUNTIF({M}$O$3:$O$500,\"Verified Web\")+COUNTIF({M}$O$3:$O$500,\"Verified Phone\")+COUNTIF({M}$O$3:$O$500,\"Verified In Person\")".format(M=ML))
line(22,1,"Pending Rows","=COUNTIF({M}$O$3:$O$500,\"Pending\")".format(M=ML))
line(23,1,"Unverified Rows","=COUNTIF({M}$O$3:$O$500,\"Unverified\")".format(M=ML))
# Partners by Type (D7)
sect(7,4,"Partners by Type")
for i,t in enumerate(TYPES):
    line(8+i,4,t,"=COUNTA('{t}'!$B$3:$B$32)".format(t=t))
# Priority (G7)
sect(7,7,"Priority")
for i,p in enumerate(PRIORITY):
    line(8+i,7,p,"=COUNTIF({M}$E$3:$E$500,\"{p}\")".format(M=ML,p=p))
# Activations coming up (G12)
sect(12,7,"Activations")
for i,(lbl,n) in enumerate([("Next 30 Days",30),("Next 60 Days",60),("Next 90 Days",90)]):
    line(13+i,7,lbl,'=COUNTIFS({M}$V$3:$V$500,">="&TODAY(),{M}$V$3:$V$500,"<="&TODAY()+{n})'.format(M=ML,n=n))
# Budget committed vs spent (J7)
sect(7,10,"Budget","$")
for i,(lbl,ref,fmt) in enumerate([("Total Budget","=Budget!B14",FMT_MONEY),("Committed","=Budget!C14",FMT_MONEY),
        ("Spent","=Budget!D14",FMT_MONEY),("Remaining","=Budget!E14",FMT_MONEY),("% Spent","=Budget!F14",FMT_PCT)]):
    line(8+i,10,lbl,ref,fmt)
# SKU status (J14)
hcell(dash,14,10,"SKU Status"); hcell(dash,14,11,"Requested"); hcell(dash,14,12,"Sampled"); hcell(dash,14,13,"Stocked")
for i,(sku,col) in enumerate([("Raspberry 4338",ml_letter(35)),("Lemon Lime 4336",ml_letter(36)),("Pineapple Passion Fruit 4340",ml_letter(37))]):
    dash.cell(15+i,10,sku).font=font(11,False,C_DATA)
    for j,stt in enumerate(["Requested","Sampled","Stocked"]):
        cc=dash.cell(15+i,11+j,"=COUNTIF({M}${c}$3:${c}$500,\"{s}\")".format(M=ML,c=col,s=stt))
        cc.font=font(11,False,C_DATA); cc.alignment=A_CL
dash.cell(25,1,"Every figure refreshes automatically. To change a record, edit its type tab. The Master List, Calendar and these tiles all update on their own.").font=font(11,False,C_SUB)
dash.sheet_properties.tabColor = "2E5A4E"

# =====================================================================
# TYPE SUMMARY
# =====================================================================
print("building type summary...")
TARGETS = {"Run Clubs":10,"Gyms & Studios":10,"Events & Festivals":8,"Sports Teams & Leagues":6,
"Campus & Student Groups":6,"Wellness & Recovery":6,"Ambassadors & Creators":8,"Charity & Causes":4}
ts = wb.create_sheet("Type Summary")
ts.sheet_view.showGridLines = False
title_row(ts, "Type Summary", "K")
TS_HDR=["Partnership Type","Target (draft)","Partners","P1","P2","P3","In Conversation","Agreed","Activated","Cases Committed","% to Target"]
for c,htext in enumerate(TS_HDR,start=1): hcell(ts,2,c,htext)
tsw={1:24,2:14,3:12,4:8,5:8,6:8,7:16,8:12,9:12,10:16,11:12}
for c,w in tsw.items(): ts.column_dimensions[get_column_letter(c)].width=w
ts.row_dimensions[2].height=50
for i,t in enumerate(TYPES):
    r=3+i
    vals=[t,TARGETS[t],
      "=COUNTA('{t}'!$B$3:$B$32)".format(t=t),
      "=COUNTIF('{t}'!$F$3:$F$32,\"P1\")".format(t=t),
      "=COUNTIF('{t}'!$F$3:$F$32,\"P2\")".format(t=t),
      "=COUNTIF('{t}'!$F$3:$F$32,\"P3\")".format(t=t),
      "=COUNTIF('{t}'!$G$3:$G$32,\"In Conversation\")".format(t=t),
      "=COUNTIF('{t}'!$G$3:$G$32,\"Agreed\")".format(t=t),
      "=COUNTIF('{t}'!$G$3:$G$32,\"Activated\")+COUNTIF('{t}'!$G$3:$G$32,\"Repeat Partner\")".format(t=t),
      "=SUM('{t}'!$X$3:$X$32)".format(t=t),
      "=IFERROR(C{r}/B{r},0)".format(r=r)]
    for c,v in enumerate(vals,start=1):
        cell=ts.cell(r,c,v); cell.font=font(); cell.border=BORD
        cell.alignment=A_L if c==1 else A_CL
        if c==11: cell.number_format=FMT_PCT
tr=3+len(TYPES)
ts.cell(tr,1,"Total").font=font(12,True,C_DATA)
ts.cell(tr,1).fill=fill(C_TOTAL); ts.cell(tr,1).border=BORD
for c in range(2,11):
    L=get_column_letter(c); cell=ts.cell(tr,c,"=SUM({L}3:{L}{e})".format(L=L,e=tr-1))
    cell.font=font(12,True,C_DATA); cell.fill=fill(C_TOTAL); cell.alignment=A_CL; cell.border=BORD
ck=ts.cell(tr,11,"=IFERROR(C{r}/B{r},0)".format(r=tr))
ck.font=font(12,True,C_DATA); ck.fill=fill(C_TOTAL); ck.alignment=A_CL; ck.border=BORD; ck.number_format=FMT_PCT
# colour cues on % to Target
tscf = ts.conditional_formatting.add
tscf("K3:K{}".format(tr), CellIsRule(operator="greaterThanOrEqual", formula=["1"], fill=fill(F_GREEN)))
tscf("K3:K{}".format(tr), CellIsRule(operator="greaterThanOrEqual", formula=["0.5"], fill=fill(F_AMBER)))
ts.cell(tr+2,1,"Targets are a starting draft for Louis to confirm. Edit the Target column any time.").font=font(11,False,C_SUB)
ts.freeze_panes="A3"; ts.sheet_properties.tabColor="3E7C68"

# =====================================================================
# BUDGET
# =====================================================================
print("building budget...")
bud = wb.create_sheet("Budget")
bud.sheet_view.showGridLines = False
title_row(bud, "Budget", "F")
B_HDR=["Partnership Type","Total Budget ($)","Committed ($)","Spent ($)","Remaining ($)","% Spent"]
for c,htext in enumerate(B_HDR,start=1): hcell(bud,2,c,htext)
budw={1:24,2:16,3:16,4:16,5:16,6:12}
for c,w in budw.items(): bud.column_dimensions[get_column_letter(c)].width=w
bud.row_dimensions[2].height=50
for i,t in enumerate(TYPES):
    r=3+i
    cells=[t,0,0,"=SUM('{t}'!$Z$3:$Z$32)".format(t=t),"=B{r}-D{r}".format(r=r),"=IFERROR(D{r}/B{r},0)".format(r=r)]
    for c,v in enumerate(cells,start=1):
        cell=bud.cell(r,c,v); cell.font=font(); cell.border=BORD
        cell.alignment=A_L if c==1 else A_CL
        if c in (2,3,4,5): cell.number_format=FMT_MONEY
        if c==6: cell.number_format=FMT_PCT
br=3+len(TYPES)
bud.cell(br,1,"Total").font=font(12,True,C_DATA); bud.cell(br,1).fill=fill(C_TOTAL); bud.cell(br,1).border=BORD
for c in range(2,6):
    L=get_column_letter(c); cell=bud.cell(br,c,"=SUM({L}3:{L}{e})".format(L=L,e=br-1))
    cell.font=font(12,True,C_DATA); cell.fill=fill(C_TOTAL); cell.alignment=A_CL; cell.border=BORD; cell.number_format=FMT_MONEY
ce=bud.cell(br,6,"=IFERROR(D{b}/B{b},0)".format(b=br)); ce.font=font(12,True,C_DATA); ce.fill=fill(C_TOTAL); ce.alignment=A_CL; ce.border=BORD; ce.number_format=FMT_PCT
bud.cell(br+2,1,"Total Budget and Committed are yours to set and start at zero. Spent rolls up the Cost column from each type tab.").font=font(11,False,C_SUB)
bud.freeze_panes="A3"; bud.sheet_properties.tabColor="8FB3A6"

# =====================================================================
# SUGGESTED EVENTS  (empty parking lot for ideas farther down the line)
# =====================================================================
print("building suggested events...")
se = wb.create_sheet("Suggested Events")
SE_HDRS = ["#","Event","City","Venue or Neighbourhood","Expected Window","Audience Size",
"Audience Source","Source","Priority","Event Status","Owner","Why It Fits","Next Step","Notes"]
SE_LAST = get_column_letter(len(SE_HDRS))   # N
title_row(se, "Suggested Events", SE_LAST)
sew = {1:5,2:30,3:14,4:24,5:18,6:16,7:30,8:14,9:10,10:20,11:14,12:32,13:28,14:40}
for c,htext in enumerate(SE_HDRS, start=1):
    hcell(se, 2, c, htext)
    se.column_dimensions[get_column_letter(c)].width = sew[c]
se.row_dimensions[2].height = 50
SE_CENTER = {1,3,5,6,8,9,10,11}
for i in range(DATA_ROWS):
    r = FIRST + i
    se.row_dimensions[r].height = 20
    for c in range(1, len(SE_HDRS)+1):
        cell = se.cell(r,c)
        cell.font = font(); cell.border = BORD
        cell.alignment = A_CL if c in SE_CENTER else A_L
    se.cell(r,1, f'=IF($B{r}="","",ROW()-2)')
# dropdowns
def se_dv(name, colrange):
    dv = DataValidation(type="list", formula1=name, allow_blank=True)
    se.add_data_validation(dv); dv.add(colrange)
se_dv("LU_City", f"C{FIRST}:C{LASTROW}")
se_dv("LU_Source", f"H{FIRST}:H{LASTROW}")
se_dv("LU_Priority", f"I{FIRST}:I{LASTROW}")
se_dv("LU_EventStatus", f"J{FIRST}:J{LASTROW}")
se_dv("LU_Owner", f"K{FIRST}:K{LASTROW}")
# conditional formatting
secf = se.conditional_formatting.add
for val,clr in [("Idea",F_GREY),("Scoping",F_PALEBLU),("Approved",F_AMBER),
                ("Moved To Events Tab",F_GREEN),("Passed",F_RED)]:
    secf(f"J{FIRST}:J{LASTROW}", CellIsRule(operator="equal", formula=[f'"{val}"'], fill=fill(clr)))
for val,clr in [("P1",F_P1),("P2",F_P2),("P3",F_P3)]:
    secf(f"I{FIRST}:I{LASTROW}", CellIsRule(operator="equal", formula=[f'"{val}"'], fill=fill(clr)))
for val,clr in [("Verified Web",F_GREEN),("Verified Phone",F_GREEN),("Verified In Person",F_GREEN),
                ("Pending",F_AMBER),("Unverified",F_P3)]:
    secf(f"H{FIRST}:H{LASTROW}", CellIsRule(operator="equal", formula=[f'"{val}"'], fill=fill(clr)))
se.freeze_panes = "C3"
se.auto_filter.ref = f"A2:{SE_LAST}{LASTROW}"
se.sheet_properties.tabColor = "8FB3A6"
subtitle(se, LASTROW+2, "Idea parking lot for events farther down the line. It starts empty on purpose. When an idea is approved, add it as a partner row on the Events & Festivals tab and book the activation there. Nothing on this tab feeds the Master List or the Calendar.")

# =====================================================================
# SALES TEAM  (Maddie only, per Louis)
# =====================================================================
print("building sales team...")
st = wb.create_sheet("Sales Team")
title_row(st, "Sales Team", "F")
ST_HDR=["Rep","Email","Cell","Region","Role on This File","On Owner Dropdown?"]
for c,htext in enumerate(ST_HDR,start=1): hcell(st,2,c,htext)
SALES=[
("Maddie","TBD verify","TBD verify","BC","Community partnerships owner per Louis","Yes"),
]
stw={1:22,2:30,3:16,4:10,5:40,6:22}
for c,w in stw.items(): st.column_dimensions[get_column_letter(c)].width=w
st.row_dimensions[2].height=50
for i,row in enumerate(SALES):
    r=3+i
    for c,v in enumerate(row,start=1):
        cell=st.cell(r,c,v); cell.font=font(); cell.border=BORD
        cell.alignment=A_L if c in (1,2,5) else A_CL
subtitle(st, 5, "Maddie runs this file. To add a rep later, add a row here and add the name to the Owner column on the Lookups tab so it appears on the Primary Owner menu.")
st.freeze_panes="A3"; st.sheet_properties.tabColor="B7C9C1"

# =====================================================================
# GUIDE
# =====================================================================
print("building guide...")
gd = wb.create_sheet("Guide")
gd.sheet_view.showGridLines = False
title_row(gd, "Guide  ·  How to Use This Workbook", "D")
gd.column_dimensions["A"].width=30; gd.column_dimensions["B"].width=86
gd.column_dimensions["C"].width=4; gd.column_dimensions["D"].width=4
def gsec(r,txt):
    c=gd.cell(r,1,txt); gd.merge_cells("A{r}:D{r}".format(r=r))
    c.font=font(13,True,WHITE); c.fill=fill(C_HEADER); c.alignment=A_L; gd.row_dimensions[r].height=24
def gline(r,a,b=None):
    ca=gd.cell(r,1,a); ca.font=font(11,True,C_DATA) if b else font(11,False,C_DATA); ca.alignment=A_LW
    if b is not None:
        cb=gd.cell(r,2,b); cb.font=font(11,False,C_DATA); cb.alignment=A_LW
    gd.row_dimensions[r].height=16
gd.cell(2,1,"A quick reference for the team. You only ever type into the type tabs or pick from a drop down menu.").font=font(11,False,C_SUB)
r=4
gsec(r,"The boundary rule, BC Tracker or this file"); r+=1
gline(r,"If it sells cans on a shelf it lives in the BC Tracker. If it samples, sponsors, or creates content it lives here."); r+=1
gline(r,"A partner can live in both files. Use the In BC Tracker column to flag any partner that also sits in the BC Tracker."); r+=1
gline(r,"This file is the sister to the BC Tracker. That file tracks retail doors. This file tracks community partnerships and activations."); r+=2
gsec(r,"Nothing here is pre proposed"); r+=1
gline(r,"Every partner row carries research facts only: who they are, where they are, audience and source."); r+=1
gline(r,"Activation Type, Activation Date, cases and budget all start blank. They only fill when the team books something real."); r+=1
gline(r,"The Activation Calendar starts empty for the same reason. Enter an Activation Date on a type tab and the row appears there on its own, soonest first."); r+=2
gsec(r,"How to use it, 3 steps"); r+=1
gline(r,"1.  Open your type tab at the bottom (the green tabs). Each tab is one partnership type."); r+=1
gline(r,"2.  Work the row. Update Status, Last Contacted, Next Action and Next Action Date as you go."); r+=1
gline(r,"3.  When a partner agrees to something real, pick the Activation Type and enter the Activation Date. The Calendar and Dashboard update on their own."); r+=2
gsec(r,"What the colours mean, mapped to the BC Tracker"); r+=1
gline(r,"Green is Activated and Repeat Partner. Same green the BC Tracker uses for Listed and Won."); r+=1
gline(r,"Amber is In Conversation, Proposal Sent and Agreed. Same amber the BC Tracker uses for Pitched and In Negotiation."); r+=1
gline(r,"Pale blue is Outreach Sent. Grey is Open and On Hold. Rose is Lost."); r+=1
gline(r,"Priority shades match the BC Tracker. P1 is warm orange, P2 is blue, P3 is grey."); r+=1
gline(r,"A Next Action Date in the past turns rose. Days Since Activity turns amber over 7 days on P1 rows and rose over 14 days on any row."); r+=2
gsec(r,"The Source tag on every row"); r+=1
gline(r,"Verified Web","Confirmed on an official site or public Instagram in 2026."); r+=1
gline(r,"Pending","The partner is real but a detail such as a follower count rests on a single source. Reverify before outreach."); r+=1
gline(r,"Unverified","Heard of secondhand and not yet confirmed. Treat as a lead only."); r+=1
gline(r,"Audience numbers came from public sources. Anything that could not be verified is left blank or TBD and sits on the gap list."); r+=2
gsec(r,"The three SKUs we track"); r+=1
gline(r,"Raspberry is SKU 4338.  Lemon Lime is SKU 4336.  Pineapple Passion Fruit is SKU 4340.  355ml cans."); r+=1
gline(r,"Each SKU column takes blank, Requested, Sampled, or Stocked."); r+=2
gsec(r,"Which tabs do what"); r+=1
for lbl,desc in [
 ("Dashboard","Live executive overview. Totals, pipeline, list health, activations, budget, SKU status. Read only."),
 ("Activation Calendar","Every booked activation in date order, soonest first. Starts empty, fills itself. Read only."),
 ("Master List","Every partner from every type tab in one place. Read only, updates on its own."),
 ("Type Summary","Targets versus actuals per type with % to target. Targets are a draft for Louis to confirm. Read only."),
 ("Budget","Budget per type. You can fill Total Budget and Committed. Spent rolls up from the type tabs."),
 ("Type tabs","Where the team works. One tab per partnership type. Fully editable."),
 ("Suggested Events","Idea parking lot for future events. Starts empty. Approved ideas move onto the Events & Festivals tab."),
 ("Lookups","The lists behind every drop down. Add a value here and it appears in the menus."),
 ("Sales Team","Maddie owns this file. Add reps here and on the Lookups Owner column to grow the menu."),
]:
    gline(r,lbl,desc); r+=1
r+=1
gsec(r,"What each column means"); r+=1
for lbl,desc in [
 ("Partner Name","The run club, studio, event, team, group, space, creator or cause being pursued."),
 ("Partnership Type","Which of the eight types this partner belongs to. Fills itself when a name is entered."),
 ("City and Neighbourhood","Where the partner is based. Metro Vancouver first, then Victoria and Kelowna."),
 ("Priority","P1 chase first, P2, or P3."),
 ("Status","Where the partnership sits, from Open through Activated and Repeat Partner."),
 ("Primary Owner","The rep responsible. Maddie to start, drawn from the Sales Team tab."),
 ("Audience Size and Source","Approximate reach and exactly where that number came from."),
 ("Source","Verified Web, Pending or Unverified. How sure we are the row is real."),
 ("Warm","Warm, Cold, Past Contact or Unknown relationship."),
 ("Last Contacted and Days Since Activity","The most recent contact date and how many days have passed."),
 ("Next Action and Date","The next step and when it is due."),
 ("Activation Type","Sampling, Event Booth, Sponsorship, Ambassador, Contra Product, Co Branded Content or Hydration Station. Pick when you book."),
 ("Activation Date","The date of the activation. Anything with a date shows on the Activation Calendar."),
 ("Cases Committed and Delivered","Cases promised and cases delivered. 24 cans per case."),
 ("Cost and Cost Per Can","Dollars spent and the cost for each can sampled. Cost Per Can fills once both Cost and Cases Delivered exist."),
 ("Contra Value","The dollar value of anything received in trade rather than cash."),
 ("What They Want and Deliverables","What the partner is asking for and what each side promised or received."),
 ("Nearby Retail Doors","Retail doors near the partner that sit in the BC Tracker. Links the two files."),
 ("In BC Tracker","Yes if this partner also sits in the BC Tracker."),
 ("Raspberry, Lemon Lime, Pineapple","The sampling status of each flavour at that partner."),
]:
    gline(r,lbl,desc); r+=1
r+=1
gsec(r,"Version"); r+=1
gline(r,"2026 06  v1","First build. 60 researched partners, live Dashboard, Activation Calendar, read only Master List, eight type tabs.")
r+=1
gline(r,"2026 06  v2","Cleared every proposed activation so the team books real ones. Maddie set as the single owner. Added the empty Suggested Events tab, List Health on the Dashboard and % to Target on the Type Summary.")
gd.sheet_properties.tabColor="B7C9C1"

# =====================================================================
# ORDER + SAVE
# =====================================================================
order = ["Dashboard","Activation Calendar","Master List","Type Summary","Budget"] + TYPES + ["Suggested Events","Lookups","Sales Team","Guide"]
wb._sheets.sort(key=lambda s: order.index(s.title))
wb.active = 0
try:
    wb.calculation.fullCalcOnLoad = True
except Exception:
    from openpyxl.workbook.properties import CalcProperties
    wb.calculation = CalcProperties(fullCalcOnLoad=True)
wb.save(OUT)
print("SAVED:", OUT)
print("master list rows:", ML_ROWS_END, " sheets:", [s.title for s in wb.worksheets])
