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
MovingObject.bounceClip = new AudioClip('sounds/bounce.mp3', true);

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
Goal.clip = new AudioClip('sounds/score.mp3');

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
Board.loseClip = new AudioClip('sounds/boom.mp3');

Board.prototype = Object.create(Entity.prototype);

Board.prototype.resetGoal = function () {
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
    Board.loseClip.play();
    this.player.clearMovingStates();
    this.children.push(this.player.createGhost());
    this.removeChild(this.player);
    this.paused = true;
    this.finishTimer = this.timer + Board.transitionPeriod;
    this.lost.fire(this.difficulty, this.score);
}

Board.prototype.captureGoal = function () {
    Goal.clip.play();
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

Board.prototype.setScore = function (score, internal) {
    this.score = score;
    this.scoreUpdated.fire(score, internal);
}

Board.prototype.setPoints = function (points) {
    this.points = points;
    this.pointsUpdated.fire(points);
}

Board.prototype.reset = function () {
    this.paused = false;
    this.finishTimer = 0;
    this.setScore(0, true);
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
    event.addListener(function (value, skipCallback) {
        valueDisplay.textElement.text = '' + value;

        if (valueDisplay.updatedCallback && !skipCallback) {
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
    this.children.push(this.scoreDisplay = new ValueDisplay(font, board.scoreUpdated, board.x - board.width / 2 + scoreLabel.getTotalWidth(), board.height / 2, 'left', addUpdateEffect));
    this.children.push(new ValueDisplay(font, board.pointsUpdated, board.x + board.width / 2, board.height / 2, 'right', addUpdateEffect));

    this.font = font;
    this.textHeight = textHeight;
    this.scoreLabel = scoreLabel;

    this.image = new Image('images/score.png', 'blue');

    // High score emphasis
    var textElement = new Text('New High Score!', this.font, 0, 0, 'center', 'middle');
    var textWidth = textElement.getTotalWidth();
    var background = new Image('images/score.png', 'blue', -textWidth / 2 - this.textHeight / 2, this.textHeight / 2, textWidth + this.textHeight, this.textHeight);
    background.opacity = 0.85;
    this.highScoreEmphasis = new Entity(board.x, board.y - this.textHeight * 2, 1, 1);
    this.highScoreEmphasis.elements = [background, textElement];
    this.children.push(this.highScoreEmphasis);
}

Display.prototype = Object.create(Entity.prototype);

Display.prototype.emphasizeHighScore = function () {
    Goal.clip.play();
    this.highScoreEmphasis.opacity = 1;
};

Display.prototype.emphasizeScore = function (newHighScore) {
    var content = this.scoreLabel.text + this.scoreDisplay.textElement.text;
    var textElement = new Text(content, this.font, 0, 0, 'left', 'middle');
    var textWidth = textElement.getTotalWidth();
    var background = this.image;
    background.x = -this.textHeight / 2;
    background.y = this.textHeight / 2;
    background.width = textWidth + this.textHeight;
    background.height = this.textHeight;
    background.opacity = 0.85;
    var scaleMax = 2
    var display = this;
    var ended = newHighScore ? function () { display.emphasizeHighScore(); } : undefined;

    this.children.push(this.bigScore = new ScriptedEntity([background, textElement],
        [[0, this.board.x - this.board.width / 2 + this.textHeight / 2, this.board.height / 2, 1, 1, 0, 1],
         [1000, this.board.x - textWidth * scaleMax / 2, this.board.y, scaleMax, scaleMax, 0, 1]],
         false,
         ended));
};

Display.prototype.reset = function () {
    this.highScoreEmphasis.opacity = 0;
    if (this.bigScore) {
        this.removeChild(this.bigScore);
        this.bigScore = null;
    }
};

function TouchJoystick(x, y, x1, y1, x2, y2) {
    Entity.call(this);
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.outline = new Entity(x, y, 64, 64);
    this.outline.elements = [new Image('images/joystick.png', 'gray', -0.5, 0.5, 1, 1)];
    this.outline.opacity = 0.7;
    this.reticle = new Entity(x, y, 32, 32);
    this.reticle.elements = [new Rectangle(-0.05, 0.5, 0.1, 1), new Rectangle(-0.5, 0.05, 1, 0.1)];

    this.manipulationStarted = new Event();
    this.manipulationUpdated = new Event();
    this.manipulationEnded = new Event();

    this.manipulationRunning = false;
    this.children = [this.outline, this.reticle];
}

TouchJoystick.maxDistance = 48;
TouchJoystick.inactiveDistance = 16;
TouchJoystick.prototype = Object.create(Entity.prototype);

TouchJoystick.prototype.intersects = function (x, y) {
    return (x >= this.x1 && x <= this.x2 && y >= this.y1 && y <= this.y2);
};

TouchJoystick.prototype.mouseButtonPressed = function (button, pressed, x, y) {
    if (button == MouseButton.primary) {
        if (pressed) {
            this.outline.x = x;
            this.outline.y = y;
            this.reticle.x = x;
            this.reticle.y = y;

            this.manipulationRunning = true;
            this.manipulationStarted.fire();
        } else {
            this.outline.x = this.reticle.x;
            this.outline.y = this.reticle.y;
            this.manipulationRunning = false;
            this.manipulationEnded.fire();
        }
    }
};

TouchJoystick.prototype.mouseMoved = function (x, y) {
    if (this.manipulationRunning) {
        // Check to see if the distance is enough to register
        var dx = x - this.reticle.x;
        var dy = y - this.reticle.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var angle = Math.atan2(dy, dx);
        if (distance >= TouchJoystick.inactiveDistance) {
            this.manipulationUpdated.fire(angle);
        } else {
            this.manipulationUpdated.fire();
        }

        // Update the outline
        this.outline.x = this.reticle.x + Math.min(distance, TouchJoystick.maxDistance) * Math.cos(angle);
        this.outline.y = this.reticle.y + Math.min(distance, TouchJoystick.maxDistance) * Math.sin(angle);
    }
};

function Tutorial(steps) {
    this.steps = steps;
    this.reset();
}

Tutorial.prototype = {
    constructor: Tutorial,

    setIndex: function (index) {
        // Remove listener for previous index
        if (this.handler) {
            this.step[0].removeListener(this.handler);
        }

        // Add listener for new index
        if (index < this.steps.length) {
            var tutorial = this;
            var step = this.steps[index];
            this.handler = function () {
                // Setup next step
                tutorial.setIndex(index + 1);

                // Call the supplied callback
                step[1].apply(null, arguments);
            };

            this.step = step;
            step[0].addListener(this.handler);
        } else {
            this.handler = null;
        }
    },

    reset: function () {
        this.setIndex(0);
    },

    cancel: function () {
        this.setIndex(this.steps.length);
    }
};

function TutorialDisplay(x, y, width) {
    var tutorialPadding = 4;
    var tutorialTextHeight = 24;
    this.tutorialTextWidth = width - tutorialPadding * 2;
    Entity.call(this, x + tutorialPadding, y - tutorialTextHeight);

    this.tutorialText = new Text('', tutorialTextHeight + 'px sans-serif', 0, 0, 'left', undefined, tutorialTextHeight);
    this.elements = [this.tutorialText];
}

TutorialDisplay.prototype = Object.create(Entity.prototype);
TutorialDisplay.displayPeriod = 2000;
TutorialDisplay.fadePeriod = 500;
TutorialDisplay.state = {
    idle: 0,
    fadingIn: 1,
    fadingOut: 2,
    waiting: 3
};

TutorialDisplay.prototype.clear = function () {
    this.opacity = 0;
    this.tutorialText.lines = null;
    this.pendingLines = [];
    this.state = TutorialDisplay.state.idle;
}

TutorialDisplay.prototype.setText = function (text) {
    var lines = text ? Radius.wrapText(this.tutorialText.font, this.tutorialTextWidth, text) : null;
    this.pendingLines.push(lines);
};

TutorialDisplay.prototype.update = function (ms) {
    switch (this.state) {
        case TutorialDisplay.state.fadingIn:
            this.timer = Math.max(0, this.timer - ms);
            this.opacity = (TutorialDisplay.fadePeriod - this.timer) / TutorialDisplay.fadePeriod;
            if (this.timer === 0) {
                this.pendingLines.splice(0, 1);
                this.timer = TutorialDisplay.displayPeriod;
                this.state = TutorialDisplay.state.waiting;
            }
            break;

        case TutorialDisplay.state.fadingOut:
            this.timer = Math.max(0, this.timer - ms);
            this.opacity = this.timer / TutorialDisplay.fadePeriod;
            if (this.timer === 0) {
                this.tutorialText.lines = this.pendingLines[0];
                this.timer = TutorialDisplay.fadePeriod;
                this.state = TutorialDisplay.state.fadingIn;
            }
            break;

        case TutorialDisplay.state.waiting:
            this.timer = Math.max(0, this.timer - ms);
            if (this.timer === 0) {
                this.state = TutorialDisplay.state.idle;
            }
            break;

        default:
            if (this.pendingLines.length > 0) {
                this.timer = TutorialDisplay.fadePeriod;
                if (this.tutorialText.lines) {
                    this.state = TutorialDisplay.state.fadingOut;
                } else {
                    this.tutorialText.lines = this.pendingLines[0];
                    this.state = TutorialDisplay.state.fadingIn;
                }
            }
            break;
    }
};

function GameLayer() {
    Layer.apply(this);
    this.done = false;
    this.board = this.addEntity(new Board(-110, 0, 400, 400));
    this.display = this.addEntity(new Display(this.board));
    this.started = new Event();
    this.moved = new Event();

    // Touch controls
    var gameLayer = this;
    var board = this.board;
    var bigDistance = this.board.width * 2; // Needs to be larger than width or height
    var boardX2 = this.board.x + this.board.width / 2;
    this.touchJoystick = this.addEntity(new TouchJoystick(boardX2 + (320 - boardX2) / 2, -200, boardX2, -10000, 10000, 10000));
    this.touchJoystick.manipulationStarted.addListener(function () {
        gameLayer.touchManipulationInProgress = true;
    });
    this.touchJoystick.manipulationEnded.addListener(function () {
        gameLayer.touchManipulationInProgress = false;
        board.player.clearTarget();
    });
    this.touchJoystick.manipulationUpdated.addListener(function (angle) {
        if (angle !== undefined) {
            gameLayer.moved.fire();
            gameLayer.board.player.setTarget(bigDistance * Math.cos(angle), bigDistance * Math.sin(angle));
        } else {
            gameLayer.board.player.clearTarget();
        }
    });

    this.board.reset();

    var tutorialDisplay = new TutorialDisplay(this.board.x + (this.board.width / 2), 200, 320 - (this.board.x + (this.board.width / 2)));
    this.tutorialDisplay = tutorialDisplay;
    this.tutorial = new Tutorial([
        [this.started, function () { tutorialDisplay.setText('Move the green square using one of the following:\n\na) Arrow keys\n\nb) Clicking or pressing on the game board\n\nc) Using the touch joystick to the right of the game board.'); }],
        [this.moved, function () { tutorialDisplay.setText('Score points by capturing the red square.\n\nThe faster you capture it, the more points you score.'); }],
        [this.board.scoreUpdated, function () { tutorialDisplay.setText('Avoid the white squares!\n\nIf you hit a white square, the game will end.'); }],
        [this.board.scoreUpdated, function () { }],
        [this.board.scoreUpdated, function () { }],
        [this.board.scoreUpdated, function () { }],
        [this.board.scoreUpdated, function () { }],
        [this.board.scoreUpdated, function () { }],
        [this.board.scoreUpdated, function () { tutorialDisplay.setText(null); }]
    ]);

    var display = this.display;
    this.board.lost.addListener(function (difficulty, score) {
        var newHighScore = false;
        if (score > HighScores.get(difficulty)) {
            newHighScore = true;
            HighScores.set(difficulty, score);
        }

        display.emphasizeScore(newHighScore);
    });

    this.board.completed.addListener(function () {
        gameLayer.done = true;
    });

    var exitIfDone = function (pressed) {
        if (pressed && gameLayer.done) {
            gameLayer.endGame();
        }
    };

    this.keyPressedHandlers = {
        left: function (pressed) {
            gameLayer.moved.fire();
            board.player.setMovingLeftState(pressed);
        },

        right: function (pressed) {
            gameLayer.moved.fire();
            board.player.setMovingRightState(pressed);
        },

        up: function (pressed) {
            gameLayer.moved.fire();
            board.player.setMovingUpState(pressed);
        },

        down: function (pressed) {
            gameLayer.moved.fire();
            board.player.setMovingDownState(pressed);
        },

        enter: exitIfDone,
        space: exitIfDone,
        escape: exitIfDone
    };
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

GameLayer.prototype.start = function (showTutorial) {
    if (showTutorial) {
        this.tutorial.reset();
        this.tutorialDisplay.clear();
        if (!this.tutorialDisplayAdded) {
            this.addEntity(this.tutorialDisplay);
            this.tutorialDisplayAdded = true;
        }
    } else {
        this.tutorial.cancel();
        if (this.tutorialDisplayAdded) {
            this.removeEntity(this.tutorialDisplay);
            this.tutorialDisplayAdded = false;
        }
    }

    this.started.fire();
    Radius.pushLayer(this);
};

GameLayer.prototype.endGame = function () {
    this.reset();
    this.done = true;
    Radius.popLayer();
};

GameLayer.prototype.mouseButtonPressed = function (button, pressed, x, y) {
    if (button == MouseButton.primary) {
        if (this.done) {
            if (pressed) {
                this.endGame();
            }
        } else {
            // Check to see if this should be routed to the touch joystick (i.e.g either a manipulation is running
            // or this is a new interaction originating within the touch joystick's area)
            if (this.touchManipulationInProgress || (pressed && this.touchJoystick.intersects(x, y))) {
                this.touchJoystick.mouseButtonPressed(button, pressed, x, y);
            } else {
                if (pressed) {
                    this.moved.fire();
                    this.board.player.setTarget((x - this.board.x) / this.board.width, (y - this.board.y) / this.board.height);
                } else {
                    this.board.player.clearTarget();
                }
            }
        }
    }
};

GameLayer.prototype.mouseMoved = function (x, y) {
    if (this.touchManipulationInProgress) {
        this.touchJoystick.mouseMoved(x, y);
    } else {
        this.board.player.updateTarget((x - this.board.x) / this.board.width, (y - this.board.y) / this.board.height);
    }
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

function StaticMenu(form) {
    FormLayer.call(this, form);
}

StaticMenu.prototype = Object.create(FormLayer.prototype);

StaticMenu.prototype.mouseButtonPressed = function (button, pressed, x, y) {
    if (pressed) {
        Radius.popLayer();
    }
};

StaticMenu.prototype.keyPressed = function (key, pressed) {
    if (pressed) {
        Radius.popLayer();
    }
};

HighScores = {
    constructKey: function (level) {
        return 'highScore' + Difficulty.levelToName[level];
    },

    get: function (level) {
        return parseInt(localStorage[HighScores.constructKey(level)]) || 0;
    },

    set: function (level, score) {
        localStorage[HighScores.constructKey(level)] = score;
    }
};

function HighScoresMenu() {
    var controls = [];
    this.labels = [];
    var difficultyLevelCount = Difficulty.levelToName.length;
    for (var i = 0; i < difficultyLevelCount; i++) {
        var name = Difficulty.levelToName[i];
        controls.push(new Label(name + ': '));
        this.labels[i] = new Label('', 'right');
        controls.push(this.labels[i]);
    }

    StaticMenu.call(this, new NestedGridForm(1, [
        new Title('High Scores'),
        new Separator(),
        new NestedGridForm(2, controls)
    ]));
}

HighScoresMenu.prototype = Object.create(StaticMenu.prototype);

HighScoresMenu.prototype.formShown = function () {
    // Update all the scores
    var count = this.labels.length;
    for (var i = 0; i < count; i++) {
        this.labels[i].setText('' + HighScores.get(i));
    }
};

function MainMenu() {
    this.gameLayer = new GameLayer();

    var difficultyChoice = new Choice('Difficulty', Difficulty.levelToName);
    var mainMenu = this;
    difficultyChoice.choiceChanged.addListener(function (difficultyName) {
        mainMenu.difficulty = Difficulty.nameToLevel[difficultyName];
    });

    var audioOptions = ['On', 'Muted'];
    var audioChoice = new Choice('Audio', audioOptions, Audio.muted ? 1 : 0);
    audioChoice.choiceChanged.addListener(function (text) {
        Audio.setMuted(text === audioOptions[1]);
    });

    var highScoresMenu = new HighScoresMenu();
    this.tutorialShown = localStorage['tutorialShown'] === 'true';
    var options = [
        new Separator(),
        new Button('Start New Game', function () { mainMenu.startNewGame(!mainMenu.tutorialShown); }),
        difficultyChoice,
        audioChoice,
        new Separator(),
        new Button('Show High Scores', function () { Radius.pushLayer(highScoresMenu); }),
        new Button('Learn How to Play', function () { mainMenu.startNewGame(true); })
    ];

    // Add the "fullscreen" choice, if necessary
    var fullscreenOnly = RadiusSettings && RadiusSettings.fullscreenOnly;
    if (!fullscreenOnly) {
        var fullscreenOptions = ['Off', 'On'];
        var fullscreenChoice = new Choice('Fullscreen', fullscreenOptions);
        fullscreenChoice.choiceChanged.addListener(function (text) {
            Radius.setFullscreen(text === fullscreenOptions[1]);
        });
        options.splice(3, 0, fullscreenChoice);
    }

    FormLayer.call(this, new NestedGridForm(1, [
        new NestedCenterFlowForm(3, [
            new Title('Avoision'),
            new Label('  '),
            new Logo()
        ]),
        new NestedFlowForm(1, options)
    ]));
}

MainMenu.prototype = Object.create(FormLayer.prototype);

MainMenu.prototype.startNewGame = function (showTutorial) {
    if (this.difficulty) {
        this.gameLayer.setDifficulty(this.difficulty);
    }

    this.gameLayer.reset();
    this.gameLayer.start(showTutorial);
    if (showTutorial) {
        this.tutorialShown = true;
        localStorage['tutorialShown'] = true;
    }
};

window.addEventListener('DOMContentLoaded', function () {
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new MainMenu());
});
