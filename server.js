


import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import simpleGit from 'simple-git';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Set up Git
const git = simpleGit();
const repoPath = "IOT-data";
const filePath = "responses.json";
console.log("File path:", filePath);

const githubToken = "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";
const repoName = "IOT-data";

// Function to validate member ID
function isValidMemberId(id) {
    // For 21BIT: matches numbers from 0001 to 0742
    const pattern21BIT = /^21BIT(?:000[1-9]|00[1-9][0-9]|0[1-6][0-9]{2}|07[0-3][0-9]|074[0-2])$/;

    // For 22BIT: matches numbers from 0001 to 0696
    const pattern22BIT = /^22BIT(?:000[1-9]|00[1-9][0-9]|0[1-5][0-9]{2}|06[0-8][0-9]|069[0-6])$/;

    return pattern21BIT.test(id) || pattern22BIT.test(id);
}


app.use(cors({
    origin: 'http://iot-project.sytes.net:8080',
    methods: ['GET', 'POST'],
}));

app.use(bodyParser.json());

// Initialize the JSON files
const jsonFilePath = "responses.json";
const topicsFilePath = "topics.json";

// [Previous helper functions remain the same]
function resetFiles() {
    if (!fs.existsSync(jsonFilePath)) {
        fs.writeFileSync(jsonFilePath, JSON.stringify([]), "utf-8");
        console.log("responses.json file created.");
    }

    if (!fs.existsSync(topicsFilePath)) {
        const initialTopics = Array.from({ length: 70 }, (_, i) => ({ number: i + 1, available: true }));
        fs.writeFileSync(topicsFilePath, JSON.stringify(initialTopics, null, 2), "utf-8");
        console.log("topics.json file created.");
    }
}

function getTopics() {
    return JSON.parse(fs.readFileSync(topicsFilePath, "utf-8"));
}

function updateTopics(topics) {
    fs.writeFileSync(topicsFilePath, JSON.stringify(topics, null, 2), "utf-8");
}

function getResponses() {
    return JSON.parse(fs.readFileSync(jsonFilePath, "utf-8"));
}

function updateResponses(responses) {
    fs.writeFileSync(jsonFilePath, JSON.stringify(responses, null, 2), "utf-8");
}

const commitAndPushToGitHub = async () => {
    try {
        await git.add(filePath);
        await git.commit("Update responses.json");
        await git.push('https://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@github.com/miit-daga/IOT-data.git', 'main');
        console.log("Changes pushed to GitHub.");
    } catch (error) {
        console.error("Error committing and pushing changes:", error);
    }
};

// Reset files on server startup
resetFiles();

app.get("/api/topics", (req, res) => {
    const topics = getTopics();
    const availableTopics = topics.filter((topic) => topic.available);
    res.json(availableTopics);
});

// Modified endpoint with member ID validation
app.post("/api/select-topic", async (req, res) => {
    const { teamName, member1, member2, member3, member4, member5, member6, topicNumber } = req.body;

    // Validate required fields
    if (!teamName || !member1 || !member2 || !member3 || !member4 || !member5 || !topicNumber) {
        return res.status(400).json({ success: false, message: "Required fields are missing." });
    }

    // Validate member IDs
    const requiredMembers = [member1, member2, member3, member4, member5];
    const invalidMembers = requiredMembers.filter(memberId => !isValidMemberId(memberId));

    if (invalidMembers.length > 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid member ID format. Member IDs must be in the format '21BIT0000' to '21BIT0742' or '22BIT0000' to '22BIT0696'.",
            invalidMembers
        });
    }

    // If member6 is provided, validate it as well
    if (member6 && !isValidMemberId(member6)) {
        return res.status(400).json({
            success: false,
            message: "Invalid member ID format for optional member 6.",
            invalidMember: member6
        });
    }

    // Read the current topics
    let topics = getTopics();

    // Check if the topic is available
    const topic = topics.find((t) => t.number === topicNumber);
    if (!topic || !topic.available) {
        return res.status(400).json({ success: false, message: "Topic not available." });
    }

    // Mark the topic as unavailable
    topic.available = false;

    // Update the topics in the JSON file
    try {
        updateTopics(topics);
    } catch (err) {
        console.error("Error updating topics:", err);
        return res.status(500).json({ success: false, message: "Error updating topic availability." });
    }

    // Read the current responses
    let responses = getResponses();

    // Add the new response to the array
    const newResponse = {
        teamName,
        member1,
        member2,
        member3,
        member4,
        member5,
        member6: member6 || "",
        topicNumber,
    };
    responses.push(newResponse);

    // Write the updated responses back to the JSON file
    try {
        updateResponses(responses);
        console.log("Data saved to responses.json.");

        // Commit and push the updated file to GitHub
        // await commitAndPushToGitHub();

        res.json({ success: true, message: `Topic ${topicNumber} selected successfully.` });
    } catch (err) {
        console.error("Error writing to responses file:", err);

        // Rollback topic availability if saving response fails
        topics = getTopics();
        topic.available = true;
        updateTopics(topics);

        return res.status(500).json({ success: false, message: "Error saving data to responses file." });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});



