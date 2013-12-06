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

    // TODO: Shown handlers, etc.
    this.pushLayer = function (layer) {
        list.unshift(layer);
    };

    this.popLayer = function () {
        list.shift();
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
            var keyPressed = activeLayer.keyPressed;
            keySerializer.process(function (key, pressed) {
                var keyPressedHandler = keyPressed[key];
                if (keyPressedHandler) {
                    keyPressedHandler(pressed);
                }
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
                // TODO: Combine code with above
                var canvasCoordinates = convertToCanvasCoordinates(globalX, globalY);
                var canvasX = canvasCoordinates[0];
                var canvasY = canvasCoordinates[1];
                var localCoordinates = Transform2D.transform(transform, [canvasX, canvasY]);
                mouseMoved(localCoordinates[0], localCoordinates[1]);
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

function Enemy(x, y, width, height, speedX, speedY) {
    Entity.call(this);
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = {
        x: speedX,
        y: speedY
    };
    this.elements = [new Rectangle()];
}

Enemy.prototype = Object.create(Entity.prototype);

Enemy.prototype.updateAxis = function (ms, axis, axisSize) {
    var axisSpeed = this.speed[axis];
    var axisPosition = this[axis] + axisSpeed * ms;
    if (Math.abs(axisPosition) + axisSize / 2 > 0.5) {
        // Reverse direction
        if (axisSpeed > 0) {
            axisPosition = 0.5 - axisSize / 2 - 0.01;
        } else {
            axisPosition = -0.5 + axisSize / 2 + 0.01;
        }
        
        this.speed[axis] = -axisSpeed;
    }
    
    this[axis] = axisPosition;
};

Enemy.prototype.update = function (ms) {
    this.updateAxis(ms, 'x', this.width);
    this.updateAxis(ms, 'y', this.height);
};

function Goal() {
    Entity.call(this);
    this.width = 1 / 30;
    this.height = 1 / 30;
    this.color = 'red';
    this.elements = [new Rectangle()];
}

Goal.prototype = Object.create(Entity.prototype);

Goal.prototype.createGhost = function () {
    return new Ghost(this, 500, 5);
};

function Player() {
    Entity.call(this);
    this.color = 'green';
    this.v = [0, 0, 0, 0];
    this.target = [];
    this.speed = 0.6 / 1000;
    this.width = 1 / 30;
    this.height = 1 / 30;
    this.elements = [new Rectangle()];
}

Player.prototype = Object.create(Entity.prototype);
Player.prototype.setMovingUpState = function (pressed) {
    this.v[0] = pressed ? 1 : 0;
};

Player.prototype.setMovingDownState = function (pressed) {
    this.v[1] = pressed ? 1 : 0;
};

Player.prototype.setMovingLeftState = function (pressed) {
    this.v[2] = pressed ? 1 : 0;
};

Player.prototype.setMovingRightState = function (pressed) {
    this.v[3] = pressed ? 1 : 0;
};

Player.prototype.setTarget = function (x, y) {
    this.target[0] = x;
    this.target[1] = y;
};

Player.prototype.updateTarget = function (x, y) {
    if (this.target.length > 0) {
        this.setTarget(x, y);
    }
}

Player.prototype.clearTarget = function () {
    this.target.length = 0;
};

Player.prototype.clearMovingStates = function () {
    this.v[0] = 0;
    this.v[1] = 0;
    this.v[2] = 0;
    this.v[3] = 0;
    this.clearTarget();
};

Player.prototype.createGhost = function () {
    return new Ghost(this, 750, 6);
};

Player.prototype.update = function (ms) {
    var directionX = this.v[3] - this.v[2];
    var directionY = this.v[0] - this.v[1];
    var target = this.target;
    if (directionX || directionY || target.length > 0) {
        var direction;
        if (target.length > 0) {
            // Only move if we're a little ways from the target
            var dx = target[0] - this.x;
            var dy = target[1] - this.y;
            if (Math.abs(dx) > this.width / 4 || Math.abs(dy) > this.height / 4) {
                direction = Math.atan2(dy, dx);
            }
        } else {
            direction = Math.atan2(directionY, directionX);
        }

        if (direction !== undefined) {
            this.x += this.speed * ms * Math.cos(direction);
            this.y += this.speed * ms * Math.sin(direction);

            // Boundaries
            if (Math.abs(this.x) + this.width / 2 > 0.5) {
                if (this.x > 0) {
                    this.x = 0.5 - this.width / 2;
                } else {
                    this.x = -0.5 + this.width / 2;
                }
            }

            if (Math.abs(this.y) + this.height / 2 > 0.5) {
                if (this.y > 0) {
                    this.y = 0.5 - this.height / 2;
                } else {
                    this.y = -0.5 + this.height / 2;
                }
            }
        }
    }
};

function Board() {
    Entity.call(this);
    this.width = 400;
    this.height = 400;
    this.color = 'blue';
    this.player = new Player();
    this.goal = new Goal();
    this.paused = false;
    this.score = 0;
    this.scoreUpdated = new Event();
    this.points = 0;
    this.pointsUpdated = new Event();
    this.points = 30;
    this.lost = new Event();
    this.elements = [new Rectangle()];
}

Board.pointProgression = [30, 20, 15, 10, 8, 7, 6, 5, 4, 3, 2, 1, 0];
Board.timeout = 19000;

Board.prototype = Object.create(Entity.prototype);

Board.prototype.resetGoal = function () {
    // TODO: Difficulty
    var position = this.getSafePosition(this.goal.width, this.goal.height);
    this.goal.x = position[0];
    this.goal.y = position[1];
    this.setPoints(Board.pointProgression[0]);
    this.timer = 0;
};

Board.prototype.checkCollision = function (a, b) {
    var ax1 = a.x - a.width / 2;
    var ax2 = a.x + a.width / 2;
    var ay1 = a.y - a.height / 2;
    var ay2 = a.y + a.height / 2;
    var bx1 = b.x - b.width / 2;
    var bx2 = b.x + b.width / 2;
    var by1 = b.y - b.height / 2;
    var by2 = b.y + b.height / 2;

    if (((ax1 >= bx1 && ax1 <= bx2) || (ax2 >= bx1 && ax2 <= bx2) || (bx1 >= ax1 && bx1 <= ax2))
    && ((ay1 >= by1 && ay1 <= by2) || (ay2 >= by1 && ay2 <= by2) || (by1 >= ay1 && by1 <= ay2))) {
        return true;
    }

    return false;
};

Board.prototype.getSafePosition = function (width, height) {
    var boardPlayerMinimumDistance = 0.15;
    var ax1 = Math.max(-0.5 + width / 2, this.player.x - (this.player.width / 2 + width / 2 + boardPlayerMinimumDistance));
    var ax2 = Math.min(0.5 - width / 2, this.player.x + (this.player.width / 2 + width / 2 + boardPlayerMinimumDistance));
    var ay1 = Math.max(-0.5 + height / 2, this.player.y - (this.player.height / 2 + height / 2 + boardPlayerMinimumDistance));
    var ay2 = Math.min(0.5 - height / 2, this.player.y + (this.player.height / 2 + height / 2 + boardPlayerMinimumDistance));
    var valid = true;

    do {
        var x = (Math.random() - 0.5) * (1 - width);
        var y = (Math.random() - 0.5) * (1 - height);

        var bx1 = x - width / 2;
        var bx2 = x + width / 2;
        var by1 = y - height / 2;
        var by2 = y + height / 2;

        if (((ax1 >= bx1 && ax1 <= bx2) || (ax2 >= bx1 && ax2 <= bx2) || (bx1 >= ax1 && bx1 <= ax2))
        && ((ay1 >= by1 && ay1 <= by2) || (ay2 >= by1 && ay2 <= by2) || (by1 >= ay1 && by1 <= ay2))) {
            valid = false;
        } else {
            return [x, y];
        }
    } while (!valid)
};

Board.prototype.addEnemy = function () {
    var size = 1 / 30;
    var speed = 0.2 / 1000;
    var speedX = 0;
    var speedY = 0;
    var position = this.getSafePosition(size, size);

    // TODO: Difficulty levels

    if (Math.random() >= 0.5) {
        speedX = speed;
    } else {
        speedY = speed;
    }

    // Animate in the new enemy
    var enemy = new Enemy(position[0], position[1], size, size, speedX, speedY);
    var board = this;
    this.children.push(new Ghost(enemy, 500, 0, true, function () {
        board.children.push(enemy);
    }));
};

Board.prototype.lose = function () {
    this.player.clearMovingStates();
    this.children.push(this.player.createGhost());
    this.removeChild(this.player);
    this.paused = true;
    this.lost.fire();
}

Board.prototype.captureGoal = function () {
    this.setScore(this.score + this.points);
    this.children.push(this.goal.createGhost());
    this.resetGoal();
    this.addEnemy();
};

Board.prototype.update = function (ms) {
    // Update children first
    this.updateChildren(ms);

    // Update timer
    this.timer += ms;

    if (!this.paused) {
        var done = false;

        // Check for goal intersection
        if (this.checkCollision(this.player, this.goal)) {
            this.captureGoal();
        } else {
            var points = Board.pointProgression[Math.max(0, Math.min(Board.pointProgression.length - 1, Math.floor(this.timer / Board.timeout * Board.pointProgression.length)))];
            if (points !== this.points) {
                this.setPoints(points);
            }
        }

        // Check for enemy intersection
        var childCount = this.children.length;
        for (var i = 0; i < childCount; i++) {
            var child = this.children[i];
            if (child instanceof Enemy) {
                if (this.checkCollision(this.player, child)) {
                    done = true;
                    break;
                }
            }
        }

        if (done) {
            this.lose();
        }
    }
};

Board.prototype.setScore = function (score) {
    this.score = score;
    this.scoreUpdated.fire(score);
}

Board.prototype.setPoints = function (points) {
    this.points = points;
    this.pointsUpdated.fire(points);
}

Board.prototype.reset = function () {
    this.children = [this.player, this.goal];

    this.setScore(0);
    this.resetGoal();
};

function ValueDisplay(font, event, x, y, align, updatedCallback) {
    Entity.apply(this);
    this.x = x;
    this.y = y;
    this.align = align;
    this.textElement = new Text('', font, 0, 0, align, 'bottom');
    this.elements = [this.textElement];
    this.updatedCallback = updatedCallback;
    var valueDisplay = this;
    event.addListener(function (value) {
        valueDisplay.textElement.text = '' + value;

        if (valueDisplay.updatedCallback) {
            valueDisplay.updatedCallback();
        }
    });
}

ValueDisplay.prototype = Object.create(Entity.prototype);

function Display(board) {
    Entity.apply(this);
    this.children = [];

    var font = '32px sans-serif';
    var textHeight = 32;
    var display = this;
    var addUpdateEffect = function () {
        var sign = (this.align === 'right') ? 1 : -1;
        display.children.push(new Ghost(this, 150, 2, undefined, undefined, sign * this.textElement.getTotalWidth() / 2, -textHeight / 2));
    }

    var scoreLabel = new Text('Score: ', font, -200, 200, 'left', 'bottom');
    var padding = (new Text('00', font)).getTotalWidth();
    var pointLabel = new Text('Points: ', font, 200 - padding, 200, 'right', 'bottom');
    this.elements = [scoreLabel, pointLabel];
    // TODO: Don't add the effect when the game first starts
    this.children.push(this.scoreDisplay = new ValueDisplay(font, board.scoreUpdated, -200 + scoreLabel.getTotalWidth(), 200, 'left', addUpdateEffect));
    this.children.push(new ValueDisplay(font, board.pointsUpdated, 200, 200, 'right', addUpdateEffect));

    this.font = font;
    this.textHeight = textHeight;
    this.scoreLabel = scoreLabel;
}

Display.prototype = Object.create(Entity.prototype);

Display.prototype.emphasizeScore = function () {
    var content = this.scoreLabel.text + this.scoreDisplay.textElement.text;
    var textElement = new Text(content, this.font, 0, 0, 'left', 'middle');
    var textWidth = textElement.getTotalWidth();
    var background = new Rectangle(-this.textHeight / 2, this.textHeight / 2, textWidth + this.textHeight, this.textHeight);
    background.color = 'blue';
    background.opacity = 0.85;
    var scaleMax = 2;
    this.bigScore = this.children.push(new ScriptedEntity([background, textElement],
        [[0, -200 + this.textHeight / 2, 200, 1, 1, 0, 1],
         [1000, -textWidth * scaleMax / 2, 0, scaleMax, scaleMax, 0, 1]]));
};

function GameLayer() {
    Layer.apply(this);
    this.board = this.addEntity(new Board());
    this.display = this.addEntity(new Display(this.board));
    this.board.reset();

    var display = this.display;
    this.board.lost.addListener(function () {
        display.emphasizeScore();
    });

    var board = this.board;
    this.keyPressed = {
        left: function (pressed) {
            board.player.setMovingLeftState(pressed);
        },

        right: function (pressed) {
            board.player.setMovingRightState(pressed);
        },

        up: function (pressed) {
            board.player.setMovingUpState(pressed);
        },

        down: function (pressed) {
            board.player.setMovingDownState(pressed);
        }
    };

    this.mouseButtonPressed = function (button, pressed, x, y) {
        if (button == MouseButton.primary) {
            if (pressed) {
                // TODO: This is ugly
                board.player.setTarget(x / board.width, y / board.height);
            } else {
                board.player.clearTarget();
            }
        }
    };

    this.mouseMoved = function (x, y) {
        board.player.updateTarget(x / board.width, y / board.height);
    }
}

GameLayer.prototype = Object.create(Layer.prototype);

window.onload = function () {
    // TODO: Consider automatic resizing (e.g. to fill the screen)
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new GameLayer());
}
