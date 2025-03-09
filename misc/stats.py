from functools import reduce
from collections import defaultdict
from itertools import combinations, product
from functools import cmp_to_key
import json

skill_db = set_skill_db = group_skill_db = {}
head = chest = arms = waist = legs = talisman = decoration = {}
total_possible_combinations = 0

# all: 2,184,395,703,840
# low-rank: 2,037,251,736
# high-rank: 2,037,251,736
def calculate_armor_combinations(slots):
    return reduce(lambda total, choices: total * choices, slots, 1)

def get_armor_combo_amounts():
    head_lr = {k: v for k, v in head.items() if v[6] == "low"}
    chest_lr = {k: v for k, v in chest.items() if v[6] == "low"}
    arms_lr = {k: v for k, v in arms.items() if v[6] == "low"}
    waist_lr = {k: v for k, v in waist.items() if v[6] == "low"}
    legs_lr = {k: v for k, v in legs.items() if v[6] == "low"}

    head_hr = {k: v for k, v in head.items() if v[6] == "high"}
    chest_hr = {k: v for k, v in chest.items() if v[6] == "high"}
    arms_hr = {k: v for k, v in arms.items() if v[6] == "high"}
    waist_hr = {k: v for k, v in waist.items() if v[6] == "high"}
    legs_hr = {k: v for k, v in legs.items() if v[6] == "high"}

    combos_count = calculate_armor_combinations([len(head), len(chest), len(arms), len(waist), len(legs), len(talisman)])
    combos_count_lr = calculate_armor_combinations([len(head_lr), len(chest_lr), len(arms_lr), len(waist_lr), len(legs_lr), len(talisman)])
    combos_count_hr = calculate_armor_combinations([len(head_hr), len(chest_hr), len(arms_hr), len(waist_hr), len(legs_hr), len(talisman)])

    print(f"number of armor set combos (low rank only): {combos_count_lr:,}")
    print(f"number of armor set combos (high rank only): {combos_count_lr:,}")
    print(f"number of armor set combos total: {combos_count:,}")

def load_jsons():
    global head, chest, arms, waist, legs, talisman, decoration, skill_db, set_skill_db, group_skill_db
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

def get_gear_pool(skills: dict, set_skills: dict, group_skills: dict) -> dict:
    best_head = get_best_armor("head", skills, set_skills, group_skills)
    best_chest = get_best_armor("chest", skills, set_skills, group_skills)
    best_arms = get_best_armor("arms", skills, set_skills, group_skills)
    best_waist = get_best_armor("waist", skills, set_skills, group_skills)
    best_legs = get_best_armor("legs", skills, set_skills, group_skills)
    best_talisman = get_best_armor("talisman", skills, set_skills, group_skills)
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

def get_best_armor(type:str, skills: dict, set_skills: dict = {}, group_skills: dict = {}, rank: str = "high"):
    full_data_file = get_json_from_type(type)

    # high/low rank and don't check rank on talisman/decos
    data_file = {
        k: v for k, v in full_data_file.items() 
        if type in {"talisman", "decoration"} or v[6] == rank
    }

    if type == "talisman":
        talismans = {
            k: v for k, v in sorted(
                ((k, v) for k, v in data_file.items() if has_needed_skill(v[1], skills)),
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

    threes = dict(
        sorted(
            ((k, v) for k, v in data_file.items() if len(v[3]) == 3),
            key=lambda x: (x[1][3], x[1][4]), # Sort by slot number, then defense
            reverse=True # descending
        )
    )

    threes_exclusive = dict((k, v) for k, v in threes.items() if k == list(threes.keys())[0] or has_needed_skill(v[1], skills))
    # threes_sorted = merge_safe_update(
    #     threes_exclusive,
    #     threes
    # )

    twos = dict(
        sorted(
            ((k, v) for k, v in data_file.items() if len(v[3]) == 2),
            key=lambda x: (x[1][3], x[1][4]),
            reverse=True
        )
    )

    twos_exclusive = dict((k, v) for k, v in twos.items() if k == list(twos.keys())[0] or has_needed_skill(v[1], skills))
    # twos_sorted = merge_safe_update(
    #     twos_exclusive,
    #     twos
    # )

    ones = dict(
        sorted(
            ((k, v) for k, v in data_file.items() if len(v[3]) == 1),
            key=lambda x: (x[1][3], x[1][4]),
            reverse=True
        )
    )

    ones_exclusive = dict((k, v) for k, v in ones.items() if k == list(ones.keys())[0] or has_needed_skill(v[1], skills))
    # ones_sorted = merge_safe_update(
    #     ones_exclusive,
    #     ones
    # )

    zeros = dict(
        sorted(
            ((k, v) for k, v in data_file.items() if len(v[3]) == 0),
            key=lambda x: (x[1][4]), # sort by defense
            reverse=True
        )
    )
    zeros_exclusive = dict((k, v) for k, v in zeros.items() if has_needed_skill(v[1], skills))

    # zeros = dict(
    #     sorted(
    #         ((k, v) for k, v in data_file.items() 
    #             if not (k in threes_sorted or k in twos_sorted or k in ones_sorted) 
    #             and has_needed_skill(v[1], skills)),
    #         key=lambda x: (x[1][3], x[1][4]),  # Sort by slot number, then defense 
    #         reverse=True  # Sort in descending order
    #     )
    # )

    exclusive_only = { **threes_exclusive, **twos_exclusive, **ones_exclusive, **zeros_exclusive }

    # trim unecessary pieces
    # best_slottage = [0, 0, 0]
    best_skillage = {key: 0 for key in skills}
    exclusives_to_keep = {}
    # checking_slottage = True
    for armor_name, armor_data in exclusive_only.items():
        a_slots = _x(armor_data, "slots")
        a_skills = _x(armor_data, "skills")
        update = None
        if has_better_slottage(exclusives_to_keep, a_slots) or has_longer_slottage(exclusives_to_keep, a_slots):
            update = [armor_name, armor_data]
            # best_slottage = a_slots

        for skill_name, skill_level in a_skills.items():
            if skill_name in skills and skill_level > best_skillage.get(skill_name, 0):
                update = [armor_name, armor_data]
                best_skillage[skill_name] = skill_level

        if update:
            exclusives_to_keep[update[0]] = update[1]

    groupies = dict(
        sorted(
            ((k, v) for k, v in data_file.items() if k not in exclusives_to_keep and (is_in_sets(v, set_skills) or is_in_groups(v, group_skills))),
            key=lambda x: (x[1][3], x[1][4]),
            reverse=True
        )
    )

    groupies_grouped, groupies_tracker = group_armor_into_sets(groupies, set_skills, group_skills)
    groupies_to_keep = {}

    for group_name, group_armor in groupies_grouped.items():
        for armor_name, armor_data in group_armor.items():
            a_slots = _x(armor_data, "slots")
            if has_better_slottage(groupies_tracker[group_name], a_slots) or has_longer_slottage(groupies_tracker[group_name], a_slots):
                groupies_tracker[group_name][armor_name] = armor_data

    for group_name, group_armor in groupies_tracker.items():
        for armor_name, armor_data in group_armor.items():
            if armor_name not in groupies_to_keep:
                groupies_to_keep[armor_name] = armor_data

    print(f"#{type}: {len(exclusive_only)}")

    # with open('./misc/exclusives-to-keep.txt', 'w' if type == "head" else 'a') as file:
    #     for a_name, a_data in exclusives_to_keep.items():
    #         file.write(f"{a_name}: ({_x(a_data, 'type')} - {_x(a_data, 'slots')})\n")
    #     file.write('\n')

    # return [
    #     threes_sorted, twos_sorted, ones_sorted, zeros, exclusives_to_keep
    # ]
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
    free_slots = list(slots_available)
    used_slots = []

    # Iterate over available slots and try to fill them with the best decorations
    for slot_size in slots_available:
        for deco_name, (deco_type, deco_skills, deco_slot) in deco_list:
            if deco_slot > slot_size:
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
            skills = dict(res["skills"])
            set_skills = res["set_skills"]
            group_skills = res["group_skills"]

            # visually limit skill levels to stay within max
            global skill_db
            for sk_name, sk_level in skills.items():
                if sk_level > skill_db[sk_name]:
                    skills[sk_name] = skill_db[sk_name]

            skills = dict(
                sorted(
                    ((k, v) for k, v in skills.items()),
                    key=lambda x: x[1], # sort by level 
                    reverse=True
                )                
            )

            free_slots = res["free_slots"]

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
            file.write(f"Free Slots - {free_slots}\n\n")
            counter += 1
            
def roll_combos(head1, chest1, arms1, waist1, legs1, talisman1, decos, skills, set_skills, group_skills, limit):
    counter = 0
    inc = 0
    ret = []

    global total_possible_combinations
    total_possible_combinations = calculate_armor_combinations([len(head1), len(chest1), len(arms1), len(waist1), len(legs1), len(talisman1)])
    print(f"possible: {total_possible_combinations:,}")
    
    # Generate all possible combinations of gear
    for combo in product(head1.items(), chest1.items(), arms1.items(), waist1.items(), legs1.items(), talisman1.items()):
        if counter >= limit:
            break  # Stop once we hit the limit

        # skip combo if doesn't require an existing set or group skill
        if set_skills or group_skills:
            do_cont = True
            if set_skills:
                for set_name, set_level in set_skills.items():
                    pieces_from_set = sum(1 for piece in combo[:-1] if piece[1][7] == set_name)
                    if pieces_from_set >= set_level * 2:
                        do_cont = False
                if do_cont:
                    continue

            if group_skills:
                for group_name, group_level in group_skills.items():
                    pieces_from_set = sum(1 for piece in combo[:-1] if piece[1][2] == group_name)
                    if pieces_from_set >= 3:
                        do_cont = False
            if do_cont:
                continue
        
        test_set = armor_combo(
            format_armor_c(combo[0]),
            format_armor_c(combo[1]),
            format_armor_c(combo[2]),
            format_armor_c(combo[3]),
            format_armor_c(combo[4]),
            format_armor_c(combo[5])
        )

        # Call the test function (you'll implement this)
        result = test(test_set, decos, skills)  # Replace with actual function

        if result is not None:
            result["id"] = counter + 1
            result["_id"] = inc + 1
            inc += 1
            ret.append(result)

        counter += 1  # Increment counter    
    
    return ret

def search(skills:dict, set_skills = {}, group_skills = {}, limit = 500000):
    load_jsons()

    gear = get_gear_pool(skills, set_skills, group_skills)

    # testy = armor_combo(
    #     find_armor("G Fulgur Helm Beta"),
    #     find_armor("Arkvulcan Mail Beta"),
    #     find_armor("G Arkveld Vambraces Beta"),
    #     find_armor("Arkvulcan Coil Beta"),
    #     find_armor("Dahaad Shardgreaves Beta"),
    #     find_armor("Leaping Charm III")
    #     # {
    #     #     "name": "None",
    #     #     "data": [None, {}]
    #     # }
    # )
    # testy_result = test(testy, best_decos, skills)

    rolls = roll_combos(
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


wanted_skills = {
    "Speed Eating": 3,
    "Evade Extender": 3,
    "Weakness Exploit": 5,
    "Partbreaker": 3,
    "Agitator": 5,
    # "Evade Window": 1
}

wanted_set_skills = {
    # "Arkveld's Hunger": 1, # Hasten Recovery
}

wanted_group_skills = {
    # "Fortifying Pelt": 1, # Fortify
}

search(wanted_skills, wanted_set_skills, wanted_group_skills)

