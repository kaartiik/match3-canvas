// The function gets called when the window is fully loaded
window.onload = function () {
  // Get the canvas and context
  var canvas = document.getElementById('viewport');
  var context = canvas.getContext('2d');

  // Timing and frames per second
  var lastframe = 0;

  var timerCountdown = 0;

  // Mouse dragging
  var drag = false;

  // Level object
  var level = {
    x: (1.5 / 10) * canvas.width, // X position
    y: (3.8 / 10) * canvas.height, // Y position
    columns: 5, // Number of tile columns
    rows: 5, // Number of tile rows
    tilewidth: (1.2 / 10) * canvas.width, // Visual width of a tile
    tileheight: (1.2 / 10) * canvas.width, // Visual height of a tile
    tiles: [], // The two-dimensional tile array
    selectedtile: { selected: false, column: 0, row: 0 },
  };

  var tileImg1 = new Image();
  var tileImg2 = new Image();
  var tileImg3 = new Image();
  var tileImg4 = new Image();
  var tileImg5 = new Image();

  tileImg1.src = 'images/darryl.png';
  tileImg2.src = 'images/elliot.png';
  tileImg3.src = 'images/jasmine.png';
  tileImg4.src = 'images/jonathan.png';
  tileImg5.src = 'images/julia.png';

  var tileImages = [tileImg1, tileImg2, tileImg3, tileImg4, tileImg5];

  // Clusters and moves that were found
  var clusters = []; // { column, row, length, horizontal }
  var moves = []; // { column1, row1, column2, row2 }

  // Current move
  var currentmove = { column1: 0, row1: 0, column2: 0, row2: 0 };

  // Game states
  var gamestates = { init: 0, ready: 1, resolve: 2 };
  var gamestate = gamestates.init;

  // Score
  var score = 0;

  // Animation variables
  var animationstate = 0;
  var animationtime = 0;
  var animationtimetotal = 0.3;

  // Show available moves
  var showmoves = false;

  // Game Over
  var gameover = false;

  // Gui buttons
  var buttons = [
    {
      x: (2.4 / 10) * canvas.width,
      y: (7 / 10) * canvas.height,
      width: (4 / 10) * canvas.width,
      height: (0.4 / 10) * canvas.height,
      text: 'New Game',
    },
  ];

  // Initialize the game
  function init() {
    // Add mouse events
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseout', onMouseOut);

    // Initialize the two-dimensional tile array
    for (var i = 0; i < level.columns; i++) {
      level.tiles[i] = [];
      for (var j = 0; j < level.rows; j++) {
        // Define a tile type and a shift parameter for animation
        level.tiles[i][j] = { type: 0, shift: 0 };
      }
    }

    // New game
    newGame();

    // Enter main loop
    main(0);
  }

  // Main loop
  function main(tframe) {
    // Request animation frames
    window.requestAnimationFrame(main);

    // Update and render the game
    update(tframe);
    render();
  }

  // Update the game state
  function update(tframe) {
    var dt = (tframe - lastframe) / 1000;
    lastframe = tframe;

    if (gamestate == gamestates.ready) {
      // Game is ready for player input

      // Check for game over
      if (moves.length <= 0) {
        gameover = true;
      }
    } else if (gamestate == gamestates.resolve) {
      // Game is busy resolving and animating clusters
      animationtime += dt;

      if (animationstate == 0) {
        // Clusters need to be found and removed
        if (animationtime > animationtimetotal) {
          // Find clusters
          findClusters();

          if (clusters.length > 0) {
            // Add points to the score
            for (var i = 0; i < clusters.length; i++) {
              // Add extra points for longer clusters
              score += 1 * (clusters[i].length - 2);
            }

            // Clusters found, remove them
            removeClusters();

            // Tiles need to be shifted
            animationstate = 1;
          } else {
            // No clusters found, animation complete
            gamestate = gamestates.ready;
          }
          animationtime = 0;
        }
      } else if (animationstate == 1) {
        // Tiles need to be shifted
        if (animationtime > animationtimetotal) {
          // Shift tiles
          shiftTiles();

          // New clusters need to be found
          animationstate = 0;
          animationtime = 0;

          // Check if there are new clusters
          findClusters();
          if (clusters.length <= 0) {
            // Animation complete
            gamestate = gamestates.ready;
          }
        }
      } else if (animationstate == 2) {
        // Swapping tiles animation
        if (animationtime > animationtimetotal) {
          // Swap the tiles
          swap(
            currentmove.column1,
            currentmove.row1,
            currentmove.column2,
            currentmove.row2
          );

          // Check if the swap made a cluster
          findClusters();
          if (clusters.length > 0) {
            // Valid swap, found one or more clusters
            // Prepare animation states
            animationstate = 0;
            animationtime = 0;
            gamestate = gamestates.resolve;
          } else {
            // Invalid swap, Rewind swapping animation
            animationstate = 3;
            animationtime = 0;
          }

          // Update moves and clusters
          findMoves();
          findClusters();
        }
      } else if (animationstate == 3) {
        // Rewind swapping animation
        if (animationtime > animationtimetotal) {
          // Invalid swap, swap back
          swap(
            currentmove.column1,
            currentmove.row1,
            currentmove.column2,
            currentmove.row2
          );

          // Animation complete
          gamestate = gamestates.ready;
        }
      }

      // Update moves and clusters
      findMoves();
      findClusters();
    }
  }

  // Draw text that is centered
  function drawCenterText(text, x, y, width) {
    var textdim = context.measureText(text);
    context.fillText(text, x + (width - textdim.width) / 2, y);
  }

  function drawBG(patternCanvas, levelwidth, levelheight) {
    var space = context.createPattern(patternCanvas, 'repeat');
    context.fillStyle = space;
    context.fillRect(level.x - 4, level.y - 4, levelwidth + 8, levelheight + 8);
  }

  // Render the game
  function render() {
    // Draw the frame
    drawFrame();

    //Draw game image assets
    renderStaticImages();

    // Draw score
    var xPos = level.x * 1.7;
    var yPos = (6.5 / 10) * canvas.width;
    var fontWidth = 150;

    context.fillStyle = '#000000';
    context.font = '45px Verdana';
    drawCenterText('Score:', xPos, yPos, fontWidth);
    drawCenterText(score, xPos, yPos * 1.1, fontWidth);

    context.fillStyle = '#000000';
    context.font = '45px Verdana';
    drawCenterText('Time left:', xPos * 1.9, yPos, fontWidth);
    drawCenterText(timerCountdown + 's', xPos * 1.9, yPos * 1.1, fontWidth);

    // Draw buttons
    drawButtons();

    // Draw level background
    var levelwidth = level.columns * level.tilewidth;
    var levelheight = level.rows * level.tileheight;

    //Set tile repeating pattern
    // var gridBackground = new Image();
    // gridBackground.src = 'images/Tile 100x100.png';

    // var patt = document.createElement('canvas');
    // // set the resized width and height
    // patt.width = 53;
    // patt.height = 53;
    // patt
    //   .getContext('2d')
    //   .drawImage(gridBackground, 0, 0, patt.width, patt.height);

    // drawBG(patt, levelwidth, levelheight);

    // Render tiles
    renderTiles();

    // Render clusters
    renderClusters();

    // Render moves, when there are no clusters
    if (showmoves && clusters.length <= 0 && gamestate == gamestates.ready) {
      renderMoves();
    }

    // Game Over overlay
    if (gameover) {
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.fillRect(level.x, level.y, levelwidth, levelheight);

      context.fillStyle = '#ffffff';
      context.font = '24px Verdana';
      drawCenterText(
        'Game Over!',
        level.x,
        level.y + levelheight / 2 + 10,
        levelwidth
      );
    }
  }

  function timer() {
    var timeleft = 120;
    var downloadTimer = setInterval(function () {
      if (timeleft <= 0) {
        clearInterval(downloadTimer);
        gameover = true;
      } else {
        timerCountdown = timeleft;
      }
      timeleft -= 1;
    }, 1000);
  }

  function renderStaticImages() {
    var gameTitle = new Image();
    gameTitle.src = 'images/Banner 500 x 200.png';

    var gameTitleYPos = (0.5 / 10) * canvas.height;

    context.drawImage(
      gameTitle,
      level.x,
      gameTitleYPos,
      (6 / 10) * canvas.width,
      (1.5 / 10) * canvas.height
    );

    var starClockDimension = (2 / 10) * canvas.width;

    var gameStar = new Image();
    gameStar.src = 'images/star 100x100.png';

    context.drawImage(
      gameStar,
      level.x * 1.5,
      gameTitleYPos * 4,
      starClockDimension,
      starClockDimension
    );

    var gameClock = new Image();
    gameClock.src = 'images/timer 100 x100.png';

    context.drawImage(
      gameClock,
      level.x * 3,
      gameTitleYPos * 4,
      starClockDimension,
      starClockDimension
    );

    var gameMonster = new Image();
    gameMonster.src = 'images/Meep.png';

    context.drawImage(
      gameMonster,
      (5 / 10) * canvas.width,
      (8 / 10) * canvas.height,
      (5 / 10) * canvas.width,
      (4 / 10) * canvas.width
    );
  }

  // Draw a frame with a border
  function drawFrame() {
    // Draw background and a border
    context.fillStyle = '#d0d0d0';
    context.fillRect(0, 0, canvas.width, canvas.height);
    var background = new Image();
    background.src = 'images/Background 900x1600.png';
    context.drawImage(background, 0, 0, canvas.width, canvas.height);
  }

  // Draw buttons
  function drawButtons() {
    for (var i = 0; i < buttons.length; i++) {
      // Draw button shape
      context.fillStyle = '#000000';
      context.fillRect(
        buttons[i].x,
        buttons[i].y,
        buttons[i].width,
        buttons[i].height
      );

      // Draw button text
      context.fillStyle = '#ffffff';
      context.font = '38px Verdana';
      var textdim = context.measureText(buttons[i].text);
      context.fillText(
        buttons[i].text,
        buttons[i].x + (buttons[i].width - textdim.width) / 2,
        buttons[i].y + 50
      );
    }
  }

  // Render tiles
  function renderTiles() {
    for (var i = 0; i < level.columns; i++) {
      for (var j = 0; j < level.rows; j++) {
        // Get the shift of the tile for animation
        var shift = level.tiles[i][j].shift;

        // Calculate the tile coordinates
        var coord = getTileCoordinate(
          i,
          j,
          0,
          (animationtime / animationtimetotal) * shift
        );

        // Check if there is a tile present
        if (level.tiles[i][j].type >= 0) {
          // Get the color of the tile
          var tileImg = tileImages[level.tiles[i][j].type];

          // Draw the tile using the color
          drawTokenImage(coord.tilex, coord.tiley, tileImg);
        }

        // Draw the selected tile
        if (level.selectedtile.selected) {
          if (level.selectedtile.column == i && level.selectedtile.row == j) {
            // Draw a red tile
            drawHiglightedTile(coord.tilex, coord.tiley, 255, 0, 0);
          }
        }
      }
    }

    // Render the swap animation
    if (
      gamestate == gamestates.resolve &&
      (animationstate == 2 || animationstate == 3)
    ) {
      // Calculate the x and y shift
      var shiftx = currentmove.column2 - currentmove.column1;
      var shifty = currentmove.row2 - currentmove.row1;

      // First tile
      var coord1 = getTileCoordinate(
        currentmove.column1,
        currentmove.row1,
        0,
        0
      );
      var coord1shift = getTileCoordinate(
        currentmove.column1,
        currentmove.row1,
        (animationtime / animationtimetotal) * shiftx,
        (animationtime / animationtimetotal) * shifty
      );
      var col1 =
        tileImages[level.tiles[currentmove.column1][currentmove.row1].type];

      // Second tile
      var coord2 = getTileCoordinate(
        currentmove.column2,
        currentmove.row2,
        0,
        0
      );
      var coord2shift = getTileCoordinate(
        currentmove.column2,
        currentmove.row2,
        (animationtime / animationtimetotal) * -shiftx,
        (animationtime / animationtimetotal) * -shifty
      );
      var col2 =
        tileImages[level.tiles[currentmove.column2][currentmove.row2].type];

      // Draw a black background
      drawTile(coord1.tilex, coord1.tiley, 0, 0, 0);
      drawTile(coord2.tilex, coord2.tiley, 0, 0, 0);

      // Change the order, depending on the animation state
      if (animationstate == 2) {
        // Draw the tiles
        drawTokenImage(coord1shift.tilex, coord1shift.tiley, col1);

        drawTokenImage(coord2shift.tilex, coord2shift.tiley, col2);
      } else {
        // Draw the tiles
        drawTokenImage(coord2shift.tilex, coord2shift.tiley, col2);

        drawTokenImage(coord1shift.tilex, coord1shift.tiley, col1);
      }
    }
  }

  // Get the tile coordinate
  function getTileCoordinate(column, row, columnoffset, rowoffset) {
    var tilex = level.x + (column + columnoffset) * level.tilewidth;
    var tiley = level.y + (row + rowoffset) * level.tileheight;
    return { tilex: tilex, tiley: tiley };
  }

  // Draw a tile with a color
  function drawTile(x, y, r, g, b) {
    context.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    context.fillRect(x + 2, y + 2, level.tilewidth - 4, level.tileheight - 4);
  }

  //Highlight the selected tile
  function drawHiglightedTile(x, y, r, g, b) {
    context.strokeStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    context.lineWidth = 5;
    context.strokeRect(x + 2, y + 2, level.tilewidth - 3, level.tileheight - 4);
  }

  // Draw tile with token image
  function drawTokenImage(x, y, tileImg) {
    var gridBackground = new Image();
    gridBackground.src = 'images/Tile 100x100.png';

    context.drawImage(
      gridBackground,
      x,
      y,
      level.tilewidth + 5,
      level.tileheight + 5
    );

    context.drawImage(
      tileImg,
      x + 5,
      y + 5,
      level.tilewidth - 8,
      level.tileheight - 8
    );
  }

  // Render clusters
  function renderClusters() {
    for (var i = 0; i < clusters.length; i++) {
      // Calculate the tile coordinates
      var coord = getTileCoordinate(clusters[i].column, clusters[i].row, 0, 0);

      if (clusters[i].horizontal) {
        // Draw a horizontal line
        context.fillStyle = '#00ff00';
        context.fillRect(
          coord.tilex + level.tilewidth / 2,
          coord.tiley + level.tileheight / 2 - 4,
          (clusters[i].length - 1) * level.tilewidth,
          8
        );
      } else {
        // Draw a vertical line
        context.fillStyle = '#0000ff';
        context.fillRect(
          coord.tilex + level.tilewidth / 2 - 4,
          coord.tiley + level.tileheight / 2,
          8,
          (clusters[i].length - 1) * level.tileheight
        );
      }
    }
  }

  // Render moves
  function renderMoves() {
    for (var i = 0; i < moves.length; i++) {
      // Calculate coordinates of tile 1 and 2
      var coord1 = getTileCoordinate(moves[i].column1, moves[i].row1, 0, 0);
      var coord2 = getTileCoordinate(moves[i].column2, moves[i].row2, 0, 0);

      // Draw a line from tile 1 to tile 2
      context.strokeStyle = '#ff0000';
      context.beginPath();
      context.moveTo(
        coord1.tilex + level.tilewidth / 2,
        coord1.tiley + level.tileheight / 2
      );
      context.lineTo(
        coord2.tilex + level.tilewidth / 2,
        coord2.tiley + level.tileheight / 2
      );
      context.stroke();
    }
  }

  // Start a new game
  function newGame() {
    // Reset score
    score = 0;

    // Set the gamestate to ready
    gamestate = gamestates.ready;

    // Reset game over
    gameover = false;

    // Create the level
    createLevel();

    // Find initial clusters and moves
    findMoves();
    findClusters();
    timer();
  }

  // Create a random level
  function createLevel() {
    var done = false;

    // Keep generating levels until it is correct
    while (!done) {
      // Create a level with random tiles
      for (var i = 0; i < level.columns; i++) {
        for (var j = 0; j < level.rows; j++) {
          level.tiles[i][j].type = getRandomTile();
        }
      }

      // Resolve the clusters
      resolveClusters();

      // Check if there are valid moves
      findMoves();

      // Done when there is a valid move
      if (moves.length > 0) {
        done = true;
      }
    }
  }

  // Get a random tile
  function getRandomTile() {
    return Math.floor(Math.random() * tileImages.length);
  }

  // Remove clusters and insert tiles
  function resolveClusters() {
    // Check for clusters
    findClusters();

    // While there are clusters left
    while (clusters.length > 0) {
      // Remove clusters
      removeClusters();

      // Shift tiles
      shiftTiles();

      // Check if there are clusters left
      findClusters();
    }
  }

  // Find clusters in the level
  function findClusters() {
    // Reset clusters
    clusters = [];

    // Find horizontal clusters
    for (var j = 0; j < level.rows; j++) {
      // Start with a single tile, cluster of 1
      var matchlength = 1;
      for (var i = 0; i < level.columns; i++) {
        var checkcluster = false;

        if (i == level.columns - 1) {
          // Last tile
          checkcluster = true;
        } else {
          // Check the type of the next tile
          if (
            level.tiles[i][j].type == level.tiles[i + 1][j].type &&
            level.tiles[i][j].type != -1
          ) {
            // Same type as the previous tile, increase matchlength
            matchlength += 1;
          } else {
            // Different type
            checkcluster = true;
          }
        }

        // Check if there was a cluster
        if (checkcluster) {
          if (matchlength >= 3) {
            // Found a horizontal cluster. Column calculation is to identify starting tile of cluster
            clusters.push({
              column: i + 1 - matchlength,
              row: j,
              length: matchlength,
              horizontal: true,
            });
          }

          matchlength = 1;
        }
      }
    }

    // Find vertical clusters
    for (var i = 0; i < level.columns; i++) {
      // Start with a single tile, cluster of 1
      var matchlength = 1;
      for (var j = 0; j < level.rows; j++) {
        var checkcluster = false;

        if (j == level.rows - 1) {
          // Last tile
          checkcluster = true;
        } else {
          // Check the type of the next tile
          if (
            level.tiles[i][j].type == level.tiles[i][j + 1].type &&
            level.tiles[i][j].type != -1
          ) {
            // Same type as the previous tile, increase matchlength
            matchlength += 1;
          } else {
            // Different type
            checkcluster = true;
          }
        }

        // Check if there was a cluster
        if (checkcluster) {
          if (matchlength >= 3) {
            // Found a vertical cluster
            clusters.push({
              column: i,
              row: j + 1 - matchlength,
              length: matchlength,
              horizontal: false,
            });
          }

          matchlength = 1;
        }
      }
    }
  }

  // Find available moves
  function findMoves() {
    // Reset moves
    moves = [];

    // Check horizontal swaps
    for (var j = 0; j < level.rows; j++) {
      for (var i = 0; i < level.columns - 1; i++) {
        // Swap, find clusters and swap back
        swap(i, j, i + 1, j);
        findClusters();
        swap(i, j, i + 1, j);

        // Check if the swap made a cluster
        if (clusters.length > 0) {
          // Found a move
          moves.push({ column1: i, row1: j, column2: i + 1, row2: j });
        }
      }
    }

    // Check vertical swaps
    for (var i = 0; i < level.columns; i++) {
      for (var j = 0; j < level.rows - 1; j++) {
        // Swap, find clusters and swap back
        swap(i, j, i, j + 1);
        findClusters();
        swap(i, j, i, j + 1);

        // Check if the swap made a cluster
        if (clusters.length > 0) {
          // Found a move
          moves.push({ column1: i, row1: j, column2: i, row2: j + 1 });
        }
      }
    }

    // Reset clusters
    clusters = [];
  }

  // Loop over the cluster tiles and execute a function
  function loopClusters(func) {
    for (var i = 0; i < clusters.length; i++) {
      //  { column, row, length, horizontal }
      var cluster = clusters[i];
      var coffset = 0; //identify subsequent matching tiles in cluster sequence
      var roffset = 0; //identify subsequent matching tiles in cluster sequence
      for (var j = 0; j < cluster.length; j++) {
        func(i, cluster.column + coffset, cluster.row + roffset, cluster);

        if (cluster.horizontal) {
          coffset++;
        } else {
          roffset++;
        }
      }
    }
  }

  // Remove the clusters
  function removeClusters() {
    // Change the type of the tiles to -1, indicating a removed tile
    loopClusters(function (index, column, row, cluster) {
      level.tiles[column][row].type = -1;
    });

    // Calculate how much a tile should be shifted downwards
    for (var i = 0; i < level.columns; i++) {
      var shift = 0;
      for (var j = level.rows - 1; j >= 0; j--) {
        // Loop from bottom to top
        if (level.tiles[i][j].type == -1) {
          // Tile is removed, increase shift
          shift++;
          level.tiles[i][j].shift = 0;
        } else {
          // Set the shift
          level.tiles[i][j].shift = shift;
        }
      }
    }
  }

  // Shift tiles and insert new tiles
  function shiftTiles() {
    // Shift tiles
    for (var i = 0; i < level.columns; i++) {
      for (var j = level.rows - 1; j >= 0; j--) {
        // Loop from bottom to top
        if (level.tiles[i][j].type == -1) {
          // Insert new random tile
          level.tiles[i][j].type = getRandomTile();
        } else {
          // Swap tile to shift it
          var shift = level.tiles[i][j].shift;
          if (shift > 0) {
            swap(i, j, i, j + shift);
          }
        }

        // Reset shift
        level.tiles[i][j].shift = 0;
      }
    }
  }

  // Get the tile under the mouse
  function getMouseTile(pos) {
    // Calculate the index of the tile
    var tx = Math.floor((pos.x - level.x) / level.tilewidth);
    var ty = Math.floor((pos.y - level.y) / level.tileheight);

    // Check if the tile is valid
    if (tx >= 0 && tx < level.columns && ty >= 0 && ty < level.rows) {
      // Tile is valid
      return {
        valid: true,
        x: tx,
        y: ty,
      };
    }

    // No valid tile
    return {
      valid: false,
      x: 0,
      y: 0,
    };
  }

  // Check if two tiles can be swapped
  function canSwap(x1, y1, x2, y2) {
    // Check if the tile is a direct neighbor of the selected tile
    if (
      (Math.abs(x1 - x2) == 1 && y1 == y2) ||
      (Math.abs(y1 - y2) == 1 && x1 == x2)
    ) {
      return true;
    }

    return false;
  }

  // Swap two tiles in the level
  function swap(x1, y1, x2, y2) {
    var typeswap = level.tiles[x1][y1].type;
    level.tiles[x1][y1].type = level.tiles[x2][y2].type;
    level.tiles[x2][y2].type = typeswap;
  }

  // Swap two tiles as a player action
  function mouseSwap(c1, r1, c2, r2) {
    // Save the current move
    currentmove = { column1: c1, row1: r1, column2: c2, row2: r2 };

    // Deselect
    level.selectedtile.selected = false;

    // Start animation
    animationstate = 2;
    animationtime = 0;
    gamestate = gamestates.resolve;
  }

  // On mouse button click
  function onMouseDown(e) {
    // Get the mouse position
    var pos = getMousePos(canvas, e);

    // Start dragging
    if (!drag) {
      // Get the tile under the mouse
      mt = getMouseTile(pos);

      if (mt.valid) {
        // Valid tile
        var swapped = false;
        if (level.selectedtile.selected) {
          if (
            mt.x == level.selectedtile.column &&
            mt.y == level.selectedtile.row
          ) {
            // Same tile selected, deselect
            level.selectedtile.selected = false;
            drag = true;
            return;
          } else if (
            canSwap(
              mt.x,
              mt.y,
              level.selectedtile.column,
              level.selectedtile.row
            )
          ) {
            // Tiles can be swapped, swap the tiles
            mouseSwap(
              mt.x,
              mt.y,
              level.selectedtile.column,
              level.selectedtile.row
            );
            swapped = true;
          }
        }

        if (!swapped) {
          // Set the new selected tile
          level.selectedtile.column = mt.x;
          level.selectedtile.row = mt.y;
          level.selectedtile.selected = true;
        }
      } else {
        // Invalid tile
        level.selectedtile.selected = false;
      }

      // Start dragging
      drag = true;
    }

    // Check if a button was clicked
    for (var i = 0; i < buttons.length; i++) {
      if (
        pos.x >= buttons[i].x &&
        pos.x < buttons[i].x + buttons[i].width &&
        pos.y >= buttons[i].y &&
        pos.y < buttons[i].y + buttons[i].height
      ) {
        // Button i was clicked
        if (i == 0) {
          // New Game
          newGame();
        }
      }
    }
  }

  function onMouseUp(e) {
    // Reset dragging
    drag = false;
  }

  function onMouseOut(e) {
    // Reset dragging
    drag = false;
  }

  // Get the mouse position
  function getMousePos(canvas, e) {
    // Gets CSS pos, and width/height
    var rect = canvas.getBoundingClientRect();
    // Subtract the 'left' of the canvas
    // from the X/Y positions to make
    // (0,0) the top left of the canvas
    return {
      x: Math.round(
        ((e.clientX - rect.left) / (rect.right - rect.left)) * canvas.width
      ),
      y: Math.round(
        ((e.clientY - rect.top) / (rect.bottom - rect.top)) * canvas.height
      ),
    };
  }

  // Call init to start the game
  init();
};
