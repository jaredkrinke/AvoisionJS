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
}

Layer.prototype = {
    constructor: Layer,

    update: function () {
        var now = Date.now();
        if (this.lastUpdate && this.lastUpdate < now) {
            var delta = now - this.lastUpdate;
            // TODO: Update entities
        }

        this.lastUpdate = now;
    },

    addEntity: function(entity) {
        this.entities.push(entity);
    },

    draw: function (canvas, context) {
        context.fillStyle = 'black';
        context.fillRect(0, 0, canvas.width, canvas.height);
        // TODO: Draw entities
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
    var canvas;
    var context;

    // TODO: Shown handlers, etc.
    this.push = function (layer) {
        list.unshift(layer);
    };

    this.pop = function () {
        list.shift();
    };

    var loop = function () {
        var activeLayer = list[0];
        // TODO: Handle switching layers
        if (activeLayer) {
            activeLayer.update();
            activeLayer.draw(canvas, context);
            // TODO: Event handling
        }

        // TODO: setInterval or requestAnimationFrame?
        requestAnimationFrame(loop);
    };

    this.runMainLoop = function (newCanvas, newContext) {
        canvas = newCanvas;
        context = newContext;
        loop();
    }
};

// TODO: Better sizing (and support resizing)
var canvas = document.createElement('canvas');
canvas.width = 640;
canvas.height = 480;
document.body.appendChild(canvas);

layers.push(new Layer());
layers.runMainLoop(canvas, canvas.getContext('2d'));

//reset();
//var then = Date.now();
//mainLoop();
