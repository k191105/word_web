
let words = [];
let weights = [];

document.addEventListener("DOMContentLoaded", function() {
    const startButton = document.getElementById("start-new-game");
    startButton.addEventListener("click", async () => {
        // Reset words and weights for each new triangulation attempt
        words = [];
        weights = [];

        // Adjust the limit to 12 to match the updated dynamic fields
        for (let i = 1; i <= 5; i++) {
            const wordInput = document.getElementById(`word${i}`);
            const weightInput = document.getElementById(`word${i}-weight`);
            
            // Collect words and weights only if the word input is not empty
            if (wordInput && wordInput.value.trim() !== "") {
                words.push(wordInput.value.trim());
                // Default to a weight of 5 if for some reason the weight input is missing or invalid
                weights.push(weightInput ? parseInt(weightInput.value, 10) : 5);
            }
        }

        console.log(words)

        // Show loading indicator
        const loadingIndicator = document.getElementById("loadingIndicator");
        if (loadingIndicator) loadingIndicator.style.display = 'block';

        // Send words and their weights to the Flask backend
        try {
            const response = await fetch('/triangulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ words, weights }), // Send both words and weights
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            displayResults(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    });
});

function displayResults(data) {
    console.log(data)
    const resultsContainer = document.getElementById("svg-container");
    
    resultsContainer.innerHTML = ""; // Clear previous results
    // Column Titles
    const titleContainer = document.createElement("div");
    titleContainer.className = "flex justify-between items-center border-b border-grey-400 py-4 px-4";

    const wordTitle = document.createElement("span");
    wordTitle.textContent = "Word";
    wordTitle.className = "font-bold";
    titleContainer.appendChild(wordTitle);

    const actionTitle = document.createElement("span");
    actionTitle.textContent = "Getting close? Click to further steer triangulation.";
    actionTitle.className = "font-bold mr-6";
    titleContainer.appendChild(actionTitle);

    resultsContainer.appendChild(titleContainer);


    data.forEach(word => {
        const item = document.createElement("div");
        item.className = "flex justify-between items-center border-b py-2 px-4";

        const wordText = document.createElement("span");
        wordText.textContent = word;
        item.appendChild(wordText);

        const feedbackContainer = document.createElement("div");
        feedbackContainer.className = "ml-2 px-4 py-1 bg-cyan-100 text-black font-bold py-2 px-4 rounded";


        // const bt = document.createElement("text");
        // bt.textContent = "Rerun Calculations: ";
        // bt.className = "font-bold";
        // feedbackContainer.appendChild(bt);
        // "This is close" Button
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "This is somewhat close - refine results";
        closeBtn.className = "ml-6 px-4 py-1 bg-blue-400 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded";
        closeBtn.onclick = () => handleFeedback(word, 120);
        feedbackContainer.appendChild(closeBtn);

        // "This is very close" Button
        const veryCloseBtn = document.createElement("button");
        veryCloseBtn.textContent = "This is very close - focus triangulation";
        veryCloseBtn.className = "ml-2 px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded";
        veryCloseBtn.onclick = () => handleFeedback(word, 240);
        feedbackContainer.appendChild(veryCloseBtn);

        item.appendChild(feedbackContainer);

        resultsContainer.appendChild(item);
    });
}
async function handleFeedback(selectedWord, weight) {
    console.log(words, weights); // Debugging line to check the status of arrays

    // Add the selected word with the new weight to your lists
    words.push(selectedWord);
    weights.push(weight);

    // Optionally clear previous results
    document.getElementById("svg-container").innerHTML = "";

    // Show loading indicator
    const loadingIndicator = document.getElementById("loadingIndicator");
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    // Resend words and their weights to the Flask backend for rerun
    try {
        const response = await fetch('/triangulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ words, weights }), 
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displayResults(data); // Display the new results
    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}
