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
DEBUG = True

def load_jsons(deco_mods = {}):
    global head, chest, arms, waist, legs, talisman, decoration, skill_db, set_skill_db, group_skill_db, deco_inventory
    with open('./data/compact/head.json', 'r') as file:
        head = json.load(file)
    with open('./data/compact/chest.json', 'r') as file:
        chest = json.load(file)
    with open('./data/compact/arms.json', 'r') as file:
        arms = json.load(file)
    with open('./data/compact/waist.json', 'r') as file:
        waist = json.load(file)
    with open('./data/compact/legs.json', 'r') as file:
        legs = json.load(file)
    with open('./data/compact/talisman.json', 'r') as file:
        talisman = json.load(file)
    with open('./data/compact/decoration.json', 'r') as file:
        decoration = json.load(file)
    with open('./data/compact/skills.json', 'r') as file:
        skill_db = json.load(file)
    with open('./data/compact/set-skills.json', 'r') as file:
        set_skill_db = json.load(file)
    with open('./data/compact/group-skills.json', 'r') as file:
        group_skill_db = json.load(file)
    with open('./data/user/deco-inventory.json', 'r') as file: # probably be localStorage when js
        deco_inventory = json.load(file)

    # modify deco inventory
    if deco_mods:
        for name, amount in deco_mods:
            deco_inventory[name] = amount

def get_json_from_type(type:str):
    global head, chest, arms, waist, legs, talisman, decoration
    type_map = {
        "head": head,
        "chest": chest,
        "arms": arms,
        "waist": waist,
        "legs": legs,
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
    sorted_by_slottage = dict(
        sorted(
            ((k, v) for k, v in armors.copy().items()),
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
    best_head = get_best_armor("head", skills, set_skills, group_skills, must_use_armor[0], blacklisted_armor)
    best_chest = get_best_armor("chest", skills, set_skills, group_skills, must_use_armor[1], blacklisted_armor)
    best_arms = get_best_armor("arms", skills, set_skills, group_skills, must_use_armor[2], blacklisted_armor)
    best_waist = get_best_armor("waist", skills, set_skills, group_skills, must_use_armor[3], blacklisted_armor)
    best_legs = get_best_armor("legs", skills, set_skills, group_skills, must_use_armor[4], blacklisted_armor)
    best_talisman = get_best_armor("talisman", skills, set_skills, group_skills, must_use_armor[5], blacklisted_armor)
    best_decos = get_best_armor("decoration", skills, set_skills, group_skills)

    return {
        "head": best_head,
        "chest": best_chest,
        "arms": best_arms,
        "waist": best_waist,
        "legs": best_legs,
        "talisman": best_talisman,
        "decos": best_decos
    }

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

def get_best_armor(
        type: str, skills: dict, set_skills: dict = {}, group_skills: dict = {},
        mandatory_piece_name: str = None,
        blacklisted_armor: tuple[str, ...] = (),
        rank: str = "high"
    ):
    full_data_file = get_json_from_type(type)

    if mandatory_piece_name:
        found_data = full_data_file.get(mandatory_piece_name)
        if found_data:
            return {
                mandatory_piece_name: found_data
            }
        else:
            print(f"WARNING: Could not find mandatory {type} armor {mandatory_piece_name}!")

    # high/low rank and don't check rank on talisman/decos
    data_file = {
        k: v for k, v in full_data_file.items() 
        if type in {"talisman", "decoration"} or v[6] == rank
    }

    if type == "talisman":
        talismans = {
            k: v for k, v in sorted(
                ((k, v) for k, v in data_file.items() if has_needed_skill(v[1], skills) and k not in blacklisted_armor),
                key=lambda x: list(x[1][1].values())[0],  # Sort by level
                reverse=True
            )
        }

        sk_opt = {}
        talis_opt = {}

        for talis_name, talis_data in talismans.items():
            sks = talis_data[1]
            if len(sks) == 1:
                for sk_name, sk_level in sks.items():
                    if sk_level > sk_opt.get(sk_name, 0):
                        talis_opt[talis_name] = talis_data
                        sk_opt[sk_name] = sk_level 

        return talis_opt

    if type == "decoration":
        return {
            k: v for k, v in sorted(
                ((k, v) for k, v in data_file.items() if v[0] == "armor" and has_needed_skill(v[1], skills)),
                key=lambda x: list(x[1][1].values())[0],  # Sort by level
                reverse=True
            )
        }

    # Group armors by slot count
    armors_by_slots = {i: {} for i in range(4)}  # 0, 1, 2, 3 slot armors
    for k, v in data_file.items():
        armors_by_slots[len(v[3])][k] = v

    # Sort armor groups by slot count and defense
    for slot_count in armors_by_slots:
        sl = dict(
            sorted(
                ((k, v) for k, v in armors_by_slots[slot_count].items() if k not in blacklisted_armor),
                key=lambda x: (x[1][3], x[1][4]),
                reverse=True
            )
        )
        armors_by_slots[slot_count] = dict(
            (k, v) for k, v in sl.items() if (slot_count > 0 and k == list(sl.keys())[0]) or has_needed_skill(v[1], skills)
        )

    # Filter exclusive armors
    exclusive_only = {
        **armors_by_slots[3], 
        **armors_by_slots[2], 
        **armors_by_slots[1], 
        **armors_by_slots[0]
    }

    # trim unecessary pieces
    best_skillage = {key: 0 for key in skills}
    exclusives_to_keep = {}

    for armor_name, armor_data in exclusive_only.items():
        a_slots = _x(armor_data, "slots")
        a_skills = _x(armor_data, "skills")
        update = None

        if is_better_armor(exclusives_to_keep, a_slots):
            update = (armor_name, armor_data)

        for skill_name, skill_level in a_skills.items():
            if skill_name in skills and skill_level > best_skillage.get(skill_name, 0):
                update = (armor_name, armor_data)
                best_skillage[skill_name] = skill_level

        if update:
            exclusives_to_keep[update[0]] = update[1]

    groupies = {
        k: v for k, v in sorted(
            ((k, v) for k, v in data_file.items() if k not in exclusives_to_keep and (is_in_sets(v, set_skills) or is_in_groups(v, group_skills))),
            key=lambda x: (x[1][3], x[1][4]),
            reverse=True
        )
    }

    groupies_grouped, groupies_tracker = group_armor_into_sets(groupies, set_skills, group_skills)
    groupies_to_keep = {}

    for group_name, group_armor in groupies_grouped.items():
        # add the best of the existing pool armor into set/group categories
        for armor_name, armor_data in exclusives_to_keep.items():
            if armor_data[2] == group_name or armor_data[7] == group_name:
                if has_better_slottage(groupies_tracker[group_name], a_slots) or has_longer_slottage(groupies_tracker[group_name], a_slots):
                    groupies_tracker[group_name][armor_name] = armor_data              

        # add new armor into set/group categories if it's better than existing
        for armor_name, armor_data in group_armor.items():
            a_slots = _x(armor_data, "slots")
            if has_better_slottage(groupies_tracker[group_name], a_slots) or has_longer_slottage(groupies_tracker[group_name], a_slots):
                groupies_tracker[group_name][armor_name] = armor_data
        

    for group_name, group_armor in groupies_tracker.items():
        for armor_name, armor_data in group_armor.items():
            if armor_name not in groupies_to_keep:
                groupies_to_keep[armor_name] = armor_data

    exclusives_to_keep = { **exclusives_to_keep, **groupies_to_keep }

    print(f"# of {type}: {len(exclusives_to_keep)}")

    if DEBUG:
        with open('./misc/exclusives-to-keep.txt', 'w' if type == "head" else 'a') as file:
            for a_name, a_data in exclusives_to_keep.items():
                file.write(f"{a_name}: ({_x(a_data, 'type')} - {_x(a_data, 'slots')})\n")
            file.write('\n')

    return exclusives_to_keep

def armor_combo(head, chest, arms, waist, legs, talisman):
    """
    Returns: { "names", "skills", "slots", "set_skills", "group_skills" }
    """
    armor_skills = [head['data'][1], chest['data'][1], arms['data'][1], waist['data'][1], legs['data'][1], talisman['data'][1]]
    armor_slots = [head['data'][3], chest['data'][3], arms['data'][3], waist['data'][3], legs['data'][3]]

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
    
    armor_set_names = [head['data'][7], chest['data'][7], arms['data'][7], waist['data'][7], legs['data'][7]]
    armor_group_names = [head['data'][2], chest['data'][2], arms['data'][2], waist['data'][2], legs['data'][2]]
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

def find_armor(name):
    global head, chest, arms, waist, legs, talisman 

    found = head.get(name) or chest.get(name) or arms.get(name) or waist.get(name) or legs.get(name) or talisman.get(name) or None

    if found is None:
        raise Exception(f"Armor {name} not found!")

    return {
        "name": name,
        "data": found
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

def can_decos_fulfill_skills(decos, skills, slots_available):
    # Step 1: Sort slots in descending order to maximize fit efficiency
    slots_available.sort(reverse=True)
    
    # Step 2: Convert skills into a mutable format
    skills_needed = skills.copy()
    
    # Step 3: Create a list of decorations sorted by skill contribution and slot size
    deco_list = sorted(
        decos.items(), 
        key=lambda x: (-max(x[1][1].values()), x[1][2])  # Sort by skill contribution, then slot size
    )
    
    # Step 4: Allocate decorations to slots
    used_decos = []
    for slot_size in slots_available:
        best_deco = None
        best_deco_name = None

        for deco_name, (deco_type, deco_skills, deco_slot) in deco_list:
            if deco_slot > slot_size:
                continue  # Skip if decoration doesn't fit in the slot

            # Check if this decoration helps fulfill any needed skills
            for skill_name, skill_level in deco_skills.items():
                if skill_name in skills_needed and skills_needed[skill_name] > 0:
                    best_deco = (deco_name, deco_type, deco_skills, deco_slot)
                    best_deco_name = deco_name
                    break  # Prioritize the first useful decoration
            
            if best_deco:
                break  # Stop searching once a decoration is found

        # If we found a valid decoration, use it
        if best_deco:
            used_decos.append(best_deco_name)
            for skill_name, skill_level in best_deco[2].items():
                if skill_name in skills_needed:
                    skills_needed[skill_name] -= skill_level
                    if skills_needed[skill_name] <= 0:
                        del skills_needed[skill_name]  # Remove fulfilled skills
            
            if not skills_needed:
                return True  # All skills fulfilled

    return False  # Not enough skills met

def get_decos_to_fulfill_skills(decos, skills, slots_available, starting_skills) -> dict:
    global deco_inventory
    # Adjust required skills based on what we already have
    skills_needed = skills.copy()
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

    return None  # Return None if the required skills cannot be fulfilled

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
        have[skill_name] = skill_set[skill_name] if skill_name in skill_set else 0
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
    return [x[field] for x in arr[:min(amount, len(arr) - 1)]]

def reorder(data_list: list) -> list:
    """re-orders display results to put some more desirables up front"""
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
        most_threes = sorted(data_list.copy(), key=lambda x: len([num for num in x["free_slots"] if num == 3]), reverse=True)
        ids_to_cut_line.extend(off_the_top(most_threes, 2, "id"))
    
    if not no_twos:
        most_twos_or_threes = sorted(data_list.copy(), key=lambda x: len([num for num in x["free_slots"] if num == 3 or num == 2]), reverse=True)
        # most_twos = sorted(data_list.copy(), key=lambda x: len([num for num in x["free_slots"] if num == 2]), reverse=True)
        ids_to_cut_line.extend(off_the_top(most_twos_or_threes, 2, "id"))
        # ids_to_cut_line.extend(off_the_top(most_twos, 2, "id"))
    
    longest_slots = sorted(data_list.copy(), key=lambda x: (len(x["free_slots"]), len([num for num in x["free_slots"] if num == 3 or num == 2])), reverse=True)
    ids_to_cut_line.extend(off_the_top(longest_slots, 5, "id"))

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

def print_results(results, limit):
    if not results:
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
            
def roll_combos(
        head1: dict, chest1: dict, arms1: dict, waist1: dict, legs1: dict, talisman1: dict, decos: dict,
        skills: dict, set_skills: dict, group_skills: dict, limit: int
    ):
    counter, inc = 0, 0
    ret = []

    # Convert dictionaries to lists for faster iteration
    head_list = list(head1.items())
    chest_list = list(chest1.items())
    arms_list = list(arms1.items())
    waist_list = list(waist1.items())
    legs_list = list(legs1.items())
    talisman_list = list(talisman1.items())

    # Calculate total possible combinations
    global total_possible_combinations
    total_possible_combinations = (
        len(head_list) * len(chest_list) * len(arms_list) * len(waist_list) * len(legs_list) * len(talisman_list)
    )
    print(f"possible: {total_possible_combinations:,}")

    # Generate all combinations
    limit_reached = False
    for combo in product(head_list, chest_list, arms_list, waist_list, legs_list, talisman_list):
        if counter >= limit:
            limit_reached = True
            break

        # Pre-check for required set or group skills (early exit)
        if set_skills or group_skills:
            do_skip = False

            if set_skills:
                for set_name, set_level in set_skills.items():
                    pieces_from_set = sum(piece[1][7] == set_name for piece in combo[:-1])
                    if pieces_from_set < set_level * 2:
                        do_skip = True
                        break
            
            if not do_skip and group_skills:
                for group_name, group_level in group_skills.items():
                    pieces_from_group = sum(piece[1][2] == group_name for piece in combo[:-1])
                    if pieces_from_group < 3:
                        do_skip = True
                        break

            if do_skip:
                continue
        
        test_set = armor_combo(*(format_armor_c(piece) for piece in combo))

        result = test(test_set, decos, skills)
        if result is not None:
            result["id"] = counter + 1
            result["_id"] = inc + 1
            inc += 1
            ret.append(result)

        counter += 1
    
    return ret

# todo: finish this
def weapon_search(type: str, skills: dict):
    global weapon_db, decoration
    with open(f'./data/compact/{type}.json', 'r') as file:
        weapon_db = json.load(file)
    if not decoration:
        with open(f'./data/compact/decoration.json', 'r') as file:
            decoration = json.load(file)

    best = get_best_weapon(skills)
    # print_weapon_results(best)

    return best

def search(
        skills: dict, set_skills = {}, group_skills = {},
        deco_mods = {}, must_use_armor: tuple[str, ...] = (None, None, None, None, None, None),
        blacklisted_armor: tuple[str, ...] = (),
        limit = 500000
    ):
    speed(load_jsons)

    gear = speed(get_gear_pool, skills, set_skills, group_skills, must_use_armor, blacklisted_armor)

    rolls = speed(
        roll_combos,
        gear["head"],
        gear["chest"],
        gear["arms"],
        gear["waist"],
        gear["legs"],
        gear["talisman"],
        gear["decos"],
        skills, set_skills, group_skills, limit
    )

    rolls = reorder(rolls)

    print_results(rolls, limit)

    print(f"found {len(rolls):,} matches out of {total_possible_combinations:,} combinations checked (limit: {limit})")

def speed(func: Callable[..., Any], *args, **kwargs) -> Any:
    start_time = time.perf_counter()
    result = func(*args, **kwargs)
    end_time = time.perf_counter()
    elapsed_time = end_time - start_time
    print(f">> {func.__name__}() = {elapsed_time:.6f} seconds")
    return result

# speed(search, *tests.test_multi)
# speed(search, *tests.test_wiki_impossible)
# speed(search, *tests.test_many)
# speed(search, *tests.test_single)
# speed(search, *tests.test_without_deco)
# speed(search, *tests.test_mandatory)
speed(search, *tests.test_blacklist)


# speed(weapon_search, "great sword", {
#     "Critical Eye": 3
# })
