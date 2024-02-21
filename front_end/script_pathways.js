var targetWord = '';
var stepsTaken = 0;
var gameIsActive = true;


document.getElementById('start-new-game').addEventListener('click', () => {
    initializeGame();
});

function initializeGame() {
    const wordList = [
        "happy", "difficult", "prove", "testify", 
        "secret", "huge", "small", "sad", "investigate",
        "throw", "adventure", "create", "read", "imaginative"
    ];
    const startWord = wordList[Math.floor(Math.random() * wordList.length)];
    document.getElementById('start-word').textContent = startWord;

    // Fetch the similar words for the start word
    fetchSimilarWords(startWord, (similarWords) => {
        // From the similar words, pick a random word to proceed
        const nextWord = chooseRandomWord(similarWords);
        console.log(nextWord)
        // Fetch the similar words for the next word
        fetchSimilarWords(startWord, (similarWords) => {
            // From the similar words, pick a random word to proceed
            const nextnextWord = chooseRandomWord(similarWords);
            console.log(nextnextWord)
            // Fetch the similar words for the next word
            fetchSimilarWords(nextnextWord, (nextSimilarWords) => {
                // Again, pick a random word from this new list
                const finalWord = chooseRandomWord(nextSimilarWords);
                console.log(finalWord)
                // Fetch the similar words for the final word to choose the target word
                fetchSimilarWords(finalWord, (finalSimilarWords) => {
                    // Choose the target word from the final list
                    targetWord = chooseRandomWord(finalSimilarWords);
                    console.log("Initialized Target Word:", targetWord);
                    // Display the target word on the page
                    document.getElementById('target-word').textContent = targetWord;

                    // Now that we have both start and target words, display the initial graph for the start word
                    displayGraphForWord(startWord, targetWord);
                });
            });
        });
    });
}

function fetchSimilarWords(word, callback) {
    fetch('/get_graph', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: word }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (!Array.isArray(data.similar_words)) {
            console.error('Received data is not an array:', data);
            showPopup('Invalid data format received from server. That word is not in the dictionary.');
            return;
        }
        console.log(data)
        // Process the data to extract just the words for the callback
        const words = data.similar_words.map(item => item[0]);
        callback(words);
        console.log(words)
    })
    .catch(error => {
        console.error('Error fetching similar words:', error);
        // Optionally, show this error in the UI as well
    });
}

function chooseRandomWord(words) {
    // Select a random word from the array
    const index = Math.floor(Math.random() * words.length);
    return words[index];
}

function displayGraphForWord(startWord, targetWord, gameIsActive) { //Akin to the submit action
    fetch('/get_graph', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: startWord }),
    })
    .then(response => response.json())
    .then(data => {
        if (!Array.isArray(data.similar_words)) {
            console.error('Received data is not an array:', data);
            showPopup('Invalid data format received from server. That word is not in the dictionary.');
            return;
        }

        currentGraphData.similarWords = data.similar_words.map(d => ({
            word: d[0],
            similarity: d[1]
        }));
        currentGraphData.sourceWord = startWord;

        displayGraph(currentGraphData.similarWords, startWord, targetWord);
    })
    .catch(error => {
        console.error('Error:', error);
        showPopup('Failed to load data. Please try again.');
    });
}

let simulation; 
var currentGraphData = { similarWords: [], sourceWord: '', nodes: [], links: [] };
let isSimulationLoaded = false;


function displayGraph(similarWords, sourceWord, targetWord, gameIsActive) {
    d3.select('#svg-container').selectAll("*").remove();

    // Update currentGraphData with the new similar words and source word
    currentGraphData.similarWords = similarWords;
    currentGraphData.sourceWord = sourceWord;

    // Filter out the source word and map to nodes format
    currentGraphData.nodes = similarWords.filter(d => d.word !== sourceWord)
                                         .map(d => ({ id: d.word }));
    currentGraphData.nodes.unshift({ id: sourceWord }); // Add sourceWord as the first node

    currentGraphData.links = similarWords.map(d => ({
        source: sourceWord,
        target: d.word,
        value: d.similarity
    }));

    // Set up graph dimensions
    var width = document.getElementById('svg-container').clientWidth;
    var height = document.getElementById('svg-container').clientHeight;

    var svg = d3.select('#svg-container').append('svg')
                .attr('width', width) 
                .attr('height', height); 


    // Initialize
    simulation = d3.forceSimulation(currentGraphData.nodes)
                   .force("link", d3.forceLink(currentGraphData.links)
                        .id(d => d.id)
                        .distance(d => {
                              return calculateDistance(d.value);
                        }))
                   .force("charge", d3.forceManyBody().strength(-300))
                   .force("center", d3.forceCenter(width / 2, height / 2));

    // Create links
    var link = svg.append("g")
                  .attr("class", "links")
                  .selectAll("line")
                  .data(currentGraphData.links)
                  .enter().append("line")
                  .style("stroke", "#aaa")
                  .style("stroke-width", 3)
    // Custom color scale - based on link distance
    var colorScale = d3.scaleLinear()
        .domain([d3.min(currentGraphData.links, d => calculateDistance(d.value)), d3.max(currentGraphData.links, d => calculateDistance(d.value))])
        .range(["#89CFF0", "#f5f5dc"]);

    colorScale.domain([d3.min(currentGraphData.links, d => calculateDistance(d.value)), d3.max(currentGraphData.links, d => calculateDistance(d.value))]);

    // Create and style the nodes with dynamic coloring based on distance
    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(currentGraphData.nodes)
        .enter().append("circle")
        .attr("r", 30)
       
        .attr("stroke", d => {
            if (d.id === currentGraphData.sourceWord) return "black"; // Start word
            if (d.id === targetWord) return "black"; // Target word after game ends
            return "none";
        })
        .attr("stroke-width", d => {
            if (d.id === currentGraphData.sourceWord || (d.id === targetWord)) return 2;
            return 0;
        })
        .style("fill", function(d) {
            // Calculate the average distance of links for this node
            let links = currentGraphData.links.filter(link => link.source.id === d.id || link.target.id === d.id);
            let averageDistance = d3.mean(links, link => calculateDistance(link.value));
            return colorScale(averageDistance);
        })
      .each(function(d) {
          var currentWord = d.id;
        d3.select(this).on('click', async function() {
            if (!isSimulationLoaded) {
                showPopup('Simulation is still loading. Please wait.'); 
                return;
            }
            console.log("Target word at the time a node is clicked, before passing to fetchAndDisplaySimilarWords from displayGraph: ", targetWord);
            await fetchAndDisplaySimilarWords(svg, currentGraphData.nodes, currentWord, targetWord);
            console.log("TWord after fetchAndDisplaySimilarWords is called in the display graph", targetWord);
        });
      });
      node.call(drag(simulation, svg));

    // Create labels
    var label = svg.append("g")
                   .attr("class", "labels")
                   .selectAll("text")
                   .data(currentGraphData.nodes)
                   .enter().append("text")
                   .text(function(d) { return d.id; })
                   .style("text-anchor", "middle")
                   .style("alignment-baseline", "central")
                   .style("font-size", "11px")
                   .style("font-family", "Times New Roman")
                   .style("fill", "#333");

    simulation.on("tick", function() {
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        label.attr("x", function(d) { return d.x; })
             .attr("y", function(d) { return d.y; });


        // Calculate new bounds based on node positions
        var maxX = d3.max(currentGraphData.nodes, d => d.x + 30);
        var maxY = d3.max(currentGraphData.nodes, d => d.y + 30);

        // Update SVG size if needed
        if (svg.attr('width') < maxX) svg.attr('width', maxX + 45);
        if (svg.attr('height') < maxY) svg.attr('height', maxY + 45);
    }).on("end", function() {
            isSimulationLoaded = true;
            document.getElementById('loadingIndicator').style.backgroundColor = 'green';
        });

}


function fetchAndDisplaySimilarWords(svg, nodes, clickedWord) {
    // Prevent further actions if the game is over
    if (!gameIsActive) {
        showPopup('You have already reached the target word! Click the button to start a new game');
        return;
    }

    isSimulationLoaded = false;
    document.getElementById('loadingIndicator').style.backgroundColor = 'red';

    fetch('/get_graph', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: clickedWord }),
    })
    .then(response => response.json())
    .then(data => {
        if (!data || !Array.isArray(data.similar_words)) {
            console.error('Received data is not in expected format:', data);
            return;
        }

        // Check if the clicked word is the target word
        if (clickedWord === targetWord) {
            gameIsActive = false; // Stop the game
            // Display a message to the user indicating the game is over
            showPopup('Congratulations! You have reached the target word in ' + stepsTaken + ' steps. Click the button to start a new game.');
            document.getElementById('loadingIndicator').style.backgroundColor = 'green';
            return; // Stop execution to prevent further actions
        }

        stepsTaken++; // Increment steps for each valid click
        document.getElementById('steps-counter').textContent = stepsTaken.toString();
        // Process new words and update currentGraphData
        data.similar_words.forEach(d => {
            const word = d[0];
            const similarity = d[1];
            if (!currentGraphData.similarWords.some(sw => sw.word === word)) {
                currentGraphData.similarWords.push({ word: word, similarity: similarity });
                currentGraphData.nodes.push({ id: word });
                currentGraphData.links.push({ source: clickedWord, target: word, value: similarity });
            }
        });

        updateGraph(svg, currentGraphData, clickedWord);
    })
    .catch(error => {
        console.error('Error:', error);
        // Optionally, update UI to reflect the error state
        showPopup('Failed to fetch similar words. Please try again.');
        document.getElementById('loadingIndicator').style.backgroundColor = 'red';
    });
}



function updateGraph(svg, currentGraphData, clickedWord) {
    // Clear existing SVG elements
    svg.selectAll("*").remove();

    // Initialize nodes with position for new nodes, if not already set
    currentGraphData.nodes.forEach(node => {
        if (isNaN(node.x) || isNaN(node.y)) {
            node.x = Math.random() * svg.attr('width');
            node.y = Math.random() * svg.attr('height');
        }
    });

    // Update links for d3 force simulation
    currentGraphData.links.forEach(link => {
        if (typeof link.source === "string") {
            link.source = currentGraphData.nodes.find(node => node.id === link.source);
        }
        if (typeof link.target === "string") {
            link.target = currentGraphData.nodes.find(node => node.id === link.target);
        }
    });

    // Create links
    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(currentGraphData.links)
        .enter().append("line")
        .style("stroke", "#aaa")
        .style("stroke-width", d => 2);

    // Custom color scale for node fill based on link value
    var colorScale = d3.scaleLinear()
        .domain([d3.min(currentGraphData.links, d => d.value), d3.max(currentGraphData.links, d => d.value)])
        .range(["#89CFF0", "#f5f5dc"]);

    // Create and style the nodes
    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(currentGraphData.nodes)
        .enter().append("circle")
        .attr("r", 30)
        .attr("stroke", d => {
            if (d.id === currentGraphData.sourceWord || d.id === targetWord) return "black"; // Outline start and target words
            return "none";
        })
        .attr("stroke-width", d => {
            if (d.id === currentGraphData.sourceWord || d.id === targetWord) return 2;
            return 0;
        })
        .style("fill", d => colorScale(d3.mean(currentGraphData.links.filter(link => link.source.id === d.id || link.target.id === d.id), link => link.value)));

        node.each(function(d) {
        var currentWord = d.id;
        d3.select(this).on('click', function() {
            if (!isSimulationLoaded || !gameIsActive) {
                console.warn('Simulation is still loading or game is over. Please wait.');
                return;
            }

            fetchAndDisplaySimilarWords(svg, currentGraphData.nodes, currentWord);
        });
    });

    // Apply drag behavior to nodes
    node.call(drag(simulation, svg));

    // Create labels for nodes
    var label = svg.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(currentGraphData.nodes)
        .enter().append("text")
        .text(d => d.id)
        .style("text-anchor", "middle")
        .style("alignment-baseline", "central")
        .style("font-size", "11px")
        .style("font-family", "Arial, sans-serif")
        .style("fill", "#333");

    
    
    simulation.force("link")
        .links(currentGraphData.links)
        .distance(d => calculateDistance(d.value));
    simulation.force("charge", d3.forceManyBody().strength(-80));
    simulation.force("center", d3.forceCenter(svg.attr('width') / 2, svg.attr('height') / 2));
    simulation.force("collide", d3.forceCollide().radius(20).iterations(3));

    simulation.nodes(currentGraphData.nodes);
    simulation.alpha(1).restart();

    // Update positions on each simulation tick
    simulation.on("tick", function() {
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        label.attr("x", function(d) { return d.x; })
             .attr("y", function(d) { return d.y; });

             
        // Calculate new bounds based on node positions
        var maxX = d3.max(currentGraphData.nodes, d => d.x + 30);
        var maxY = d3.max(currentGraphData.nodes, d => d.y + 30);

        // Update SVG size if needed
        if (svg.attr('width') < maxX) svg.attr('width', maxX + 50);
        if (svg.attr('height') < maxY) svg.attr('height', maxY + 50);
        console.log(`svg.attr('width') = ${svg.attr('width')}`);
        }).on("end", function() {
            isSimulationLoaded = true;
            document.getElementById('loadingIndicator').style.backgroundColor = 'green';
        });

        console.log("Graph update complete");
}


function calculateDistance(similarity){
    // console.log(`similarity = ${similarity}`);
    var calculatedDistance = (27.5163)/(-8.30189 + 10.8555*similarity) + 76.9605 + 50;

    // console.log(`calculatedDistance = ${calculatedDistance}`);
    if (calculatedDistance < 100) {
        calculatedDistance = 100;
    }
    if (calculatedDistance > 180) {
        calculatedDistance = 180;
    }
    return calculatedDistance;
}

function drag(simulation, svg) {
    let draggeder = false;
    function dragstarted(event) {
            draggeder = false;

        if (!event.active) simulation.alphaTarget(0.4).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
        event.sourceEvent.stopPropagation(); 
    }

    function dragged(event) {
        draggeder = true;

        event.subject.fx = event.x;
        event.subject.fy = event.y;
        event.sourceEvent.stopPropagation();
    }

    function dragended(event) {

        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;

        if (!draggeder) {
            // console.log("Node clicked", event.subject);
            fetchAndDisplaySimilarWords(svg, currentGraphData.nodes, event.subject.id);
        } else {
            // The node was dragged
            // console.log("Node dragged", event.subject);
        }

        event.sourceEvent.stopPropagation();
        simulation.restart();
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

function showError(message) {
    const errorMessageDiv = document.getElementById('error-message');
    errorMessageDiv.textContent = message; 
    errorMessageDiv.style.display = 'block'; 
}

function hideError() {
    document.getElementById('error-message').style.display = 'none'; // Hide the error div
}

function showPopup(message) {
    const popup = document.getElementById('info-popup') || createPopupElement();
    popup.textContent = message;
    popup.classList.add('fade-in');
    popup.style.display = 'block';
    setTimeout(() => {
        popup.classList.remove('fade-in');
        popup.classList.add('fade-out');
    }, 2000); 
    setTimeout(() => {
        popup.style.display = 'none';
        popup.classList.remove('fade-out');
    }, 2500); 
}

function createPopupElement() {
    const popup = document.createElement('div');
    popup.id = 'info-popup';
    document.body.appendChild(popup);
    return popup;
}
