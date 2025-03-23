from collections import defaultdict
from itertools import product
from functools import cmp_to_key
from dataclasses import dataclass, asdict
import json
import time
from typing import Callable, Any
import tests
import constants

skill_db = set_skill_db = group_skill_db = {}
weapon_db = {}
deco_inventory = {}
all_armor = head = chest = arms = waist = legs = talisman = decoration = {}
total_possible_combinations, total_prunes = 0, 0
reorder_amount = (3, 2, 1, 2, 5)
show_result_num = False
show_speeds = True

decos_have_skill_names = True # if true, shows deco skills and levels instead of their names
show_set_skills = False # if true, shows set/group skill names instead of the set names

already_loaded_jsons = False
file_write = True

search_results = []
wiki_string = ""

def load_jsons(deco_mods = {}):
    global already_loaded_jsons
    if already_loaded_jsons:
        return
    global head, chest, arms, waist, legs, talisman, decoration, skill_db, set_skill_db, group_skill_db, deco_inventory, all_armor
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

    all_armor = { **head, **chest, **arms, **waist, **legs }

    # modify deco inventory
    if deco_mods:
        for name, amount in deco_mods.items():
            deco_inventory[name] = amount
    already_loaded_jsons = True

def get_json_from_type(type: str):
    global head, chest, arms, waist, legs, talisman, decoration, all_armor

    type_map = {
        "head": head,
        "chest": chest,
        "arms": arms,
        "waist": waist,
        "legs": legs,
        "armor": all_armor,
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

    for i in range(len(a_slots) - 1, -1, -1):
        eq = a_slots[i] == b_slots[i]
        if not eq:
            return a_slots[i] > b_slots[i]
    
    return False

def slottage_length_compare_sort(slots):
    """Returns a tuple of slot values, right-aligned with zeros."""
    return tuple(reversed(slots + [0] * (3 - len(slots))))  # Ensure consistent length

def slottage_length_compare_raw(top_slots, try_slots):
    best_slots = list(top_slots)
    test_slots = list(try_slots)
    standard_length = max(len(test_slots), len(best_slots))
    while len(test_slots) < standard_length:
        test_slots.append(0)
    while len(best_slots) < standard_length:
        best_slots.append(0)

    for i in range(len(best_slots) - 1, -1, -1):
        if test_slots[i] > best_slots[i]:
            return True
    
    return False

def has_better_slottage(armors: dict, challenger_slots: list, skill_name: str = None) -> bool:
    if not armors:
        return True
    copied_armors = armors.copy()
    sorted_by_slottage = dict(
        sorted(
            ((k, v) for k, v in copied_armors.items() if not skill_name or skill_name in v[1]),
            key=lambda x: (_x(x[1], "slots")),
            reverse=True # descending
        )
    )

    if not sorted_by_slottage:
        return True

    top = next(iter(sorted_by_slottage.items()))
    return challenger_slots > top[1][3]

def has_longer_slottage(armors: dict, challenger_slots: list, skill_name: str = None) -> bool:
    if not armors:
        return True

    data = armors.copy()
    # Sort dictionary keys using the comparison function
    sorted_keys = dict(
        sorted(
            ((k, v) for k, v in data.items() if not skill_name or skill_name in v[1]),
            key=cmp_to_key(slottage_length_compare)
        )
    )

    # Convert back to a sorted dictionary if needed
    sorted_data = {key: data[key] for key in sorted_keys}

    return slottage_length_compare_raw(next(iter(sorted_data.items()))[1][3], challenger_slots)

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

def is_better_armor(existing_armors, new_slots, skill_name = None):
    return has_better_slottage(existing_armors, new_slots, skill_name) or has_longer_slottage(existing_armors, new_slots, skill_name)

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

def generate_wiki_string(skills: dict, set_skills: dict, group_skills: dict):
    global wiki_string
    skills_wiki_format = []
    for key, value in skills.items():
        skills_wiki_format.append(f"{key} Lv{value}")
    for key, value in set_skills.items():
        skills_wiki_format.append(f"{set_skill_db[key][0]} {'I' * value}")
    for key, value in group_skills.items():
        skills_wiki_format.append(f"{group_skill_db[key][0]}")
    skills_wiki_format = "%2C".join(skills_wiki_format)
    wiki_string = skills_wiki_format

def empty_gear_set(lists: bool = False) -> dict:
    if lists:
        return {
            "head": [],
            "chest": [],
            "arms": [],
            "waist": [],
            "legs": []
        } 

    return {
        "head": {},
        "chest": {},
        "arms": {},
        "waist": {},
        "legs": {}
    }

def get_skill_potential(armor_data: dict, skill_name: str, decos: dict, all_skills: dict) -> tuple[int]:
    """returns (max skill level, leftover slots, length of slots)"""
    filtered_decos = dict(
        sorted(
            ((k, (v[1][skill_name], v[2])) for k, v in decos.items() if skill_name in v[1]),
            key=lambda x: (x[1]), # sort by skill level
            reverse=True
        )
    )
    other_deco_slot_sizes = list(v[2] for _, v in decos.items() if skill_name not in v[1])
    extra_points = sum(0 + (5 if skill in all_skills else 1) 
        for skill, level in armor_data[1].items() if skill != skill_name)


    max_points = 0
    leftover_slots = armor_data[3].copy()
    for _, stats in filtered_decos.items():
        level = stats[0]
        slot_size = stats[1]
        summation = 0
        for slot in armor_data[3]:
            if slot_size <= slot:
                leftover_slots.remove(slot)
                summation += level
        max_points = max(summation, max_points)
    points = max_points + armor_data[1].get(skill_name, 0)
    mod_points = points + len(list(slot for slot in leftover_slots if slot in other_deco_slot_sizes))

    return (points, leftover_slots, extra_points, mod_points)

def get_best_armor(
        skills: dict, set_skills: dict = {}, group_skills: dict = {},
        mandatory_piece_names: tuple = (),
        blacklisted_armor: tuple[str, ...] = (),
        blacklisted_armor_types: tuple[str, ...] = (),
        dont_use_decos: bool = False,
        rank: str = "high"
    ):
    global file_write, talisman
    full_data_file = get_json_from_type("armor")

    mandatory = {}
    for name in mandatory_piece_names:
        if name:
            found_data = full_data_file.get(name)
            if found_data:
                mandatory[found_data[0]] = name
            else:
                print(f"WARNING: Could not find mandatory {type} armor {name}!")

    # high/low rank
    data_file = {
        k: v for k, v in full_data_file.items()
        if v[6] == rank and (not mandatory.get(v[0]) or k == mandatory.get(v[0]))
            and (v[0] not in blacklisted_armor_types) and (k not in blacklisted_armor)
    }

    # now talisman
    best_talismans = {
        k: v for k, v in sorted(
            ((k, v) for k, v in talisman.items() if has_needed_skill(v[1], skills) and k not in blacklisted_armor),
            key=lambda x: list(x[1][1].values())[0],  # Sort by level
            reverse=True
        )
    }
    top_talis = {}
    if "talisman" not in blacklisted_armor_types:
        top_talis_levels = {}
        for talis_name, talis_data in best_talismans.items():
            sks = talis_data[1]
            if len(sks) == 1:
                for sk_name, sk_level in sks.items():
                    if sk_level > top_talis_levels.get(sk_name, 0):
                        top_talis[talis_name] = talis_data
                        top_talis_levels[sk_name] = sk_level 
    
    firsts = empty_gear_set()
    best = empty_gear_set()
    best_decos = {} if dont_use_decos else get_best_decos(skills)

    # store best slotters and skill armors
    for sort_type in ("length", "size"):
        checker = empty_gear_set()
        all_sort = dict(
            sorted(
                (data_file.items()),
                key=lambda x: (x[1][3] if sort_type == "size" else (slottage_length_compare_sort(x[1][3])), x[1][4]),
                reverse=True
            )
        )

        for armor_name, armor_data in all_sort.items():
            category = armor_data[0]
            group = checker[category]
            if not group: # if first in category
                thiccer = sort_type == "size" and has_better_slottage(firsts[category], armor_data[3])
                longer = sort_type == "length" and has_longer_slottage(firsts[category], armor_data[3])

                if thiccer or longer:
                    checker[category] = True
                    firsts[category][armor_name] = armor_data

            if has_needed_skill(armor_data[1], skills):
                best[category][armor_name] = armor_data 

    total_max_skill_potential = {}
    def update_skill_potential(skill_potential, mod_point_map, category, skill_name, armor_name, armor_data, group_name = None):
        nonlocal total_max_skill_potential, skills
        points, leftover_slots, extra_points, mod_points = get_skill_potential(armor_data, skill_name, best_decos, skills)
        alias = {}
        mod_point_map[armor_name] = mod_points
        if group_name:
            alias = skill_potential[category].setdefault(group_name, {}).setdefault(skill_name, {})
        else:
            alias = skill_potential[category].setdefault(skill_name, {})

        def slot_compare(top_slots, try_slots):
            best_slots = list(top_slots)
            test_slots = list(try_slots)
            longer = False
            identical = True
            bigger = test_slots > best_slots
            standard_length = max(len(test_slots), len(best_slots))
            while len(test_slots) < standard_length:
                test_slots.append(0)
            while len(best_slots) < standard_length:
                best_slots.append(0)

            for i in range(len(best_slots) - 1, -1, -1):
                if test_slots[i] != best_slots[i]:
                    identical = False
                if test_slots[i] > best_slots[i]:
                    longer = True
                    break
            if identical:
                return "equal"
            return longer or bigger
        
        def apply_for_more(new_applicant):
            more_pool = alias.get("more", [])
            accepted = True
            for piece in more_pool:
                if mod_point_map[new_applicant] < mod_point_map[piece]:
                    accepted = False
                    break
            if accepted:
                more_pool.append(new_applicant)
                alias["more"] = more_pool

        def alias_update(keys: tuple = ()):
            old_best = alias.get("best")

            alias.update({
                "best": armor_name, 
                "points": points,
                "slots": armor_data[3],
                "extra_points": extra_points if "extra_points" in keys else alias.get("extra_points", 0),
                "leftover_slots": leftover_slots if "leftover_slots" in keys else alias.get("leftover_slots", []),
                "defense": armor_data[4]
            })
            # print(f"best: {armor_name}, points: {points}")

            if old_best and mod_point_map[old_best] >= mod_points:
                apply_for_more(old_best)

            # todo look at this later
            total_max_skill_potential[skill_name] = total_max_skill_potential.get(skill_name, 0) + points
              
        current_points = alias.get("points", 0)
        current_mod_points = mod_point_map.get(armor_name, 0)
        compare = slot_compare(alias.get("leftover_slots", []), leftover_slots)
        if points > current_points: # if highest skill potential, add it
            alias_update(("leftover_slots", "extra_points"))
        elif points == current_points and compare: # otherwise, check "leftover slots" (slots leftover after slotting in decos)
            if compare == "equal": # if exactly equal
                best_extra_points = alias.get("extra_points", 0)
                if armor_data[3] > alias.get("slots", []):
                    alias_update()
                elif extra_points > best_extra_points: # check "extra" skills (skills other than current, bonus for other needed skills)
                    alias_update(("extra_points",))
                elif extra_points == best_extra_points: # if even THAT'S equal
                    if armor_data[4] > alias.get("defense", 0): # check defense 
                        alias_update()
            else: # leftover slots are better
                alias_update(("leftover_slots",))
        elif points < current_points and mod_points > current_mod_points:
            apply_for_more(armor_name)
        
        # got_the_skill = skill_name in armor_data[1]
        # ss = "_skill" if got_the_skill else ""
        # if armor_data[3] > alias.get("slots", []):
        #     alias.update({f"slots{ss}": armor_data[3], f"biggest{ss}": armor_name})
        # if not alias.get(f"longest{ss}") or has_longer_slottage({alias[f"longest{ss}"]: data_file[alias[f"longest{ss}"]]}, armor_data[3]):
        #     alias.update({f"slot_length{ss}": slot_length, f"longest{ss}": armor_name})

    # now we check max skill point potential
    max_possible_skill_potential = empty_gear_set()
    mod_point_map = {}
    for skill_name in skills:
        for category, data in best.items():
            for armor_name, armor_data in data.items():
                update_skill_potential(max_possible_skill_potential, mod_point_map, category, skill_name, armor_name, armor_data)

    for skill_name, target_level in skills.items():
        relevant_talisman = list((k, v[1]) for k, v in top_talis.items() if skill_name in v[1])
        relevant_talisman_level = 0
        if relevant_talisman:
            relevant_talisman_level = relevant_talisman[0][1][skill_name]
        if total_max_skill_potential.get(skill_name, 0) + relevant_talisman_level < target_level:
            # we will never fulfill this search, stop here
            return None
    
    bare_minimum = firsts
    for category, data in max_possible_skill_potential.items():
        for skill_name, stat_data in data.items():
            for key in ("best", "more"):
                if key in stat_data:
                    if key == "more" and stat_data[key]:
                        for ex in stat_data[key]:
                            bare_minimum[category][ex] = data_file[ex]
                    else:
                        bare_minimum[category][stat_data[key]] = data_file[stat_data[key]]

    # group/set effects alt =======================================================
    groupies_alt = {
        k: v for k, v in sorted(
            ((k, v) for k, v in data_file.items() if (is_in_sets(v, set_skills) or is_in_groups(v, group_skills))),
            key=lambda x: (x[1][3], x[1][4]),
            reverse=True
        )
    }

    total_max_skill_potential = {}
    max_possible_skill_potential_set = empty_gear_set()

    best_groupies_alt = defaultdict(dict)
    for name, a_data in groupies_alt.items():
        best_groupies_alt[a_data[0]][name] = a_data  # Append `name: a_data` under the right key

    # Convert to a normal dict if needed
    best_groupies_alt = dict(best_groupies_alt)
    mod_point_map = {}
    for skill_name in skills:
        for category, data in best_groupies_alt.items():
            groupies_grouped, _ = group_armor_into_sets(data, set_skills, group_skills)

            for group_name, group_armors in groupies_grouped.items():
                # add the best of the existing pool armor into set/group categories
                for armor_name, armor_data in group_armors.items():
                    update_skill_potential(max_possible_skill_potential_set, mod_point_map, category, skill_name, armor_name, armor_data, group_name)
    
    for category, data in max_possible_skill_potential_set.items():
        for group_name, group_data in data.items():
            for skill_name, stat_data in group_data.items():
                for key in ("best", "more"):
                    if key in stat_data:
                        if key == "more" and stat_data[key]:
                            for ex in stat_data[key]:
                                bare_minimum[category][ex] = data_file[ex]
                        else:
                            bare_minimum[category][stat_data[key]] = data_file[stat_data[key]]
    # ============================================================================= 
    bare_minimum["decos"] = best_decos
    bare_minimum["talisman"] = top_talis

    # add in a dummy piece (no skills/slots) for any blacklisted armor types
    for tipo in blacklisted_armor_types:
        bare_minimum[tipo]["None"] = [tipo,{},"",[],0,[0,0,0,0,0],rank,""]

    # sort final return armor by slottage
    for cat, armor in bare_minimum.items():
        if cat in ("talisman", "decos"):
            continue
        slottage = dict(
            sorted(
                (armor.items()),
                key=lambda x: (slottage_length_compare_sort(x[1][3]), x[1][3]),
                reverse=True
            )
        )
        bare_minimum[cat] = slottage

    ret = bare_minimum

    if constants.DEBUG and file_write:
        with open('./misc/chosen-armor.txt', 'w') as file:
            file.write(f"{skills}\n")
            if set_skills:
                file.write(f"Set Skills: {set_skills}\n")
            if group_skills:
                file.write(f"Group Skills: {group_skills}\n")
            file.write("\n")
            for category, data in ret.items():
                if category in {"talisman", "decos"}:
                    continue
                file.write(f"{category}\n")
                for a_name, a_data in data.items():
                    relevant_skills = {k: v for k, v in a_data[1].items() if k in skills}
                    relevant_set_skill = f" / {a_data[-1]}" if a_data[-1] in set_skills else ""
                    relevant_group_skill = f" / {a_data[2]}" if a_data[2] in group_skills else ""
                    file.write(f"\t{a_name}: ({_x(a_data, 'type')} - {_x(a_data, 'slots')}) {relevant_skills}{relevant_set_skill}{relevant_group_skill}\n")
                file.write('\n')

    return ret

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
    if not decos:
        return None 
    global deco_inventory

    # Adjust required skills based on starting skills
    skills_needed = desired_skills.copy()
    for skill, level in starting_skills.items():
        if skill in skills_needed:
            skills_needed[skill] -= level
            if skills_needed[skill] <= 0:
                del skills_needed[skill]

    if not skills_needed:
        return {
            "deco_names": [],
            "free_slots": slots_available
        }

    # Build a sorted pool of slot sizes (descending)
    slot_pool = sorted(slots_available, reverse=False)

    # Sort decorations:
    # - by skill impact (total skill points it contributes)
    # - then by smallest slot size (prefer smaller ones first for tighter fit)
    sorted_decos = sorted(
        decos.items(), 
        key=lambda x: (-sum(x[1][1].values()), x[1][2])
    )

    used_decos = []
    used_decos_count = {}
    used_slots = []

    # Try to fulfill each skill by picking the best matching decorations
    for skill, needed_points in skills_needed.items():
        while needed_points > 0:
            found_match = False
            for deco_name, (deco_type, deco_skills, deco_slot) in sorted_decos:
                if skill not in deco_skills:
                    continue
                if used_decos_count.get(deco_name, 0) >= deco_inventory.get(deco_name, 0):
                    continue

                # Try to find a slot that fits this decoration
                for i, slot_size in enumerate(slot_pool):
                    if slot_size >= deco_slot:
                        # Use this decoration
                        used_decos.append(deco_name)
                        used_decos_count[deco_name] = used_decos_count.get(deco_name, 0) + 1
                        used_slots.append(slot_size)
                        del slot_pool[i]
                        
                        gained = deco_skills[skill]
                        needed_points -= gained
                        found_match = True
                        break
                if found_match:
                    break
            if not found_match:
                return None  # Could not fulfill this skill

    return {
        "deco_names": used_decos,
        "free_slots": slot_pool
    }


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

    damn_sort = sorted(
        data_list.copy(),
        key=lambda x: (x['free_slots'], x['id']),
        reverse=True
    )

    for d in damn_sort:
        d["slots"].sort(reverse=True)

    pre, post = [], []
    best_per_three = {}  # Tracks the best (longest) list per num_threes

    for res in sorted(damn_sort, key=lambda x: (
            -sum(1 for y in x['free_slots'] if y == 3),  # Sort by most 3s
            -sum(1 for y in x['free_slots'] if y == 2),  # Then most 2s
            -len(x['free_slots']),  # Then by overall length
            len(x['skills']),
            x['id']
            # x['armor_names']
        )):
        num_threes = sum(1 for y in res['free_slots'] if y == 3)
        num_twos = sum(1 for y in res['free_slots'] if y == 2)

        # Keep only the best (longest) version of this (num_threes, num_twos) pair
        if (num_threes, num_twos) not in best_per_three:
            pre.append(res)
            best_per_three[(num_threes, num_twos)] = len(res['free_slots'])  # Store the length
        else:
            post.append(res)

    pre.extend(post)
    exclude_ids = {obj['id'] for obj in pre}
    longest_slots = sorted(
        (v for v in data_list.copy() if v["id"] not in exclude_ids), 
        key=lambda x: (len(x["free_slots"]), len(x['free_slots']) if any(val in x['free_slots'] for val in {2, 3}) else 0),
        reverse=True
    )
    pre.extend(longest_slots)

    return pre

def merge_sum_dicts(dict_list: list[dict]):
    result = defaultdict(int)
    for t_dict in dict_list:
        for k, v in t_dict.items():
            result[k] += v
    return result

def print_results(results, wiki = ""):
    global file_write, total_possible_combinations, total_prunes, decoration
    global decos_have_skill_names, show_set_skills, set_skill_db, group_skill_db

    if show_result_num:
        return

    print(f"{len(results):,} matches.  possible combinations: {total_possible_combinations:,}.  filtered sets: {total_prunes:,} (display limit: {constants.LIMIT:,})")

    if not file_write:
        return
    
    with open('./misc/rolls.txt', 'w') as file:
        counter = 1
        file.write(f"Found {len(results):,} matches out of {total_possible_combinations:,} possible combinations (display limit: {constants.LIMIT:,}).\n\n")
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

            deco_skills = deco_names.copy()
            if decos_have_skill_names:
                deco_skills = ["/".join(f"{skill} Lv {level}" for skill, level in decoration[name][1].items()) for name in deco_names]

            file.write(f"Match #{counter} (id-{res['id']}):\n")
            file.write(f"Armor = {armor_names}\n")
            file.write(f"Skills = {str(skills)}\n")

            set_skills = {k: int((v / 2) // 1) for k, v in set_skills.items() if k and int((v / 2) // 1) > 0}
            group_skills = {k: int((v / 3) // 1) for k, v in group_skills.items() if k and int((v / 3) // 1) > 0}

            set_skills_f = set_skills.copy()
            group_skills_f = group_skills.copy()
            if show_set_skills:
                set_skills_f = {set_skill_db[name][0]: level for name, level in set_skills.items()}
                group_skills_f = {group_skill_db[name][0]: level for name, level in group_skills.items()}

            if set_skills_f:
                file.write(f"Set Skills = {str(set_skills_f)}\n")

            if group_skills_f:
                file.write(f"Group Skills = {str(group_skills_f)}\n")

            file.write(f"Decorations = {deco_skills}\n")
            file.write(f"Free Slots - {free_slots}\n")
            file.write(f"Total Slots - {slots}\n\n")
            counter += 1

        if wiki:
            file.write(f"https://mhwilds.wiki-db.com/sim/#skills={wiki}&fee=1\n")

def get_min_required_slots(skills: dict, decos: dict) -> dict:
    ret_skills = {}

    for name in skills:
        for _, deco_data in decos.items():
            if name in deco_data[1]:
                ret_skills[name] = deco_data[2]
    return ret_skills
            
def _d(armor_name: str) -> dict:
    """Fetch armor data by name"""
    armor = get_json_from_type("armor")
    return armor[armor_name]

def roll_combos_dfs(
    gear: dict,
    skills: dict, set_skills: dict, group_skills: dict,
    limit: int, find_one: bool = False
):
    global total_possible_combinations
    ret = []
    counter, inc, prunes = 0, 0, 0
    limit_reached = False

    # Precomputed gear priority lists (best first)
    priority_gear = {
        "head": list(gear["head"].items()),
        "chest": list(gear["chest"].items()),
        "arms": list(gear["arms"].items()),
        "waist": list(gear["waist"].items()),
        "legs": list(gear["legs"].items()),
        "talisman": list(gear["talisman"].items())
    }

    # Skill lookups
    set_skills_check = set(set_skills.keys()) if set_skills else set()
    group_skills_check = set(group_skills.keys()) if group_skills else set()

    # DFS Search Function
    def dfs_search(current_set, slot_index, current_skills, pieces_from_set, pieces_from_group, available_slots):
        nonlocal counter, inc, limit_reached, prunes

        # Base Case: Full armor set is formed
        if slot_index == 5:  # Last slot before talisman
            for talisman_name, talisman_data in priority_gear["talisman"]:
                new_skills = current_skills.copy()
                new_available_slots = available_slots[:]

                # Add talisman skills
                for skill, level in talisman_data[1].items():
                    new_skills[skill] = new_skills.get(skill, 0) + level

                # Add talisman slots (there are no talisman slots)
                # new_available_slots.extend(talisman_data[2])

                # Identify missing skills
                missing_skills = {skill: max(0, level - new_skills.get(skill, 0)) for skill, level in skills.items()}
                missing_skills = {skill: level for skill, level in missing_skills.items() if level > 0}

                # Check if the final set meets requirements
                cat = list((k, v) for k, v in current_set.items())
                test_set = armor_combo(*(format_armor_c(piece) for piece in cat), format_armor_c([talisman_name, gear["talisman"][talisman_name]]))
                result = test(test_set, gear["decos"], skills)
                if result:
                    result["id"] = counter + 1
                    result["_id"] = inc + 1
                    inc += 1
                    ret.append(result)
                    if find_one:
                        return True  # Stop early if find_one=True

            counter += 1
            return False  # Continue exploring other paths

        # Pruning: If limit is reached, stop
        if counter >= limit:
            limit_reached = True
            print("LIMIT REACHED")
            return True  # Stop early

        # Select armor category (head, chest, etc.)
        slot_name = list(priority_gear.keys())[slot_index]

        # Try all armor pieces in the current category
        for piece_name, armor_data in priority_gear[slot_name]:
            new_skills = current_skills.copy()
            new_pieces_from_set = pieces_from_set.copy()
            new_pieces_from_group = pieces_from_group.copy()
            new_available_slots = available_slots[:]

            # Track set/group skills
            set_name = armor_data[7]
            group_name = armor_data[2]

            if set_name in set_skills_check:
                new_pieces_from_set[set_name] = new_pieces_from_set.get(set_name, 0) + 1

            if group_name in group_skills_check:
                new_pieces_from_group[group_name] = new_pieces_from_group.get(group_name, 0) + 1

            # Prune: If set/group skills not met, skip
            if any(new_pieces_from_set.get(skill, 0) < set_skills[skill] * 2 for skill in set_skills_check):
                continue
            if any(new_pieces_from_group.get(skill, 0) < 3 for skill in group_skills_check):
                continue

            # Add armor skills
            for skill, level in armor_data[1].items():
                new_skills[skill] = new_skills.get(skill, 0) + level

            # Add available slots from armor
            if armor_data[0] != "talisman":
                new_available_slots.extend(armor_data[3])

            # **Check If Slots Are Actually Useful**
            missing_skills = {skill: max(0, level - new_skills.get(skill, 0)) for skill, level in skills.items()}
            missing_skills = {skill: level for skill, level in missing_skills.items() if level > 0}

            if missing_skills:
                # Determine minimum slot requirements for needed skills
                min_required_slots = get_min_required_slots(missing_skills, gear["decos"])

                # Check if this armor contributes enough slots for at least one of the needed skills
                can_fulfill_any = any(
                    any(slot >= min_required_slots[skill] for slot in new_available_slots)
                    for skill in missing_skills if skill in min_required_slots
                )

                if not can_fulfill_any:
                    print(f"@@@@@@@@@ {piece_name}")
                    continue  # Skip this armor if its slots can't contribute meaningfully

            # Recursive DFS
            if dfs_search({ **current_set, **{piece_name: armor_data} }, slot_index + 1, new_skills, new_pieces_from_set, new_pieces_from_group, new_available_slots):
                return True  # Stop early if find_one=True

        return False  # No valid set found at this depth

    # Start DFS with an empty slot list
    dfs_search({}, 0, {}, {}, {}, [])
    total_possible_combinations = counter
    return ret


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

    if not show_result_num:
        print(f"possible: {total_possible_combinations:,}")

    # Convert skill lookups into sets for quick membership testing
    set_skills_check = set_skills.keys() if set_skills else set()
    group_skills_check = group_skills.keys() if group_skills else set()

    # Generate all combinations efficiently
    for combo in product(head_list, chest_list, arms_list, waist_list, legs_list, talisman_list):
        if counter >= limit:
            limit_reached = True
            break  # Stop processing once the limit is reached

        # # Gypceros Helm α	Conga Mail β	Xu Wu Vambraces α	Dober Coil α	Gajau Boots α	Impact Charm III
        # tester = ["Gypceros Helm Alpha", "Conga Mail Beta", "Xu Wu Vambraces Alpha", "Dober Coil Alpha", "Gajau Boots Alpha", "Impact Charm III"]
        # passer = True
        # for i in range(len(tester)):
        #     if combo[i][0] != tester[i]:
        #         passer = False
        #         break
        # if passer:
        #     dog = 33

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

from collections import Counter

def count_slots(slot_list, targets):
    """Counts occurrences of numbers in `targets` within `slot_list`."""
    return sum(1 for slot in slot_list if slot in targets)

def verify(results: list, verify_slots: list) -> bool:
    # Initialize tracking variables
    object_A, object_B, object_C = None, None, None
    max_A, max_B, max_C = -1, -1, -1
    max_B_3s = -1  # Track count of 3s for breaking 2/3 ties
    max_B_length = -1  # Track length for breaking further ties in B

    for result in results:
        slot_list = result['free_slots']

        # Count criteria
        count_3s = count_slots(slot_list, {3})
        count_2s_3s = count_slots(slot_list, {2, 3})
        count_1s = count_slots(slot_list, {1, 2, 3})
        slot_length = len(slot_list)

        # Find object A (most 3s)
        if count_3s > max_A:
            object_A, max_A = result, count_3s

        # Find object B with priority order:
        # 1. Highest count of 2s + 3s
        # 2. If tied, pick the one with more 3s
        # 3. If still tied, pick the longer slot array
        if (
            count_2s_3s > max_B or
            (count_2s_3s == max_B and count_3s > max_B_3s) or
            (count_2s_3s == max_B and count_3s == max_B_3s and slot_length > max_B_length)
        ) and count_2s_3s > max_A:
            object_B, max_B, max_B_3s, max_B_length = result, count_2s_3s, count_3s, slot_length

        # Find object C (most 1s)
        if count_1s > max_C:
            object_C, max_C = result, count_1s

    # Results
    three, two, one = [], [], []
    a_count, b_count, c_count = 0, 0, 0
    if object_A:
        three = object_A['free_slots']
        a_count = count_slots(three, {3})
    if object_B:
        two = object_B['free_slots']
        b_count = count_slots(two, {2, 3})
    if object_C:
        one = object_C['free_slots']
        c_count = count_slots(one, {1, 2, 3})

    print(f"Most Free 3 Slots: {three} = {a_count}")
    print(f"Most Free 2/3 Slots: {two} = {b_count}")
    print(f"Most Free Slots: {one} = {c_count}")

    return [a_count, b_count, c_count] == verify_slots

def search(
        skills: dict, set_skills = {}, group_skills = {},
        deco_mods = {}, # specify if you have limited number of a deco
        mandatory_armor: tuple[str, ...] = (None, None, None, None, None, None), # must-use these armor pieces
        blacklisted_armor: tuple[str, ...] = (), # don't use these armor pieces
        blacklisted_armor_types: tuple[str, ...] = (), # don't use these armor types (head, chest, etc)
        dont_use_decos: bool = False, # don't use decorations at all
        limit = constants.LIMIT, find_one: bool = False,
        verify_slots: list = []
    ):
    global file_write, search_results

    if find_one:
        file_write = False

    speed(load_jsons, deco_mods)

    gear = speed(
        get_best_armor, skills, set_skills, group_skills, mandatory_armor, blacklisted_armor,
        blacklisted_armor_types, dont_use_decos
    )

    if not gear:
        print(f"no results possible")
        return []

    rolls = speed(
        roll_combos,
        gear,
        skills, set_skills, group_skills, limit,
        find_one=find_one
    )

    rolls = reorder(rolls)
    search_results = rolls

    if verify_slots and not find_one and not show_result_num:
        passed_test = verify(rolls, verify_slots)
        flashy = ".........."
        print(f"{flashy}[TEST {'PASSED' if passed_test else 'FAILED'}]{flashy}")
    generate_wiki_string(skills, set_skills, group_skills)
    return rolls

def speed(func: Callable[..., Any], *args, **kwargs) -> Any:
    global show_speeds
    start_time = time.perf_counter()
    result = func(*args, **kwargs)
    end_time = time.perf_counter()
    elapsed_time = end_time - start_time
    if not show_speeds:
        return result
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

# todo: add set/group skills to this
def get_addable_skills(
        skills: dict, set_skills = {}, group_skills = {},
        deco_mods = {}, mandatory_armor: tuple[str, ...] = (None, None, None, None, None, None),
        blacklisted_armor: tuple[str, ...] = (),
        blacklisted_armor_types: tuple[str, ...] = (),
        dont_use_decos: bool = False,
        limit = constants.LIMIT, prior_results: list = [],
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
            blacklisted_armor, blacklisted_armor_types, dont_use_decos, limit
        )

    with open('./src/data/compact/armor-skills.json', 'r') as file:
        armor_skills_list = json.load(file)

    def number_tuple(n, stop = 1):
        return (1,) + tuple(range(n, stop, -1))

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
                mandatory_armor, blacklisted_armor, blacklisted_armor_types,
                dont_use_decos, limit, find_one=True
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
    if constants.DEBUG and file_write:        
        def seq(n):
            return ", ".join(map(str, range(1, n + 1)))

        with open('./misc/rolls-can_add.txt', 'w') as file:
            file.write(f"Skills addable:\n\n")
            for skill_name, skill_level in skills_can_add.items():
                file.write(f"{skill_name}: {seq(skill_level)}\n")
    return skills_can_add


def run_all_tests():
    global show_result_num, file_write, show_speeds
    show_result_num = True
    file_write = False
    show_speeds = False
    for test_name, test in tests.all_tests.items():
        results = search(**asdict(test))
        print(f"{test_name}: {len(results)}")

# ==============SEARCH==============
# speed(search, **asdict(tests.test_multi))
# speed(search, **asdict(tests.test_impossible))
# speed(search, **asdict(tests.test_many))
# speed(search, **asdict(tests.test_hammer))
# speed(search, **asdict(tests.test_gather))
# speed(search, **asdict(tests.test_gather_honey))
# speed(search, **asdict(tests.test_lance))
# speed(search, **asdict(tests.test_dalton))
# speed(search, **asdict(tests.test_single))
speed(search, **asdict(tests.test_without_burst_deco))
# speed(search, **asdict(tests.test_mandatory))
# speed(search, **asdict(tests.test_blacklist))
# speed(search, **asdict(tests.test_set))
# speed(search, **asdict(tests.test_group))
# speed(search, **asdict(tests.test_set_and_group))
# speed(search, **asdict(tests.test_more))
# speed(search, **asdict(tests.test_one_slotter))
# speed(search, **asdict(tests.test_decos_not_needed))
# speed(search, **asdict(tests.test_blacklist_armor_type))
# speed(search, **asdict(tests.test_too_high))
# speed(search, **asdict(tests.test_deco_bug))

# ==============MORE SKILLS==============
#speed(get_addable_skills, **asdict(tests.test_multi))
# speed(get_addable_skills, **asdict(tests.test_many))
# speed(get_addable_skills, **asdict(tests.test_one_slotter))

# ==============WEAPONS==============
# speed(weapon_search, "great sword", {
#     "Critical Eye": 3
# })

# run_all_tests()

# ==============PRINT==============
print_results(search_results, wiki_string)
