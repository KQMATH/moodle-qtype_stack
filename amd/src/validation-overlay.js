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
 * A JavaScript module defining an overlay for the native STACK validation feedback.
 *
 * @package    qtype_stack
 * @author     André Storhaug <andr3.storhaug@gmail.com>
 * @copyright  2019 Norwegian University of Science and Technology (NTNU)
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['jquery', 'core/str'], function($, str) {

    'use strict';

    /**
     * Class constructor representing an overlay for the native STACK validation feedback.
     * This is primarily used for displaying editor errors.
     *
     * @class ValidationOverlay
     * @constructor
     * @param {Object} validationDiv jQuery representation of the validation div.
     */
    var ValidationOverlay = function(validationDiv) {
        this.$validationDiv = validationDiv;
        this.id = this.$validationDiv.attr('id');
        this.isShowing = false;
        this.stringsPromise = this._retrieveStrings();

        this.$overlay = this._createOverlay();
    };

    /**
     * Create the validation overlay. This overlay is placed "over" the
     * existing STACK validation div.
     * @return {jQuery} the new validation overlay wrapped in jQuery.
     * @private
     */
    ValidationOverlay.prototype._createOverlay = function() {
        var $overlay = $('<div>').attr({
            class: 'stackinputfeedback empty',
            id: this.id + '_overlay',// TODO fix up with actual input id (not full id).
        });
        this.$validationDiv.after($overlay);
        return $overlay;
    };

    /**
     * Generate promise with the required Moodle strings.
     * @returns {Promise} Promise carrying the wanted strings.
     * @private
     */
    ValidationOverlay.prototype._retrieveStrings = function() {
        var strings = [
            {
                key: 'answerinvalid',
                component: 'qtype_stack',
            },
        ];
        return str.get_strings(strings);
    };

    /**
     * Get the validation div that lies under the validation overlay.
     * @return {jQery} return the underlying validation div.
     */
    ValidationOverlay.prototype.getUnderlay = function() {
        return this.$validationDiv;
    };

    /**
     * Creates an standard error message. Used in {@link displayErrorMessage}.
     *
     * @param message the error message text to generate the appropriate message.
     * @returns {Array} Array with jQuery elements.
     * @private
     */
    ValidationOverlay.prototype._createStandardErrorMessage = function(message, strings) {
        var content = [];

        var $invalidString = $('<p>');
        $invalidString.append(strings);
        content.push($invalidString);

        var $errorMessage = $('<p>').attr({class: 'stack_errors'});
        $errorMessage.append(message);
        content.push($errorMessage);

        return content;
    };

    ValidationOverlay.prototype.displayMessage = function(message) {
        this.$overlay.html(message);
    };

    /**
     * Display an error message in the validation overlay based on an error
     * passed as parameter.
     * @param {String} error the error message text to display.
     */
    ValidationOverlay.prototype.displayErrorMessage = function(error) {
        var self = this;
        this.stringsPromise.then(function(strings) {
            var html = self._createStandardErrorMessage(error, strings);
            self.$overlay.empty().html(html);
            self.show();
        });
    };

    /**
     * Hide the overlay div.
     */
    ValidationOverlay.prototype.hide = function() {
        this.$validationDiv.css('display', ''); // Remove display none from validation div.
        this._removeAllClasses();
        this.$overlay.addClass('empty'); // Hide overlay.
        this.isShowing = false;
    };

    /**
     * Show the overlay div.
     */
    ValidationOverlay.prototype.show = function() {
        this.$validationDiv.hide();
        this._removeAllClasses();
        this.$overlay.css('display', ''); // Remove display none from overlay div.
        this.isShowing = true;
    };

    /**
     * Display the loader icon.
     */
    ValidationOverlay.prototype._showLoading = function() {
        this._removeAllClasses();
        this.$validationDiv.addClass('loading');
    };

    /**
     * Update the validation overlay div to show that the input contents have changed,
     * so the validation results are no longer relevant.
     */
    ValidationOverlay.prototype._showWaiting = function() {
        this._removeAllClasses();
        this.$overlay.addClass('waiting');
    };

    /**
     * Strip all our class names from the validation div.
     */
    ValidationOverlay.prototype._removeAllClasses = function() {
        this.$overlay.removeClass('empty');
        this.$overlay.removeClass('error');
        this.$overlay.removeClass('loading');
        this.$overlay.removeClass('waiting');
    };

    return ValidationOverlay;
});

