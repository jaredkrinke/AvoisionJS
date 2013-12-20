/// <reference path="radius.js" />

function Label(text, alignment) {
    Entity.apply(this);
    // TODO: Need to set font...
    this.elements = [this.textElement = new Text(text, '10px sans-serif')];
    // TODO: Need to account for font height
    this.totalHeight = 10;
}

Label.prototype = Object.create(Entity.prototype);

Label.prototype.setLayer = function (layer) {
    layer.addEntity(this);
};

Label.prototype.getPosition = function () {
    return [this.x, this.y + this.totalHeight];
};

Label.prototype.setPosition = function (x, y) {
    this.x = x;
    this.y = y - this.totalHeight;
};

Label.prototype.getActive = function () {
    return false;
};

Label.prototype.getMinimumSize = function () {
    return [Radius.getTextWidth(this.font, this.text), this.totalHeight];
};

Label.prototype.getSize = function () {
    return this.getMinimumSize();
};

Label.prototype.setSize = function (width, height) {
    // Don't need to do anything here
};

function Button(text, activated) {
    Label.apply(this);
    this.active = true;
    this.textElement.color = Button.defaultColor;
}

Button.defaultColor = 'white';
Button.focusedColor = 'green';
Button.disabledColor = 'gray';
Button.prototype = Object.create(Label.prototype);

Button.prototype.setActive = function (active) {
    this.active = active;
    this.textElement.color = (active ? Button.defaultColor : Button.disabledColor);
};

Button.prototype.getActive = function () {
    return this.active;
};

Button.prototype.focused = function () {
    this.textElement.color = Button.focusedColor;
};

Button.prototype.unfocused = function () {
    this.textElement.color = Button.defaultColor;
};

function Form(x, y, desiredWidth, desiredHeight) {
    this.components = [];
    this.x = x;
    this.y = y;
    this.desiredWidth = desiredWidth;
    this.desiredHeight = desiredHeight;

    this.keyPressed = {
        up: this.moveFocusUp,
        down: this.moveFocusDown,
        enter: this.activate
    };
}

Form.prototype = {
    constructor: Form,

    layoutInternal: function (pad) {
        var columns = this.columns || 1;

        // Determine minimum column widths
        var columnWidths = [];
        var rowMinimumWidths = [0];
        var rowHeights = [0];
        var column;
        var row = 0;

        for (column = 0; column < columns; column++) {
            columnWidths[column] = 0;
        }

        var components = this.components;
        var componentCount = components.length;
        var i;
        for (column = 0, i = 0; i < componentCount; i++) {
            var component = components[i];
            var minimumSize = component.getMinimumSize();
            columnWidths[column] = Math.max(columnWidths[column], minimumSize[0]);
            rowMinimumWidths[row] += minimumSize[0];
            rowHeights[row] = Math.max(rowHeights[row], minimumSize[1]);
            column = column++ % columns;

            if (column === 0) {
                row++;
                rowMinimumWidths[row] = 0;
                rowHeights[row] = 0;
            }
        }

        // Calculate total width
        var minimumWidth = 0;
        for (column = 0; column < columns; column++) {
            minimumWidth += columnWidths[column];
        }

        this.minimumWidth = minimumWidth;

        // Check for size constraints
        if (this.desiredWidth) {
            // Add padding (or negative padding)
            var padding = (this.desiredWidth - minimumWidth) / columns;
            if (!pad && padding > 0) {
                padding = 0;
            }

            // Add padding
            for (column = 0; column < columns; column++) {
                columnWidths[column] += padding;
            }
        }

        // Layout components
        var x = this.x;
        var y = this.y;
        var rowHeight = 0;
        var totalMinimumHeight = 0;
        column = -1;
        row = -1;

        for (i = 0; i < componentCount; i++) {
            if (column === -1 || column >= columns - 1) {
                // Last column; move to next row
                if (row >= 0) {
                    y -= rowHeights[row];
                    totalMinimumHeight += rowHeights[row];
                }

                x = this.x;
                column = 0;
                row++;

                // TODO: Special case for centered flow layout
            } else {
                column++;
            }

            var componentWidth = columnWidths[column];
            var component = components[i];
            component.setPosition(x, y);

            // Flow layout doesn't fill the entire column
            if (!pad) {
                var minimumSize = component.getMinimumSize();
                componentWidth = minimumSize[0];
            }

            component.setSize(componentWidth, rowHeights[row]);
            x += componentWidth;
        }

        if (rowHeights[row]) {
            totalMinimumHeight += rowHeights[row];
        }

        this.minimumHeight = totalMinimumHeight;
    },

    changeFocus: function (newlyFocusedNode, event) {
        var lastFocusedNode = this.focusedNode;
        this.focusedNode = newlyFocusedNode;

        // Notify the previously-focused component that it has lost focus
        if (lastFocusedNode && lastFocusedNode.unfocused) {
            lastFocusedNode.unfocused();
        }

        // Notify the newly-focused component that it has gained focus
        if (newlyFocusedNode && newlyFocusedNode.focused) {
            newlyFocusedNode.focused(event);
        }
    },

    focus: function (component) {
        this.changeFocus(component);
    },

    getComponentIndex: function (component) {
        var components = this.components;
        var componentCount = components.length;
        for (var i = 0; i < componentCount; i++) {
            if (components[i] === component) {
                return i;
            }
        }
    },

    moveFocusUp: function (event) {
        var oldNode = this.focusedNode;
        var newNode;
        var i;

        if (oldNode) {
            i = this.getComponentIndex(oldNode);
        } else {
            // Start with the last component
            i = this.components.length;
        }

        // Iterate to next active node
        while (--i >= 0) {
            var component = this.components[i];
            if (component && component.getActive && component.getActive()) {
                newNode = component;
                break;
            }
        }

        if (newNode) {
            this.changeFocus(newNode, event);
        }

        return newNode && newNode !== oldNode;
    },

    moveFocusDown: function (event) {
        var components = this.components;
        var oldNode = this.focusedNode;
        var newNode;
        var i;

        if (oldNode) {
            i = this.getComponentIndex(oldNode);
        } else {
            // Start with the last component
            i = components.length;
        }

        // Iterate to next active node
        var componentCount = components.length;
        while (++i < componentCount) {
            var component = components[i];
            if (component && component.getActive && component.getActive()) {
                newNode = component;
                break;
            }
        }

        if (newNode) {
            this.changeFocus(newNode, event);
        }

        return newNode && newNode !== oldNode;
    },

    // TODO: moveLeft/moveRight

    activate: function (event, source) {
        var handled = false;
        if (this.focusedNode && this.focusedNode.activated) {
            this.focusedNode.activated(source);
            handled = true;
        }

        return handled;
    },

    // TODO: keyPressed, mouseMoved, inputReceived, layout, addAtLocation

    add: function (component) {
        this.components.push(component);
        // TODO: Handle nested stuff for focus...
        this.layout();
    },

    layout: function () {
        // TODO: Allow grid layout
        this.layoutInternal(false);
    },

    setLayer: function (layer) {
        var components = this.components;
        var componentCount = components.length;
        for (var i = 0; i < componentCount; i++) {
            components[i].setLayer(layer);
        }
    },

    getPosition: function () {
        return [this.x, this.y];
    },

    setPosition: function (x, y) {
        if (x !== this.x || y !== this.y) {
            this.x = x;
            this.y = y;
            this.layout();
        }
    },

    getActive: function () {
        // Check for at least one active component
        var active = false;
        var componentCount = this.components.length;
        for (var i = 0; i < componentCount; i++) {
            var component = this.components[i];
            if (component && component.getActive && component.getActive()) {
                active = true;
                break;
            }
        }

        return active;
    },

    getMinimumSize: function () {
        if (!this.minimumWidth || !this.minimumHeight) {
            this.layout();
        }

        return [this.minimumWidth, this.minimumHeight];
    },

    getDesiredSize: function () {
        var minimumSize = this.getMinimumSize();
        return [this.desiredWidth || minimumSize[0], this.desiredHeight || minimumSize[1]];
    },

    getSize: function () {
        return this.getDesiredSize();
    },

    setSize: function (width, height) {
        if (!this.desiredWidth || this.desiredWidth !== width) {
            this.desiredWidth = width;
            this.layout();
        }
    },

    focused: function (event) {
        // TODO: There is special logic for when an event is supplied...?
        this.moveFocusDown();
    },

    unfocused: function () {
        this.changeFocus(null);
    }

    // TODO: Nested focus/unfocus
};

Form.newFlow = function (columns, x, y, desiredWidth, desiredHeight) {
    var form = new Form(x, y, desiredWidth, desiredHeight);
    form.columns = columns;

    // Add all components
    var argumentCount = arguments.length;
    for (var i = 5; i < argumentCount; i++) {
        form.add(arguments[i]);
    }

    return form;
};

function FormLayer(form) {
    Layer.apply(this);
    this.form = form;
    form.setLayer(this);
    form.focused();
}

FormLayer.prototype = Object.create(Layer.prototype);

FormLayer.prototype.keyPressed = function (key, pressed) {
    return this.form.keyPressed(key, pressed);
};

FormLayer.prototype.show = function () {
    Radius.pushLayer(this);
};

FormLayer.prototype.shown = function () {
    // TODO: Update selected item based on mouse
};
