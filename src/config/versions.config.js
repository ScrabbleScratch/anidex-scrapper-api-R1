const availableVersions = {
    v3: {
        anime: [],
        character: [],
        manga: []
    },
    v4: {
        anime: ["characters", "staff", "pictures", "statistics", "recommendations", "relations", "themes", "external"],
        characters: ["anime", "manga", "voices", "pictures"],
        manga: ["characters", "pictures", "statistics", "recommendations", "relations", "external"]
    }
};

module.exports = availableVersions;