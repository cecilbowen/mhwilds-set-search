/* eslint-disable no-underscore-dangle */
/*
functions to make it easier to read/use code when dealing with armor objects
slight speed loss, but readability, right?

armor example:
---------------

"Gogmazios Vambraces Alpha":
[
  "arms",
  {
    "Gogmapocalypse": 1,
    "Maximum Might": 2,
    "Agitator": 1
  },
  [],
  [2,1],
  68,
  [-4,3,0,3,-5],
  "high",
  ["Gogmapocalypse","Fulgur Anjanath's Will"]
],

*/

const ARMOR_FIELDS = {
    TYPE: 0,
    SKILLS: 1,
    GROUP_SKILLS: 2,
    SLOTS: 3,
    DEFENSE: 4,
    RESISTS: 5,
    RANK: 6,
    SET_SKILLS: 7,
};

export const _x = {
    type: a => a[ARMOR_FIELDS.TYPE],
    skills: a => a[ARMOR_FIELDS.SKILLS],
    groupSkills: a => a[ARMOR_FIELDS.GROUP_SKILLS],
    slots: a => a[ARMOR_FIELDS.SLOTS],
    defense: a => a[ARMOR_FIELDS.DEFENSE],
    resists: a => a[ARMOR_FIELDS.RESISTS],
    rank: a => a[ARMOR_FIELDS.RANK],
    setSkills: a => a[ARMOR_FIELDS.SET_SKILLS],
};
