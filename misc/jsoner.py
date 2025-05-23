# okay, I caved
# uses BeautifulSoup to pull and rip armor and skill data to fill jsons
# because kiranico is pretty consistent on updating monster hunter data, and this is faster than manual input/ripping

from collections import defaultdict
import json
import re
import requests
from bs4 import BeautifulSoup
import time

base_path = "./src/data"

JSON_FIELDS = {
    "skills": [
        "type", "icon", "description", "levels"
    ],
    "setSkills": [
        "skill", "description", "levels", "piecesPerLevel", "armor"
    ],
    "groupSkills": [
        "skill", "description", "effect", "pieces", "armor"
    ],
    "armor": [
        "type",
        "slots",
        "skills::name,level",
        "setSkill",
        "groupSkill",
        "rarity",
        "rank",
        "defense",
        "fireResistance",
        "waterResistance",
        "thunderResistance",
        "iceResistance",
        "dragonResistance",
        # "materials",
        # "url",
        # "imgUrl"
    ],
    "decoration": [
        "type",
        "rarity",
        "slot",
        "skills::name,level",
        "description",
        # "acquisition",
        # "url",
        # "imgUrl"
    ],
    "talisman": [
        "rarity",
        "effect",
        "skills::name,level",
        "type",
        # "materials",
        # "url",
        # "imgUrl"
    ]
}

def de_kira(name: str) -> str:
    return name.replace('α', 'Alpha').replace('β', 'Beta').replace('γ', 'Gamma').replace('G. ', 'G ')

def transform_json(input_path, output_path, key_field, fields):
    with open(input_path, 'r', encoding='utf-8') as infile:
        data = json.load(infile)

    data.sort(key=lambda obj: obj[key_field])

    output_data = {}

    for item in data:
        key = item.get(key_field)
        if key is None:
            continue

        entry = {}

        for field in fields:
            if "::" in field:
                base_field, mapping = field.split("::", 1)
                if base_field in item and isinstance(item[base_field], list):
                    subkeys = [s.strip() for s in mapping.split(",")]
                    if len(subkeys) == 2:
                        sub_key, sub_value = subkeys
                        transformed = {
                            subitem[sub_key]: subitem[sub_value]
                            for subitem in item[base_field]
                            if sub_key in subitem and sub_value in subitem
                        }
                        entry[base_field] = transformed
            else:
                if field in item:
                    entry[field] = item[field]

        output_data[key] = entry

    with open(output_path, 'w', encoding='utf-8') as outfile:
        json.dump(output_data, outfile, indent=2)

def format_all_jsons():
    transform_json(f"{base_path}/skills/skills.json", f"{base_path}/format/skills.json", 'name', JSON_FIELDS["skills"])
    transform_json(f"{base_path}/skills/set-skills.json", f"{base_path}/format/set-skills.json", 'name', JSON_FIELDS["setSkills"])
    transform_json(f"{base_path}/skills/group-skills.json", f"{base_path}/format/group-skills.json", 'name', JSON_FIELDS["groupSkills"])

    transform_json(f"{base_path}/detailed/talisman.json", f"{base_path}/format/talisman.json", 'name', JSON_FIELDS["talisman"])
    transform_json(f"{base_path}/detailed/decoration.json", f"{base_path}/format/decoration.json", 'name', JSON_FIELDS["decoration"])

    transform_json(f"{base_path}/detailed/armor/head.json", f"{base_path}/format/head.json", 'name', JSON_FIELDS["armor"])
    transform_json(f"{base_path}/detailed/armor/arms.json", f"{base_path}/format/arms.json", 'name', JSON_FIELDS["armor"])
    transform_json(f"{base_path}/detailed/armor/chest.json", f"{base_path}/format/chest.json", 'name', JSON_FIELDS["armor"])
    transform_json(f"{base_path}/detailed/armor/waist.json", f"{base_path}/format/waist.json", 'name', JSON_FIELDS["armor"])
    transform_json(f"{base_path}/detailed/armor/legs.json", f"{base_path}/format/legs.json", 'name', JSON_FIELDS["armor"])

def init_kiranico_session():
    session = requests.Session()
    session.headers.update({'User-Agent': 'Mozilla/5.0'})
    return session

def pull_kiranico_data(pull_skills = False, pull_armor = False, pull_talismans = False):
    session = init_kiranico_session()

    if pull_skills:
        pull_kiranico_skills(session)

    if pull_armor:
        pull_kiranico_armor(session)

    if pull_talismans:
        pull_kiranico_talismans(session)
    
def pull_kiranico_skills(session):
    # Base URL
    base_url = 'https://mhwilds.kiranico.com'
    skills_url = f'{base_url}/data/skills'

    # Fetch the main skill page
    response = session.get(skills_url)
    response.raise_for_status()
    doc = BeautifulSoup(response.text, 'html.parser')

    # Extract skill link groups
    link_groups = doc.find_all(class_='my-8')

    links = {
        'weapon': [],
        'armor': [],
        'group': [],
        'set': []
    }

    for i, group in enumerate(link_groups[:4]):  # Only the first 4 groups are used
        category = list(links.keys())[i]
        links[category] = [a['href'] for a in group.select('td > a[href]')]

    # Initialize result dictionaries
    skills = {}
    set_skills = {}
    group_skills = {}

    def get_doc_from_url(url):
        time.sleep(0.3)
        print(f"Fetching: {url}")
        res = session.get(url)
        res.raise_for_status()
        return BeautifulSoup(res.text, 'html.parser')

    # Weapon and Armor Skills
    for skill_type in ['weapon', 'armor']:
        for link in links[skill_type]:
            doc = get_doc_from_url(f"{base_url}{link}")
            name = doc.find('h2').get_text(strip=True)
            description = doc.find('blockquote').get_text(strip=True)
            level_rows = doc.find_all('tbody')[0].find_all('tr')
            levels = [row.find_all('td')[2].get_text(strip=True) for row in level_rows]
            skills[name] = {
                'icon': '',
                'type': skill_type,
                'description': description,
                'levels': levels
            }

    # Group Skills
    for link in links['group']:
        doc = get_doc_from_url(f"{base_url}{link}")
        name = doc.find('h2').get_text(strip=True)
        effect_row = doc.find_all('tbody')[0].find_all('tr')[0]
        effect = effect_row.find_all('td')[2].get_text(strip=True)
        description = effect
        armor_rows = doc.find_all('tbody')[1].find_all('tr')
        armor_pieces = [de_kira(row.find_all('td')[0].get_text(strip=True)) for row in armor_rows]
        group_skills[name] = {
            'skill': name, # replace manually once it's in-game i guess
            'description': description,
            'effect': effect,
            'pieces': 3,
            'armor': armor_pieces
        }

    # Set Skills
    for link in links['set']:
        doc = get_doc_from_url(f"{base_url}{link}")
        name = doc.find('h2').get_text(strip=True)
        level_rows = doc.find_all('tbody')[0].find_all('tr')
        levels = [row.find_all('td')[2].get_text(strip=True) for row in level_rows]
        description = levels[0]
        armor_rows = doc.find_all('tbody')[1].find_all('tr')
        armor_pieces = [de_kira(row.find_all('td')[0].get_text(strip=True)) for row in armor_rows]
        set_skills[name] = {
            'skill': name, # replace manually once it's in-game i guess
            'description': description,
            'levels': levels,
            'piecesPerLevel': [2, 4],  # hardcoded like in JS
            'armor': armor_pieces
        }

    with open(f'{base_path}/kiranico/skills.json', 'w') as f: json.dump(skills, f, indent=2)
    with open(f'{base_path}/kiranico/group-skills.json', 'w') as f: json.dump(group_skills, f, indent=2)
    with open(f'{base_path}/kiranico/set-skills.json', 'w') as f: json.dump(set_skills, f, indent=2)

def pull_kiranico_armor(session):
    with open(f'{base_path}/kiranico/group-skills.json', 'r') as f: 
        group_skills_db = json.load(f)
    with open(f'{base_path}/kiranico/set-skills.json', 'r') as f: 
        set_skills_db = json.load(f)

    # Base URL
    base_url = 'https://mhwilds.kiranico.com'

    # Step 1: Fetch the main armor series page
    main_url = f'{base_url}/data/armor-series'
    response = session.get(main_url)
    response.raise_for_status()  # Ensure the request was successful

    # Parse the main page
    soup = BeautifulSoup(response.text, 'html.parser')

    # Step 2: Extract links to individual armor series
    armor_links = [a['href'] for a in soup.select('td > a[href]')]
    count = 0
    max_count = len(armor_links)

    # Dictionaries to store armor and armor series data
    armor = {}
    armor_series = {}

    # Step 3: Iterate over each armor series link
    for relative_link in armor_links:
        count += 1
        armor_url = f"{base_url}{relative_link}"
        print(f"Fetching: {armor_url} ({count}/{max_count})")
        
        # Fetch the armor series page
        res = session.get(armor_url)
        res.raise_for_status()
        html = res.text

        # Parse the armor series page
        doc = BeautifulSoup(html, 'html.parser')

        # Extract armor series name
        armor_series_name = doc.find('h2').get_text(strip=True) if doc.find('h2') else 'Unknown Series'
        rank = 'high' if any(char in armor_series_name for char in ['α', 'β', 'γ']) else 'low'
        armor_series_name = de_kira(armor_series_name)

        # Find all table bodies
        table_bodies = doc.find_all('tbody')

        if len(table_bodies) < 4:
            print(f"Skipping {armor_url} due to unexpected table structure")
            continue

        current_name = ""

        # Table 1: Name + Description
        for row in table_bodies[0].find_all('tr'):
            cols = row.find_all('td')
            if len(cols) < 2:
                continue
            name = de_kira(cols[0].get_text(strip=True))
            current_name = name
            description = cols[1].get_text(strip=True)
            armor[name] = {'description': description, 'rank': rank}
            armor_series.setdefault(armor_series_name, {'pieces': [], 'rank': rank})['pieces'].append(name)

        if not armor.get(current_name):
            print(f"\t{current_name} has no skills, skipping...")
            continue

        # Table 2: Defenses + Resistances
        for row in table_bodies[1].find_all('tr'):
            cols = row.find_all('td')
            if len(cols) < 7:
                continue
            name = de_kira(cols[1].get_text(strip=True))
            armor[name].update({
                'type': cols[0].get_text(strip=True).lower(),
                'defense': int(cols[2].get_text(strip=True)),
                'fireResistance': int(cols[3].get_text(strip=True)),
                'waterResistance': int(cols[4].get_text(strip=True)),
                'thunderResistance': int(cols[5].get_text(strip=True)),
                'iceResistance': int(cols[6].get_text(strip=True)),
                'dragonResistance': int(cols[7].get_text(strip=True)),
            })

        # Table 3: Slots and Skills
        for row in table_bodies[2].find_all('tr'):
            cols = row.find_all('td')
            if len(cols) < 4:
                continue
            name = de_kira(cols[1].get_text(strip=True))
            slots = [int(slot) for slot in cols[2].get_text(strip=True).replace('[', '').replace(']', '').split() if slot.isdigit()]
            slots = [int(d) for d in str(slots[0])]
            slots = [x for x in slots if x != 0]
            skills_text = cols[3].get_text(strip=True)
            set_skill = ""
            group_skill = ""

            if name == "Leather Headgear Alpha":
                dog = 1

            skills = {}
            if '\n' in skills_text:
                for skill in skills_text.split('\n'):
                    skill_name, skill_level = skill.rsplit(' +', 1)
                    skills[skill_name] = int(skill_level)
            else:
                # Split at each +<number> (with optional space), but keep the +<number> with the preceding text
                parts = re.findall(r'.*?\+\d+', skills_text)
                for skill in parts:
                    skill_name, skill_level = skill.rsplit(' +', 1)
                    if set_skills_db.get(skill_name):
                        set_skill = skill_name
                    elif group_skills_db.get(skill_name):
                        group_skill = skill_name
                    else:
                        skills[skill_name] = int(skill_level)
            armor[name].update({
                'slots': slots,
                'skills': skills,
                'groupSkill': group_skill,
                'setSkill': set_skill,
                'rarity': 1 # another non-kiranico inclusion
                # 'materials': [],
                # 'url': armor_url,
                # 'imgUrl': ''
            })

        # Table 4: Series Skills
        series_skills = {}
        for row in table_bodies[3].find_all('tr'):
            cols = row.find_all('td')
            if len(cols) < 3:
                continue
            skill_name = cols[0].get_text(strip=True)
            level = int(cols[1].get_text(strip=True))
            description = cols[2].get_text(strip=True)
            series_skills[skill_name] = level
        armor_series[armor_series_name]['skills'] = series_skills

        # Respectful delay to prevent throttling
        time.sleep(0.3)

    with open(f'{base_path}/kiranico/armor.json', 'w') as f:
        json.dump(armor, f, indent=4)
    with open(f'{base_path}/kiranico/armor-series.json', 'w') as f:
        json.dump(armor_series, f, indent=4)

def pull_kiranico_talismans(session):
    # Base URL
    base_url = 'https://mhwilds.kiranico.com'

    # Step 1: Fetch the main armor series page
    main_url = f'{base_url}/data/charms'
    response = session.get(main_url)
    response.raise_for_status()  # Ensure the request was successful

    # Parse the main page
    soup = BeautifulSoup(response.text, 'html.parser')

    # Step 2: Extract links to individual armor series
    armor_links = [a['href'] for a in soup.select('td > a[href]')]
    count = 0
    max_count = len(armor_links)

    # Dictionaries to store talisman data
    talismans = {}

    # Step 3: Iterate over each talisman link
    for relative_link in armor_links:
        count += 1
        armor_url = f"{base_url}{relative_link}"
        print(f"Fetching: {armor_url} ({count}/{max_count})")
        
        # Fetch the talisman page
        res = session.get(armor_url)
        res.raise_for_status()
        html = res.text

        # Parse the talisman page
        doc = BeautifulSoup(html, 'html.parser')

        # Extract talisman name
        name = doc.find('h2').get_text(strip=True) if doc.find('h2') else 'Unknown Talisman'

        # Find all table bodies
        table_bodies = doc.find_all('tbody')

        skills = {}
        for row in table_bodies[0].find_all('tr'):
            cols = row.find_all('td')
            skill_name = cols[0].get_text(strip=True)
            level = int(cols[1].get_text(strip=True).split("Lv")[1])
            skills[skill_name] = level

        talismans[name] = {
            'type': "talisman",
            'rarity': 1, # kiranico doesn't have this
            'skills': skills,
            # 'effect': ""
        }

        # Respectful delay to prevent throttling
        time.sleep(0.3)

    with open(f'{base_path}/kiranico/talisman.json', 'w') as f:
        json.dump(talismans, f, indent=4)

def update_detailed_data():
    ret = {
        "skills": {},
        "setSkills": {},
        "groupSkills": {},
        "head": {},
        "arms": {},
        "chest": {},
        "waist": {},
        "legs": {},
        "talisman": {},
        # "decoration": {}
    }

    # kiranico-pulled data
    with open(f'{base_path}/kiranico/skills.json', 'r') as f: 
        skills_kira = json.load(f)
    with open(f'{base_path}/kiranico/set-skills.json', 'r') as f: 
        set_skills_kira = json.load(f)
    with open(f'{base_path}/kiranico/group-skills.json', 'r') as f: 
        group_skills_kira = json.load(f)
    with open(f'{base_path}/kiranico/armor.json', 'r') as f: 
        armor_kira = json.load(f)
    with open(f'{base_path}/kiranico/talisman.json', 'r') as f: 
        talisman_kira = json.load(f)

    # my data
    with open(f'{base_path}/detailed/skills.json', 'r') as f: 
        skills = json.load(f)
    with open(f'{base_path}/detailed/set-skills.json', 'r') as f: 
        set_skills = json.load(f)
    with open(f'{base_path}/detailed/group-skills.json', 'r') as f: 
        group_skills = json.load(f)
    with open(f'{base_path}/detailed/head.json', 'r') as f: 
        head = json.load(f)
    with open(f'{base_path}/detailed/arms.json', 'r') as f: 
        arms = json.load(f)
    with open(f'{base_path}/detailed/chest.json', 'r') as f: 
        chest = json.load(f)
    with open(f'{base_path}/detailed/waist.json', 'r') as f: 
        waist = json.load(f)
    with open(f'{base_path}/detailed/legs.json', 'r') as f: 
        legs = json.load(f)
    armor = { **head, **arms, **chest, **waist, **legs }
    with open(f'{base_path}/detailed/talisman.json', 'r') as f: 
        talisman = json.load(f)

    # skills
    for name, data in skills_kira.items():
        sk = skills.get(name)
        if sk:
            obj = {
                **sk,
            }
        else:
            obj = {
                **data
            }
        ret["skills"][name] = obj

    # set skills
    for name, data in set_skills_kira.items():
        sk = set_skills.get(name)
        if sk:
            obj = {
                **sk,
            }
        else:
            obj = {
                **data
            }
            if not obj.get("skill"):
                obj["skill"] = name
        ret["setSkills"][name] = obj

    # group skills
    for name, data in group_skills_kira.items():
        sk = group_skills.get(name)
        if sk:
            obj = {
                **sk,
            }
        else:
            obj = {
                **data
            }
            if not obj.get("skill"):
                obj["skill"] = name
        ret["groupSkills"][name] = obj

    # armor
    for name, data in armor_kira.items():
        sk = armor.get(name)
        if sk:
            obj = {
                **sk
            }

            # to avoid changing field order in the json, i modify after assign
            obj["defense"] = data["defense"]
            obj["fireResistance"] = data["fireResistance"]
            obj["waterResistance"] = data["waterResistance"]
            obj["thunderResistance"] = data["thunderResistance"]
            obj["iceResistance"] = data["iceResistance"]
            obj["dragonResistance"] = data["dragonResistance"]
            if not obj.get("setSkill"):
                obj["setSkill"] = data["setSkill"]
            if not obj.get("groupSkill"):
                obj["groupSkill"] = data["groupSkill"]
        else:
            obj = {
                **data
            }
        ret[data["type"]][name] = obj

    # talisman
    for name, data in talisman_kira.items():
        sk = talisman.get(name)
        if sk:
            obj = {
                **sk
            }
        else:
            obj = {
                **data
            }
        ret["talisman"][name] = obj
        
    with open(f'{base_path}/detailed/skills.json', 'w') as f:
        json.dump(ret["skills"], f, indent=4)
    with open(f'{base_path}/detailed/set-skills.json', 'w') as f:
        json.dump(ret["setSkills"], f, indent=4)
    with open(f'{base_path}/detailed/group-skills.json', 'w') as f:
        json.dump(ret["groupSkills"], f, indent=4)
    with open(f'{base_path}/detailed/head.json', 'w') as f:
        json.dump(ret["head"], f, indent=4)
    with open(f'{base_path}/detailed/arms.json', 'w') as f:
        json.dump(ret["arms"], f, indent=4)
    with open(f'{base_path}/detailed/chest.json', 'w') as f:
        json.dump(ret["chest"], f, indent=4)
    with open(f'{base_path}/detailed/waist.json', 'w') as f:
        json.dump(ret["waist"], f, indent=4)
    with open(f'{base_path}/detailed/legs.json', 'w') as f:
        json.dump(ret["legs"], f, indent=4)
    with open(f'{base_path}/detailed/talisman.json', 'w') as f:
        json.dump(ret["talisman"], f, indent=4)

def update_compact_data():
    ret = {
        "skills": {},
        "setSkills": {},
        "groupSkills": {},
        "head": {},
        "arms": {},
        "chest": {},
        "waist": {},
        "legs": {},
        "talisman": {},
        # "decoration": {}
    }

    # detailed data
    with open(f'{base_path}/detailed/head.json', 'r') as file:
        head = json.load(file)
        head = dict(sorted(head.items()))
    with open(f'{base_path}/detailed/chest.json', 'r') as file:
        chest = json.load(file)
        chest = dict(sorted(chest.items()))
    with open(f'{base_path}/detailed/arms.json', 'r') as file:
        arms = json.load(file)
        arms = dict(sorted(arms.items()))
    with open(f'{base_path}/detailed/waist.json', 'r') as file:
        waist = json.load(file)
        waist = dict(sorted(waist.items()))
    with open(f'{base_path}/detailed/legs.json', 'r') as file:
        legs = json.load(file)
        legs = dict(sorted(legs.items()))
    with open(f'{base_path}/detailed/talisman.json', 'r') as file:
        talisman = json.load(file)
        talisman = dict(sorted(talisman.items()))
    # with open(f'{base_path}/detailed/decoration.json', 'r') as file:
    #     decoration = json.load(file)
    with open(f'{base_path}/detailed/skills.json', 'r') as file:
        skills = json.load(file)
        skills = dict(sorted(skills.items()))
    with open(f'{base_path}/detailed/set-skills.json', 'r') as file:
        set_skills = json.load(file)
        set_skills = dict(sorted(set_skills.items()))
    with open(f'{base_path}/detailed/group-skills.json', 'r') as file:
        group_skills = json.load(file)
        group_skills = dict(sorted(group_skills.items()))

    armors = {**head, **chest, **arms, **waist, **legs}

    grouped = defaultdict(dict)
    for armor_name, armor in armors.items():
        skill_map = armor["skills"]
        resistances = [
            armor["fireResistance"],
            armor["waterResistance"],
            armor["thunderResistance"],
            armor["iceResistance"],
            armor["dragonResistance"]
        ]
        entry = [
            armor["type"],
            skill_map,
            armor["groupSkill"],
            armor["slots"],
            armor["defense"],
            resistances,
            armor["rank"],
            armor["setSkill"]
        ]
        grouped[armor["type"]][armor_name] = entry

    # armor compact
    for armor_type, items in grouped.items():
        filename = f"{base_path}/compact/{armor_type}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("{\n")
            lines = []
            for name, entry in items.items():
                line = f'\t"{name}":{json.dumps(entry, separators=(",", ":"))}'
                lines.append(line)
            f.write(",\n".join(lines))
            f.write("\n}")

    # talisman compact
    filename = f"{base_path}/compact/talisman.json"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("{\n")
        lines = []
        for name, data in talisman.items():
            entry = [
                data["type"],
                data["skills"]
            ]
            line = f'\t"{name}":{json.dumps(entry, separators=(",", ":"))}'
            lines.append(line)
        f.write(",\n".join(lines))
        f.write("\n}")

    # set skills compact
    filename = f"{base_path}/compact/set-skills.json"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("{\n")
        lines = []
        for name, data in set_skills.items():
            entry = [
                data["skill"],
                2,
                [2,4]
            ]
            line = f'\t"{name}":{json.dumps(entry, separators=(",", ":"))}'
            lines.append(line)
        f.write(",\n".join(lines))
        f.write("\n}")

    # group skills compact
    filename = f"{base_path}/compact/group-skills.json"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("{\n")
        lines = []
        for name, data in group_skills.items():
            entry = [
                data["skill"],
                1,
                3
            ]
            line = f'\t"{name}":{json.dumps(entry, separators=(",", ":"))}'
            lines.append(line)
        f.write(",\n".join(lines))
        f.write("\n}")

    # skills compact
    filename = f"{base_path}/compact/skills.json"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("{\n")
        lines = []
        for name, data in skills.items():
            line = f'\t"{name}":{len(data["levels"])}'
            lines.append(line)
        f.write(",\n".join(lines))
        f.write("\n}")

# =================================================================

# format_all_jsons() # this was really a run one-time-only thing to convert old list format to map
pull_kiranico_data(pull_armor=True)
update_detailed_data()
update_compact_data()

# after this, run tasks.py to map any new ids
# finally, manually edit any set/group skills that kiranico doesn't list (will default to same as set/group names)
#   and armor/talisman rarities that kiranico also doesn't list
