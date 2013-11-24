// Vectors and two dimensional transformations
// TODO: Needed?
var Transform2D = {
    createIdentity: function () {
        return [[1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]];
    },

    copy: function (transform) {
        var result = [[], [], []];
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                result[i][j] = transform[i][j];
            }
        }
        return result;
    },

    multiply: function (a, b, result) {
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                var value = 0;
                for (var x = 0; x < 3; x++) {
                    value += a[x][j] * b[i][x];
                }
                result[i][j] = value;
            }
        }
        return result;
    },

    translate: function (transform, x, y, result) {
        // TODO: It'd be better to not create new matrices each time...
        var a = this.copy(transform);
        var b = [[1, 0, x],
                 [0, 1, y],
                 [0, 0, 1]];
        return this.multiply(a, b, transform);
    },

    scale: function (transform, sx, sy, result) {
        var a = this.copy(transform);
        var b = [[sx, 0, 0],
                 [0, sy, 0],
                 [0, 0, 1]];
        return this.multiply(a, b, result);
    },

    // TODO: These could be optimized and combined so that there aren't so many unnecessary objects getting created
    transformHomogeneous: function (a, vh) {
        var avh = [];
        for (var i = 0; i < 3; i++) {
            var value = 0;
            for (var x = 0; x < 3; x++) {
                value += a[i][x] * vh[x];
            }
            avh[i] = value;
        }
        return avh;
    },

    transform: function (a, v) {
        var avh = this.transformHomogeneous(a, [v[0], v[1], 1]);
        return [avh[0] / avh[2], avh[1] / avh[2]];
    }

    // TODO: Is rotate needed?
    // TODO: Is invert needed?

    // TODO: Needed?
    //this.identity = this.createIdentity();
};

Transform2D.prototype = {
    constructor: Transform2D,

    multiply: function (b) {
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {

            }
        }
    }
};

var keyCodeToName = {
    //8: 'backspace',
    //9: 'tab',
    //13: 'enter',
    //27: 'escape',
    //32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
};

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
        // TODO: Use clearRect?
        context.fillStyle = 'black';
        context.fillRect(0, 0, canvas.width, canvas.height);
        var layer = this;

        // Adjust coordinate system
        // TODO: Should be based on canvas dimensions and support resizing
        context.save();
        context.translate(320, 240);
        context.scale(1, -1);

        this.forEachEntity(function (entity) {
            // TODO: Draw entities based on elements
            context.fillStyle = 'green';
            // TODO: Transform per entity
            var width = entity.width;
            var height = entity.height;
            context.fillRect(entity.x - width / 2, entity.y - height / 2, width, height);
        });

        context.restore();
    }
};

// Entity that can be displayed and updated each frame
function Entity() {
    // TODO: Display elements
    // TODO: Update function
    this.x = 0;
    this.y = 0;
    this.width = 1;
    this.height = 1;
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
entity.width = 32;
entity.height = 32;
entity.update = function (ms) {
    if (entity.movingLeft) {
        entity.x -= 0.1 * ms;
    }
    if (entity.movingRight) {
        entity.x += 0.1 * ms;
    }
    if (entity.movingUp) {
        entity.y += 0.1 * ms;
    }
    if (entity.movingDown) {
        entity.y -= 0.1 * ms;
    }
}

var testLayer = new Layer();
testLayer.addEntity(entity);
testLayer.keyPressed = {
    left: function (pressed) {
        entity.movingLeft = pressed;
    },

    right: function (pressed) {
        entity.movingRight = pressed;
    },

    up: function (pressed) {
        entity.movingUp = pressed;
    },

    down: function (pressed) {
        entity.movingDown = pressed;
    }
};

layers.push(testLayer);
layers.runMainLoop(canvas, canvas.getContext('2d'));
