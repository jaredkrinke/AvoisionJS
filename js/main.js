/// <reference path="radius.js" />
/// <reference path="radius-ui.js" />

function MovingObject(x, y, width, height, vx, vy) {
    Entity.call(this, x, y, width, height);
    this.v = {
        x: vx,
        y: vy
    };
}

MovingObject.prototype = Object.create(Entity.prototype);
MovingObject.bounceClip = new AudioClip('sounds/bounce.mp3');

MovingObject.prototype.updateAxis = function (ms, axis, axisSize) {
    var v = this.v[axis];
    var axisPosition = this[axis] + v * ms;
    if (Math.abs(axisPosition) + axisSize / 2 > 0.5) {
        // Reverse direction
        if (v > 0) {
            axisPosition = 0.5 - axisSize / 2 - 0.01;
        } else {
            axisPosition = -0.5 + axisSize / 2 + 0.01;
        }

        this.v[axis] = -v;
        MovingObject.bounceClip.play();
    }

    this[axis] = axisPosition;
};

MovingObject.prototype.update = function (ms) {
    this.updateAxis(ms, 'x', this.width);
    this.updateAxis(ms, 'y', this.height);
};

function Enemy(x, y, width, height, vx, vy) {
    MovingObject.call(this, x, y, width, height, vx, vy);
    this.elements = [Enemy.image];
}

Enemy.prototype = Object.create(MovingObject.prototype);
Enemy.image = new Image('images/enemy.png', 'white');

function Goal() {
    MovingObject.call(this, 0 ,0, Board.enemyWidth, Board.enemyWidth, 0, 0);
    this.elements = [Goal.image];
}

Goal.prototype = Object.create(MovingObject.prototype);
Goal.image = new Image('images/goal.png', 'red');

Goal.prototype.createGhost = function () {
    return new Ghost(this, 500, 5);
};

function Player() {
    Entity.call(this);
    this.v = [0, 0, 0, 0];
    this.target = [];
    this.speed = 0.6 / 1000;
    this.width = 1 / 30;
    this.height = 1 / 30;
    this.elements = [Player.image];
}

Player.prototype = Object.create(Entity.prototype);
Player.image = new Image('images/player.png', 'green');
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

function Board(x, y, width, height) {
    Entity.call(this, x, y, width, height);
    this.elements = [Board.image];

    this.paused = false;
    this.difficulty = Difficulty.nameToLevel.Easy;
    this.score = 0;
    this.player = new Player();
    this.goal = new Goal();
    this.scoreUpdated = new Event();
    this.points = 0;
    this.pointsUpdated = new Event();
    this.points = 30;
    this.lost = new Event();
    this.completed = new Event();
}

Board.image = new Image('images/background.jpg', 'blue');
Board.pointProgression = [30, 20, 15, 10, 8, 7, 6, 5, 4, 3, 2, 1, 0];
Board.timeout = 19000;
Board.transitionPeriod = 1000;
Board.enemyWidth = 1 / 30;
Board.enemyWidthMin = 1 / 90;
Board.enemyWidthMax = 1 / 15;
Board.enemySpeed = 0.2 / 1000;
Board.enemySpeedMin = 0.1 / 1000;
Board.enemySpeedMax = 0.6 / 1000;
Board.goalSpeed = 0.1 / 1000;
Board.goalDirectionPeriod = 3000;

Board.prototype = Object.create(Entity.prototype);

Board.prototype.resetGoal = function () {
    // TODO: Difficulty
    var position = this.getSafePosition(this.goal.width, this.goal.height);
    this.goal.x = position[0];
    this.goal.y = position[1];
    this.setPoints(Board.pointProgression[0] * (this.difficulty + 1));
    this.timer = 0;

    // The goal moves on hard
    this.goal.va = (this.difficulty >= Difficulty.nameToLevel.Hard ? Board.goalSpeed : 0);
    this.resetGoalDirection();
};

Board.prototype.resetGoalDirection = function () {
    var v = this.goal.va;

    // Direction
    if (Math.random() > 0.5) {
        v = -v;
    }

    // Axis
    if (Math.random() > 0.5) {
        this.goal.v.x = v;
        this.goal.v.y = 0;
    } else {
        this.goal.v.x = 0;
        this.goal.v.y = v;
    }

    this.goalDirectionTimer = this.timer + Board.goalDirectionPeriod * Math.random();
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
    var size = Board.enemyWidth;
    var speed = Board.enemySpeed;
    var speedX = 0;
    var speedY = 0;
    var position = this.getSafePosition(size, size);

    // Enemy speeds vary on normal
    if (this.difficulty >= Difficulty.nameToLevel.Normal) {
        speed = Board.enemySpeedMin + (Board.enemySpeedMax - Board.enemySpeedMin) * Math.random();
    }

    // Enemies are faster and their sizes vary on hard
    if (this.difficulty >= Difficulty.nameToLevel.Hard) {
        speed *= 1.1;
        size = Board.enemyWidthMin + (Board.enemyWidthMax - Board.enemyWidthMin) * Math.random();
    }

    if (Math.random() >= 0.5) {
        speedX = speed;
    } else {
        speedY = speed;
    }

    // Enemies can move diagonally on hard
    if (this.difficulty >= Difficulty.nameToLevel.Hard && Math.random() > 0.5) {
        var otherSpeed = Board.enemySpeedMin + (Board.enemySpeedMax - Board.enemySpeedMin) * Math.random();
        if (speedX === 0) {
            speedX = otherSpeed;
        } else {
            speedY = otherSpeed;
        }
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
    this.finishTimer = this.timer + Board.transitionPeriod;
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
            // Update goal direction
            if (this.difficulty >= Difficulty.nameToLevel.Hard && this.timer >= this.goalDirectionTimer) {
                this.resetGoalDirection();
            }

            var points = (this.difficulty + 1) * Board.pointProgression[Math.max(0, Math.min(Board.pointProgression.length - 1, Math.floor(this.timer / Board.timeout * Board.pointProgression.length)))];
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
    } else {
        if (this.finishTimer > 0 && this.timer >= this.finishTimer) {
            this.completed.fire();
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
    this.paused = false;
    this.finishTimer = 0;
    this.setScore(0);
    this.children = [this.player, this.goal];
    this.resetGoal();
};

Board.prototype.setDifficulty = function (difficulty) {
    this.difficulty = difficulty;
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
    this.board = board;
    this.children = [];

    var font = '32px sans-serif';
    var textHeight = 32;
    var display = this;
    var addUpdateEffect = function () {
        var sign = (this.align === 'right') ? 1 : -1;
        display.children.push(new Ghost(this, 150, 2, undefined, undefined, sign * this.textElement.getTotalWidth() / 2, -textHeight / 2));
    }

    var scoreLabel = new Text('Score: ', font, board.x - board.width / 2, board.height / 2, 'left', 'bottom');
    var padding = (new Text('00', font)).getTotalWidth();
    var pointLabel = new Text('Points: ', font, board.x + board.width / 2 - padding, board.height / 2, 'right', 'bottom');
    this.elements = [scoreLabel, pointLabel];
    // TODO: Don't add the effect when the game first starts
    this.children.push(this.scoreDisplay = new ValueDisplay(font, board.scoreUpdated, board.x - board.width / 2 + scoreLabel.getTotalWidth(), board.height / 2, 'left', addUpdateEffect));
    this.children.push(new ValueDisplay(font, board.pointsUpdated, board.x + board.width / 2, board.height / 2, 'right', addUpdateEffect));

    this.font = font;
    this.textHeight = textHeight;
    this.scoreLabel = scoreLabel;

    this.image = new Image('images/score.png', 'blue');
}

Display.prototype = Object.create(Entity.prototype);

Display.prototype.emphasizeScore = function () {
    var content = this.scoreLabel.text + this.scoreDisplay.textElement.text;
    var textElement = new Text(content, this.font, 0, 0, 'left', 'middle');
    var textWidth = textElement.getTotalWidth();
    var background = this.image;
    background.x = -this.textHeight / 2;
    background.y = this.textHeight / 2;
    background.width = textWidth + this.textHeight;
    background.height = this.textHeight;
    background.opacity = 0.85;
    var scaleMax = 2;
    this.children.push(this.bigScore = new ScriptedEntity([background, textElement],
        [[0, this.board.x - this.board.width / 2 + this.textHeight / 2, this.board.height / 2, 1, 1, 0, 1],
         [1000, this.board.x - textWidth * scaleMax / 2, this.board.y, scaleMax, scaleMax, 0, 1]]));
};

Display.prototype.reset = function () {
    // TODO: Suppress effects?
    // TODO: There is some weird flashing when switching to a second game...
    if (this.bigScore) {
        this.removeChild(this.bigScore);
        this.bigScore = null;
    }
};

function AdaptiveJoystick(x1, y1, x2, y2) {
    Entity.call(this);
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    // TODO: Use outlined circles instead?
    this.outline = new Entity(0, 0, 64, 64);
    this.outline.elements = [new Rectangle(-0.5, 0.5, 1, 1, 'gray')];
    this.outline.opacity = 0.7;
    this.reticle = new Entity(0, 0, 48, 48);
    this.reticle.elements = [new Rectangle(-0.05, 0.5, 0.1, 1), new Rectangle(-0.5, 0.05, 1, 0.1)];

    this.manipulationStarted = new Event();
    this.manipulationUpdated = new Event();
    this.manipulationEnded = new Event();

    this.manipulationRunning = false;
    this.children = [];
}

// TODO: Rename the class and these two variables
AdaptiveJoystick.maxOffset = 48;
AdaptiveJoystick.minOffset = 16;
AdaptiveJoystick.prototype = Object.create(Entity.prototype);

AdaptiveJoystick.prototype.intersects = function (x, y) {
    return (x >= this.x1 && x <= this.x2 && y >= this.y1 && y <= this.y2);
};

AdaptiveJoystick.prototype.mouseButtonPressed = function (button, pressed, x, y) {
    if (button == MouseButton.primary) {
        if (pressed) {
            // Show the joystick
            this.outline.x = x;
            this.outline.y = y;
            this.reticle.x = x;
            this.reticle.y = y;
            this.children.push(this.outline);
            this.children.push(this.reticle);

            this.manipulationRunning = true;
            this.manipulationStarted.fire();
        } else {
            // Hide the joystick
            this.children.length = 0;
            this.manipulationRunning = false;
            this.manipulationEnded.fire();
        }
    }
};

AdaptiveJoystick.prototype.mouseMoved = function (x, y) {
    if (this.manipulationRunning) {
        // Check to see if the distance is enough to register
        var dx = x - this.reticle.x;
        var dy = y - this.reticle.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var angle = Math.atan2(dy, dx);
        if (distance >= AdaptiveJoystick.minOffset) {
            this.manipulationUpdated.fire(angle);
        } else {
            this.manipulationUpdated.fire();
        }

        // Update the outline
        this.outline.x = this.reticle.x + Math.min(distance, AdaptiveJoystick.maxOffset) * Math.cos(angle);
        this.outline.y = this.reticle.y + Math.min(distance, AdaptiveJoystick.maxOffset) * Math.sin(angle);
    }
};

function GameLayer() {
    Layer.apply(this);
    this.done = false;
    this.board = this.addEntity(new Board(-110, 0, 400, 400));
    this.display = this.addEntity(new Display(this.board));

    // Touch controls
    var gameLayer = this;
    var board = this.board;
    var bigDistance = this.board.width * 2; // Needs to be larger than width or height
    this.touchJoystick = this.addEntity(new AdaptiveJoystick(this.board.x + this.board.width / 2, -10000, 10000, 10000));
    this.touchJoystick.manipulationStarted.addListener(function () {
        gameLayer.touchManipulationInProgress = true;
    });
    this.touchJoystick.manipulationEnded.addListener(function () {
        gameLayer.touchManipulationInProgress = false;
        board.player.clearTarget();
    });
    this.touchJoystick.manipulationUpdated.addListener(function (angle) {
        if (angle) {
            gameLayer.board.player.setTarget(bigDistance * Math.cos(angle), bigDistance * Math.sin(angle));
        } else {
            gameLayer.board.player.clearTarget();
        }
    });

    this.board.reset();

    var display = this.display;
    this.board.lost.addListener(function () {
        display.emphasizeScore();
    });

    this.board.completed.addListener(function () {
        gameLayer.done = true;
    });

    this.keyPressedHandlers = {
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
        },

        enter: function (pressed) {
            // TODO: Really, any key should be able to quit, but this will require modifying the event handling...
            if (pressed && gameLayer.done) {
                gameLayer.endGame();
            }
        }
    };

    // TODO: Why aren't these in the prototype instead?
    this.mouseButtonPressed = function (button, pressed, x, y) {
        if (button == MouseButton.primary) {
            if (gameLayer.done) {
                if (pressed) {
                    gameLayer.endGame();
                }
            } else {
                // Check to see if this should be routed to the touch joystick (i.e.g either a manipulation is running
                // or this is a new interaction originating within the touch joystick's area)
                if (gameLayer.touchManipulationInProgress || (pressed && gameLayer.touchJoystick.intersects(x, y))) {
                    gameLayer.touchJoystick.mouseButtonPressed(button, pressed, x, y);
                } else {
                    if (pressed) {
                        board.player.setTarget((x - board.x) / board.width, (y - board.y) / board.height);
                    } else {
                        board.player.clearTarget();
                    }
                }
            }
        }
    };

    this.mouseMoved = function (x, y) {
        if (gameLayer.touchManipulationInProgress) {
            gameLayer.touchJoystick.mouseMoved(x, y);
        } else {
            board.player.updateTarget((x - board.x) / board.width, (y - board.y) / board.height);
        }
    }
}

GameLayer.prototype = Object.create(Layer.prototype);

GameLayer.prototype.reset = function () {
    this.done = false;
    this.board.reset();
    this.display.reset();
};

GameLayer.prototype.setDifficulty = function (difficulty) {
    this.board.setDifficulty(difficulty);
};

GameLayer.prototype.start = function () {
    Radius.pushLayer(this);
};

GameLayer.prototype.endGame = function () {
    this.reset();
    this.done = true;
    Radius.popLayer();
};

Difficulty = {
    levelToName: ['Easy', 'Normal', 'Hard'],
    nameToLevel: {
        Easy: 0,
        Normal: 1,
        Hard: 2
    }
};

function Logo() {
    Entity.call(this);
    this.desiredWidth = Title.textHeight;
    this.desiredHeight = Title.textHeight;

    // Animation
    var chaseX = 0.2;
    var chaseY = -0.2;
    var chaseX2 = 0.8;
    var chaseY2 = -0.8;
    var chaseSize = 0.25;
    var chasePeriod = 3000;

    var background = new Entity(0.5, -0.5, 0.95, 0.95);
    background.elements = [Board.image];
    this.children = [
        background,
        new ScriptedEntity([Player.image], [
            [0, chaseX, chaseY, chaseSize, chaseSize, 0, 1],
            [chasePeriod / 4, chaseX2, chaseY, chaseSize, chaseSize, 0, 1],
            [chasePeriod / 4, chaseX2, chaseY2, chaseSize, chaseSize, 0, 1],
            [chasePeriod / 4, chaseX, chaseY2, chaseSize, chaseSize, 0, 1],
            [chasePeriod / 4, chaseX, chaseY, chaseSize, chaseSize, 0, 1],
        ], true),
        new ScriptedEntity([Goal.image], [
            [0, chaseX2, chaseY, chaseSize, chaseSize, 0, 1],
            [chasePeriod / 4, chaseX2, chaseY2, chaseSize, chaseSize, 0, 1],
            [chasePeriod / 4, chaseX, chaseY2, chaseSize, chaseSize, 0, 1],
            [chasePeriod / 4, chaseX, chaseY, chaseSize, chaseSize, 0, 1],
            [chasePeriod / 4, chaseX2, chaseY, chaseSize, chaseSize, 0, 1],
        ], true),
        new ScriptedEntity([Enemy.image], [
            [0, chaseX, chaseY2, chaseSize, chaseSize, 0, 1],
            [chasePeriod / 4, chaseX, chaseY, chaseSize, chaseSize, 0, 1],
            [chasePeriod / 4, chaseX2, chaseY, chaseSize, chaseSize, 0, 1],
            [chasePeriod / 4, chaseX2, chaseY2, chaseSize, chaseSize, 0, 1],
            [chasePeriod / 4, chaseX, chaseY2, chaseSize, chaseSize, 0, 1],
        ], true),
    ];
}

Logo.prototype = Object.create(Entity.prototype);

Logo.prototype.setLayer = function (layer) {
    layer.addEntity(this);
};

Logo.prototype.getPosition = function () {
    return [this.x, this.y];
};

Logo.prototype.setPosition = function (x, y) {
    this.x = x;
    this.y = y;
};

Logo.prototype.getActive = function () {
    return false;
}

Logo.prototype.getMinimumSize = function () {
    return [this.desiredWidth, this.desiredHeight];
}

Logo.prototype.getDesiredSize = Logo.prototype.getMinimumSize;
Logo.prototype.getSize = Logo.prototype.getMinimumSize;

Logo.prototype.setSize = function (width, height) {
    // Maintain aspect ratio
    this.desiredWidth = Math.max(width, height);
    this.desiredHeight = this.desiredWidth;
    this.width = this.desiredWidth;
    this.height = this.desiredHeight;
};

function InstructionsMenu() {
    var textHeight = 18;
    var font = '18px sans-serif';
    FormLayer.call(this, new NestedGridForm(1, [
        new Title('How to Play'),
        new NestedFlowForm(1, [
            new Label('', null, textHeight, font),
            new Label('', null, textHeight, font),
            new Label('MOVE the green square using the arrow keys,', null, textHeight, '18px sans-serif'),
            new Label('clicking/tapping on the game area,', null, textHeight, font),
            new Label('or with the virtual joystick to the right of the game', null, textHeight, font),
            new Label('', null, textHeight, font),
            new Label('HIT the red square to score points', null, textHeight, font),
            new Label('(the faster you get to it, the more points you score)', null, textHeight, font),
            new Label('', null, textHeight, font),
            new Label('AVOID the obstacles that appear', null, textHeight, font),
            new Label('', null, textHeight, font),
            new Label('COMPETE to get the highest score!', null, textHeight, font)
        ])
    ]));
}

InstructionsMenu.prototype = Object.create(FormLayer.prototype);

// TODO: These should ideally be consolidated in an "inputReceived" handler
InstructionsMenu.prototype.mouseButtonPressed = function (button, pressed, x, y) {
    if (pressed) {
        Radius.popLayer();
    }
};

InstructionsMenu.prototype.keyPressed = function (key, pressed) {
    if (pressed) {
        Radius.popLayer();
    }
};

function MainMenu() {
    this.gameLayer = new GameLayer();

    var difficultyChoice = new Choice('Difficulty', Difficulty.levelToName);
    var mainMenu = this;
    difficultyChoice.choiceChanged.addListener(function (difficultyName) {
        mainMenu.difficulty = Difficulty.nameToLevel[difficultyName];
    });

    var fullscreenOptions = ['Off', 'On'];
    var fullscreenChoice = new Choice('Fullscreen', fullscreenOptions);
    fullscreenChoice.choiceChanged.addListener(function (text) {
        Radius.setFullscreen(text === fullscreenOptions[1]);
    });

    var audioOptions = ['On', 'Muted'];
    var audioChoice = new Choice('Audio', audioOptions);
    audioChoice.choiceChanged.addListener(function (text) {
        Audio.muted = (text === audioOptions[1]);
    });

    var instructionsMenu = new InstructionsMenu();
    FormLayer.call(this, new NestedGridForm(1, [
        new NestedCenterFlowForm(3, [
            new Title('Avoision'),
            new Label('  '),
            new Logo()
        ]),
        new NestedFlowForm(1, [
            new Separator(),
            new Button('Start New Game', function () { mainMenu.startNewGame(); }),
            difficultyChoice,
            fullscreenChoice,
            audioChoice,
            new Separator(),
            new Button('Learn How to Play', function () { Radius.pushLayer(instructionsMenu); })
        ])
    ]));
}

MainMenu.prototype = Object.create(FormLayer.prototype);

MainMenu.prototype.startNewGame = function () {
    // TODO: Instructions
    if (this.difficulty) {
        this.gameLayer.setDifficulty(this.difficulty);
    }

    this.gameLayer.reset();
    this.gameLayer.start();
};

window.onload = function () {
    // TODO: Consider automatic resizing (e.g. to fill the screen)
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new MainMenu());
}
