# Armor Selection Pseudo Flow
This is just more of a general look at what I do in the code.  I wrote this document for people who want to know sort of an overview of what is happening to decide if they want to contribute better ideas or methods (of which I'm almost certain there are).

As mentioned on the [main readme](https://github.com/cecilbowen/mhwilds-set-search/blob/master/README.md), we want this tool to show all the armor combos that have the best free slots.  Therefore, the armor selection process is very important to make sure we choose the minimum required armor pieces to accomplish this, while not filtering out too much so that we miss valuable free slot results.

I suggest checking out the [getBestArmor() function in logic.js](https://github.com/cecilbowen/mhwilds-set-search/blob/master/src/util/logic.js#L32) for the full, detailed process.

## Common Terms
**biggest slots** - left-to-right slots comparison.  [3,2,1] is *bigger* than [2,2,2]
**longest slots** - right-to-left slots comparison.  [3,2,1] is *shorter* than [2,2,2]
**keep pool** - final pool of armor we've chosen
**refine pool** - armor pool we're filtering out of to add to the *keep pool*

# Main function - getBestArmor()
This is the main function where the armor selection happens.  It chooses the best armor based on the skills that we are looking for.  It also takes into account things like user-specified mandatory (we *must* use these) and blacklisted (*never* use these) armors.

 1. Filter in/out mandatory/blacklisted armor pieces
 2. Filter out any talismans that don't have skills we want or that aren't the best talisman of each skill (eg, no need to keep in **Leaping Charm I** or **Leaping Charm II**, since **Leaping Charm III** is better)
 3. For each armor type (*head*, *chest*, *arms*, etc.) add the biggest and longest slots armor to the **keep pool**.
 4. Filter out any armor pieces from the **refine pool** that don't have any of the skills we want

## Step 5 - Skill Potentials and Scoring
At the end of this function, the final armor pieces we've chosen are going to be grouped by armor type.  In code, it would be represented somewhat like this:

    {
    	"head": {
    		"head armor 1 name": data,
    		"head armor 2 name": data,
    		// ... etc
    	},
    	"chest": {
    		"chest armor 1 name": data,
    		"chest armor 2 name": data,
    		// ... etc
    	},
    	// ... arms, waist, legs, talisman
    }
To get to this point, we have to decide what the best armor pieces per armor type category are.  The first step to figuring this out, is looping through each desired skill and armor type and calculating point values for each armor piece in the **refine pool**.  For the purpose of this write-up, we're going to call these calculated point values, an armor piece's **skill potentials**.  These **skill potentials** are then used to update the armor type's **score**, leaving you at the end with a **score** object per armor type.  This is what an armor type's **score** object could look like in code (with example values):

    // assume this is the first helmet we find and "Agitator" is one of our desired skills
    {
    	best: "G Fulgur Helm β", // current best armor piece name 
    	points: 2, // has level 2 of Agitator and only [2,0,0] slots, so an Agitator deco would not fit
    	slots: [2, 0, 0],
    	extraPoints: 0, 
    	leftoverSlots: [2], // slots that weren't used to calculate points
    	defense: 48,
    	more // list of additional viable armor pieces for this armor type (head in this case)
    }

The *more* list in the **score** is sort of a fail-safe method to include possible armor pieces that could yield better slot results, instead of outright excluding them.

The function that determines these **skill potentials** that update the **score** values is called **getSkillPotential**.  Below is a brief summary of the function. 

    getSkillPotential()
    
    Parameters:
	    armor data: stats of the armor we're checking
	    skill name: name of the skill we're checking
	    decorations: best relevant decorations for the skill we're checking
	    desired skills: all skills we're searching for
    
    Return values:
		points: skill points on the armor + skill points that could be added via decos
		leftoverSlots: slots leftover that weren't used to calculate points (eg, too small for required decos)
		extraPoints: 1 additional point per non-required (extra) skill, or 5 addtional points per other-required skills 
		modPoints: points + the size of leftoverSlots filtered so that only slots that fit any other-required skills remain 

The *extraPoints* logic above is one of the areas where I could see improvements being made. We then use the calculated **skill potential** to see what we need to update in the armor type's **score** object.  Here are the conditional checks that happen to decide what parts of **score** to update:

	if points > current best points for this category (armor type/skill name),
		update best, leftoverSlots, extraPoints and defense 
	else if the points are equal,
		if leftoverSlots are identical to best leftoverSlots,
			if slots are bigger than current best slots, 
				update best and defense 
			else if extraPoints are > current best extraPoints 
				update best, extraPoints and defense 
			else if extraPoints are equal to best extraPoints and defense > current best defense,
				update best and defense
		else 
			update best, leftoverSlots and defense 
	else if points < current best points and modPoints > current best modPoints,
		put the armor in the more pool only if its modPoints are >= every other piece in the more pool 

*Remember, step 5 above runs per skill, per armor type.*

After all this, you should have something like this:

    {
      "head": {
        "Agitator": {
          "best": "G Fulgur Helm Beta",
          "points": 2,
          "slots": [2],
          "extraPoints": 0,
          "leftoverSlots": [2],
          "defense": 48
        },
        "Antivirus": {
          "best": "G Rathalos Helm Alpha",
          "points": 2,
          "slots": [1,1],
          "extraPoints": 6,
          "leftoverSlots": [],
          "defense": 48,
          "more": [
            "Dahaad Shardhelm Beta"
          ]
        },
    	// ... etc
      },
      "chest": {
        "Agitator": {
          "best": "Blango Mail Beta",
          "points": 2,
          "slots": [2],
          "extraPoints": 0,
          "leftoverSlots": [2],
          "defense": 48,
          "more": [
            "Chatacabra Mail Beta"
          ]
        },
        "Antivirus": {
          "best": "Chatacabra Mail Beta",
          "points": 3,
          "slots": [1,1,1],
          "extraPoints": 5,
          "leftoverSlots": [],
          "defense": 36
        },
    	// ... etc
      },
      // ... arms, waist, legs, talisman
    }

6. After we've gone through each skill for each armor type, we now want to add every *best* armor piece as well as every armor piece in the *more* list of each **score** object to the **keep pool**.
7. We then repeat the ranking and point systems from **step 5**, but this time for set/group skills.  The only difference here, is that we'd be looping through the armor pieces per skill, per set/group skill name, per armor type instead.
8. Same deal as **step 6**, add the *best* armor and every *more* armor into the **keep pool**.  Even if there are duplicates we're adding in this step already in the **keep pool**, it's no problem, because they are just ignored (or rather, it's an existing key in the final return map object).

Now we should have a return object of chosen armors that looks something like what was mentioned at the start of **step 5**.

We're now going to use these chosen armor pieces to find armor-decoration combinations that fulfill the skill requirements we are looking for.  The combination testing step is nothing complicated currently; we just use depth-first search and prune early if certain conditions occur (such as not enough pieces for a set/group skill).  That's about the end for this write-up on how armor is chosen for the combinations testing.  

Below is a bonus *really* brief description of the steps the combination DFS goes through.

1. Start looping through armor type combinations
2. Pick first piece of combo (head)
3. Check to see if we can still form any required set/group skills via count of each set/group's pieces.  If we can't, then backtrack
4. Using our current pieces (just head right now), check if we can fulfill all the skills we need with the theoretical best of each remaining piece (chest, arms, waist, legs, talisman) and decorations
5. If we can, continue to the next piece.  If we can't, then backtrack
6. When we have formed a full set this way, test the set by slotting in decorations to see if we can reach our desired skills
7. If we can, then we have found a result, otherwise, discard the result
8. Repeat
