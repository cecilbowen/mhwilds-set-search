from collections import defaultdict
from itertools import product
from functools import cmp_to_key
import json
import time
from typing import Callable, Any
import tests

skill_db = set_skill_db = group_skill_db = {}
weapon_db = {}
deco_inventory = {}
head = chest = arms = waist = legs = talisman = decoration = {}
total_possible_combinations = 0
reorder_amount = (2, 2, 5) # how many of best 3 slotters, 2/3 slotters, longest slotters to put at top of list

already_loaded_jsons = False
file_write = True

DEBUG = True

def load_jsons(deco_mods = {}):
    global already_loaded_jsons
    if already_loaded_jsons:
        return
    global head, chest, arms, waist, legs, talisman, decoration, skill_db, set_skill_db, group_skill_db, deco_inventory
    with open('./src/data/compact/head.json', 'r') as file:
        head = json.load(file)
    with open('./src/data/compact/chest.json', 'r') as file:
        chest = json.load(file)
    with open('./src/data/compact/arms.json', 'r') as file:
        arms = json.load(file)
    with open('./src/data/compact/waist.json', 'r') as file:
        waist = json.load(file)
    with open('./src/data/compact/legs.json', 'r') as file:
        legs = json.load(file)
    with open('./src/data/compact/talisman.json', 'r') as file:
        talisman = json.load(file)
    with open('./src/data/compact/decoration.json', 'r') as file:
        decoration = json.load(file)
    with open('./src/data/compact/skills.json', 'r') as file:
        skill_db = json.load(file)
    with open('./src/data/compact/set-skills.json', 'r') as file:
        set_skill_db = json.load(file)
    with open('./src/data/compact/group-skills.json', 'r') as file:
        group_skill_db = json.load(file)
    with open('./src/data/user/deco-inventory.json', 'r') as file: # probably be localStorage when js
        deco_inventory = json.load(file)

    # modify deco inventory
    if deco_mods:
        for name, amount in deco_mods.items():
            deco_inventory[name] = amount
    already_loaded_jsons = True

def get_json_from_type(type:str):
    global head, chest, arms, waist, legs, talisman, decoration
    type_map = {
        "head": head,
        "chest": chest,
        "arms": arms,
        "waist": waist,
        "legs": legs,
        "armor": { **head, **chest, **arms, **waist, **legs },
        "talisman": talisman,
        "decoration": decoration
    }

    return type_map[type]

def has_needed_skill(gear_skills: dict, needed_skills: dict) -> bool:
    return bool(set(gear_skills) & set(needed_skills))

def is_in_sets(armor_data: list, set_skills: dict):
    return armor_data[7] in set_skills

def is_in_groups(armor_data: list, group_skills: dict):
    return armor_data[2] in group_skills

def list_find(list, prop, value):
    return next((x for x in list if x[prop] == value), None)

# merge dict2 onto dict1, without overwriting existing dict1 values
def merge_safe_update(dict1_o, dict2):
    dict1 = dict1_o.copy()
    for key, value in dict2.items():
        if key not in dict1:
            dict1[key] = value
    return dict1

def slottage_length_compare(a, b):
    a_slots = list(a)[1][3].copy()
    b_slots = list(b)[1][3].copy()
    if len(a_slots) < len(b_slots):
        while len(a_slots) < len(b_slots):
            a_slots.append(0)
    if len(b_slots) < len(a_slots):
        while len(b_slots) < len(a_slots):
            b_slots.append(0)

    for i in range(len(a_slots) - 1, 0, -1):
        if a_slots[i] > b_slots[i]:
            return True
    
    return False

def slottage_length_compare_raw(best_slots, challenger_slots):
    test_slots = list(challenger_slots)
    while len(test_slots) < len(best_slots):
        test_slots.append(0)

    for i in range(len(best_slots) - 1, 0, -1):
        if test_slots[i] > best_slots[i]:
            return True
    
    return False

def has_better_slottage(armors: dict, challenger_slots: list) -> bool:
    if not armors:
        return True
    copied_armors = armors.copy()
    sorted_by_slottage = dict(
        sorted(
            ((k, v) for k, v in copied_armors.items()),
            key=lambda x: (_x(x[1], "slots")),
            reverse=True # descending
        )
    )

    top = next(iter(sorted_by_slottage.items()))
    return challenger_slots > top[1][3]

def has_longer_slottage(armors: dict, challenger_slots: list) -> bool:
    data = armors.copy()
    # Sort dictionary keys using the comparison function
    sorted_keys = dict(sorted(data.items(), key=cmp_to_key(slottage_length_compare)))

    # Convert back to a sorted dictionary if needed
    sorted_data = {key: data[key] for key in sorted_keys}

    return slottage_length_compare_raw(challenger_slots, next(iter(sorted_data.items()))[1][3])

def get_gear_pool(
        skills: dict, set_skills: dict, group_skills: dict,
        must_use_armor: tuple[str, ...], blacklisted_armor: tuple[str, ...]
    ) -> dict:
    best_armor = get_best_armor(skills, set_skills, group_skills, must_use_armor, blacklisted_armor)
    return best_armor

def get_set_name(armor_data: dict) -> str:
    return armor_data[7]

def get_group_name(armor_data: dict) -> str:
    return armor_data[2]

def group_armor_into_sets(armor_pieces: dict, set_skills: dict, group_skills: dict) -> dict:
    groups = {}
    groups_empty = {}

    for armor_name, armor_data in armor_pieces.items():
        set_name = get_set_name(armor_data) 
        group_name = get_group_name(armor_data)

        if set_name and set_name in set_skills:
            groups[set_name] = groups.get(set_name) or {}
            groups_empty[set_name] = groups_empty.get(set_name) or {}
            groups[set_name][armor_name] = armor_data
        
        if group_name and group_name in group_skills:
            groups[group_name] = groups.get(group_name) or {}
            groups_empty[group_name] = groups_empty.get(group_name) or {}
            groups[group_name][armor_name] = armor_data

    return [groups, groups_empty]

def is_better_armor(existing_armors, new_slots):
    return has_better_slottage(existing_armors, new_slots) or has_longer_slottage(existing_armors, new_slots)

def get_best_weapon(desired_skills: dict):
    global weapon_db, decoration

    # only use rarity 8 weapons
    best_rarity_weapons = {
        k: v for k, v in weapon_db.items()
        if v[len(v) - 1] == 8
    }

    decos_for_skills = {
        k: v for k, v in sorted(
            ((k, v) for k, v in decoration.items() if v[0] == "weapon" and has_needed_skill(v[1], desired_skills)),
            key=lambda x: list(x[1][1].values())[0],  # Sort by level
            reverse=True
        )
    }

    deco_combos = {}
    for weapon_name, weapon_data in best_rarity_weapons.items():
        # todo: for weapons, try multiple deco combos per weapon (if not all combos)
        combo = get_decos_to_fulfill_skills(decos_for_skills, desired_skills, weapon_data[2], weapon_data[1])
        if combo:
            deco_combos[weapon_name] = combo

    sorted_deco_combos = {
        k: v for k, v in sorted(
            ((k, v) for k, v in deco_combos.items()),
            key=lambda x: x[1]["free_slots"],  # Sort by free slots
            reverse=True
        )
    }

    top_key = next(iter(sorted_deco_combos.keys()))
    top_value = next(iter(sorted_deco_combos.values()))
    
    return {
        "name": top_key,
        "deco_names": top_value["deco_names"],
        "free_slots": top_value["free_slots"],
        # "skills": get skill from deco names and combine with weapon skills sums
    }

def get_best_decos(skills: dict) -> dict:
    global decoration
    return {
        k: v for k, v in sorted(
            ((k, v) for k, v in decoration.items() if v[0] == "armor" and has_needed_skill(v[1], skills)),
            key=lambda x: list(x[1][1].values())[0],  # Sort by level
            reverse=True
        )
    }

def get_best_armor(
        skills: dict, set_skills: dict = {}, group_skills: dict = {},
        mandatory_piece_names: tuple = (),
        blacklisted_armor: tuple[str, ...] = (),
        rank: str = "high"
    ):
    global file_write, talisman
    full_data_file = get_json_from_type("armor")

    mandatory = {}
    for name in mandatory_piece_names:
        if name:
            found_data = full_data_file.get(name)
            if found_data:
                mandatory[found_data[0]] = found_data
            else:
                print(f"WARNING: Could not find mandatory {type} armor {name}!")

    # high/low rank
    data_file = {
        k: v for k, v in full_data_file.items() 
        if v[6] == rank
    }

    # Group armors by slot count
    armors_by_slots = {i: {} for i in range(3, -1, -1)}  # 0, 1, 2, 3 slot armors
    for k, v in data_file.items():
        armors_by_slots[len(v[3])][k] = v

    best = {
        "head": {},
        "chest": {},
        "arms": {},
        "waist": {},
        "legs": {}
    }

    # Sort armor groups by slot count and defense
    for slot_count in armors_by_slots:
        sl = dict(
            sorted(
                ((k, v) for k, v in armors_by_slots[slot_count].items() if k not in blacklisted_armor),
                key=lambda x: (x[1][3], x[1][4]),
                reverse=True
            )
        )

        for armor_name, armor_data in sl.items():
            category = armor_data[0]
            group = best[category]
            if not group:
                best[category][armor_name] = armor_data 
            elif has_needed_skill(armor_data[1], skills):
                best[category][armor_name] = armor_data 

    # trim unecessary pieces
    exclusives_to_keep = {
        "head": {},
        "chest": {},
        "arms": {},
        "waist": {},
        "legs": {}
    }
    for category, data in best.items():
        best_skillage = {key: 0 for key in skills}

        for armor_name, armor_data in data.items():
            a_slots = _x(armor_data, "slots")
            a_skills = _x(armor_data, "skills")
            name_data = None

            if is_better_armor(exclusives_to_keep[category], a_slots):
                name_data = (armor_name, armor_data)

            for skill_name, skill_level in a_skills.items():
                if skill_name in skills and skill_level > best_skillage.get(skill_name, 0):
                    name_data = (armor_name, armor_data)
                    best_skillage[skill_name] = skill_level

            if name_data:
                exclusives_to_keep[category][name_data[0]] = name_data[1]

    groupies = {
        k: v for k, v in sorted(
            ((k, v) for k, v in data_file.items() if k not in exclusives_to_keep and (is_in_sets(v, set_skills) or is_in_groups(v, group_skills))),
            key=lambda x: (x[1][3], x[1][4]),
            reverse=True
        )
    }

    best_groupies = {
        "head": {},
        "chest": {},
        "arms": {},
        "waist": {},
        "legs": {}
    }
    for armor_name, armor_data in groupies.items():
        category = armor_data[0]
        best_groupies[category][armor_name] = armor_data 

    for category, data in best_groupies.items():
        groupies_grouped, groupies_tracker = group_armor_into_sets(data, set_skills, group_skills)
        groupies_to_keep = {}
        best_skillage = {key: 0 for key in skills}

        for group_name, group_armor in groupies_grouped.items():
            # add the best of the existing pool armor into set/group categories
            for armor_name, armor_data in exclusives_to_keep[category].items():
                if armor_data[2] == group_name or armor_data[7] == group_name:
                    a_slots = _x(armor_data, "slots")
                    if is_better_armor(groupies_tracker[group_name], a_slots):
                        groupies_tracker[group_name][armor_name] = armor_data              

            # add new armor into set/group categories if it's better than existing
            for armor_name, armor_data in group_armor.items():
                a_slots = _x(armor_data, "slots")
                a_skills = _x(armor_data, "skills")
                if is_better_armor(groupies_tracker[group_name], a_slots):
                    groupies_tracker[group_name][armor_name] = armor_data

                for skill_name, skill_level in a_skills.items():
                    if skill_name in skills and skill_level > best_skillage.get(skill_name, 0):
                        groupies_tracker[group_name][armor_name] = armor_data
                        best_skillage[skill_name] = skill_level
            
        for group_name, group_armor in groupies_tracker.items():
            for armor_name, armor_data in group_armor.items():
                if armor_name not in groupies_to_keep:
                    groupies_to_keep[armor_name] = armor_data

        exclusives_to_keep[category] = { **exclusives_to_keep[category], **groupies_to_keep }

    # now talisman
    best_talismans = {
        k: v for k, v in sorted(
            ((k, v) for k, v in talisman.items() if has_needed_skill(v[1], skills) and k not in blacklisted_armor),
            key=lambda x: list(x[1][1].values())[0],  # Sort by level
            reverse=True
        )
    }

    sk_opt = {}
    talis_opt = {}

    for talis_name, talis_data in best_talismans.items():
        sks = talis_data[1]
        if len(sks) == 1:
            for sk_name, sk_level in sks.items():
                if sk_level > sk_opt.get(sk_name, 0):
                    talis_opt[talis_name] = talis_data
                    sk_opt[sk_name] = sk_level 

    exclusives_to_keep["talisman"] = talis_opt
    
    # finally decos
    best_decos = get_best_decos(skills)

    exclusives_to_keep["decos"] = best_decos

    # print(f"# of {type}: {len(exclusives_to_keep)}")

    if DEBUG and file_write:
        with open('./misc/exclusives-to-keep.txt', 'w') as file:
            for category, data in exclusives_to_keep.items():
                if category in {"talisman", "decos"}:
                    continue
                file.write(f"{category}\n")
                for a_name, a_data in data.items():
                    file.write(f"\t{a_name}: ({_x(a_data, 'type')} - {_x(a_data, 'slots')})\n")
                file.write('\n')

    return exclusives_to_keep

def armor_combo(head, chest, arms, waist, legs, talisman):
    """
    Returns: { "names", "skills", "slots", "set_skills", "group_skills" }
    """
    armor_skills = (head['data'][1], chest['data'][1], arms['data'][1], waist['data'][1], legs['data'][1], talisman['data'][1])
    armor_slots = (head['data'][3], chest['data'][3], arms['data'][3], waist['data'][3], legs['data'][3])

    # Merging dictionaries
    result = defaultdict(int)
    slots = []
    for skill in armor_skills:
        for skill_name, level in skill.items():
            result[skill_name] += level

    # flattening slots list
    for slot_list in armor_slots:
        for slot in slot_list:
            slots.append(slot)

    # Convert defaultdict back to a normal dictionary
    skill_totals = dict(
        sorted(
            ((k, v) for k, v in result.items()),
            key=lambda x: x[1], # sort by level 
            reverse=True
        )
    )
    
    armor_set_names = (head['data'][7], chest['data'][7], arms['data'][7], waist['data'][7], legs['data'][7])
    armor_group_names = (head['data'][2], chest['data'][2], arms['data'][2], waist['data'][2], legs['data'][2])
    set_skills = {}
    group_skills = {}

    for set_name in armor_set_names:
        set_skills[set_name] = set_skills.get(set_name, 0) + 1

    for group_name in armor_group_names:
        group_skills[group_name] = group_skills.get(group_name, 0) + 1

    return {
        "names": [head['name'], chest['name'], arms['name'], waist['name'], legs['name'], talisman['name']],
        "skills": skill_totals,
        "slots": slots,
        "set_skills": set_skills,
        "group_skills": group_skills
    }

def format_armor(obj, pos):
    return {
        "name": list(obj.keys())[pos],
        "data": list(obj.values())[pos]
    }

def format_armor_c(obj):
    return {
        "name": obj[0],
        "data": obj[1]
    }

def get_decos_to_fulfill_skills(decos, desired_skills, slots_available, starting_skills) -> dict:
    global deco_inventory

    # Adjust required skills based on what we already have
    skills_needed = desired_skills.copy()
    for skill, level in starting_skills.items():
        if skill in skills_needed:
            skills_needed[skill] -= level
            if skills_needed[skill] <= 0:
                del skills_needed[skill]  # Remove fully fulfilled skills

    # If we already have all required skills, no decorations are needed
    if not skills_needed:
        return {
            "deco_names": [],
            "free_slots": slots_available
        }

    # Sort slots in descending order for optimal placement
    slots_available.sort(reverse=True)

    # Sort decorations by highest skill contribution, then by smallest slot size
    deco_list = sorted(
        decos.items(), 
        key=lambda x: (x[1][2], -sum(x[1][1].values())),  # Sort by slot size, then total skill contribution
        reverse=True
    )

    # Track used decorations
    used_decos = []
    used_decos_count = {}
    free_slots = list(slots_available)
    used_slots = []

    # Iterate over available slots and try to fill them with the best decorations
    for slot_size in slots_available:
        for deco_name, (deco_type, deco_skills, deco_slot) in deco_list:
            if deco_slot > slot_size or used_decos_count.get(deco_name, 0) > deco_inventory[deco_name]:
                continue  # Skip if decoration doesn't fit in the slot

            if deco_slot < slot_size and deco_slot in free_slots:
                continue # fits, but more efficient to slot into smaller slot we'll reach later
            
            # Check if this decoration helps fulfill any remaining skills
            useful = False
            for skill_name, skill_level in deco_skills.items():
                if skill_name in skills_needed and skills_needed[skill_name] > 0:
                    useful = True
                    break  # Stop searching if this decoration contributes
            
            if not useful:
                continue  # Skip decorations that don't contribute
            
            # Use this decoration
            used_decos.append(deco_name)
            used_decos_count[deco_name] = used_decos_count.get(deco_name, 0) + 1

            used_slots.append(slot_size)
            free_slots.remove(slot_size)

            # Reduce skill requirements
            for skill_name, skill_level in deco_skills.items():
                if skill_name in skills_needed:
                    skills_needed[skill_name] -= skill_level
                    if skills_needed[skill_name] <= 0:
                        del skills_needed[skill_name]  # Remove fully fulfilled skills

            # If all skills are fulfilled, return the list of used decorations
            if not skills_needed:
                return {
                    "deco_names": used_decos,
                    "free_slots": free_slots
                }
            break

    return None

def _x(piece: dict, field: str):
    """
    Extracts a field from an armor piece or decoration
    """

    field_map = {
        "type": 0,
        "skills": 1,
        "slot": 2, # for decos
        "group_skill": 2,
        "slots": 3,
        "defense": 4,
        "resistances": 5,
        "rank": 6
    }

    return piece[field_map[field]]

def get_deco_skills_from_names(names: list[str]) -> dict:
    global decoration

    skills_list = [_x(decoration[name], "skills") for name in names]
    return merge_sum_dicts(skills_list)


def test(armor_set: dict, decos: dict, desired_skills: dict):
    skill_set = armor_set["skills"]
    slots = armor_set["slots"]
    set_skills = armor_set["set_skills"]
    group_skills = armor_set["group_skills"]
    have = {}
    need = {}
    done = True 
    for skill_name, level in desired_skills.items():
        have[skill_name] = skill_set.get(skill_name, 0)
        lack = level - have[skill_name]
        need[skill_name] = lack
        if lack > 0:
            done = False

    if done:
        return {
            "armor_names": armor_set["names"],
            "slots": armor_set["slots"],
            "deco_names": [],
            "skills": skill_set,
            "set_skills": set_skills,
            "group_skills": group_skills,
            "free_slots": armor_set["slots"]
        }

    decos_used = get_decos_to_fulfill_skills(decos, desired_skills, slots, skill_set)

    if decos_used:
        decos_skills_map = get_deco_skills_from_names(decos_used["deco_names"])
        combined_skills = merge_sum_dicts([skill_set, decos_skills_map])
    
        return {
            "armor_names": armor_set["names"],
            "slots": armor_set["slots"],
            "deco_names": decos_used["deco_names"],
            "skills": combined_skills,
            "set_skills": set_skills,
            "group_skills": group_skills,
            "free_slots": decos_used["free_slots"]
        }

    return None

def off_the_top(arr: list, amount: int, field: str) -> list:
    """takes x amount of elements from the top of a dict list and returns a specific field from each"""
    return [x[field] for x in arr[:min(amount, len(arr))]]

def reorder(data_list: list) -> list:
    """
    re-orders display results to put some more desirables up front.
    priority is longest slots with most 3s, longest slots with most 2/3s, then longest slots
    """

    finality = []
    ids_to_cut_line = []

    no_threes = True
    no_twos = True 
    for res in data_list:
        if 3 in res["free_slots"]:
            no_threes = False
        if 2 in res["free_slots"]:
            no_twos = False
        if not (no_threes or no_twos):
            break
    
    if not no_threes:
        most_threes = sorted(
            filter(lambda x: 3 in x['free_slots'], data_list.copy()),
            key=lambda x: len(x['free_slots']),
            reverse=True
        )
        ids_to_cut_line.extend(off_the_top(most_threes, reorder_amount[0], "id"))
    
    if not no_twos:
        most_twos_or_threes = sorted(
            filter(lambda x: any(val in x['free_slots'] for val in {2, 3}) and x['id'] not in ids_to_cut_line, data_list.copy()),
            key=lambda x: len(x['free_slots']),
            reverse=True
        )
        ids_to_cut_line.extend(off_the_top(most_twos_or_threes, reorder_amount[1], "id"))
    
    longest_slots = sorted(data_list.copy(), key=lambda x: (len(x["free_slots"]), len(x['free_slots']) if any(val in x['free_slots'] for val in {2, 3}) else 0), reverse=True)
    ids_to_cut_line.extend(off_the_top(longest_slots, reorder_amount[2], "id"))

    id_set = list(dict.fromkeys(ids_to_cut_line))

    # Create a lookup dictionary for id positions (default to a high number for non-priority IDs)
    id_order_map = {id_val: index for index, id_val in enumerate(id_set)}

    # Sort the list: prioritize by order in id_order, then keep the original order for others
    finality = sorted(data_list, key=lambda d: (id_order_map.get(d["id"], float('inf')), data_list.index(d)))

    return finality

def merge_sum_dicts(dict_list: list[dict]):
    result = defaultdict(int)
    for t_dict in dict_list:
        for k, v in t_dict.items():
            result[k] += v
    return result

def print_results(results, limit, wiki = ""):
    global file_write
    if not (results and file_write):
        return
    
    with open('./misc/rolls.txt', 'w') as file:
        counter = 1
        global total_possible_combinations
        file.write(f"Found {len(results):,} matches out of {total_possible_combinations:,} possible combinations (display limit: {limit:,}).\n\n")
        for res in results:
            armor_names = res["armor_names"]
            deco_names = res["deco_names"]
            slots = res["slots"]
            free_slots = res["free_slots"]
            skills = dict(res["skills"])
            set_skills = res["set_skills"]
            group_skills = res["group_skills"]

            slots.sort(reverse=True)
            free_slots.sort(reverse=True)

            # visually limit skill levels to stay within max
            global skill_db
            for sk_name, sk_level in skills.items():
                if sk_level > skill_db[sk_name]:
                    skills[sk_name] = skill_db[sk_name]

            skills = dict(
                sorted(
                    ((k, v) for k, v in skills.items()),
                    key=lambda x: (-x[1], x[0]), # sort by level, then name
                )                
            )

            file.write(f"Match #{counter} (id-{res['id']}):\n")
            file.write(f"Armor = {armor_names}\n")
            file.write(f"Skills = {str(skills)}\n")

            set_skills = {k: int((v / 2) // 1) for k, v in set_skills.items() if int((v / 2) // 1) > 0}
            if set_skills:
                file.write(f"Set Skills = {str(set_skills)}\n")

            group_skills = {k: int((v / 3) // 1) for k, v in set_skills.items() if int((v / 3) // 1) > 0}
            if group_skills:
                file.write(f"Group Skills = {str(group_skills)}\n")

            file.write(f"Decorations = {deco_names}\n")
            file.write(f"Free Slots - {free_slots}\n")
            file.write(f"Total Slots - {slots}\n\n")
            counter += 1

        if wiki:
            file.write(f"https://mhwilds.wiki-db.com/sim/#skills={wiki}&fee=1\n")
            
def roll_combos(
        gear: dict,
        skills: dict, set_skills: dict, group_skills: dict, limit: int, find_one: bool = False
    ):
    counter, inc = 0, 0
    ret = []

    # Convert dictionaries to lists for faster iteration
    head_list = list(gear["head"].items())
    chest_list = list(gear["chest"].items())
    arms_list = list(gear["arms"].items())
    waist_list = list(gear["waist"].items())
    legs_list = list(gear["legs"].items())
    talisman_list = list(gear["talisman"].items())

    # Calculate total possible combinations
    limit_reached = False
    global total_possible_combinations
    total_possible_combinations = (
        len(head_list) * len(chest_list) * len(arms_list) * len(waist_list) * len(legs_list) * len(talisman_list)
    )
    print(f"possible: {total_possible_combinations:,}")

    # Convert skill lookups into sets for quick membership testing
    set_skills_check = set_skills.keys() if set_skills else set()
    group_skills_check = group_skills.keys() if group_skills else set()

    # Generate all combinations efficiently
    for combo in product(head_list, chest_list, arms_list, waist_list, legs_list, talisman_list):
        if counter >= limit:
            limit_reached = True
            break  # Stop processing once the limit is reached

        # Pre-check for required set or group skills
        if set_skills_check or group_skills_check:
            pieces_from_set = {}
            pieces_from_group = {}

            for piece in combo[:-1]:  # Ignore talisman for set/group skills
                armor_data = piece[1]
                set_name = armor_data[7]
                group_name = armor_data[2]

                if set_name in set_skills_check:
                    pieces_from_set[set_name] = pieces_from_set.get(set_name, 0) + 1

                if group_name in group_skills_check:
                    pieces_from_group[group_name] = pieces_from_group.get(group_name, 0) + 1

            # Check set skill requirement
            if any(pieces_from_set.get(skill, 0) < set_skills[skill] * 2 for skill in set_skills_check):
                continue

            # Check group skill requirement
            if any(pieces_from_group.get(skill, 0) < 3 for skill in group_skills_check):
                continue

        # Convert to armor format
        test_set = armor_combo(*(format_armor_c(piece) for piece in combo))

        # Run skill test
        result = test(test_set, gear["decos"], skills)
        if result:
            result["id"] = counter + 1
            result["_id"] = inc + 1
            inc += 1
            ret.append(result)
            if find_one:
                return ret

        counter += 1
    
    return ret

# todo: finish this
def weapon_search(type: str, skills: dict):
    global weapon_db, decoration
    with open(f'./src/data/compact/{type}.json', 'r') as file:
        weapon_db = json.load(file)
    if not decoration:
        with open(f'./src/data/compact/decoration.json', 'r') as file:
            decoration = json.load(file)

    best = get_best_weapon(skills)
    # print_weapon_results(best)

    return best

def search(
        skills: dict, set_skills = {}, group_skills = {},
        deco_mods = {}, mandatory_armor: tuple[str, ...] = (None, None, None, None, None, None),
        blacklisted_armor: tuple[str, ...] = (),
        limit = 500000, find_one = False
    ):
    global file_write

    if find_one:
        file_write = False

    speed(load_jsons, deco_mods)

    gear = speed(get_gear_pool, skills, set_skills, group_skills, mandatory_armor, blacklisted_armor)

    rolls = speed(
        roll_combos,
        gear,
        skills, set_skills, group_skills, limit,
        find_one=find_one
    )

    rolls = reorder(rolls)

    skills_wiki_format = []
    for key, value in skills.items():
        skills_wiki_format.append(f"{key} Lv{value}")
    for key, value in set_skills.items():
        skills_wiki_format.append(f"{set_skill_db[key][0]} {'I' * value}")
    for key, value in group_skills.items():
        skills_wiki_format.append(f"{group_skill_db[key][0]}")
    skills_wiki_format = "%2C".join(skills_wiki_format)

    print_results(rolls, limit, wiki=skills_wiki_format)
    print(f"found {len(rolls):,} matches out of {total_possible_combinations:,} combinations checked (limit: {limit})")

    return rolls

def speed(func: Callable[..., Any], *args, **kwargs) -> Any:
    start_time = time.perf_counter()
    result = func(*args, **kwargs)
    end_time = time.perf_counter()
    elapsed_time = end_time - start_time
    print(f">> {func.__name__}() = {elapsed_time:.6f} seconds")
    return result

def check_prior_results(results: tuple, skill_name: str, level: int):
    counter = 0
    limit = reorder_amount[0] + reorder_amount[1] + reorder_amount[2]
    limit = min(limit, len(results))
    for res in results:
        if skill_name in res["skills"] and level <= res["skills"][skill_name]:
            return True 
        
        decos = get_best_decos({skill_name: level})
        if get_decos_to_fulfill_skills(decos, {skill_name: level}, res["free_slots"], res["skills"]):
            return True
        counter += 1
        if counter >= limit:
            break
    return False


def get_addable_skills(
        skills: dict, set_skills = {}, group_skills = {},
        deco_mods = {}, mandatory_armor: tuple[str, ...] = (None, None, None, None, None, None),
        blacklisted_armor: tuple[str, ...] = (),
        limit = 500000, prior_results: list = [],
        exhaustive = False
) -> dict:
    global skill_db
    skills_can_add = {}
    percent_done = 0
    base_skills = skills

    # in the js version, this will always already exist
    if not prior_results:
        print("fetching prior_results...")
        prior_results = search(
            skills, set_skills, group_skills, deco_mods, mandatory_armor,
            blacklisted_armor, limit
        )

    with open('./src/data/compact/armor-skills.json', 'r') as file:
        armor_skills_list = json.load(file)

    def number_tuple(n):
        return (1,) + tuple(range(n, 1, -1))

    print("beginning skill iterations...")
    counter = -1
    trimmed_skills = {k: v for k, v in skill_db.items() if k in armor_skills_list}
    for skill_name, max_skill_level in trimmed_skills.items():
        counter += 1
        percent_done = (counter / len(trimmed_skills)) * 100
        print(f"{percent_done:.2f}%...")

        existing_skill_level = base_skills.get(skill_name, 0)
        if existing_skill_level >= max_skill_level:
            continue
        
        num_order = number_tuple(max_skill_level)
        for level in num_order:
            # check prior results first to see if we can just slot in decos to fulfill the skill
            good = check_prior_results(prior_results, skill_name, level)
            if good:
                print(f"-+ {skill_name} {level}: yes")
                skills_can_add[skill_name] = level 
                
                if level > 1:
                    break
                else:
                    continue
            elif level == 1: # abort if level 1 skill isn't possible
                print(f"-+ {skill_name} {level}: no")
                break

            # just decos for now, cause i still haven't figured out the magic to make it FAST otherwise
            if not exhaustive:
                continue

            # if we can't just slot in decos, then we have to do a full combo check
            rolls = search(
                { **skills, **{ skill_name: level }}, set_skills, group_skills, deco_mods,
                mandatory_armor, blacklisted_armor, limit, find_one=True
            )

            # if a roll exists, add the skill name with it's level
            good = len(rolls) > 0
            if good:
                skills_can_add[skill_name] = level 
                print(f"-- {skill_name} {level}: yes")

                # abort, since we now know we can add all levels below it too, so no need to check
                if level > 1:
                    break
            elif level == 1: # abort if level 1 skill isn't possible
                print(f"-- {skill_name} {level}: no")
                break

    global file_write
    if DEBUG and file_write:        
        def seq(n):
            return ", ".join(map(str, range(1, n + 1)))

        with open('./misc/rolls-can_add.txt', 'w') as file:
            file.write(f"Skills addable:\n\n")
            for skill_name, skill_level in skills_can_add.items():
                file.write(f"{skill_name}: {seq(skill_level)}\n")
    return skills_can_add

# ==============SEARCH==============
# speed(search, *tests.test_multi)
# speed(search, *tests.test_impossible)
# speed(search, *tests.test_many)
# speed(search, *tests.test_single)
# speed(search, *tests.test_without_deco)
# speed(search, *tests.test_mandatory)
# speed(search, *tests.test_blacklist)
# speed(search, *tests.test_set)
# speed(search, *tests.test_group)
# speed(search, *tests.test_set_and_group)

# ==============MORE SKILLS==============
# speed(get_addable_skills, *tests.test_multi)
speed(get_addable_skills, *tests.test_many)

# ==============WEAPONS==============
# speed(weapon_search, "great sword", {
#     "Critical Eye": 3
# })
