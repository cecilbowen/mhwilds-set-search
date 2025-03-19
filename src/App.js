import { useState, useEffect } from "react";
import "./App.css";
import SkillsPicker from "./components/SkillsPicker";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import * as TEST from "./test/tests";
import { runAllTests, search } from "./util/logic";
import SKILLS from './data/compact/skills.json';
import Search from "./components/Search";
import CustomTabPanel from "./components/CustomTabPanel";
import Results from "./components/Results";
import { excludeArmor, pinArmor } from "./util/util";
import SavedSets from "./components/SavedSets";

const DEFAULT_DISPLAY_LIMIT = 500;

const App = () => {
  const [skills, setSkills] = useState({});
  const [setEffects, setSetEffects] = useState({});
  const [groupSkills, setGroupSkills] = useState({});
  const [decoInventory, setDecoInventory] = useState({});
  const [mandatoryArmor, setMandatoryArmor] = useState(['', '', '', '', '', '']);
  const [blacklistedArmor, setBlacklistedArmor] = useState([]);
  const [blacklistedArmorTypes, setBlacklistedArmorTypes] = useState([]);

  const [dontUseDecos, setDontUseDecos] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(DEFAULT_DISPLAY_LIMIT);
  const [showDecoSkillNames, setShowDecoSkillNames] = useState(false);
  const [showGroupSkillNames, setShowGroupSkillNames] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {

  }, []);

  const generate = () => {
    const results = search(TEST.testMandatory);
    console.log('results', results, results.length);
  };

  const addSkill = (skillName, level) => {
    const tempSkills = { ...skills };
    tempSkills[skillName] = level || SKILLS[skillName];
    setSkills(tempSkills);
  };

  const tabProps = index => {
    return {
      "id": `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  };

  const handleTabChange = (event, newValue) => {
    if (newValue === "external") {
      window.open(source, '_blank');
      return;
    }

    setTab(newValue);
  };

  const tabs = {
    "Search": 0,
    "Saved Sets": 1,
    "Decorations": 2,
    "Settings": 3
  };

  const renderTab = (name, index) => {
    return <Tab key={name} label={name} {...tabProps(index)} />;
  };

    // pins/unpins armor
    const pin = (name, type) => {
        const mm = pinArmor(name, type);
        if (!mm) { return; }

        setMandatoryArmor(mm.mandatoryArmor);
        setBlacklistedArmor(mm.blacklistedArmor);
        setBlacklistedArmorTypes(mm.blacklistedArmorTypes);
    };

    const exclude = name => {
        const mm = excludeArmor(name);
        if (!mm) { return; }
        setBlacklistedArmor(mm.blacklistedArmor);
        setMandatoryArmor(mm.mandatoryArmor);
    };

  const source = "https://github.com/cecilbowen/mhwilds-set-search";
  return (
    <div className="App">
      <Tabs value={tab} onChange={handleTabChange} aria-label="tabs" variant="scrollable">
        {Object.entries(tabs).map(([name, index]) => renderTab(name, index))}
        <Tab label={"Source Code"} value="external" onClick={e => e.preventDefault()} />
      </Tabs>
      <CustomTabPanel value={tab} index={0}><Search /></CustomTabPanel>
      <CustomTabPanel value={tab} index={1}>
        <SavedSets />
      </CustomTabPanel>
      <CustomTabPanel value={tab} index={2}>Tab Three Content</CustomTabPanel>
      <CustomTabPanel value={tab} index={3}>Tab Four Content</CustomTabPanel>
    </div>
  );
};

export default App;
