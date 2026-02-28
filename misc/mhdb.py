# pull gear data from wilds.mhdb.io

from collections import defaultdict
import json
import re
import requests

BASE_DATA_PATH = "./src/data"
BASE_URL = "https://wilds.mhdb.io/en"

# i have the icons named differently, so this just renames them after pull, for less work
icon_map = {
    "affinity": "crit",
    "attack": "attack",
    "defense": "defense",
    "element": "elemental",
    "gathering": "explore",
    "group": "group",
    "handicraft": "sharpness",
    "health": "recovery",
    "item": "item",
    "offense": "power",
    "ranged": "ammo",
    "set": "set",
    "stamina": "stamina",
    "utility": "meditate",
}

def sort_dump(data, path):
    with open(path, "w") as f:
        json.dump(
            data,
            f,
            # ensure_ascii=False,
            sort_keys=True,
            indent=4
        )

# gets the base name of set skills like Decimator I or Decimator II (becomes Decimator here)
def get_base_name(names):
    # Regex to strip trailing I or II
    suffix_regex = re.compile(r"\s(I|II)\s*$")

    # Strip suffixes
    stripped = [
        suffix_regex.sub("", name).strip()
        for name in names
    ]

    # Are all stripped names identical?
    if len(set(stripped)) == 1:
        return stripped[0]

    # If different names, join originals
    return "/".join(names)

def de_kira(name: str) -> str:
    decode = name.replace('\u03b1', 'Alpha').replace('\u03b2', 'Beta').replace('\u03b3', 'Gamma').replace('\u2014', '—').replace('\"', "'")
    return decode.replace('α', 'Alpha').replace('β', 'Beta').replace('γ', 'Gamma').replace('G. ', 'G ')

def generate_gear(data):
    ret = {
        **data
    }

    match data['type']:
        case "head" | "chest" | "arms" | "waist" | "legs":
            ret = {
                **ret,
                "defense": 0,
                "description": "[no gear description in database]",
                "rank": "high",
                "rarity": 1,
                "dragonResistance": 0,
                "fireResistance": 0,
                "iceResistance": 0,
                "thunderResistance": 0,
                "waterResistance": 0
            }
        case "talisman":
            ret = {
                **ret,
                "effect": "[no gear effect in database]",
                "rarity": 1
            }
        case "decoration":
            ret = {
                **ret,
                "description": "[no deco description in database]",
                "rarity": 1
            }
        case "weapon":
            return ret
        case _:
            print(f"Unexpected gear generation parsed, type {data['type']}")
    return ret

def pull_gear():
    ret = {}
    gear_map = {
        "armor": f"{BASE_URL}/armor",
        "talismans": f"{BASE_URL}/charms",
        "skills": f"{BASE_URL}/skills",
        "armor-sets": f"{BASE_URL}/armor/sets",
        "decorations": f"{BASE_URL}/decorations"
    }

    for gear_type in gear_map:
        response = requests.get(gear_map[gear_type])

        if response.status_code == 200:
            ret[gear_type] = response.json()
        else:
            print(f"Error: {response.status_code} - {response.text}")

    # save jsons
    for gear_type in ret:
        with open(f'{BASE_DATA_PATH}/mhdb/{gear_type}.json', 'w', encoding="utf-8") as f:
            json.dump(ret[gear_type], f, indent=4, ensure_ascii=False)

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
        "decoration": {}
    }

    # mhdb-pulled data
    with open(f'{BASE_DATA_PATH}/mhdb/armor.json', 'r', encoding="utf-8") as f: 
        armor_mhdb = json.load(f)
    with open(f'{BASE_DATA_PATH}/mhdb/talismans.json', 'r', encoding="utf-8") as f: 
        talismans_mhdb = json.load(f)
    with open(f'{BASE_DATA_PATH}/mhdb/skills.json', 'r', encoding="utf-8") as f: 
        skills_mhdb = json.load(f)
    with open(f'{BASE_DATA_PATH}/mhdb/armor-sets.json', 'r', encoding="utf-8") as f: 
        armor_sets_mhdb = json.load(f)
    with open(f'{BASE_DATA_PATH}/mhdb/decorations.json', 'r', encoding="utf-8") as f: 
        decorations_mhdb = json.load(f)

    # my data
    with open(f'{BASE_DATA_PATH}/detailed/skills.json', 'r') as f: 
        skills = json.load(f)
    with open(f'{BASE_DATA_PATH}/detailed/set-skills.json', 'r') as f: 
        set_skills = json.load(f)
    with open(f'{BASE_DATA_PATH}/detailed/group-skills.json', 'r') as f: 
        group_skills = json.load(f)
    with open(f'{BASE_DATA_PATH}/detailed/head.json', 'r') as f: 
        head = json.load(f)
    with open(f'{BASE_DATA_PATH}/detailed/arms.json', 'r') as f: 
        arms = json.load(f)
    with open(f'{BASE_DATA_PATH}/detailed/chest.json', 'r') as f: 
        chest = json.load(f)
    with open(f'{BASE_DATA_PATH}/detailed/waist.json', 'r') as f: 
        waist = json.load(f)
    with open(f'{BASE_DATA_PATH}/detailed/legs.json', 'r') as f: 
        legs = json.load(f)
    armor = { **head, **arms, **chest, **waist, **legs }
    with open(f'{BASE_DATA_PATH}/detailed/talisman.json', 'r') as f: 
        talisman = json.load(f)
    with open(f'{BASE_DATA_PATH}/detailed/decoration.json', 'r') as f: 
        decorations = json.load(f)

    # mhdb api cannot currently handle gogma's multiple set skills correctly, so we just manually overwrite them
    with open(f'{BASE_DATA_PATH}/manual/set-overwrites.json', 'r') as f: 
        set_overwrites = json.load(f)
    
    # and of course, there's missing data, especially if new gear has just been released within a few days
    with open(f'{BASE_DATA_PATH}/manual/armor.json', 'r') as f: 
        manual_gear = json.load(f)

    # armor
    for armor_piece in armor_mhdb:
        obj = {}
        name = armor_piece['name']
        clean_name = de_kira(name)
        mine = armor.get(clean_name)
        if mine:
            obj = {
                **mine
            }

        obj["description"] = armor_piece["description"]
        obj["rank"] = armor_piece["rank"]
        obj["type"] = armor_piece["kind"]
        obj["defense"] = armor_piece["defense"]["base"]
        obj["fireResistance"] = armor_piece["resistances"]["fire"]
        obj["waterResistance"] = armor_piece["resistances"]["water"]
        obj["thunderResistance"] = armor_piece["resistances"]["thunder"]
        obj["iceResistance"] = armor_piece["resistances"]["ice"]
        obj["dragonResistance"] = armor_piece["resistances"]["dragon"]
        obj["slots"] = armor_piece['slots']
        obj["skills"] = dict(sorted({
            x["skill"]["name"]: x["level"]
            for x in armor_piece["skills"]
            if x["skill"]["kind"] == "armor"
        }.items()))
        obj["groupSkill"] = [
            gs
            for s in armor_sets_mhdb
            if any(p.get("name") == name for p in s.get("pieces", []))
            if (gs := (
                (s.get("groupBonus") or {}).get("skill") or {}
            ).get("name"))
        ]
        out = [
            x["skill"]["name"]
            for x in armor_piece["skills"]
            if x["skill"]["kind"] == "set"
        ]
        for s in armor_sets_mhdb:
            if not any(p.get("name") == name for p in s.get("pieces", [])):
                continue

            name = (
                (s.get("bonus") or {}).get("skill") or {}
            ).get("name")

            if name:
                out.append(name)
        obj["setSkill"] = set_overwrites.get(name) or out
        obj["rarity"] = armor_piece['rarity']
        ret[obj["type"]][clean_name] = obj

    armor = { **ret['head'], **ret['arms'], **ret['chest'], **ret['waist'], **ret['legs'] }
    for armor_name, armor_piece in manual_gear.items():
        if armor.get(armor_name):
            print(f"Previously missing gear piece [{armor_name}] exists now")
            continue
        print(f"Generating dummy gear for [{armor_name}]")
        ret[armor_piece['type']][armor_name] = generate_gear(armor_piece)

    armor = { **ret['head'], **ret['arms'], **ret['chest'], **ret['waist'], **ret['legs'] }

    # skills
    for skill in skills_mhdb:
        name = skill['name']
        clean_name = de_kira(name)
        match skill['kind']:
            case "weapon" | "armor":
                type = skill['kind']
                obj = {}
                
                mine = skills.get(clean_name)
                if mine:
                    obj = {
                        **mine,
                    }

                obj = {
                    **obj,
                    "type": type,
                    "icon": icon_map.get(skill['icon']['kind']) or 'ammo',
                    "description": skill['description'],
                    "levels": [x["description"] for x in skill['ranks']]
                }

                ret["skills"][clean_name] = obj
            case "set" | "group":
                source = set_skills if skill['kind'] == "set" else group_skills
                file_name = "setSkills" if skill['kind'] == "set" else "groupSkills"
                skill_type = "setSkill" if skill['kind'] == "set" else "groupSkill"
                is_set = skill['kind'] == "set"
                type = "armor"

                sk = source.get(clean_name)
                if sk:
                    obj = {
                        **sk,
                    }

                # set: skill, description, levels, piecesPerLevel, armor
                # group: skill, description, effect, pieces, armor
                obj = {
                    **obj,
                    "skill": get_base_name([x["name"] for x in skill['ranks']]),
                    "description": obj.get("description") or skill["description"],
                    "armor": [
                        armor_name
                        for armor_name, armor_data in armor.items()
                        if name in armor_data[skill_type]
                    ]
                }

                if is_set:
                    obj = {
                        **obj,
                        "levels": [x["description"] for x in skill['ranks']],
                        "piecesPerLevel": [2, 4],
                    }
                else:
                    obj = {
                        **obj,
                        "effect": skill['ranks'][0]['description'],
                        "pieces": 3,
                    }

                ret[file_name][clean_name] = obj
            case _: continue

    # talisman
    for charm_group in talismans_mhdb:
        for charm in charm_group['ranks']:
            name = charm['name']
            clean_name = de_kira(name)
            mine = talisman.get(name)
            if mine:
                obj = {
                    **mine
                }

            # rarity, effect, skills, type
            obj = {
                **obj,
                "type": "talisman",
                "rarity": charm['rarity'],
                "effect": charm['description'],
                "skills": dict(sorted({
                    x["skill"]["name"]: x["level"]
                    for x in charm["skills"]
                    # if x["skill"]["kind"] == "armor"
                }.items()))
            }
            ret["talisman"][clean_name] = obj

    # decoration
    for deco in decorations_mhdb:
        name = deco['name'].replace('[', '').replace(']', '').replace('/', '-')
        clean_name = de_kira(name)
        mine = decorations.get(name)
        if mine:
            obj = {
                **mine
            }

        # type, rarity, description, slot, skills
        obj = {
            **obj,
            "type": deco['kind'],
            "rarity": deco['rarity'],
            "description": deco['description'],
            "slot": deco['slot'],
            "skills": dict(sorted({
                x["skill"]["name"]: x["level"]
                for x in deco["skills"]
            }.items()))
        }
        ret["decoration"][clean_name] = obj
        
    for key, filename in {
        "skills": "skills.json",
        "setSkills": "set-skills.json",
        "groupSkills": "group-skills.json",
        "head": "head.json",
        "arms": "arms.json",
        "chest": "chest.json",
        "waist": "waist.json",
        "legs": "legs.json",
        "talisman": "talisman.json",
        "decoration": "decoration.json",
    }.items():
        sort_dump(ret[key], f"{BASE_DATA_PATH}/detailed/{filename}")

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
        "decoration": {}
    }

    # detailed data
    with open(f'{BASE_DATA_PATH}/detailed/head.json', 'r') as file:
        head = json.load(file)
        head = dict(sorted(head.items()))
    with open(f'{BASE_DATA_PATH}/detailed/chest.json', 'r') as file:
        chest = json.load(file)
        chest = dict(sorted(chest.items()))
    with open(f'{BASE_DATA_PATH}/detailed/arms.json', 'r') as file:
        arms = json.load(file)
        arms = dict(sorted(arms.items()))
    with open(f'{BASE_DATA_PATH}/detailed/waist.json', 'r') as file:
        waist = json.load(file)
        waist = dict(sorted(waist.items()))
    with open(f'{BASE_DATA_PATH}/detailed/legs.json', 'r') as file:
        legs = json.load(file)
        legs = dict(sorted(legs.items()))
    with open(f'{BASE_DATA_PATH}/detailed/talisman.json', 'r') as file:
        talisman = json.load(file)
        talisman = dict(sorted(talisman.items()))
    with open(f'{BASE_DATA_PATH}/detailed/decoration.json', 'r') as file:
        decoration = json.load(file)
        decoration = dict(sorted(decoration.items()))
    with open(f'{BASE_DATA_PATH}/detailed/skills.json', 'r') as file:
        skills = json.load(file)
        skills = dict(sorted(skills.items()))
    with open(f'{BASE_DATA_PATH}/detailed/set-skills.json', 'r') as file:
        set_skills = json.load(file)
        set_skills = dict(sorted(set_skills.items()))
    with open(f'{BASE_DATA_PATH}/detailed/group-skills.json', 'r') as file:
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
        filename = f"{BASE_DATA_PATH}/compact/{armor_type}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("{\n")
            lines = []
            for name, entry in items.items():
                line = f'\t"{name}":{json.dumps(entry, separators=(",", ":"))}'
                lines.append(line)
            f.write(",\n".join(lines))
            f.write("\n}")

    # talisman compact
    filename = f"{BASE_DATA_PATH}/compact/talisman.json"
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

    # decoration compact
    filename = f"{BASE_DATA_PATH}/compact/decoration.json"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("{\n")
        lines = []
        for name, data in decoration.items():
            entry = [
                data["type"],
                data["skills"],
                data["slot"]
            ]
            line = f'\t"{name}":{json.dumps(entry, separators=(",", ":"))}'
            lines.append(line)
        f.write(",\n".join(lines))
        f.write("\n}")

    # set skills compact
    filename = f"{BASE_DATA_PATH}/compact/set-skills.json"
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
    filename = f"{BASE_DATA_PATH}/compact/group-skills.json"
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
    filename = f"{BASE_DATA_PATH}/compact/skills.json"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("{\n")
        lines = []
        for name, data in skills.items():
            line = f'\t"{name}":{len(data["levels"])}'
            lines.append(line)
        f.write(",\n".join(lines))
        f.write("\n}")


pull_gear()
update_detailed_data()
update_compact_data()
