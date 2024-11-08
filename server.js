


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

// Now you can resolve the path to your GitHub repository


const app = express();
const PORT = 3000;

// Set up Git
const git = simpleGit();
const repoPath = "IOT-data";// Make sure this is the correct path to your repo
const filePath = "responses.json";
// This should be the correct path to your responses.json
// Path to your local clone of the GitHub repository
console.log("File path:", filePath);

const githubToken = "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"; // GitHub token for pushing to your repo
const repoName = "IOT-data"; // GitHub repository name // Path to responses.json file in your repo

app.use(cors({
    origin: 'http://iot-project.sytes.net:8080', // Replace with your frontend URL
    methods: ['GET', 'POST'],
}));

app.use(bodyParser.json());

// Initialize the JSON files
const jsonFilePath = "responses.json";
const topicsFilePath = "topics.json";

// Reset both JSON files when the server starts
function resetFiles() {
    // Check if responses.json exists, if not create it
    if (!fs.existsSync(jsonFilePath)) {
        fs.writeFileSync(jsonFilePath, JSON.stringify([]), "utf-8");
        console.log("responses.json file created.");
    }

    // Check if topics.json exists, if not create it
    if (!fs.existsSync(topicsFilePath)) {
        const initialTopics = Array.from({ length: 200 }, (_, i) => ({ number: i + 1, available: true }));
        fs.writeFileSync(topicsFilePath, JSON.stringify(initialTopics, null, 2), "utf-8");
        console.log("topics.json file created.");
    }
}

// Reset files on server startup
resetFiles();

// Read topics from the topics.json file
function getTopics() {
    return JSON.parse(fs.readFileSync(topicsFilePath, "utf-8"));
}

// Write topics to the topics.json file
function updateTopics(topics) {
    fs.writeFileSync(topicsFilePath, JSON.stringify(topics, null, 2), "utf-8");
}

// Read responses from the responses.json file
function getResponses() {
    return JSON.parse(fs.readFileSync(jsonFilePath, "utf-8"));
}

// Write responses to the responses.json file
function updateResponses(responses) {
    fs.writeFileSync(jsonFilePath, JSON.stringify(responses, null, 2), "utf-8");
}

// Function to commit and push changes to GitHub
const commitAndPushToGitHub = async () => {
    try {
        // Stage the changes
        await git.add(filePath);
        await git.commit("Update responses.json");
        await git.push('https://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@github.com/miit-daga/IOT-data.git', 'main');
        // Replace 'main' with your branch if different
        console.log("Changes pushed to GitHub.");
    } catch (error) {
        console.error("Error committing and pushing changes:", error);
    }
};

// Endpoint to get available topics
app.get("/api/topics", (req, res) => {
    const topics = getTopics();
    const availableTopics = topics.filter((topic) => topic.available);
    res.json(availableTopics);
});

// Endpoint to select a topic
app.post("/api/select-topic", async (req, res) => {
    const { teamName, member1, member2, member3, member4, member5, member6, topicNumber } = req.body;

    // Validate input
    if (!teamName || !member1 || !member2 || !member3 || !member4 || !member5 || !topicNumber) {
        return res.status(400).json({ success: false, message: "Required fields are missing." });
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
        await commitAndPushToGitHub();

        res.json({ success: true, message: `Topic ${topicNumber} selected successfully.` });
    } catch (err) {
        console.error("Error writing to responses file:", err);

        // Rollback topic availability if saving response fails
        topics = getTopics(); // Reload topics to their original state
        topic.available = true; // Revert the topic to available
        updateTopics(topics);

        return res.status(500).json({ success: false, message: "Error saving data to responses file." });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});



