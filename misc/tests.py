# todo: should probably allow generation of sets without talisman, since single searches like test_single
#   will use the 3 slot talisman for all it's combos otherwise

test_single = (
    {
        "Evade Extender": 3,
    },
    {},
    {}
)

test_without_deco = (
    {
        "Burst": 5,
    },
    {},
    {},
    {
        "Chain Jewel 3": 0
    }
)

test_multi = (
    {
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 5,
    },
    {},
    {}
)

test_set = (
    {
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 5,
    },
    {
        "Arkveld's Hunger": 1, # Hasten Recovery
    },
    {}
)

test_group = (
    {
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 5,
    },
    {},
    {
        "Fortifying Pelt": 1, # Fortify
    }
)

test_set_and_group = (
    {
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 2,
    },
    {
        "Arkveld's Hunger": 1, # Hasten Recovery
    },
    {
        "Fortifying Pelt": 1, # Fortify
    }
)

test_set_and_group = (
    {
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 2,
    },
    {
        "Arkveld's Hunger": 1, # Hasten Recovery
    },
    {
        "Fortifying Pelt": 1, # Fortify
    }
)

test_wiki_impossible = (
    {
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 5,
        "Evade Window": 1
    },
    {},
    {}
)

# wiki (version 20250309T155958) returns a result with a 2 slot available.  that is an error
test_many = (
    {
        "Evade Extender": 3,
        "Weakness Exploit": 2,
        "Partbreaker": 3,
        "Constitution": 3,
        "Antivirus": 3,
        "Burst": 5
    },
    {
        "Ebony Odogaron's Power": 1, # Burst Boost
        "Gore Magala's Tyranny": 1 # Black Eclipse
    },
    {}
)

test_mandatory = (
    {
        "Burst": 4,
    },
    {}, # set skills
    {}, # group skills
    {}, # deco mods
    ("G Ebony Helm Beta", None, None, None, None, None), # mandatory armor
)

test_blacklist = (
    {
        "Burst": 4,
    },
    {}, # set skills
    {}, # group skills
    {}, # deco mods
    (None, None, None, None, None, None), # mandatory armor
    ("Arkvulcan Helm Beta", "Arkvulcan Mail Beta", "Gore Coil Beta", "G Arkveld Helm Beta")
)
