function Event() {
    this.callbacks = [];
    // TODO: Consider refactoring this "lockable list" and using it for entities in Layer
    this.locked = false;
}

Event.prototype = {
    constructor: Event,

    addListener: function (callback) {
        this.callbacks.push(callback);
    },

    removeListener: function (callback) {
        if (this.locked) {
            // Queue the remove
            if (this.pendingRemoval) {
                this.pendingRemoval.push(callback);
            } else {
                this.pendingRemoval = [callback];
            }
        } else {
            // Scan for the callback and remove it
            for (var i = 0; i < this.callbacks.length; i++) {
                if (this.callbacks[i] === callback) {
                    this.callbacks.splice(i, 1);
                    i--;
                    break;
                }
            }
        }
    },

    fire: function () {
        var callbacks = this.callbacks;
        var length = callbacks.length;

        // Lock the list of callbacks while iterating
        this.locked = true;
        for (var i = 0; i < length; i++) {
            callbacks[i].apply(null, arguments);
        }
        this.locked = false;

        if (this.pendingRemoval) {
            // Process removes that occurred during iteration
            length = this.pendingRemoval.length;
            for (i = 0; i < length; i++) {
                this.removeListener(this.pendingRemoval[i]);
            }
            this.pendingRemoval = null;
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

Audio = {
};

(function () {
    var key = 'radiusAudioMuted';
    Audio.muted = localStorage[key] === 'true';
    Audio.setMuted = function (muted) {
        localStorage[key] = muted;
        Audio.muted = muted;
    };
})();

function AudioClip(source, frequent) {
    // Note: Internet Explorer 11 on Windows 7 seems to truncate MP3s that are less than 0.4s long, so make sure all
    // clips are longer than this...
    this.instances = [];
    this.source = source;
    this.frequent = frequent;

    // Cache the clip immediately
    if (!Audio.muted) {
        this.addInstance();
    }
}

AudioClip.maxInstances = 4;
AudioClip.prototype = {
    constructor: AudioClip,

    addInstance: function () {
        var audio = document.createElement('audio');

        // Mark as preload = 'auto' so that the whole clip is cached and there is no buffering
        audio.preload = 'auto';
        audio.src = this.source;

        this.instances.push({
            audio: audio,
            played: false
        });
    },

    play: function () {
        if (!Audio.muted) {
            // Find an inactive instance
            var count = this.instances.length;
            var index = -1;
            var now = Date.now();
            for (var i = 0; i < count; i++) {
                var instance = this.instances[i];
                if (!instance.played || instance.audio.ended) {
                    index = i;
                    break;
                }
            }

            // Add a new instance, if none are available
            if (index === -1 && count < AudioClip.maxInstances) {
                this.addInstance();
                index = this.instances.length - 1;
            }

            // If this clip is expected to occur frequently and we're on the last available instance, aggressively preload another instance
            if (this.frequent && index === this.instances.length - 1 && this.instances.length < AudioClip.maxInstances) {
                this.addInstance();
            }

            // Play
            if (index >= 0) {
                var instance = this.instances[index];
                instance.played = true;
                instance.audio.play();
            }
        }
    }
}

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

    addEntity: function (entity) {
        this.entities.push(entity);
        return entity;
    },

    removeEntity: function (entity) {
        var entities = this.entities;
        var entityCount = entities.length;
        for (var i = 0; i < entityCount; i++) {
            if (entities[i] === entity) {
                entities.splice(i, 1);
                break;
            }
        }
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

            // Enforce a maximum period (50 ms) to handle e.g. switching to another tab (which may suspend the animation frames for this tab)
            if (ms > 100) {
                ms = 50;
            }

            // TODO: Need to lock the list of children
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
        var opacity = (entity.opacity !== undefined ? entity.opacity : 1);
        if (opacity > 0 && (entity.elements || entity.children)) {
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

            if (opacity < 1) {
                context.globalAlpha *= opacity;
            }

            // Draw all elements
            if (entity.elements) {
                var elementCount = entity.elements.length;
                for (var i = 0; i < elementCount; i++) {
                    var element = entity.elements[i];
                    var elementOpacity = (element.opacity !== undefined ? element.opacity : 1);
                    if (elementOpacity > 0) {
                        context.save();

                        // Need to flip the coordinate system back so that text is rendered upright
                        context.scale(1, -1);

                        if (elementOpacity < 1) {
                            context.globalAlpha *= elementOpacity;
                        }

                        if (element instanceof Image && element.loaded) {
                            context.drawImage(element.img, element.x, -element.y, element.width, element.height);
                        } else {
                            // Color is only supported for text/shapes
                            if (element.color) {
                                context.fillStyle = element.color;
                            }

                            if (element instanceof Text) {
                                if (element.font) {
                                    context.font = element.font;
                                }

                                context.textBaseline = element.baseline;
                                context.textAlign = element.align;

                                if (element.text) {
                                    context.fillText(element.text, element.x, -element.y);
                                } else if (element.lines) {
                                    var lineCount = element.lines.length;
                                    var offset = 0;
                                    for (var l = 0; l < lineCount; l++) {
                                        context.fillText(element.lines[l], element.x, -element.y + offset);
                                        offset += element.lineHeight;
                                    }
                                }
                            } else {
                                // Rectangle
                                context.fillRect(element.x, -element.y, element.width, element.height);
                            }
                        }

                        context.restore();
                    }
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
        }
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

function Rectangle(x, y, width, height, color) {
    this.x = (x !== undefined ? x : -0.5);
    this.y = (y !== undefined ? y : 0.5);
    this.width = width || 1;
    this.height = height || 1;
    this.color = color;
}

function Image(source, color, x, y, width, height) {
    this.x = (x !== undefined ? x : -0.5);
    this.y = (y !== undefined ? y : 0.5);
    this.width = width || 1;
    this.height = height || 1;
    this.color = color;
    this.loaded = false;

    // Load the image
    this.img = document.createElement('img');
    var image = this;
    this.img.onload = function () {
        image.loaded = true;
    };

    this.img.src = source;
}

// TODO: Should this just take a height value instead of a font?
function Text(text, font, x, y, align, baseline, lineHeight) {
    this.text = text;
    this.font = font;
    this.x = x || 0;
    this.y = y || 0;
    this.align = align || 'left';
    this.baseline = baseline || 'alphabetic';
    this.lineHeight = lineHeight;
}

Text.prototype = {
    constructor: Text,

    getTotalWidth: function () {
        return Radius.getTextWidth(this.font, this.text);
    }
}

// Entity that can be displayed and updated each frame
function Entity(x, y, width, height) {
    this.x = (x !== undefined ? x : 0);
    this.y = (y !== undefined ? y : 0);
    this.width = width || 1;
    this.height = height || 1;
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
        // Mark the current top layer as being hidden
        if (list[0]) {
            list[0].hidden = true;
        }

        list.unshift(layer);

        // Run the "shown" handler, if it exists
        if (layer.shown) {
            layer.shown();
        }
    };

    this.popLayer = function () {
        // Mark the current top layer as being hidden
        if (list[0]) {
            list[0].hidden = true;
        }

        list.shift();

        // Notify any top layer that is has been shown
        if (list.length > 0) {
            var layer = list[0];
            if (layer.shown) {
                layer.shown();
            }
        }
    };

    var noBordersOrMarginsStyle = 'margin: 0px; padding: 0px; border: 0px; width: 100%; height: 100%; overflow: hidden;'
    var html = document.getElementsByTagName('html')[0];
    var body = document.getElementsByTagName('body')[0];
    var resizeHandler = function () {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };

    this.setFullscreen = function (fullscreen) {
        if (!this.fullscreen && fullscreen) {
            // Resize the canvas
            this.originalCanvasWidth = canvas.width;
            this.originalCanvasHeight = canvas.height;
            resizeHandler();

            // Remove margins/padding/borders/scrollbars on containers
            this.originalHtmlStyle = html.getAttribute('style');
            this.originalBodyStyle = body.getAttribute('style');
            html.setAttribute('style', noBordersOrMarginsStyle);
            body.setAttribute('style', noBordersOrMarginsStyle);

            // Add a handler for "resize" events
            window.addEventListener('resize', resizeHandler, false);
        } else if (this.fullscreen && !fullscreen) {
            // Reset canvas size
            canvas.width = this.originalCanvasWidth;
            canvas.height = this.originalCanvasHeight;

            // Reset body/html styles
            html.setAttribute('style', this.originalHtmlStyle);
            body.setAttribute('style', this.originalBodyStyle);

            // Remove "resize" handler
            window.removeEventListener('resize', resizeHandler);
        }

        this.fullscreen = fullscreen;
    };

    var convertToCanvasCoordinates = function (globalX, globalY) {
        // TODO: This rectangle could be cached... perhaps in an affine transform
        var rect = canvas.getBoundingClientRect();
        return [globalX - rect.left, globalY - rect.top];
    }

    // Single loop iteration
    var loop = function () {
        var activeLayer = list[0];
        if (activeLayer) {
            // Handle input

            // Send all events to this frame's activy layer; drop events if the layer changes. This is to avoid 
            // sending multiple layer (and therefore focus)-changing events (e.g. submitting a high score multiple
            // times).

            keySerializer.process(function (key, pressed) {
                if (activeLayer === list[0]) {
                    activeLayer.keyPressed(key, pressed);
                }
            });

            var mouseButtonPressed = activeLayer.mouseButtonPressed;
            var mouseMoved = activeLayer.mouseMoved;

            // TODO: This could be cached and should also share code with the canvas 
            // TODO: The API here is ugly...
            var transform = Transform2D.createIdentity();
            var scale = 1 / Radius.getScale();
            Transform2D.translate(transform, -canvas.width / 2, -canvas.height / 2, transform);
            Transform2D.scale(transform, scale, -scale, transform);

            mouseSerializer.process(function (button, pressed, globalX, globalY) {
                if (mouseButtonPressed && activeLayer === list[0]) {
                    var canvasCoordinates = convertToCanvasCoordinates(globalX, globalY);
                    var canvasX = canvasCoordinates[0];
                    var canvasY = canvasCoordinates[1];
                    var localCoordinates = Transform2D.transform(transform, [canvasX, canvasY]);
                    activeLayer.mouseButtonPressed(button, pressed, localCoordinates[0], localCoordinates[1]);
                }
            }, function (globalX, globalY) {
                if (mouseMoved && activeLayer === list[0]) {
                    // TODO: Combine code with above
                    var canvasCoordinates = convertToCanvasCoordinates(globalX, globalY);
                    var canvasX = canvasCoordinates[0];
                    var canvasY = canvasCoordinates[1];
                    var localCoordinates = Transform2D.transform(transform, [canvasX, canvasY]);
                    activeLayer.mouseMoved(localCoordinates[0], localCoordinates[1]);
                }
            });

            // Update entities
            activeLayer.update();

            // Check to see if the active layer changed
            var lastActiveLayer = activeLayer;
            activeLayer = list[0];

            // Draw the frame with the top layer (which may have changed after input/updates)
            activeLayer.draw(canvas, context);

            // If the original layer got hidden during this frame, reset its timer
            if (lastActiveLayer.hidden) {
                activeLayer.lastUpdate = undefined;
                activeLayer.hidden = false;
            }
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

    this.wrapText = function (font, maxWidth, text) {
        var lines = [];
        var length = text.length;
        var startIndex = 0;
        var lastSeparator;
        for (var i = 0; i <= length; i++) {
            if (i === length || text[i] === ' ' || text[i] === '\n') {
                if (i > startIndex) {
                    var width = Radius.getTextWidth(font, text.slice(startIndex, i));
                    if (width < maxWidth) {
                        if (text[i] === '\n' || i === length) {
                            lines.push(text.slice(startIndex, i));
                            startIndex = i + 1;
                        } else {
                            // This line fit, so record this point in case we need to come back to it
                            lastSeparator = i;
                        }
                    } else {
                        // The line is too long, so go back to the previous separator
                        if (lastSeparator) {
                            lines.push(text.slice(startIndex, lastSeparator));
                            startIndex = lastSeparator + 1;
                            lastSeparator = null;

                            // Now check this point again
                            i--;
                        } else {
                            lines.push(text.slice(startIndex, i));
                            startIndex = i + 1;
                        }
                    }
                } else {
                    startIndex = i + 1;
                    if (text[i] === '\n') {
                        lines.push('');
                    }
                }
            }
        }
        return lines;
    }
};
