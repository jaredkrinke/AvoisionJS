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

// TODO: This could surely be optimized
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
};

var keyCodeToName = {
    8: 'backspace',
    9: 'tab',
    13: 'enter',
    27: 'escape',
    32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
};

// Layer that contains entities to display/update
function Layer() {
    this.entities = [];
}

Layer.prototype = {
    constructor: Layer,

    // TODO: Maybe just call the property children and let callers manipulate directly?
    addEntity: function (entity) {
        this.entities.push(entity);
        return entity;
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
        if (this.lastUpdate !== undefined && this.lastUpdate < now) {
            var ms = now - this.lastUpdate;
            this.forEachEntity(function (entity) {
                if (entity.update) {
                    entity.update(ms);
                }
            });
        }

        this.lastUpdate = now;
    },

    keyPressed: function (key, pressed) {
        if (this.keyPressedHandlers) {
            var keyPressedHandler = this.keyPressedHandlers[key];
            if (keyPressedHandler) {
                keyPressedHandler.call(this, pressed);
            }
        }
    },

    drawEntity: function (canvas, context, entity) {
        context.save();
        context.translate(entity.x, entity.y);

        if (entity.width !== 1 || entity.height !== 1) {
            context.scale(entity.width, entity.height);
        }

        if (entity.angle) {
            context.rotate(entity.angle);
        }

        if (entity.color) {
            context.fillStyle = entity.color;
        }

        if (entity.opacity !== undefined) {
            context.globalAlpha *= entity.opacity;
        }

        // Draw all elements
        if (entity.elements) {
            var elementCount = entity.elements.length;
            for (var i = 0; i < elementCount; i++) {
                var element = entity.elements[i];
                context.save();

                // Need to flip the coordinate system back so that text is rendered upright
                context.scale(1, -1);

                if (element.color) {
                    context.fillStyle = element.color;
                }

                if (element.opacity !== undefined) {
                    context.globalAlpha *= element.opacity;
                }

                if (element instanceof Rectangle) {
                    context.fillRect(element.x, -element.y, element.width, element.height);
                } else if (element instanceof Text && element.text) {
                    if (element.font) {
                        context.font = element.font;
                    }

                    context.textBaseline = element.baseline;
                    context.textAlign = element.align;
                    context.fillText(element.text, element.x, -element.y);
                }

                context.restore();
            }
        }

        // Draw children
        if (entity.children) {
            var childCount = entity.children.length;
            for (var i = 0; i < childCount; i++) {
                Layer.prototype.drawEntity(canvas, context, entity.children[i]);
            }
        }

        context.restore();
    },

    draw: function (canvas, context) {
        context.fillStyle = 'black';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Adjust coordinate system
        context.save();
        context.translate(canvas.width / 2, canvas.height / 2);
        var scale = Radius.getScale();
        context.scale(scale, -scale);

        this.forEachEntity(function (entity) {
            Layer.prototype.drawEntity(canvas, context, entity);
        });

        context.restore();
    }
};

function Rectangle(x, y, width, height) {
    this.x = (x !== undefined ? x : -0.5);
    this.y = (y !== undefined ? y : 0.5);
    this.width = width || 1;
    this.height = height || 1;
}

function Text(text, font, x, y, align, baseline) {
    this.text = text;
    this.font = font;
    this.x = x || 0;
    this.y = y || 0;
    this.align = align || 'left';
    this.baseline = baseline || 'alphabetic';
}

Text.prototype = {
    constructor: Text,

    getTotalWidth: function () {
        return Radius.getTextWidth(this.font, this.text);
    }
}

// Entity that can be displayed and updated each frame
function Entity() {
    this.x = 0;
    this.y = 0;
    this.width = 1;
    this.height = 1;
    this.angle = 0;
    this.color = 'white';
}

Entity.prototype = {
    constructor: Entity,

    removeChild: function (child) {
        if (this.children) {
            var childCount = this.children.length;
            for (var i = 0; i < childCount; i++) {
                if (child === this.children[i]) {
                    this.children.splice(i, 1);
                }
            }
        }
    },

    updateChildren: function (ms) {
        if (this.children) {
            var childCount = this.children.length;
            for (var i = 0; i < childCount; i++) {
                var child = this.children[i];
                if (child.update) {
                    child.update(ms);
                }

                // Check to see if this child should be removed
                if (child.dead) {
                    this.removeChild(child);

                    // Update loop variables to account for the removed child
                    childCount--;
                    i--;
                }
            }
        }
    },

    update: function (ms) {
        this.updateChildren(ms);
    }
};

function ScriptedEntity(entityOrElements, steps, repeat, endedCallback) {
    Entity.apply(this);
    // TODO: Must/should the elements be copied?
    if (entityOrElements instanceof Entity) {
        this.elements = entityOrElements.elements;
        this.color = entityOrElements.color;
    } else {
        this.elements = entityOrElements;
    }

    this.steps = steps;
    this.repeat = repeat;
    this.endedCallback = endedCallback;

    this.timer = 0;
    this.stepIndex = 0;

    this.x = steps[0][1];
    this.y = steps[0][2];
    this.width = steps[0][3];
    this.height = steps[0][4];
    this.angle = steps[0][5];
    this.opacity = steps[0][6];
}

ScriptedEntity.prototype = Object.create(Entity.prototype);

ScriptedEntity.prototype.update = function (ms) {
    var done = false;
    this.timer += ms;
    if (this.timer >= this.steps[this.stepIndex][0]) {
        this.timer = this.timer - this.steps[this.stepIndex][0];
        this.stepIndex++;

        this.initialX = this.x;
        this.initialY = this.y;
        this.initialWidth = this.width;
        this.initialHeight = this.height;
        this.initialAngle = this.angle;
        this.initialOpacity = this.opacity;

        if (this.stepIndex >= this.steps.length) {
            if (this.repeat) {
                this.stepIndex = 1;
            } else {
                this.update = undefined;
                done = true;

                if (this.endedCallback) {
                    this.endedCallback();
                }
            }
        }
    }

    if (!done) {
        var step = this.steps[this.stepIndex];

        this.x = this.initialX + (step[1] - this.initialX) / step[0] * this.timer;
        this.y = this.initialY + (step[2] - this.initialY) / step[0] * this.timer;
        this.width = this.initialWidth + (step[3] - this.initialWidth) / step[0] * this.timer;
        this.height = this.initialHeight + (step[4] - this.initialHeight) / step[0] * this.timer;
        this.angle = this.initialAngle + (step[5] - this.initialAngle) / step[0] * this.timer;
        this.opacity = this.initialOpacity + (step[6] - this.initialOpacity) / step[0] * this.timer;
    } else {
        var step = this.steps[this.steps.length - 1];

        this.x = step[1];
        this.y = step[2];
        this.width = step[3];
        this.height = step[4];
        this.angle = step[5];
        this.opacity = step[6];
    }
};

function Ghost(entity, period, scaleMax, inward, endedCallback, offsetX2, offsetY2) {
    var initialScale = 1;
    var finalScale = 1;
    var opacity = (entity.opacity >= 0 ? entity.opacity : 1);
    var finalOpacity;
    var x2 = entity.x;
    var y2 = entity.y;

    if (inward) {
        initialScale = scaleMax;
        finalOpacity = opacity;
        opacity = 0;
    } else {
        // Default case is outward
        finalScale = scaleMax;
        finalOpacity = 0;
    }

    if (offsetX2 !== undefined) {
        x2 += offsetX2;
    }

    if (offsetY2 !== undefined) {
        y2 += offsetY2;
    }

    ScriptedEntity.call(
        this,
        entity,
        [[0, entity.x, entity.y, entity.width * initialScale, entity.height * initialScale, entity.angle, opacity],
         [period, x2, y2, entity.width * finalScale, entity.height * finalScale, entity.angle, finalOpacity]],
        false,
        function () {
            this.dead = true;
            if (this.ghostEnded) {
                this.ghostEnded();
            }
        });

    this.ghostEnded = endedCallback;
}

Ghost.prototype = Object.create(ScriptedEntity.prototype);

// Serializes key presses so that they show up predictably between frames
function KeySerializer() {
    var queuedKeyCodes = [];
    var queuedKeyStates = [];

    addEventListener('keydown', function (e) {
        if (e.keyCode in keyCodeToName) {
            queuedKeyCodes.push(e.keyCode);
            queuedKeyStates.push(true);
        }
    }, false);

    addEventListener('keyup', function (e) {
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

// Serializes mouse events so that they are only handled between frames
var MouseEvent = {
    down: 1,
    up: 2,
    move: 3
};

var MouseButton = {
    primary: 0,
    secondary: 2,
    tertiary: 1
};

function MouseSerializer(canvas) {
    var queuedMouseEvents = [];
    var queuedMousePayloads = [];
    var disableDefault = function (e) {
        // Disable the default action since the layer will handle this event
        if (e.preventDefault) {
            e.preventDefault();
        }
    }

    canvas.addEventListener('mousedown', function (e) {
        disableDefault(e);
        queuedMouseEvents.push(MouseEvent.down);
        queuedMousePayloads.push([e.clientX, e.clientY, e.button]);
    });

    canvas.addEventListener('mouseup', function (e) {
        disableDefault(e);
        queuedMouseEvents.push(MouseEvent.up);
        queuedMousePayloads.push([e.clientX, e.clientY, e.button]);
    });

    canvas.addEventListener('mousemove', function (e) {
        disableDefault(e);
        queuedMouseEvents.push(MouseEvent.move);
        queuedMousePayloads.push([e.clientX, e.clientY]);
    });

    this.process = function (mouseButtonPressed, mouseMoved) {
        var count = queuedMouseEvents.length;
        if (count > 0) {
            for (var i = 0; i < count; i++) {
                var event = queuedMouseEvents[i];
                var payload = queuedMousePayloads[i];
                switch (event) {
                    case MouseEvent.down:
                    case MouseEvent.up:
                        mouseButtonPressed(payload[2], event == MouseEvent.down, payload[0], payload[1]);
                        break;

                    case MouseEvent.move:
                        mouseMoved(payload[0], payload[1]);
                        break;
                }
            }

            queuedMouseEvents.length = 0;
            queuedMousePayloads.length = 0;
        }
    };
}

var Radius = new function () {
    var keySerializer = new KeySerializer();
    var mouseSerializer;
    var list = [];
    var canvas;
    var context;

    this.pushLayer = function (layer) {
        list.unshift(layer);

        // Run the "shown" handler, if it exists
        if (layer.shown) {
            layer.shown();
        }
    };

    this.popLayer = function () {
        list.shift();

        // Notify any top layer that is has been shown
        if (list.length > 0) {
            var layer = list[0];
            if (layer.shown) {
                layer.shown();
            }
        }
    };

    var convertToCanvasCoordinates = function (globalX, globalY) {
        // TODO: This rectangle could be cached... perhaps in an affine transform
        var rect = canvas.getBoundingClientRect();
        return [globalX - rect.left, globalY - rect.top];
    }

    // Single loop iteration
    var loop = function () {
        var activeLayer = list[0];
        // TODO: Handle switching layers
        if (activeLayer) {
            // Handle input
            keySerializer.process(function (key, pressed) {
                activeLayer.keyPressed(key, pressed);
            });

            var mouseButtonPressed = activeLayer.mouseButtonPressed;
            var mouseMoved = activeLayer.mouseMoved;

            // TODO: This could be cached and should also share code with the canvas 
            // TODO: The API here is ugly...
            var transform = Transform2D.createIdentity();
            var scale = Radius.getScale();
            Transform2D.scale(transform, scale, -scale, transform);
            Transform2D.translate(transform, -canvas.width / 2, canvas.height / 2, transform);

            mouseSerializer.process(function (button, pressed, globalX, globalY) {
                if (mouseButtonPressed) {
                    var canvasCoordinates = convertToCanvasCoordinates(globalX, globalY);
                    var canvasX = canvasCoordinates[0];
                    var canvasY = canvasCoordinates[1];
                    var localCoordinates = Transform2D.transform(transform, [canvasX, canvasY]);
                    mouseButtonPressed(button, pressed, localCoordinates[0], localCoordinates[1]);
                }
            }, function (globalX, globalY) {
                if (mouseMoved) {
                    // TODO: Combine code with above
                    var canvasCoordinates = convertToCanvasCoordinates(globalX, globalY);
                    var canvasX = canvasCoordinates[0];
                    var canvasY = canvasCoordinates[1];
                    var localCoordinates = Transform2D.transform(transform, [canvasX, canvasY]);
                    mouseMoved(localCoordinates[0], localCoordinates[1]);
                }
            });

            // Update entities and draw everything
            // TODO: How to deal with really long delays between animation frames? Just override the value of ms (i.e. pretend it didn't happen)? Auto-pause?
            activeLayer.update();
            activeLayer.draw(canvas, context);
        }

        requestAnimationFrame(loop);
    };

    this.initialize = function (targetCanvas) {
        canvas = targetCanvas;
        context = canvas.getContext('2d');
        mouseSerializer = new MouseSerializer(canvas);

        // Disable default touch behavior (e.g. pan/bounce) for the canvas
        canvas.setAttribute('style', 'touch-action: none;');
    }

    this.start = function (layer) {
        this.pushLayer(layer);
        loop();
    }

    this.getScale = function () {
        return Math.min(canvas.width / 640, canvas.height / 480);
    }

    this.getTextWidth = function (font, text) {
        context.save();
        context.font = font;
        var width = context.measureText(text).width;
        context.restore();

        return width;
    }
};
