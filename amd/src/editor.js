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
     * @param {Object} inputdata An object containing STACK input data.
     * @param {String} inputdata.input A string with the name of the STACK input.
     * @param {String} inputdata.latexresponse Saved LaTeX data from a previous attempt or auto saved value.
     * @param {Object} inputdata.inputoptions The input options set for the STACK input.
     * @param {Object} editorOptions Editor specific options.
     * @param {Boolean} debug Flag to determine debug mode.
     */
    var Editor = function(questionid, prefix, inputdata, editorOptions, debug) {
        this.questionid = questionid;
        this.prefix = prefix;
        this.inputdata = inputdata;
        this.editorOptions = editorOptions;
        this.debug = debug;

        this.name = inputdata.input;

        this.$stackInput = null;
        this.validationOverlay = null;

        this.readonly = null;

        this._initValidation();
        this._gatherStackInput();
    };

    /**
     * @config EDITOR_NAME The name of this Editor.
     */
    Editor.prototype.EDITOR_NAME = 'GENERIC';

    /**
     * Init the ValidationOverlay.
     * @private
     */
    Editor.prototype._initValidation = function() {
        var name = this.inputdata.input;
        var $valinput = $('#' + $.escapeSelector(this.prefix + name) + '_val');
        if ($valinput) {
            this.validationOverlay = new ValidationOverlay($valinput);
        }
    };

    /**
     * Find and cache the stack input as a jQuery element.
     * @private
     */
    Editor.prototype._gatherStackInput = function() {
        var name = this.inputdata.input;
        var $stackInput = $('#' + $.escapeSelector(this.prefix + name));
        if ($stackInput) {
            this.$stackInput = $stackInput;
        }

    };

    /**
     * Check if the editor is read only.
     * @returns {boolean} return true if the editor should be read only, otherwise false.
     */
    Editor.prototype._isReadonly = function() {
        var readonly = this.readonly;
        if (readonly != null) {
            return readonly;
        }

        readonly = !!this.$stackInput.prop('readonly');
        return readonly;
    };

    /**
     * Event handler that is fired when the input (with the name passed as parameter)
     * fails and should display error message.
     * @param {String} name the name of the input that has changed.
     * @param {String} message the error message to pass to the ValidationOverlay.
     */
    Editor.prototype.inputError = function(message) {
        var validationOverlay = this.getValidationOverlay();
        if (validationOverlay) {
            validationOverlay.displayErrorMessage(message);
        }
    };

    /**
     * Get the stack input.
     * @returns {jQuery} the stack input associated with this input.
     */
    Editor.prototype.getStackInput = function() {
        return this.$stackInput ? this.$stackInput : null;
    };

    /**
     * Event handler that is fired when the stack input
     * contents should be validated immediately.
     * @param value The updated value to pass to the stack input.
     */
    Editor.prototype.valueChanged = function(value) {
        var validationOverlay = this.getValidationOverlay();
        if (validationOverlay) {
            validationOverlay.hide();
        }

        var $stackInput = this.getStackInput();
        $stackInput.val(value);
        $stackInput.get(0).dispatchEvent(new Event('input')); // Event firing needs to be on a vanilla dom object.

        if (value === '') {
            validationOverlay.getUnderlay().addClass('empty'); // Make sure the validation div is hidden.
        }
    };

    /**
     * Get the validation overlay.
     * @returns {ValidationOverlay} A ValidationOverlay.
     */
    Editor.prototype.getValidationOverlay = function() {
        return this.validationOverlay ? this.validationOverlay : null;
    };

    return Editor;
});
