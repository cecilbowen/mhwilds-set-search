// ran from a kiranico page browser console, cause i'm too lazy to debug beautifulsoup/selenium
// pulls all wilds armor details from kiranico (which I then copy armor.json and armor-series.json to /src/data/kiranico)

const pullArmor = async() => {
    const delay = ms => new Promise(res => setTimeout(res, ms));

    const urlsToParse = [...document.querySelectorAll('td > a')].map(x => x.href);

    const armor = {};
    const armorSeries = {};

    for (const url of urlsToParse) {
        console.log(`Fetching: ${url}`);
        const res = await fetch(url);
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        let armorSeriesName = doc.getElementsByTagName('h2')[0]?.innerText || 'Unknown Series';
        const rank = armorSeriesName.includes("α") ||
            armorSeriesName.includes("β") ||
            armorSeriesName.includes("γ") ? "high" : "low";
        armorSeriesName = armorSeriesName.replace('γ', 'Gamma').replace('α', 'Alpha').replace('β', 'Beta');
        const tableBodies = [...doc.getElementsByTagName('tbody')];

        if (tableBodies.length < 4) {
            console.warn(`Skipping ${url} due to unexpected table structure`);
            continue;
        }

        // Table 1: name + description
        const nameDescRows = [...tableBodies[0].children];
        for (const row of nameDescRows) {
            const name = row.children[0].innerText.replace('γ', 'Gamma').replace('α', 'Alpha').replace('β', 'Beta');
            armor[name] = {
                description: row.children[1].innerText,
                rank,
            };

            const pieces = armorSeries[armorSeriesName]?.pieces || [];
            pieces.push(name);
            armorSeries[armorSeriesName] = {
                ...armorSeries[armorSeriesName],
                pieces,
                rank,
            };
        }

        // Table 2: defenses + resistances
        const defRows = [...tableBodies[1].children];
        for (const row of defRows) {
            const children = row.children;
            if (children[0].tagName.toLowerCase() !== "td") { continue; }

            const name = children[1].innerText;
            armor[name] = {
                ...armor[name],
                type: children[0].innerText.toLowerCase(),
                defense: parseInt(children[2].innerText, 10),
                fireResistance: parseInt(children[2].innerText, 10),
                waterResistance: parseInt(children[3].innerText, 10),
                thunderResistance: parseInt(children[4].innerText, 10),
                iceResistance: parseInt(children[5].innerText, 10),
                dragonResistance: parseInt(children[6].innerText, 10),
            };
        }

        // Table 3: slots and skills
        const slotSkillRows = [...tableBodies[2].children];
        for (const row of slotSkillRows) {
            const children = row.children;
            if (children[0].tagName.toLowerCase() !== "td") { continue; } // skip header row

            const name = children[1].innerText;
            const skillsHaveLineBreaks = children[3].innerText.includes("\n");
            const skillsText = skillsHaveLineBreaks ? children[3].innerText.split("\n") :
                children[3].innerText.match(/[^+]+\+\d+/g);

            const skills = Object.fromEntries(skillsText.map(x => {
                const split = x.split(' +');

                return [split[0], parseInt(split[1], 10)];
            }));

            armor[name] = {
                ...armor[name],
                slots: children[2].innerText.replaceAll('[', '').replaceAll(']', '')
                    .trim().split('').map(x => parseInt(x, 10)),
                skills,
                materials: [],
                url: "",
                imgUrl: "",
                // setSkill
                // groupSkill
            };
        }

        // Table 4: series skills
        const totalSkillRows = [...tableBodies[3].children];
        const skills = {};
        for (const row of totalSkillRows) {
            const children = row.children;
            if (children[0].tagName.toLowerCase() !== "td") { continue; }

            const skillName = children[0].innerText;
            skills[skillName] = {
                level: parseInt(children[1].innerText, 10),
                description: children[2].innerText
            };
            armorSeries[armorSeriesName] = {
                ...armorSeries[armorSeriesName],
                skills,
            };
        }

        await delay(300); // slight wait to make site less likely to throttle me
    }

    console.log("armor:", armor);
    console.log("armorSeries:", armorSeries);

    // Optionally, download as JSON files:
    // const saveJSON = (obj, filename) => {
    //     const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    //     const a = document.createElement("a");
    //     a.href = URL.createObjectURL(blob);
    //     a.download = filename;
    //     a.click();
    // };

    // saveJSON(armor, "armor.json");
    // saveJSON(armorSeries, "armor-series.json");
};

const pullSkills = async() => {
    const delay = ms => new Promise(res => setTimeout(res, ms));

    // returns
    const skills = {};
    const setSkills = {};
    const groupSkills = {};

    const links = {
        weapon: [],
        armor: [],
        group: [],
        set: []
    };

    const linkGroups = [...document.getElementsByClassName("my-8")];
    for (let i = 0; i < linkGroups.length; i++) {
        const group = [...linkGroups[i].querySelectorAll('td > a')].map(x => x.href);
        const groupType = Object.keys(links)[i];
        links[groupType] = group;
    }

    // weapon skills
    for (const url of links.weapon) {
        console.log(`Fetching: ${url}`);
        const res = await fetch(url);
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const name = doc.getElementsByTagName('h2')[0]?.innerText.trim();
        const type = 'weapon';
        const icon = '';
        const description = [...doc.getElementsByTagName('blockquote')][0].innerText.trim();
        const levels = [
            ...[...doc.getElementsByTagName('tbody')][0].getElementsByTagName('tr')
        ].map(x => x.children[2].innerText);

        skills[name] = { icon, type, description, levels };
        await delay(300); // slight wait to make site less likely to throttle me
    }

    // armor skills
    for (const url of links.armor) {
        console.log(`Fetching: ${url}`);
        const res = await fetch(url);
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const name = doc.getElementsByTagName('h2')[0]?.innerText.trim();
        const type = 'armor';
        const icon = '';
        const description = [...doc.getElementsByTagName('blockquote')][0].innerText.trim();
        const levels = [
            ...[...doc.getElementsByTagName('tbody')][0].getElementsByTagName('tr')
        ].map(x => x.children[2].innerText);

        skills[name] = { icon, type, description, levels };
        await delay(300); // slight wait to make site less likely to throttle me
    }

    // group skills
    for (const url of links.group) {
        console.log(`Fetching: ${url}`);
        const res = await fetch(url);
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const name = doc.getElementsByTagName('h2')[0]?.innerText.trim();
        const skill = ""; // annoying that kiranico doesn't appear to have the skill name for sets/groups
        const description = [...doc.getElementsByTagName('blockquote')][0].innerText.trim();
        const effect = [
            ...[...doc.getElementsByTagName('tbody')][0].getElementsByTagName('tr')
        ].map(x => x.children[2].innerText)[0];
        const pieces = 3;
        const armor = [
            ...[...doc.getElementsByTagName('tbody')][1].getElementsByTagName('tr')
        ].map(x => x.children[0].innerText.replace('γ', 'Gamma').replace('α', 'Alpha').replace('β', 'Beta'));

        groupSkills[name] = { skill, description, effect, pieces, armor };
        await delay(300); // slight wait to make site less likely to throttle me
    }

    // set skills
    for (const url of links.set) {
        console.log(`Fetching: ${url}`);
        const res = await fetch(url);
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const name = doc.getElementsByTagName('h2')[0]?.innerText.trim();
        const skill = ""; // annoying that kiranico doesn't appear to have the skill name for sets/groups
        const description = [...doc.getElementsByTagName('blockquote')][0].innerText.trim();
        const levels = [
            ...[...doc.getElementsByTagName('tbody')][0].getElementsByTagName('tr')
        ].map(x => x.children[2].innerText);
        const piecesPerLevel = [2, 4];
        const armor = [
            ...[...doc.getElementsByTagName('tbody')][1].getElementsByTagName('tr')
        ].map(x => x.children[0].innerText.replace('γ', 'Gamma').replace('α', 'Alpha').replace('β', 'Beta'));

        setSkills[name] = { skill, description, levels, piecesPerLevel, armor };
        await delay(300); // slight wait to make site less likely to throttle me
    }

    console.log("skills", skills);
    console.log("groupSkills", groupSkills);
    console.log("setSkills", setSkills);
};
