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

var keyCodeToName = {};
(function () {
    for (var name in keyNameToCode) {
        keyCodeToName[keyNameToCode[name]] = name;
    }
})();

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

// Layer that contains entities to display/update
function Layer() {
    this.entities = [];
    this.keyPressed = {};
}

Layer.prototype = {
    constructor: Layer,

    addEntity: function (entity) {
        this.entities.push(entity);
    },

    forEachEntity: function (f) {
        var entities = this.entities;
        var entityCount = entities.length;
        for (var i = 0; i < entityCount; i++) {
            f(entities[i]);
        }
    },

    update: function () {
        var now = Date.now();
        if (this.lastUpdate && this.lastUpdate < now) {
            var ms = now - this.lastUpdate;
            this.forEachEntity(function (entity) {
                var updateEntity = entity.update;
                if (updateEntity) {
                    updateEntity(ms);
                }
            });
        }

        this.lastUpdate = now;
    },

    draw: function (canvas, context) {
        context.fillStyle = 'black';
        context.fillRect(0, 0, canvas.width, canvas.height);

        this.forEachEntity(function (entity) {
            // TODO: Draw entities based on elements
            // TODO: Add in a transformation for both proper scaling and inverting the y-axis
            context.fillStyle = 'green';
            context.fillRect(entity.x - 16, canvas.height - (entity.y + 16), 32, 32);
        });
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

// Serializes key presses so that they show up predictably between frames
function KeySerializer() {
    var queuedKeyCodes = [];
    var queuedKeyStates = [];

    addEventListener("keydown", function (e) {
        if (e.keyCode in keyCodeToName) {
            queuedKeyCodes.push(e.keyCode);
            queuedKeyStates.push(true);
        }
    }, false);

    addEventListener("keyup", function (e) {
        if (e.keyCode in keyCodeToName) {
            queuedKeyCodes.push(e.keyCode);
            queuedKeyStates.push(false);
        }
    }, false);

    this.process = function (keyPressed) {
        var count = queuedKeyCodes.length;
        if (count > 0) {
            for (var i = 0; i < count; i++) {
                keyPressed(keyCodeToName[queuedKeyCodes[i]], queuedKeyStates[i]);
            }

            queuedKeyCodes.length = 0;
            queuedKeyStates.length = 0;
        }
    };
}

// Layers handles a stack of layers (only the top one is visible/running)
var layers = new function () {
    var keySerializer = new KeySerializer();
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

    // Single loop iteration
    var loop = function () {
        var activeLayer = list[0];
        // TODO: Handle switching layers
        if (activeLayer) {
            // Handle input
            var keyPressed = activeLayer.keyPressed;
            keySerializer.process(function (key, pressed) {
                var keyPressedHandler = keyPressed[key];
                if (keyPressedHandler) {
                    keyPressedHandler(pressed);
                }
            });

            // Update entities and draw everything
            activeLayer.update();
            activeLayer.draw(canvas, context);
        }

        // TODO: setInterval or requestAnimationFrame?
        requestAnimationFrame(loop);
    };

    this.runMainLoop = function (newCanvas, newContext) {
        // Initialization
        canvas = newCanvas;
        context = newContext;

        // Start looping
        loop();
    }
};

// TODO: Better sizing (and support resizing)
var canvas = document.createElement('canvas');
canvas.width = 640;
canvas.height = 480;
document.body.appendChild(canvas);

var entity = new Entity();
entity.x = 320;
entity.y = 240;
entity.vx = 0;
entity.vy = 0;
entity.update = function (ms) {
    entity.x += entity.vx * ms;
    entity.y += entity.vy * ms;
}
var testLayer = new Layer();
testLayer.addEntity(entity);
testLayer.keyPressed = {
    left: function (pressed) {
        entity.vx = pressed ? -0.1 : 0;
    },

    right: function (pressed) {
        entity.vx = pressed ? 0.1 : 0;
    },

    up: function (pressed) {
        entity.vy = pressed ? 0.1 : 0;
    },

    down: function (pressed) {
        entity.vy = pressed ? -0.1 : 0;
    }
};

layers.push(testLayer);
layers.runMainLoop(canvas, canvas.getContext('2d'));

//reset();
//var then = Date.now();
//mainLoop();
