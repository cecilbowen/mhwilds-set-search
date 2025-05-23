import Results from "./Results";
import { useStorage } from "../hooks/StorageContext";

const SavedSets = () => {
    const { fields } = useStorage();

    return (
        <div className="saved-sets">
            <Results results={fields.savedSets} save />
        </div>
    );
};

export default SavedSets;
