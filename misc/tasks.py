import json
import os

# maps data with unique ids per data type for easier use in urls, etc

def map_skills():
    map_path = "./src/data/ids/skill-ids.json"

    with open('./src/data/compact/skills.json', 'r') as file:
        skills = json.load(file)
    with open('./src/data/compact/set-skills.json', 'r') as file:
        set_skills = json.load(file)
    with open('./src/data/compact/group-skills.json', 'r') as file:
        group_skills = json.load(file)

    skill_map = {}
    if os.path.exists(map_path):
        with open(map_path, 'r') as file:
            skill_map = json.load(file)

    latest_id = max(list(skill_map.values()) + [0]) + 1
    
    for name in skills.keys():
        if not skill_map.get(name):
            print(f"added skill - {name}, {latest_id}")
            skill_map[name] = latest_id
            latest_id += 1
    for name in set_skills.keys():
        if not skill_map.get(name):
            print(f"added set_skill - {name}, {latest_id}")
            skill_map[name] = latest_id
            latest_id += 1
    for name in group_skills.keys():
        if not skill_map.get(name):
            print(f"added group_skill - {name}, {latest_id}")
            skill_map[name] = latest_id
            latest_id += 1
    
    with open(map_path, 'w') as f:
        json.dump(skill_map, f, indent = 4)

def map_armor():
    map_path = "./src/data/ids/armor-ids.json"

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

    armor_map = {}
    if os.path.exists(map_path):
        with open(map_path, 'r') as file:
            armor_map = json.load(file)

    latest_id = max(list(armor_map.values()) + [0]) + 1

    name_map = {
        'head': head, 'chest': chest, 'arms': arms,
        'waist': waist, 'legs': legs, 'talisman': talisman
    }

    if not armor_map.get("None"):
        armor_map["None"] = latest_id
        latest_id += 1

    for type, data in name_map.items():
        for name in data.keys():
            if not armor_map.get(name):
                print(f"added {type} - {name}, {latest_id}")
                armor_map[name] = latest_id
                latest_id += 1
    
    with open(map_path, 'w') as f:
        json.dump(armor_map, f, indent = 4)

def map_decos():
    map_path = "./src/data/ids/deco-ids.json"

    with open('./src/data/compact/decoration.json', 'r') as file:
        decos = json.load(file)

    deco_map = {}
    if os.path.exists(map_path):
        with open(map_path, 'r') as file:
            deco_map = json.load(file)

    latest_id = max(list(deco_map.values()) + [0]) + 1
    
    for name in decos.keys():
        if not deco_map.get(name):
            print(f"added deco - {name}, {latest_id}")
            deco_map[name] = latest_id
            latest_id += 1
    
    with open(map_path, 'w') as f:
        json.dump(deco_map, f, indent = 4)

def map_data():
    map_skills()
    map_armor()
    map_decos()

map_data()
