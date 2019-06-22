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
         * @param {String} prefix question attempt prefix
         * @param {Object} inputs An object representing the input element for this input.
         * @param {Object} editorOptions Editor options.
         * @param {Boolean} debug Flag to determine debug mode.
         */
        var WYSIWYG = function(questionid, prefix, inputs, editorOptions, debug) {
            Editor.call(this, questionid, prefix, inputs, editorOptions, debug);

            this.MQInputs = {};
            this.controls = null;
            this.lastFocusedInput = {input: null};

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
            if (!this.isReadonly()) {
                this._buildInputControls(this.editorOptions['mathinputmode']);
            }
            this._setupInputs();
        };

        /**
         * Setup all MQInputs.
         * @private
         */
        WYSIWYG.prototype._setupInputs = function() {
            for (var i = 0; i < this.inputs.length; i++) {
                var name = this.inputs[i].input;
                var latexresponse = this.inputs[i].latexresponse;
                var inputoptions = this.inputs[i].inputoptions;
                var MQinput = new MQInput(this.prefix, name, latexresponse, inputoptions, this.getValidationOverlay(name),
                    this.lastFocusedInput, this.debug);

                this.MQInputs[name] = MQinput;

                MQinput._addEventHandlers(this);
            }
        };

        /**
         * Builds and sets the input control buttons based on the mathinputmode supplied as parameter.
         * @private
         * @param {string} mode the mathinputmode.
         */
        WYSIWYG.prototype._buildInputControls = function(mode) {
            if (!mode) {
                throw new Error('No mathinputmode is set');
            }

            this.controls = new VisualMath.ControlList(
                '#' + this.questionid + 'controls_wrapper', this.lastFocusedInput);
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
         * Class constructor representing an MQInput for use with a STACK WYSIWYG editor.
         *
         * @class MQInput
         * @abstract
         * @constructor
         * @param {String} prefix
         * @param {String} name the name for this input.
         * @param {String} latexresponse LaTeX responses from previous question attempts.
         * @param {Object} inputoptions the stack input options.
         * @param {ValidationOverlay} validationOverlay the validation overlay to be associated with this input.
         * @param lastFocusedInput object for keeping reference to the last focused input.
         * @param lastFocusedInput.input the last focused VisualMath input.
         * @param {Boolean} debug Flag to determine debug mode.
         */
        var MQInput = function(prefix, name, latexresponse, inputoptions, validationOverlay, lastFocusedInput, debug) {
            this.prefix = prefix;
            this.name = name;
            this.latexresponse = latexresponse;
            this.inputoptions = this._formatOptionsObj(inputoptions);
            this.validationOverlay = validationOverlay;
            this.lastFocusedInput = lastFocusedInput;
            this.debug = debug;

            this.delayTimeoutHandle = null;
            this.readonly = null;
            this.converter = null;
            this.visualMath = null;

            this.$debugFeedback = null;
            this.$stackInput = $('#' + $.escapeSelector(this.prefix + this.name));
            this.$latexInput = $('#' + $.escapeSelector(this.prefix + this.name) + '_latex');

            this.lastMaximaRes = this.$stackInput.val();
            this.lastLatex = this.$latexInput.val() ? this.$latexInput.val() : this.latexresponse;

            this._initTeX2Max();
            this._initMathQuill();
        };

        /**
         * @config DEFAULT_TEX2MAX_OPTIONS The default TeX2Max options to use for the TeX2Max library.
         */
        MQInput.prototype.DEFAULT_TEX2MAX_OPTIONS = {
            onlySingleVariables: false,
            handleEquation: false,
            addTimesSign: true,
            onlyGreekName: true,
            onlyGreekSymbol: false,
            debugging: false,
        };

        /**
         * @config TYPINGDELAY How long a pause in typing before we trigger an valchange an ajax validation request.
         */
        MQInput.prototype.TYPINGDELAY = 1000;

        /**
         * Initiate the TeX2Max converter.
         * @private
         */
        MQInput.prototype._initTeX2Max = function() {
            // Create TeX2Max (LaTeX to Maxima) converter
            try {
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
        MQInput.prototype._initMathQuill = function() {
            this.$stackInput.wrap('<div>');
            var $parent = this.$stackInput.parent();

            var restoreok = this._restoreLatex();

            // Setup MathQuill // TODO remove visual math -> transform into only button library...
            var self = this;
            if (this._isReadonly()) {
                if (restoreok) {
                    this.visualMath = new VisualMath.StaticInput(this.$stackInput, $parent);
                    this.visualMath.$input.hide();
                }

            } else {
                this.visualMath = new VisualMath.Input(this.$stackInput, $parent, this.lastFocusedInput);
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
        MQInput.prototype._restoreLatex = function() {
            // Set the previous step attempt data or autosaved
            // (mod_quiz) value to the MathQuill field.
            this.lastLatex = this.$latexInput.val() ? this.$latexInput.val() : this.latexresponse;
            if (this.$stackInput.val() !== '' && this.lastLatex === '') {
                return false;
            }
            return true;
        };

        /**
         * Determine if this input is read only.
         * @returns {boolean} return true if this input is read only, otherwise false.
         */
        MQInput.prototype._isReadonly = function() {
            if (this.readonly != null) {
                return this.readonly;
            } else {
                this.readonly = this.$stackInput.prop('readonly');
            }

            return this.readonly;
        };

        /**
         * Add the event handler to call when the user input changes.
         *
         * @param {Object} editor A Editor object
         */
        MQInput.prototype._addEventHandlers = function(editor) {
            var self = this;
            // The input event fires on any change in value, even if pasted in or added by speech
            // recognition to dictate text. Change only fires after loosing focus.
            // Should also work on mobile.
            this.$stackInput.on('valchange', null, null, function(event, value) {
                editor.valueChanged(self.name, value);
            });
            this.$stackInput.on('valerror', null, null, function(event, message) {
                editor.inputError(self.name, message);
                self.$stackInput.val('');
                // TODO prevent submission of input_val data => remove input_val and restore if error is resolved.
            });
        };

        /**
         * Cancel any typing pause timer.
         */
        MQInput.prototype.cancelErrorDelay = function() {
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
         * handler function after TYPINGDELAY if nothing else happens.
         * @param {errorHandler} handler - The callback that handles the error.
         */
        MQInput.prototype._errorDelay = function(handler) {
            this.cancelErrorDelay();
            this.validationOverlay.getUnderlay().addClass('waiting');
            this.delayTimeoutHandle = setTimeout(function() {
                handler();
            }, this.TYPINGDELAY);
        };

        /**
         * Event handler that is fired when this MQInput contents changes and should be converted immediately.
         * @private
         * @param latex the new LaTeX to convert.
         */
        MQInput.prototype._valueChanged = function(latex) {
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
         * @param rawOptions the raw input options to process.
         * @param rawOptions
         * @returns {Object} return the formatted options object.
         */
        MQInput.prototype._formatOptionsObj = function(rawOptions) {
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
        MQInput.prototype._initDebug = function() {
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
                // self.validationOverlay.getUnderlay().after(self.$debugFeedback);

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
         * @return {jQuery} debug feedback HTML.
         */
        MQInput.prototype._createDebugFeedback = function(strings) {
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
