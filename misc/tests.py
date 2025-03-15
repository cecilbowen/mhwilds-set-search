from dataclasses import dataclass, field
from typing import Dict, Tuple
import constants

# todo: should probably allow generation of sets without talisman, since single searches like test_single
#   will use the 3 slot talismans

@dataclass
class TestParams:
    skills: Dict[str, int]
    set_skills: Dict[str, int] = field(default_factory=dict)
    group_skills: Dict[str, int] = field(default_factory=dict)
    deco_mods: Dict[str, int] = field(default_factory=dict)  # specify if you have a limited number of a deco
    mandatory_armor: Tuple[str, ...] = field(default_factory=lambda: ("", "", "", "", "", "")) # must-use these armor pieces
    blacklisted_armor: Tuple[str, ...] = field(default_factory=tuple)  # Don't use these armor pieces
    blacklisted_armor_types: Tuple[str, ...] = field(default_factory=tuple)  # Don't use these armor types (head, chest, etc)
    dont_use_decos: bool = False  # Don't use decorations at all
    limit: int = constants.LIMIT
    find_one: bool = False
    verify_slots: list = field(default_factory=list) # count of 3s, 2/3s and longest slots in results

test_single = TestParams(
    skills={"Evade Extender": 3},
    verify_slots=[5, 10, 15]
)

test_without_burst_deco = TestParams(
    skills={
        "Burst": 5,
    },
    deco_mods={
        "Chain Jewel 3": 0
    },
    verify_slots=[4, 8, 12]
)

# faster! but im missing a [3, 2, 1] (not a big deal I guess..)
test_more = TestParams(
    skills={
        "Coalescence": 1,
        "Evade Extender": 3,
        "Counterstrike": 3,
        "Partbreaker": 3,
        "Agitator": 5,
    },
    verify_slots=[1, 3, 5]
)

test_multi = TestParams(
    skills={
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 5,
    },
    verify_slots=[0, 0, 2]
)

test_decos_not_needed = TestParams(
    skills={
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Partbreaker": 3,
        "Antivirus": 1
    },
    dont_use_decos=True,
    verify_slots=[3, 4, 11]
)

# four 3s, seven 2s, eight 1s not found on wiki
test_one_slotter = TestParams(
    skills={
        "Speed Eating": 1,
    },
    verify_slots=[5, 10, 15]
)

test_set = TestParams(
    skills={
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 5,
    },
    set_skills={
        "Arkveld's Hunger": 1, # Hasten Recovery
    },
    verify_slots=[0, 0, 2]
)

# three 1s not found on wiki
test_group = TestParams(
    skills={
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 2,
    },
    group_skills={
        "Fortifying Pelt": 1, # Fortify
    },
    verify_slots=[0, 1, 3]
)

test_set_and_group = TestParams(
    skills={
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 2,
    },
    set_skills={
        "Arkveld's Hunger": 1, # Hasten Recovery
    },
    group_skills={
        "Fortifying Pelt": 1, # Fortify
    },
    verify_slots=[0, 1, 3]
)

test_impossible = TestParams(
    skills={
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 5,
        "Evade Window": 1
    },
    verify_slots=[0, 0, 0]
)

test_many = TestParams(
    skills={
        "Evade Extender": 3,
        "Weakness Exploit": 2,
        "Partbreaker": 3,
        "Constitution": 3,
        "Antivirus": 3,
        "Burst": 5
    },
    set_skills={
        "Ebony Odogaron's Power": 1, # Burst Boost
        "Gore Magala's Tyranny": 1 # Black Eclipse
    },
    verify_slots=[0, 1, 2]
)

test_too_high = TestParams(
    skills={
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Constitution": 3,
        "Antivirus": 3,
        "Burst": 5
    },
    verify_slots=[0, 0, 0]
)

test_mandatory = TestParams(
    skills={
        "Burst": 4,
    },
    mandatory_armor=("G Ebony Helm Beta", None, None, None, None, None),
    verify_slots=[4, 9, 13]
)

test_blacklist = TestParams(
    skills={
        "Burst": 4,
    },
    blacklisted_armor=("Arkvulcan Helm Beta", "Arkvulcan Mail Beta", "Gore Coil Beta", "G Arkveld Helm Beta"),
    verify_slots=[4, 9, 13]
)

test_blacklist_armor_type = TestParams(
    skills={
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Partbreaker": 3,
    },
    blacklisted_armor_types=("head", "talisman"), # blacklisted armor types
    verify_slots=[2, 0, 5]
)

all_tests = {
    "test_single": test_single,
    "test_without_burst_deco": test_without_burst_deco,
    "test_more": test_more,
    "test_multi": test_multi,
    "test_decos_not_needed": test_decos_not_needed,
    "test_one_slotter": test_one_slotter,
    "test_set": test_set,
    "test_group": test_group,
    "test_set_and_group": test_set_and_group,
    "test_impossible": test_impossible,
    "test_many": test_many,
    "test_too_high": test_too_high,
    "test_mandatory": test_mandatory,
    "test_blacklist": test_blacklist,
    "test_blacklist_armor_type": test_blacklist_armor_type,
}
