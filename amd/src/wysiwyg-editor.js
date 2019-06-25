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
 * A JavaScript module defining a WYSIWYG STACK editor.
 *
 * @package    qtype_stack
 * @author     André Storhaug <andr3.storhaug@gmail.com>
 * @copyright  2019 Norwegian University of Science and Technology (NTNU)
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['jquery', 'core/str', 'qtype_stack/tex2max.amd', 'qtype_stack/visual-math-input', 'qtype_stack/editor'],
    function($, str, TeX2Max, VisualMath, Editor) {

        'use strict';

        /**
         * Class constructor representing an WYSIWYG editor for an Stack question input.
         *
         * @class WYSIWYG
         * @extends {Editor}
         * @constructor
         * @param {String} questionid The input name, for example ans1.
         * @param {String} prefix Question attempt prefix
         * @param {Object} inputdata An object representing the input element for this input.
         * @param {Object} editorOptions Editor options.
         * @param {Boolean} debug Flag to determine debug mode.
         */

        var WYSIWYG = function(questionid, prefix, inputdata, editorOptions, debug) {
            Editor.call(this, questionid, prefix, inputdata, editorOptions, debug);

            this.controls = null;
            this.lastFocusedInput = {input: null};

            this.latexresponse = inputdata.latexresponse;
            this.inputoptions = this._formatOptionsObj(inputdata.inputoptions);

            this.delayTimeoutHandle = null;
            this.converter = null;
            this.visualMath = null;

            this.$wrapper = null;

            this.$debugFeedback = null;
            this.$latexInput = $('#' + $.escapeSelector(this.prefix + this.name) + '_latex');

            this.lastMaximaRes = this.$stackInput.val();
            this.lastLatex = this.$latexInput.val() ? this.$latexInput.val() : this.latexresponse;

            this._init();
        };

        // Make WYSIWYG class extend Editor class
        WYSIWYG.prototype = Object.create(Editor.prototype);
        WYSIWYG.prototype.constructor = WYSIWYG;

        /**
         * @config EDITOR_NAME The name of this Editor.
         */
        WYSIWYG.prototype.EDITOR_NAME = 'WYSIWYG';

        /**
         * Initiate this editor.
         * @private
         */
        WYSIWYG.prototype._init = function() {
            this.$stackInput.wrap('<div>');
            this.$wrapper = this.$stackInput.parent().attr({class: 'wysiwyg'});

            this._addEventHandlers();
            this._initTeX2Max();
            this._initMathQuill();

            if (!this._isReadonly()) {
                this._buildInputControls(this.editorOptions['mathinputmode']);
            }
        };

        /**
         * Builds and sets the input control buttons based on the mathinputmode supplied as parameter.
         * @private
         * @param {string} mode The mathinputmode.
         */
        WYSIWYG.prototype._buildInputControls = function(mode) {
            if (!mode) {
                throw new Error('No mathinputmode is set');
            }

            var wrapper = $('<div>').attr({class: 'controls_wrapper'});
            this.$wrapper.prepend(wrapper);

            this.controls = new VisualMath.ControlList(wrapper, this.lastFocusedInput);
            var controlNames = [];

            switch (mode) {
                case 'simple':
                    controlNames = ['sqrt', 'divide', 'pi', 'caret'];
                    this.controls.enable(controlNames);
                    break;
                case 'normal':
                    controlNames = [
                        'sqrt',
                        'divide',
                        'nchoosek',
                        'pi',
                        'caret'];
                    this.controls.enable(controlNames);
                    break;
                case 'advanced':
                    this.controls.enableAll();
                    break;
                case 'none':
                    break;
                default:
                    break;
            }
        };

        /**
         * @config DEFAULT_TEX2MAX_OPTIONS The default TeX2Max options to use for the TeX2Max library.
         */
        WYSIWYG.prototype.DEFAULT_TEX2MAX_OPTIONS = {
            onlySingleVariables: false,
            handleEquation: false,
            addTimesSign: true,
            onlyGreekName: true,
            onlyGreekSymbol: false,
            debugging: false,
        };

        /**
         * @config TYPINGDELAY How long a pause in typing before we trigger a valchange.
         */
        WYSIWYG.prototype.TYPINGDELAY = 1000;

        /**
         * Initiate the TeX2Max converter.
         * @private
         */
        WYSIWYG.prototype._initTeX2Max = function() {
            try {
                // Create TeX2Max (LaTeX to Maxima) converter.
                this.converter = new TeX2Max(this.inputoptions);
            }
            catch (error) {
                this.$stackInput.trigger('valerror', [error.message]);
            }
        };

        /**
         * Initiate MathQuill.
         * @private
         */
        WYSIWYG.prototype._initMathQuill = function() {
            var restoreok = this._restoreLatex();

            // Setup MathQuill
            var self = this;
            if (this._isReadonly()) {
                if (restoreok) {
                    this.visualMath = new VisualMath.StaticInput(this.$stackInput, this.$wrapper);
                    this.visualMath.$input.hide();
                }

            } else {
                this.visualMath = new VisualMath.Input(this.$stackInput, this.$wrapper, this.lastFocusedInput);
                self.visualMath.onEdit = function($input, field) {
                    self._valueChanged(field.latex());
                };
                this.visualMath.$input.hide();
            }

            // If moodle autosave or saved qusetion data from db.
            if (restoreok && this.lastLatex) {
                this.visualMath.field.latex(this.lastLatex);
                this._valueChanged(this.lastLatex);
            }

            if (restoreok) {
                if (this.debug) {this._initDebug();}
            }

        };

        /**
         * Restore the latex from a previous question attempt or autosaved data (from mod_quiz).
         * @private
         */
        WYSIWYG.prototype._restoreLatex = function() {
            // Set the previous step attempt data or autosaved (mod_quiz) value to the MathQuill field.
            this.lastLatex = this.$latexInput.val() ? this.$latexInput.val() : this.latexresponse;
            if (this.$stackInput.val() !== '' && this.lastLatex === '') {
                return false;
            }
            return true;
        };

        /**
         * Add the event handler to call when the user input changes.
         */
        WYSIWYG.prototype._addEventHandlers = function() {
            var self = this;
            this.$stackInput.on('valchange', null, null, function(event, value) {
                self.valueChanged(value);
            });
            this.$stackInput.on('valerror', null, null, function(event, message) {
                self.inputError(message);
                self.$stackInput.val('');
                // TODO prevent submission of input_val data => remove input_val and restore if error is resolved.
            });
        };

        /**
         * Cancel any typing pause timer.
         */
        WYSIWYG.prototype.cancelErrorDelay = function() {
            if (this.delayTimeoutHandle) {
                clearTimeout(this.delayTimeoutHandle);
                this.validationOverlay.getUnderlay().removeClass('waiting');
            }
            this.delayTimeoutHandle = null;
        };

        /**
         * @callback errorHandler
         */

        /**
         * Event handler that is fired when the input produces an error. Will run the supplied
         * handler function after {@link TYPINGDELAY} if nothing else happens.
         * @param {errorHandler} handler The callback that handles the error.
         */
        WYSIWYG.prototype._errorDelay = function(handler) {
            this.cancelErrorDelay();
            this.validationOverlay.getUnderlay().addClass('waiting');
            this.delayTimeoutHandle = setTimeout(function() {
                handler();
            }, this.TYPINGDELAY);
        };

        /**
         * Event handler that is fired when this WYSIWYG's contents changes and should be converted immediately.
         * @private
         * @param latex The new LaTeX to convert to Maxima.
         */
        WYSIWYG.prototype._valueChanged = function(latex) {
            var self = this;
            this.cancelErrorDelay();

            // TODO make TeX2Max render "empty string" correctly. Currently
            //  throws syntax error. When fixed, this condition should be removed =>
            if (latex === '') {
                this.$stackInput.trigger('valchange', ['']);
                this.lastLatex = latex;
                this.$latexInput.val(latex);
                if (this.debug) {
                    this.$stackInput.trigger('valchangedebug', ['', latex]);
                }
                return;
            }

            try {
                var value = this.converter.toMaxima(latex);

                this.lastMaximaRes = value;
                this.$stackInput.trigger('valchange', [value]);
                if (this.debug) {
                    this.$stackInput.trigger('valchangedebug', [value, latex]);
                }
            }
            catch (error) { // TODO make separate error type in TeX2Max
                this.lastMaximaRes = error.message;
                this._errorDelay(function() {
                    self.$stackInput.trigger('valerror', [error.message]);
                });

                if (this.debug) {
                    this.$stackInput.trigger('valchangedebug', [error.message, latex]);
                }
            }
            finally {
                this.lastLatex = latex;
                this.$latexInput.val(latex);
            }
        };

        /**
         * Prepare and properly format the input options. If some required options are
         * missing, default values {@link DEFAULT_TEX2MAX_OPTIONS} are used.
         * @private
         * @param rawOptions The raw input options to process.
         * @returns {Object} return The formatted options object.
         */
        WYSIWYG.prototype._formatOptionsObj = function(rawOptions) {
            var options = {};

            for (var key in rawOptions) {
                if (!rawOptions.hasOwnProperty(key)) {
                    continue;
                }

                var value = rawOptions[key];
                switch (key) {
                    case 'insertStars':

                        if (value === 2 || value === 5) {
                            options.onlySingleVariables = true;
                        } else {
                            options.onlySingleVariables = false;
                        }

                        if (value === 1 || value === 2 || value === 4 ||
                            value === 5) {
                            options.addTimesSign = true;
                        } else {
                            options.addTimesSign = false;
                        }
                        break;
                    default :
                        break;
                }
            }

            options = $.extend(this.DEFAULT_TEX2MAX_OPTIONS, options);
            return options;
        };

        /**
         * Initiate debugging for this input. Fetch required strings.
         * @private
         */
        WYSIWYG.prototype._initDebug = function() {
            var self = this;
            var strings = [
                {
                    key: 'convertedmaximadebugging',
                    component: 'qtype_stack',
                },
                {
                    key: 'mathquilllatexdebugging',
                    component: 'qtype_stack',
                },
            ];

            str.get_strings(strings).then(function(strings) {
                self.$debugFeedback = self._createDebugFeedback(strings);
                self.validationOverlay.getUnderlay().next('.stackinputfeedback').addBack().wrapAll('<div>');
                self.validationOverlay.getUnderlay().parent().after(self.$debugFeedback);

                var $stackInputDebug = $('#' + $.escapeSelector(self.prefix + self.name) + '_debug');
                var $latexInputDebug = $('#' + $.escapeSelector(self.prefix + self.name) + '_latex' + '_debug');

                $stackInputDebug.html(self.lastMaximaRes);
                $latexInputDebug.html(self.lastLatex);

                self.$stackInput.on('valchangedebug', null, null, function(event, maxima, latex) {
                    $stackInputDebug.html(maxima);
                    $latexInputDebug.html(latex);

                });
            });
        };

        /**
         * Generate the debug feedback HTML.
         * @private
         * @param strings Moodle strings
         * @return {jQuery} debug Feedback HTML.
         */
        WYSIWYG.prototype._createDebugFeedback = function(strings) {
            var debugWrapper = $('<div>').attr({class: 'stackinputfeedbackdebug'});

            var $maximaString = $('<p>');
            $maximaString.append(strings[0]);

            var $maximaValue = $('<div>').attr({
                class: 'stackdebugvalue',
                id: this.prefix + this.name + '_debug',
            });

            var $latexString = $('<p>');
            $latexString.append(strings[1]);

            var $latexValue = $('<div>').attr({
                class: 'stackdebugvalue',
                id: this.prefix + this.name + '_latex' + '_debug',
            });

            debugWrapper.append($maximaString, $maximaValue, $latexString, $latexValue);

            return debugWrapper;
        };

        return WYSIWYG;
    });
