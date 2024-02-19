document.getElementById('submit-button').addEventListener('click', submitAction);

// Add keypress event listener to the input field
document.getElementById('word-input').addEventListener('keypress', function(event) {
    // Check if the key pressed is the Enter key
    if (event.keyCode === 13 || event.which === 13) {
        submitAction(); // Call the same function as the submit button click
    }
});

function submitAction() {
    var word = document.getElementById('word-input').value.toLowerCase().trim(); // Convert to lowercase right away
    fetch('/get_graph', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: word }),
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
        currentGraphData.sourceWord = word;

        displayGraph(currentGraphData.similarWords, word);
    })
    .catch(error => {
        console.error('Error:', error);
        showPopup('Failed to load data. Please try again.');
    });
}

let simulation; // Declare this at the top of your script
var currentGraphData = { similarWords: [], sourceWord: '', nodes: [], links: [] };
let isSimulationLoaded = false;


function displayGraph(similarWords, sourceWord) {
    // Clear the existing graph
    d3.select('#svg-container').selectAll("*").remove();

    // Update currentGraphData with the new similar words and source word
    currentGraphData.similarWords = similarWords;
    currentGraphData.sourceWord = sourceWord;

    // Filter out the source word and map to nodes format
    currentGraphData.nodes = similarWords.filter(d => d.word !== sourceWord)
                                         .map(d => ({ id: d.word }));
    currentGraphData.nodes.unshift({ id: sourceWord }); // Add sourceWord as the first node

    // Map similar words to links format
    currentGraphData.links = similarWords.map(d => ({
        source: sourceWord,
        target: d.word,
        value: d.similarity
    }));

    // Set up the graph dimensions
    var width = document.getElementById('graph-container').clientWidth;
    var height = document.getElementById('graph-container').clientHeight;

        // Initialize SVG with basic dimensions
    var svg = d3.select('#svg-container').append('svg')
                .attr('width', width) // Set an initial width
                .attr('height', height); // Set an initial height


    // Initialize the simulation with nodes and links
    simulation = d3.forceSimulation(currentGraphData.nodes)
                   .force("link", d3.forceLink(currentGraphData.links)
                        .id(d => d.id)
                        .distance(d => {
                              return calculateDistance(d.value);
                        }))
                   .force("charge", d3.forceManyBody().strength(-300))
                   .force("center", d3.forceCenter(width / 2, height / 2));

    // Create and style the links
    var link = svg.append("g")
                  .attr("class", "links")
                  .selectAll("line")
                  .data(currentGraphData.links)
                  .enter().append("line")
                  .style("stroke", "#aaa")
                  .style("stroke-width", 3)
    var clickedNode;
    // Define a color scale: closer nodes are blue, farther nodes are red
    var colorScale = d3.scaleLinear()
        .domain([d3.min(currentGraphData.links, d => calculateDistance(d.value)), d3.max(currentGraphData.links, d => calculateDistance(d.value))])
        .range(["#89CFF0", "#f5f5dc"]);

    // Update color scale domain based on new distances
    colorScale.domain([d3.min(currentGraphData.links, d => calculateDistance(d.value)), d3.max(currentGraphData.links, d => calculateDistance(d.value))]);

    // Create and style the nodes with dynamic coloring based on distance
    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(currentGraphData.nodes)
        .enter().append("circle")
        .attr("r", 30)
        .style("fill", function(d) {
            // Calculate the average distance of links for this node
            let links = currentGraphData.links.filter(link => link.source.id === d.id || link.target.id === d.id);
            let averageDistance = d3.mean(links, link => calculateDistance(link.value));
            return colorScale(averageDistance);
        })
      .each(function(d) {
          var currentWord = d.id;
          console.log('Node created for word:', currentWord);  // Debugging log
          d3.select(this).on('click', function() {
           if (!isSimulationLoaded) {
                showPopup('Simulation is still loading. Please wait.'); // Call showPopup here
                // ... rest of the code ...
            }
            fetchAndDisplaySimilarWords(svg, currentGraphData.nodes, currentWord);
        });
      });
      node.call(drag(simulation, svg));

    // Create and style the labels
    var label = svg.append("g")
                   .attr("class", "labels")
                   .selectAll("text")
                   .data(currentGraphData.nodes)
                   .enter().append("text")
                   .text(function(d) { return d.id; })
                   .style("text-anchor", "middle")
                   .style("alignment-baseline", "central")
                   .style("font-size", "12px")
                   .style("font-family", "Times New Roman")
                   .style("fill", "#333");

    // Define the tick behavior for the simulation
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

        // Update the graph with new nodes and links
        updateGraph(svg, currentGraphData, clickedWord);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function updateGraph(svg, currentGraphData, clickedWord) {
    // Clear existing SVG elements
    svg.selectAll("*").remove();

    // Initialize positions for new nodes
    currentGraphData.nodes.forEach(node => {
        if (isNaN(node.x) || isNaN(node.y)) {
            node.x = Math.random() * svg.attr('width');
            node.y = Math.random() * svg.attr('height');
        }
    });

    // Debugging: Log the nodes and links
    console.log("Nodes:", currentGraphData.nodes);
    console.log("Links:", currentGraphData.links);

    // Ensure links reference node objects
    currentGraphData.links.forEach(link => {
        if (typeof link.source === "string") {
            link.source = currentGraphData.nodes.find(node => node.id === link.source);
        }
        if (typeof link.target === "string") {
            link.target = currentGraphData.nodes.find(node => node.id === link.target);
        }
    });

    // Create and style the links
    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(currentGraphData.links)
        .enter().append("line")
        .style("stroke", "#aaa")
        .style("stroke-width", 3);

    var clickedNode;
    // Define a color scale: closer nodes are blue, farther nodes are red
    var colorScale = d3.scaleLinear()
        .domain([d3.min(currentGraphData.links, d => calculateDistance(d.value)), d3.max(currentGraphData.links, d => calculateDistance(d.value))])
        .range(["#89CFF0", "#f5f5dc"]);

    // Update color scale domain based on new distances
    colorScale.domain([d3.min(currentGraphData.links, d => calculateDistance(d.value)), d3.max(currentGraphData.links, d => calculateDistance(d.value))]);

    // Create and style the nodes with dynamic coloring based on distance
    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(currentGraphData.nodes)
        .enter().append("circle")
        .attr("r", 30)
        .style("fill", function(d) {
            // Calculate the average distance of links for this node
            let links = currentGraphData.links.filter(link => link.source.id === d.id || link.target.id === d.id);
            let averageDistance = d3.mean(links, link => calculateDistance(link.value));
            console.log(`color of node ${d.id} = ${colorScale(averageDistance)}` )
            return colorScale(averageDistance);
        })
        // Additional node setup...
        node.each(function(d) {
            var currentWord = d.id;
            d3.select(this).on('click', function(event) {
                if (!isSimulationLoaded) {
                    console.warn('Simulation is still loading. Please wait.');
                    return; // Exit the function early
                }

                // Debounce click event
                clickedNode = currentWord;
                setTimeout(function() {
                    if (clickedNode === currentWord) {
                        fetchAndDisplaySimilarWords(svg, currentGraphData.nodes, currentWord);
                    }
                }, 250); // Delay of 250 milliseconds
            });
        });
        node.call(drag(simulation, svg));

    // Create and style the labels
    var label = svg.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(currentGraphData.nodes)
        .enter().append("text")
        .text(function(d) { return d.id; })
        .style("text-anchor", "middle")
        .style("alignment-baseline", "central")
        .style("font-size", "12px")
        .style("font-family", "Times New Roman")
        .style("fill", "#333");


    console.log("Updating graph with new data", currentGraphData);
    simulation.force("link")
        .links(currentGraphData.links)
        .distance(d => calculateDistance(d.value));
    simulation.force("charge", d3.forceManyBody().strength(-80));
    simulation.force("center", d3.forceCenter(svg.attr('width') / 2, svg.attr('height') / 2));
    simulation.force("collide", d3.forceCollide().radius(20).iterations(3));

    simulation.nodes(currentGraphData.nodes);
    simulation.alpha(1).restart();


    // Define the tick behavior for the simulation
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
        if (svg.attr('width') < maxX) svg.attr('width', maxX + 30);
        if (svg.attr('height') < maxY) svg.attr('height', maxY + 30);
        console.log(`svg.attr('width') = ${svg.attr('width')}`);
        }).on("end", function() {
            isSimulationLoaded = true;
            document.getElementById('loadingIndicator').style.backgroundColor = 'green';
        });

        console.log("Graph update complete");
}

function calculateDistance(similarity){
    console.log(`similarity = ${similarity}`);
    var calculatedDistance = (27.5163)/(-8.30189 + 10.8555*similarity) + 76.9605 + 50;

    console.log(`calculatedDistance = ${calculatedDistance}`);
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
        event.sourceEvent.stopPropagation(); // Prevent event bubbling
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
            // The node was clicked, not dragged
            console.log("Node clicked", event.subject);
            fetchAndDisplaySimilarWords(svg, currentGraphData.nodes, event.subject.id);
        } else {
            // The node was dragged
            console.log("Node dragged", event.subject);
        }
        console.log("Node data after drag ends", event.subject);

        // Log data for all nodes
        simulation.nodes().forEach(node => {
            console.log("Node data", node);
        });

        console.log("Current Graph Data", currentGraphData);

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
    errorMessageDiv.textContent = message; // Set the error message
    errorMessageDiv.style.display = 'block'; // Make the div visible
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
    }, 2000); // This will fade out the message after 1.5 seconds
    setTimeout(() => {
        popup.style.display = 'none';
        popup.classList.remove('fade-out');
    }, 2500); // This will hide the message after it fades out
}

function createPopupElement() {
    const popup = document.createElement('div');
    popup.id = 'info-popup';
    document.body.appendChild(popup);
    return popup;
}
