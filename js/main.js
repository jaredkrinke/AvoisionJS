// TODO: Load images at some point...
var player = {
    speed: 100,
    x: 0,
    y: 0
}

var keysPressed = {};
addEventListener("keydown", function (e) {
    keysPressed[e.keyCode] = true;
}, false);

addEventListener("keyup", function (e) {
    delete keysPressed[e.keyCode];
}, false);

function reset() {
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
}

var keyNameToCode = {
    backspace: 8,
    tab: 9,
    enter: 13,
    escape: 27,
    space: 32,
    left: 37,
    up: 38,
    right: 39,
    down: 40
};

function update(delta) {
    if (keyNameToCode.up in keysPressed) {
        player.y -= player.speed * delta;
    }

    if (keyNameToCode.down in keysPressed) {
        player.y += player.speed * delta;
    }

    if (keyNameToCode.left in keysPressed) {
        player.x -= player.speed * delta;
    }

    if (keyNameToCode.right in keysPressed) {
        player.x += player.speed * delta;
    }
}

function drawFrame() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'green';
    ctx.fillRect(player.x - 16, player.y - 16, 32, 32);
}

var mainLoop = function () {
    var now = Date.now();
    var delta = now - then;
    if (delta > 0) {
        update(delta / 1000);
    }
    drawFrame();
    then = now;
    requestAnimationFrame(mainLoop);
}

// Event source
function Event() {
    this.callbacks = [];
}

Event.prototype = {
    constructor: Event,

    addListener: function (callback) {
        this.callbacks.push(callback);
    },


    fire: function () {
        var callbacks = this.callbacks;
        var length = callbacks.length;
        for (var i = 0; i < length; i++) {
            callbacks[i].apply(null, arguments);
        }
    }
};

// Layer that contains entities to display/update
function Layer() {
    this.entities = [];
    // TODO: Should this be a full-blown Event? Or just a simple callback?
    this.keyPressed = new Event();
    this.lastUpdate = Date.now();
}

Layer.prototype = {
    constructor: Layer,

    update: function (delta) {
        // TODO: Update entities
    },

    addEntity: function(entity) {
        this.entities.push(entity);
    },

    draw: function (canvas, context) {
        context.fillStyle = 'black';
        context.fillRect(0, 0, canvas.width, canvas.height);
        // TODO: Draw entities
    },

    // TODO: How much to do here vs. in layers?
    mainLoop: function () {
        var now = Date.now();
        if (this.lastUpdate) {
            var delta = now - this.lastUpdate;
            // TODO: Update everything here
        }

        this.lastUpdate = now;
    }
};

// Entity that can be displayed and updated each frame
function Entity() {
    // TODO: Display elements
    // TODO: Update function
    this.x = 0;
    this.y = 0;
    // TODO: Z order
}

Entity.prototype = {
    constructor: Entity
    // TODO?
};

// Layers handles a stack of layers (only the top one is visible/running)
var layers = new function () {
    var list = [];

    // TODO: Shown handlers, etc.
    this.push = function (layer) {
        list.unshift(layer);
    };

    this.pop = function () {
        list.shift();
    };

    this.loop = function () {
        var activeLayer = list[0];
        if (activeLayer) {
            activeLayer.mainLoop();
        }
    };
};

var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 480;
document.body.appendChild(canvas);

//reset();
//var then = Date.now();
//mainLoop();
