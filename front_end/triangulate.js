document.addEventListener("DOMContentLoaded", function() {
    const startButton = document.getElementById("start-new-game");
    startButton.addEventListener("click", async () => {
        // Initialize arrays to collect words and their weights
        const words = [];
        const weights = [];

        // Adjust the limit to 12 to match the updated dynamic fields
        for (let i = 1; i <= 12; i++) {
            const wordInput = document.getElementById(`word${i}`);
            const weightInput = document.getElementById(`word${i}-weight`);
            
            // Collect words and weights only if the word input is not empty
            if (wordInput && wordInput.value.trim() !== "") {
                words.push(wordInput.value.trim());
                // Default to a weight of 5 if for some reason the weight input is missing or invalid
                weights.push(weightInput ? parseInt(weightInput.value, 10) : 5);
            }
        }

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

function displayResults(words) {
    const resultsContainer = document.getElementById("svg-container");
    resultsContainer.innerHTML = ""; // Clear previous results
    const list = document.createElement("ul");

    if (Array.isArray(words)) {
        words.forEach(word => {
            const item = document.createElement("li");
            item.textContent = word;
            list.appendChild(item);
        });
    } else {
        console.error("Expected an array of words, but did not receive one.");
    }
    resultsContainer.appendChild(list);
}
