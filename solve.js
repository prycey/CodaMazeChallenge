const fetch = require('node-fetch');
const PriorityQueue = require('./priority_queue.js').PriorityQueue;

function print_pretty(maze) {
    let ar = new Array(maze.width * maze.height);
    for (let i = 0; i < maze.width * maze.height; i++) {
        if (maze.tiles[i]) {
            let tile = maze.tiles[i];
            if (tile.wall) {
                ar[i] = 'X';
            }
            else if ('on_path' in tile) {
                ar[i] = 'c';
            }
            else if (tile.explored) {
                ar[i] = '_';
            }
            else {
                ar[i] = 'q';
            }
        }
        else {
            ar[i] = '*';
        }
    }
    for (let y = 0; y < maze.height; y++) {
        let str = "";
        for (let x = 0; x < maze.width; x++) {
            str += ar[y * maze.width + x];
        }
        console.log(str);
    }

    //console.log(maze.pq.ar);
    //console.log(maze.pq.map);
}

function tile_idx(maze, x, y) {
    return x + y * maze.width;
}

async function get_tile(maze, x, y) {
    let idx = tile_idx(maze, x, y);
    let tile;

    if (x < 0 || y < 0 || x >= maze.width || y >= maze.height) {
        return {
            x: x,
            y: y,
            wall: true
        };
    }
    if (maze.tiles[idx] === undefined) {
        while (true) {
            let tile_promise = fetch(`https://maze.coda.io/maze/${maze.id}/check?x=${x}&y=${y}`, {
                method: "GET"
            });
            let timeout_promise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('timeout')), 2000)
            });
            let res;
            try {
                res = await Promise.race([tile_promise, timeout_promise]);
            }
            catch {
                continue;
            }
            //console.log(`x: ${x}, y: ${y}: https://maze.coda.io/maze/${maze.id}/check?x=${x}&y=${y}`);
            //console.log(res);
            if (res.status === 200) {
                // valid, open position
                tile = {
                    x: x,
                    y: y,
                    wall: false,
                    explored: false,
                    min_dist: Number.MAX_SAFE_INTEGER,
                    heuristic: maze.width + maze.height - x - y,
                    prev_tile: -1
                };
                break;
            }
            else if (res.status === 403) {
                // either invalid or not open position
                tile = {
                    x: x,
                    y: y,
                    wall: true
                };
                break;
            }
            else {
                continue;
            }
        }
        maze.tiles[idx] = tile;
    }
    else {
        tile = maze.tiles[idx];
    }

    return tile;
}


function find_soln(maze) {
    let last_tile = maze.tiles[maze.tiles.length - 1];
    let soln = [];
    if (last_tile !== undefined && last_tile.explored) {
        // found a solution
        let idx = maze.tiles.length - 1;
        while (idx != -1) {
            soln.push(maze.tiles[idx]);
            maze.tiles[idx].on_path = true;
            idx = maze.tiles[idx].prev_tile;
        }
        //console.log("solution", soln);
        print_pretty(maze);

        let s = [];
        for (let i = soln.length - 1; i >= 0; i--) {
            s[soln.length - i - 1] = {
                x: soln[i].x,
                y: soln[i].y
            };
        }

        let cb = function(res) {
            //console.log("res: ", res);
            if (res.status === 200) {
                console.log("valid!");
            }
            else if (res === 403) {
                console.log("INVALID");
            }
            else {
                fetch(`https://maze.coda.io/maze/${maze.id}/solve`, {
                    method: "POST",
                    body: JSON.stringify(s)
                }).then(cb);
            }
        }

        fetch(`https://maze.coda.io/maze/${maze.id}/solve`, {
            method: "POST",
            body: JSON.stringify(s)
        }).then(cb);
    }
    else {
        let cb = function(res) {
            console.log("res: ", res);
            if (res.status === 200) {
                console.log("valid!");
            }
            else if (res.status === 422) {
                console.log("INVALID");
            }
            else {
                fetch(`https://maze.coda.io/maze/${maze.id}/solve`, {
                    method: "POST",
                    body: JSON.stringify([])
                }).then(cb);
            }
        }
        console.log("no solution");
        fetch(`https://maze.coda.io/maze/${maze.id}/solve`, {
            method: "POST",
            body: JSON.stringify([])
        }).then(cb);
    }
}


function discover_next_tile(maze) {
    let pq = maze.pq;
    if (!pq.isEmpty()) {
        let node = pq.pop();
        node.explored = true;

        let x = node.x;
        let y = node.y;
        if (x == maze.width - 1 && y == maze.height - 1) {
            find_soln(maze);
            return;
        }
        let tiles = [
            get_tile(maze, x - 1, y),
            get_tile(maze, x, y - 1),
            get_tile(maze, x + 1, y),
            get_tile(maze, x, y + 1)
        ];
        tiles = Promise.all(tiles).then(tiles => {
            tiles.forEach(tile => {
                if (!tile.wall && !tile.explored) {
                    if (tile.min_dist > node.min_dist + 1) {
                        if (tile.min_dist == Number.MAX_SAFE_INTEGER) {
                            tile.min_dist = node.min_dist + 1;
                            tile.prev_tile = tile_idx(maze, x, y);
                            pq.push(tile);
                        }
                        else {
                            tile.min_dist = node.min_dist + 1;
                            tile.prev_tile = tile_idx(maze, x, y);
                            pq.decreaseKey(tile);
                        }
                    }
                }
            });
            //print_pretty(maze);
            discover_next_tile(maze);
        });
    }
    else {
        // maze has been discovered completely
        find_soln(maze);
    }
}


function solve_maze(width, height, id) {
    let mazeTiles = new Array(width * height);
    let maze = {
        tiles: mazeTiles,
        width: width,
        height: height,
        id: id
    };

    let pq = new PriorityQueue(
        function(a, b) {
            return (a.min_dist + a.heuristic) - (b.min_dist + b.heuristic);
        },
        function(a) {
            return tile_idx(maze, a.x, a.y);
        }
    );
    maze.pq = pq;

    mazeTiles[0] = {
        x: 0,
        y: 0,
        wall: false,
        explored: false,
        min_dist: 0,
        heuristic: width + height,
        prev_tile: -1,
        id: id
    };
    pq.push(mazeTiles[0]);
    console.log(maze);

    discover_next_tile(maze);
}


fetch("https://maze.coda.io/maze", {
    method: "POST"
})
.then(res => {
    if (res.status != 201) {
        console.log("Failed to fetch maze data");
        return;
    }
    res = res.json().then(res => {
        solve_maze(res.width, res.height, res.id);
    });
})