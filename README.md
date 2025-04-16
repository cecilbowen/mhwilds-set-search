# Monster Hunter Wilds Set Search

A tool to help you find gear sets with the skills you want in Monster Hunter Wilds.  Set your search parameters and the tool will find you the armor combos with the best slots available.

You can find it here: [MHWilds Set Search](https://cecilbowen.github.io/mhwilds-set-search/).

Originally, I wrote this in python to help sort out the logic and flow of how it was going to work.  I regretted that decision when it came time to "port" it over to JavaScript for static web hosting; not because either language is difficult, but because I despise writing the same code twice.  So that is why there is a (slightly outdated) python version of the tool that you can find in ./misc/stats.py.

## Goal of this Tool
The main purpose of this tool is perhaps a little different than some other armor set search tools.  When you search for a set with your chosen skills, the goal is for this tool to return you the results with the best free slots possible.  Best free slots as in, the "biggest" and "longest" free slots.  This tool aims to make sure you don't miss any results that can fit the biggest and also the most decorations into.  You should never have to make a search with this tool to then wonder, "but did this thing really give me the best results possible?".

## Contributions Welcome
I made this open source for a reason!  I'm no god of figuring out the best speed and efficiency algorithms, so if you see possible improvements, then feel free to contribute.  If you find any bugs or even have any ideas/changes you want to see, then open up an issue, create a pull request or even just leave a comment [here](https://redd.it/1jftiwm).

(Also, it's kind of annoying when you come across similar tools that are behind ad-ridden webpages or that refuse to be open source.)

## Obscure Features

 - `CTRL + clicking` the "Search" button on the search tab will copy a
   share-able search URL to the clipboard
 - Holding `CTRL` with an armor set expanded will reveal a "Search Wiki"
   button that, when clicked, opens a new tab of the mhwilds wiki sim
   with the same skills
 - Holding `SHIFT` while on the Saved Sets page with an armor set expanded
   will add a 🔎 icon next to the "Set as Search Target" button.  If you
   click it while this is shown, it will instead add the skills as a
   search target that you used to find that armor set (eg. the set may
   have many skills on it, but you may have found it by only searching
   some of the skills)
