function LockingList() {
    // TODO: Should "locked" be a counter instead?
    this.locked = false;
    this.items = [];
    this.pendingActions = [];
}

LockingList.action = {
    append: 0,
    remove: 1,
    clear: 2
};

// TODO: Consider making the internal versions hidden
LockingList.prototype.appendInternal = function (item) {
    this.items.push(item);
};

LockingList.prototype.append = function (item) {
    if (this.locked) {
        this.pendingActions.push({ type: LockingList.action.append, item: item });
    } else {
        this.appendInternal(item);
    }
};

LockingList.prototype.removeInternal = function (item) {
    var index = this.items.indexOf(item);
    if (index >= 0) {
        this.items.splice(index, 1);
    }
};

LockingList.prototype.remove = function (item) {
    if (this.locked) {
        this.pendingActions.push({ type: LockingList.action.remove, item: item });
    } else {
        this.removeInternal(item);
    }
};

LockingList.prototype.getCount = function () {
    return this.items.length;
};

LockingList.prototype.lock = function () {
    this.locked = true;
};

LockingList.prototype.unlock = function () {
    if (this.locked) {
        // Process any queued actions on unlock
        var count = this.pendingActions.length;
        for (var i = 0; i < count; i++) {
            var action = this.pendingActions[i];
            switch (action.type) {
                case LockingList.action.append:
                    this.appendInternal(action.item);
                    break;

                case LockingList.action.remove:
                    this.removeInternal(action.item);
                    break;

                case LockingList.action.clear:
                    this.clearInternal();
                    break;
            }
        }
        this.pendingActions.length = 0;
    }

    this.locked = false;
};

LockingList.prototype.forEach = function (callback, that) {
    this.lock();
    var count = this.items.length;
    for (var i = 0; i < count; i++) {
        callback.call(that, this.items[i]);
    }
    this.unlock();
};

LockingList.prototype.clearInternal = function () {
    this.items.length = 0;
}

LockingList.prototype.clear = function () {
    if (this.locked) {
        this.pendingActions.push({ type: LockingList.action.clear });
    } else {
        this.clearInternal();
    }
};

function Event() {
    this.callbacks = [];
    // TODO: Use LockingList here
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
    Audio.muted = false;
    try {
        Audio.muted = localStorage[key] === 'true';
    } catch (e) {}

    Audio.setMuted = function (muted) {
        Audio.muted = muted;
        try {
            localStorage[key] = muted;
        } catch (e) {}
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
    90: 'z'
};

// Layer that contains entities to display/update
function Layer() {
    this.entities = new LockingList();
}

Layer.prototype = {
    constructor: Layer,

    addEntity: function (entity) {
        this.entities.append(entity);
        return entity;
    },

    removeEntity: function (entity) {
        this.entities.remove(entity);
    },

    forEachEntity: function (f) {
        this.entities.forEach(f);
    },

    update: function () {
        var now = Date.now();
        if (this.lastUpdate !== undefined && this.lastUpdate < now) {
            var ms = now - this.lastUpdate;

            // Enforce a maximum period (50 ms) to handle e.g. switching to another tab (which may suspend the animation frames for this tab)
            if (ms > 100) {
                ms = 50;
            }

            // Update entities
            var layer = this;
            this.entities.forEach(function (child) {
                if (child.update) {
                    child.update(ms);
                }

                // Check to see if this child should be removed
                if (child.dead) {
                    layer.removeEntity(child);
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

                        if (element instanceof Image && element.image && element.image.loaded && element.width && element.height) {
                            if (element.angle) {
                                context.translate(element.x, -element.y);
                                context.scale(element.width, element.height);
                                // Rotate around the center
                                context.translate(0.5, 0.5);
                                context.rotate(element.angle);
                                context.translate(-0.5, -0.5);
                                if (element instanceof ImageRegion) {
                                    var imgWidth = element.image.element.width;
                                    var imgHeight = element.image.element.height;
                                    context.drawImage(element.image.element, element.sx / imgWidth, element.sy / imgHeight, element.swidth / imgWidth, element.sheight / imgHeight, 0, 0, 1, 1);
                                } else {
                                    context.drawImage(element.image.element, 0, 0, 1, 1);
                                }
                            } else {
                                if (element instanceof ImageRegion) {
                                    var imgWidth = element.image.element.width;
                                    var imgHeight = element.image.element.height;
                                    context.drawImage(element.image.element, element.sx * imgWidth, element.sy * imgHeight, element.swidth * imgWidth, element.sheight * imgHeight, element.x, -element.y, element.width, element.height);
                                } else {
                                    context.drawImage(element.image.element, element.x, -element.y, element.width, element.height);
                                }
                            }
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
                            } else if (element.width && element.height) {
                                // Rectangle
                                if (element.angle) {
                                    context.translate(element.x, -element.y);
                                    context.scale(element.width, element.height);
                                    // Rotate around the center
                                    context.translate(0.5, 0.5);
                                    context.rotate(element.angle);
                                    context.translate(-0.5, -0.5);
                                    context.fillRect(-0.5, -0.5, 1, 1);
                                } else {
                                    context.fillRect(element.x, -element.y, element.width, element.height);
                                }
                            }
                        }

                        context.restore();
                    }
                }
            }

            // Draw children
            if (entity.children) {
                entity.forEachChild(function (child) {
                    Layer.prototype.drawEntity(canvas, context, child);
                });
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

        // By default, cover up the areas outside the normal coordinate system
        // TODO: Add some way to override this behavior--it may not be needed everywhere
        var widthFactor = canvas.width / 640;
        var heightFactor = canvas.height / 480;
        context.fillStyle = 'black';
        if (widthFactor > heightFactor) {
            // Landscape
            var overlayWidth = Math.ceil((canvas.width - canvas.height * 4 / 3) / 2);
            context.fillRect(0, 0, overlayWidth, canvas.height);
            context.fillRect(canvas.width - overlayWidth, 0, canvas.width, canvas.height);
        } else if (widthFactor < heightFactor) {
            // Portrait
            var overlayHeight = Math.ceil((canvas.height - canvas.width * 3 / 4) / 2);
            context.fillRect(0, 0, canvas.width, overlayHeight);
            context.fillRect(0, canvas.height - overlayHeight, canvas.width, canvas.height);
        }
    }
};

function Rectangle(x, y, width, height, color) {
    this.x = (x !== undefined ? x : -0.5);
    this.y = (y !== undefined ? y : 0.5);
    this.width = width || 1;
    this.height = height || 1;
    this.color = color;
}

function Image(source, color, x, y, width, height, opacity) {
    this.x = (x !== undefined ? x : -0.5);
    this.y = (y !== undefined ? y : 0.5);
    this.width = width || 1;
    this.height = height || 1;
    this.color = color;
    this.opacity = opacity;
    this.loaded = false;

    // Get the image entry from the cache
    this.image = Radius.images.get(source);
}

function ImageRegion(source, color, sx, sy, swidth, sheight, x, y, width, height, opacity) {
    Image.call(this, source, color, x, y, width, height, opacity);
    this.sx = sx;
    this.sy = sy;
    this.swidth = swidth;
    this.sheight = sheight;
}

ImageRegion.prototype = Object.create(Image.prototype);

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

    addChild: function (child) {
        if (!this.children) {
            this.children = new LockingList();
        }

        this.children.append(child);
    },

    addChildren: function (children) {
        var count = children.length;
        for (var i = 0; i < count; i++) {
            this.addChild(children[i]);
        }
    },

    removeChild: function (child) {
        if (this.children) {
            this.children.remove(child);
        }
    },

    clearChildren: function () {
        if (this.children) {
            this.children.clear();
        }
    },

    forEachChild: function (f, that) {
        if (this.children) {
            this.children.forEach(f, that);
        }
    },

    updateChildren: function (ms) {
        if (this.children) {
            this.children.forEach(function (child) {
                if (child.update) {
                    child.update(ms);
                }

                // Check to see if this child should be removed
                if (child.dead) {
                    this.children.remove(child);
                }
            }, this);
        }
    },

    getChildCount: function () {
        if (this.children) {
            return this.children.getCount();
        }
        return 0;
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

// TODO: These aren't always used, so consider moving them to a library file or something
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
    var disableDefault = function (e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
    };

    window.addEventListener('keydown', function (e) {
        if (e.keyCode in keyCodeToName) {
            disableDefault(e);
            queuedKeyCodes.push(e.keyCode);
            queuedKeyStates.push(true);
        }
    }, false);

    window.addEventListener('keyup', function (e) {
        if (e.keyCode in keyCodeToName) {
            disableDefault(e);
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
    move: 3,
    out: 4
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
        // Propagate the event if this window doesn't have focus (this is needed to support keyboard input when hosted within an iframe)
        var neededForFocus = (document.activeElement && document.activeElement !== window && document.activeElement !== document.body);

        // Disable the default action since the layer will handle this event
        if (e.preventDefault && !neededForFocus) {
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

    canvas.addEventListener('mouseout', function (e) {
        disableDefault(e);
        queuedMouseEvents.push(MouseEvent.out);
        queuedMousePayloads.push([]);
    });

    this.process = function (mouseButtonPressed, mouseMoved, mouseOut) {
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

                    case MouseEvent.out:
                        mouseOut();
                        break;
                }
            }

            queuedMouseEvents.length = 0;
            queuedMousePayloads.length = 0;
        }
    };
}

var TouchEvent = {
    start: 1,
    end: 2,
    move: 3,
    cancel: 4
};

function TouchSerializer(canvas) {
    var queuedEvents = [];
    var queuedPayloads = [];
    var disableDefault = function (e) {
        // Disable the default action since the layer will handle this event
        if (e.preventDefault) {
            e.preventDefault();
        }
    }

    canvas.addEventListener('touchstart', function (e) {
        disableDefault(e);
        for (var i = 0; i < e.changedTouches.length; i++) {
            var touch = e.changedTouches[i];
            queuedEvents.push(TouchEvent.start);
            queuedPayloads.push([touch.clientX, touch.clientY, touch.identifier]);
        }
    });

    canvas.addEventListener('touchmove', function (e) {
        disableDefault(e);
        for (var i = 0; i < e.changedTouches.length; i++) {
            var touch = e.changedTouches[i];
            queuedEvents.push(TouchEvent.move);
            queuedPayloads.push([touch.clientX, touch.clientY, touch.identifier]);
        }
    });

    canvas.addEventListener('touchend', function (e) {
        disableDefault(e);
        for (var i = 0; i < e.changedTouches.length; i++) {
            var touch = e.changedTouches[i];
            queuedEvents.push(TouchEvent.end);
            queuedPayloads.push([touch.clientX, touch.clientY, touch.identifier]);
        }
    });

    canvas.addEventListener('touchcancel', function (e) {
        disableDefault(e);
        for (var i = 0; i < e.changedTouches.length; i++) {
            var touch = e.changedTouches[i];
            queuedEvents.push(TouchEvent.cancel);
            queuedPayloads.push([touch.identifier]);
        }
    });

    this.process = function (touched, touchMoved, touchCanceled) {
        var count = queuedEvents.length;
        if (count > 0) {
            for (var i = 0; i < count; i++) {
                var event = queuedEvents[i];
                var payload = queuedPayloads[i];
                switch (event) {
                    case TouchEvent.start:
                    case TouchEvent.end:
                        touched(payload[2], event == TouchEvent.start, payload[0], payload[1]);
                        break;

                    case TouchEvent.move:
                        touchMoved(payload[2], payload[0], payload[1]);
                        break;

                    case TouchEvent.cancel:
                        touchCanceled(payload[0]);
                        break;
                }
            }

            queuedEvents.length = 0;
            queuedPayloads.length = 0;
        }
    };
}

function ImageCache() {
    this.cache = {};
}

ImageCache.prototype.get = function (source) {
    // TODO: Retrieve the image on demand?
    var entry = this.cache[source];
    if (!entry) {
        entry = { loaded: false };
        this.cache[source] = entry;
    }
    return entry;
};

ImageCache.prototype.load = function (sources) {
    // Initialize count of images to load
    var batchCount = sources.length;
    var completedCount = 0;
    var handlers = {};
    var imageCache = this;
    for (var i = 0; i < batchCount; i++) {
        (function (i) {
            // Ensure an entry in the cache exists
            // TODO: Handle multiple requests to load the same image?
            var source = sources[i];
            var entry = imageCache.get(source);

            var image = document.createElement('img');
            entry.element = image;

            // Setup image-loading callbacks
            // TODO: Error handler
            image.onload = function () {
                // Make the image as loaded
                entry.loaded = true;

                // Call handlers, if provided
                if (++completedCount === batchCount) {
                    // Fulfilled
                    handler = handlers.fulfilled;
                    if (handler) {
                        handler();
                    }
                } else {
                    // Progress made
                    handler = handlers.progress;
                    if (handler) {
                        handler(completedCount / batchCount);
                    }
                }
            };

            // Start loading the image
            image.src = source;
        })(i);
    }

    return {
        then: function (fulfilledHandler, errorHandler, progressHandler) {
            // Check to see if we're already done
            if (completedCount === batchCount) {
                fulfilledHandler();
            } else {
                // Setup handlers since we're not done yet
                handlers.fulfilled = fulfilledHandler;
                handlers.progress = progressHandler;
            }
        }
    };
};

var RadiusSettings = {
    fullscreenOnly: false
};

var Radius = new function () {
    var keySerializer;
    var mouseSerializer;
    var touchSerializer;
    var list = [];
    var canvas;
    var context;

    this.images = new ImageCache();

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
            window.focus();

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
            var mouseOut = activeLayer.mouseOut;

            var touched = activeLayer.touched;
            var touchMoved = activeLayer.touchMoved;
            var touchCanceled = activeLayer.touchCanceled;

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
                    this.lastMouseCoordinates = localCoordinates;
                    activeLayer.mouseButtonPressed(button, pressed, localCoordinates[0], localCoordinates[1]);
                }
            }, function (globalX, globalY) {
                if (mouseMoved && activeLayer === list[0]) {
                    // TODO: Combine code with above
                    var canvasCoordinates = convertToCanvasCoordinates(globalX, globalY);
                    var canvasX = canvasCoordinates[0];
                    var canvasY = canvasCoordinates[1];
                    var localCoordinates = Transform2D.transform(transform, [canvasX, canvasY]);
                    this.lastMouseCoordinates = localCoordinates;
                    activeLayer.mouseMoved(localCoordinates[0], localCoordinates[1]);
                }
            }, function () {
                if (mouseOut && activeLayer === list[0]) {
                    activeLayer.mouseOut();
                }
            });

            touchSerializer.process(function (identifier, started, globalX, globalY) {
                if (touched && activeLayer === list[0]) {
                    var canvasCoordinates = convertToCanvasCoordinates(globalX, globalY);
                    var canvasX = canvasCoordinates[0];
                    var canvasY = canvasCoordinates[1];
                    var localCoordinates = Transform2D.transform(transform, [canvasX, canvasY]);
                    this.lastMouseCoordinates = localCoordinates;
                    activeLayer.touched(identifier, started, localCoordinates[0], localCoordinates[1]);
                }
            }, function (identifier, globalX, globalY) {
                if (touchMoved && activeLayer === list[0]) {
                    // TODO: Combine code with above
                    var canvasCoordinates = convertToCanvasCoordinates(globalX, globalY);
                    var canvasX = canvasCoordinates[0];
                    var canvasY = canvasCoordinates[1];
                    var localCoordinates = Transform2D.transform(transform, [canvasX, canvasY]);
                    this.lastMouseCoordinates = localCoordinates;
                    activeLayer.touchMoved(identifier, localCoordinates[0], localCoordinates[1]);
                }
            }, function (identifier) {
                if (touchCanceled && activeLayer === list[0]) {
                    activeLayer.touchCanceled(identifier);
                }
            });

            // Update entities
            activeLayer.update();

            // Check to see if the active layer changed
            var lastActiveLayer = activeLayer;
            activeLayer = list[0];

            // Update cursor, if needed
            var cursor = activeLayer.cursor || 'auto';
            if (this.lastMouseCoordinates) {
                // Check and see if the mouse is inside the canvas but outside the normal coordinate system
                var mouseX = this.lastMouseCoordinates[0];
                var mouseY = this.lastMouseCoordinates[1];
                if (mouseX < -320 || mouseX > 320 || mouseY < -240 || mouseY > 240) {
                    // Mouse is outside normal coordinate system, so force the cursor to be shown
                    cursor = 'auto';
                }
            }
            if (canvas.style.cursor !== cursor) {
                canvas.style.cursor = cursor;
            }

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
        keySerializer = new KeySerializer();
        mouseSerializer = new MouseSerializer(canvas);
        touchSerializer = new TouchSerializer(canvas);

        // Disable default touch behavior (e.g. pan/bounce) for the canvas
        canvas.setAttribute('style', 'touch-action: none; -ms-touch-action: none;');

        if (RadiusSettings.fullscreenOnly) {
            Radius.setFullscreen(true);
        }
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
