// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * A JavaScript module defining an abstract STACK editor class.
 *
 * @package    qtype_stack
 * @author     André Storhaug <andr3.storhaug@gmail.com>
 * @copyright  2019 Norwegian University of Science and Technology (NTNU)
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['jquery', 'qtype_stack/validation-overlay'], function($, ValidationOverlay) {

    'use strict';

    /**
     * Class constructor representing an editor for an STACK question input.
     *
     * @class Editor
     * @abstract
     * @constructor
     * @param {String} questionid The input name, for example ans1.
     * @param {String} prefix
     * @param {Array} inputs An array of objects representing Stack inputs.
     * @param {Object} editorOptions Editor options.
     * @param {Boolean} debug Flag to determine debug mode.
     */
    var Editor = function(questionid, prefix, inputs, editorOptions, debug) {
        this.questionid = questionid;
        this.prefix = prefix;
        this.inputs = inputs;
        this.editorOptions = editorOptions;
        this.debug = debug;

        this.stackInputs = {};
        this.validationOverlays = {};

        this.readonly = null;
        this.editorVisible = null;

        this._initValidation();
        this._gatherStackInputs();
    };

    /**
     * @config EDITOR_NAME The name of this Editor.
     */
    Editor.prototype.EDITOR_NAME = 'GENERIC';

    /**
     * Init all ValidationOverlays. One for each validation field.
     * @private
     */
    Editor.prototype._initValidation = function() {
        for (var i = 0; i < this.inputs.length; i++) {
            var name = this.inputs[i].input;
            // Add event listeners for validationDiv (where feedback is displayed).
            var $valinput = $('#' + $.escapeSelector(this.prefix + name) + '_val');
            if ($valinput) {
                var validationOverlay = new ValidationOverlay($valinput);
                this.validationOverlays[name] = validationOverlay;
            }
        }
    };

    /**
     * Find and cache all stack inputs as jQuery elements.
     * @private
     */
    Editor.prototype._gatherStackInputs = function() {
        for (var i = 0; i < this.inputs.length; i++) {
            var name = this.inputs[i].input;
            // Add event listeners for validationDiv (where feedback is displayed).
            var $stackInput = $('#' + $.escapeSelector(this.prefix + name));
            if ($stackInput) {
                this.stackInputs[name] = $stackInput;
            }
        }
    };

    /**
     * Check if the editor is read only.
     * @returns {boolean} return true if the editor should be read only, otherwise false.
     */
    Editor.prototype.isReadonly = function() {
        var readonly = this.readonly;
        if (readonly != null) {
            return readonly;
        }

        var isAllRead = true;
        var self = this;
        Object.keys(this.stackInputs).forEach(function(input) {
            if (self.stackInputs[input].prop('readonly')) {
                isAllRead = false;
            }
        });
        readonly = !isAllRead;

        return readonly;
    };

    /**
     * Event handler that is fired when the input (with the name passed as parameter)
     * fails and should display error message.
     * @param {String} name the name of the input that has changed.
     * @param {String} message the error message to pass to the ValidationOverlay.
     */
    Editor.prototype.inputError = function(name, message) {
        var validationOverlay = this.getValidationOverlay(name);
        if (validationOverlay) {
            validationOverlay.displayErrorMessage(message);
        }
    };

    /**
     * Get the stack input with the name passed as parameter.
     * @param name the name of the input.
     * @returns {jQuery} the stack input with the name passed as parameter.
     */
    Editor.prototype.getStackInput = function(name) {
        return this.stackInputs[name];
    };

    /**
     * Event handler that is fired when the stack input (with the name passed as parameter)
     * contents should be validated immediately.
     * @param name the name of the input that has changed.
     * @param value the updated value to pass to the stack input.
     */
    Editor.prototype.valueChanged = function(name, value) {
        var validationOverlay = this.getValidationOverlay(name);
        if (validationOverlay) {
            validationOverlay.hide();
        }

        var $stackInput = this.getStackInput(name);
        $stackInput.val(value);
        $stackInput.get(0).dispatchEvent(new Event('input')); // Event firing needs to be on a vanilla dom object.

        if (value === '') {
            this.getValidationOverlay(name).getUnderlay().addClass('empty'); // Make sure the validation div is hidden.
        }
    };

    /**
     * Get the validation overlay.
     * @param name the name of the input the ValidationOverlay it is associated with.
     * @returns {ValidationOverlay} a ValidationOverlay.
     */
    Editor.prototype.getValidationOverlay = function(name) {
        var validationOverlay = this.validationOverlays[name];
        return validationOverlay;
    };

    return Editor;
});
