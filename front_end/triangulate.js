document.addEventListener("DOMContentLoaded", function() {
    const startButton = document.getElementById("start-new-game");
    startButton.addEventListener("click", async () => {
        // Collect non-empty word inputs
        const words = [];
        for (let i = 1; i <= 8; i++) {
            const wordInput = document.getElementById(`word${i}`);
            if (wordInput && wordInput.value.trim() !== "") {
                words.push(wordInput.value.trim());
            }
        }

        // Show loading indicator (assuming you have one)
        const loadingIndicator = document.getElementById("loadingIndicator");
        if (loadingIndicator) loadingIndicator.style.display = 'block';

        // Send non-empty words to the Flask backend
        try {
            const response = await fetch('/triangulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ words }),
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

    // Ensure 'words' is treated as an array
    if (Array.isArray(words)) {
        words.forEach(word => {
            const item = document.createElement("li");
            item.textContent = word;
            list.appendChild(item);
        });
    } else {
        console.error("Expected an array of words, but did not receive one.");
        console.log(data);
    }
    resultsContainer.appendChild(list);
}
