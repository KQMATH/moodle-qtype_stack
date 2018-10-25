/**
 * @package    qtype_stack
 * @author     André Storhaug <andr3.storhaug@gmail.com>
 * @copyright  2018 Norwegian University of Science and Technology (NTNU)
 */
define(['jquery', 'qtype_stack/tex2max', 'qtype_stack/visual-math-input'], function ($, Tex2Max, VisualMath) {

    // Constants
    const FEEDBACK_ERROR_DELAY = 1000;
    const WAITING_TIMER_DELAY = 1000;

    const DEFAULT_TEX2MAX_OPTIONS = {
        onlySingleVariables: false,
        handleEquation: false,
        addTimesSign: true,
        onlyGreekName: true,
        onlyGreekSymbol: false,
        debugging: false
    };


    class wysiwyg {
        constructor(questionid, debug, prefix, stackInputIDs, latexInputIDs, latexResponses, questionOptions) {
            this.errorTimer;
            this.waitingTimer;

            this.editorVisible = true;
            this.inputs = [];
            this.controls;
            this.converters = new Map();

            this.questionid = questionid;
            this.prefix = prefix;
            this.stackInputIDs = stackInputIDs;
            this.latexInputIDs = latexInputIDs;
            this.latexResponses = latexResponses;
            this.questionOptions = questionOptions;
            this.debug = debug;

            this.initialize();
        }


        initialize() {
            this.addEventListeners();

            let savedState = getEditorSelection(this.questionid);
            if (savedState === null) {
                this.editorVisible = true;
            } else {
                this.editorVisible = savedState;
            }
            saveEditorSelection(this.questionid, this.editorVisible);


            let options = this.formatOptionsObj(this.questionOptions);
            let readOnly = false;

            this.showOrHideCheckButton(this.stackInputIDs, this.prefix);

            for (let i = 0; i < this.stackInputIDs.length; i++) {
                let $stackInputDebug, $latexInputDebug;

                let latexInput = document.getElementById(this.latexInputIDs[i]);
                let $latexInput = $(latexInput);

                let stackInput = document.getElementById(this.stackInputIDs[i]);
                let $stackInput = $(stackInput);

                let wrapper = document.createElement('div');
                $stackInput.wrap(wrapper);
                let $parent = $stackInput.parent();

                if (this.debug) {
                    let stackInputDebug = document.getElementById(this.stackInputIDs[i] + '_debug');
                    $stackInputDebug = $(stackInputDebug);

                    let latexInputDebug = document.getElementById(this.latexInputIDs[i] + '_debug');
                    $latexInputDebug = $(latexInputDebug);
                }

                let input = new VisualMath.Input('#' + $.escapeSelector(this.stackInputIDs[i]), $parent);
                this.inputs.push(input); // Register the new input
                input.$input.hide();

                if (!input.$input.prop('readonly')) {
                    input.onEdit = ($input, field) => {
                        $input.val(this.convert(field.latex(), options, this.stackInputIDs[i]));
                        $latexInput.val(field.latex());
                        $input.get(0).dispatchEvent(new Event('change')); // Event firing needs to be on a vanilla dom object.

                        if (this.debug) {
                            $stackInputDebug.html(this.convert(field.latex(), options, this.stackInputIDs[i]));
                            $latexInputDebug.html(field.latex());
                        }
                    };

                } else {
                    readOnly = true;
                    input.disable();
                }

                // Set the previous step attempt data or autosaved (mod_quiz) value to the MathQuill field.
                if ($latexInput.val()) {
                    input.field.write($latexInput.val());
                    this.convert($latexInput.val(), options, this.stackInputIDs[i])

                } else if (this.latexResponses[i] !== null && this.latexResponses[i] !== "") {
                    input.field.write(this.latexResponses[i]);
                    this.convert(this.latexResponses[i], options, this.stackInputIDs[i])
                }
            }


            if (!readOnly) {
                this.buildInputControls(this.questionOptions['mathinputmode']);
            } else {
                let selectionButton = $('#' + this.questionid + 'editor_selection');
                selectionButton.hide();
            }

            if (!this.editorVisible) {
                this.editorVisible = true;
                this.toggleEditor();
            }
        }

        convert(latex, options, stackInputID) {
            let result = '';

            let converter = this.converters.get(stackInputID);
            if (typeof converter === "undefined") {
                try {
                    converter = new Tex2Max.TeX2Max(options);
                    this.converters.set(stackInputID, converter);
                } catch (error) {
                    this.renderErrorFeedback(error.message, stackInputID);
                    return;
                }
            }

            clearTimeout(this.errorTimer);

            if (!latex) {
                this.hideTeX2MaXFeedback(stackInputID);

                let stackValidationFeedback = document.getElementById(stackInputID + '_val');
                let $stackValidationFeedback = $(stackValidationFeedback);
                $stackValidationFeedback.hide();

                return result;
            }

            try {
                result = converter.toMaxima(latex);
                this.hideTeX2MaXFeedback(stackInputID);

            } catch (error) {
                this.renderErrorFeedback(error.message, stackInputID);
            }

            return result;
        }

        removeAllValidationClasses(selector) {
            let validationFeedback = document.getElementById(selector);
            let $validationFeedback = $(validationFeedback);
            $validationFeedback.removeClass('empty');
            $validationFeedback.removeClass('error');
            $validationFeedback.removeClass('loading');
            $validationFeedback.removeClass('waiting');
        }

        resetStackValidation(stackInputID) {
            let stackValidationFeedback = document.getElementById(stackInputID + '_val');
            let $stackValidationFeedback = $(stackValidationFeedback);

            $stackValidationFeedback.removeAttr("style");
        }

        hideTeX2MaXFeedback(stackInputID) {
            let existingFeedback = document.getElementById(stackInputID + '_tex2max');
            let $existingFeedback = $(existingFeedback);

            let stackValidationFeedback = document.getElementById(stackInputID + '_val');

            let parent = this;
            if (stackValidationFeedback.style.display !== "") {
                $existingFeedback.toggleClass('waiting', true);
                parent.waitingTimer = setTimeout(() => {
                    parent.removeAllValidationClasses(stackInputID + '_tex2max');
                    $existingFeedback.toggleClass('empty', true);
                    parent.resetStackValidation(stackInputID);
                }, WAITING_TIMER_DELAY);

                setTimeout(function () {
                    parent.removeAllValidationClasses(stackInputID + '_tex2max');
                    $existingFeedback.toggleClass('waiting', true);
                }, 0);

            } else {
                $existingFeedback.toggleClass('empty', true);
            }
        }

        renderErrorFeedback(errorMessage, stackInputID) {
            clearTimeout(this.waitingTimer);

            let existingFeedback = document.getElementById(stackInputID + '_tex2max');
            let $existingFeedback = $(existingFeedback);
            if (existingFeedback && !$existingFeedback.hasClass('empty')) {
                this.removeAllValidationClasses(stackInputID + '_tex2max');
                $existingFeedback.toggleClass('waiting', true);
            }

            this.errorTimer = setTimeout(() => {
                this.renderTeX2MaXFeedback(errorMessage, stackInputID)
            }, FEEDBACK_ERROR_DELAY);
        }


        renderTeX2MaXFeedback(errorMessage, stackInputID) {
            if (!errorMessage) errorMessage = "";

            let feedbackMessage = "This answer is invalid.";
            let stackValidationFeedback = document.getElementById(stackInputID + '_val');
            let $stackValidationFeedback = $(stackValidationFeedback);
            $stackValidationFeedback.hide();

            let existingFeedback = document.getElementById(stackInputID + '_tex2max');
            if (existingFeedback) {
                this.removeAllValidationClasses(stackInputID + '_tex2max');

                let existingErrorMessageParagraph = document.getElementById(stackInputID + '_errormessage');
                existingErrorMessageParagraph.innerHTML = errorMessage;

            } else {
                let feedbackWrapper = document.createElement('div');
                feedbackWrapper.setAttribute('class', 'tex2max-feedback-wrapper');
                feedbackWrapper.setAttribute('id', stackInputID + '_tex2max');

                let feedbackMessageParagraph = document.createElement('p');
                let errorMessageParagraph = document.createElement('p');
                errorMessageParagraph.setAttribute('id', stackInputID + '_errormessage');

                feedbackMessageParagraph.innerHTML = feedbackMessage;
                errorMessageParagraph.innerHTML = errorMessage;

                feedbackWrapper.append(feedbackMessageParagraph);
                feedbackWrapper.append(errorMessageParagraph);

                $stackValidationFeedback.after(feedbackWrapper);
            }
        }

        showOrHideCheckButton(inputIDs, prefix) {
            for (let i = 0; i < inputIDs.length; i++) {
                let $outerdiv = $(document.getElementById(inputIDs[i])).parents('div.que.stack').first();
                if ($outerdiv && ($outerdiv.hasClass('dfexplicitvaildate') || $outerdiv.hasClass('dfcbmexplicitvaildate'))) {
                    // With instant validation, we don't need the Check button, so hide it.
                    let button = $outerdiv.find('.im-controls input.submit').first();
                    if (button.attr('id') === prefix + '-submit') {
                        button.hide();
                    }
                }
            }
        }

        formatOptionsObj(rawOptions) {
            let options = {};

            for (let key in rawOptions) {
                if (!rawOptions.hasOwnProperty(key)) continue;

                let value = rawOptions[key];
                switch (key) {
                    case "singlevars":
                        if (value === '1') {
                            options.onlySingleVariables = true;
                        } else {
                            options.onlySingleVariables = false;
                        }
                        break;
                    case "addtimessign":
                        if (value === '1') {
                            options.addTimesSign = true;
                        } else {
                            options.addTimesSign = false;
                        }
                        break;

                    default :
                        break;
                }
            }

            options = Object.assign(DEFAULT_TEX2MAX_OPTIONS, options);
            return options;
        }

        buildInputControls(mode) {
            if (!mode) throw new Error('No mathinputmode is set');

            this.controls = new VisualMath.ControlList('#' + this.questionid + 'controls_wrapper');
            let controlNames = [];

            switch (mode) {
                case 'simple':
                    controlNames = ['sqrt', 'divide', 'pi', 'caret'];
                    this.controls.enable(controlNames);
                    break;
                case 'normal':
                    controlNames = ['sqrt', 'divide', 'nchoosek', 'pi', 'caret'];
                    this.controls.enable(controlNames);
                    break;
                case 'experimental':
                    this.controls.enableAll();
                    break;
                case 'none':
                    break;
                default:
                    break;
            }
        }

        addEventListeners() {
            let selectionButton = $('#' + this.questionid + 'editor_selection');
            let parent = this;
            selectionButton.on('click', function () {
                parent.toggleEditor();
            });
        }

        toggleEditor() {
            if (this.editorVisible) {
                this.inputs.forEach(input => {
                    input.$input.show();
                    input.wrapper.hide();
                    this.controls.$wrapper.hide();
                    this.editorVisible = false;
                })
            } else {
                this.inputs.forEach(input => {
                    input.$input.hide();
                    input.wrapper.show();
                    this.controls.$wrapper.show();
                    this.editorVisible = true;
                });
            }

            saveEditorSelection(this.questionid, this.editorVisible);
        }

    }

    /**
     * Returns true or false whether the wysiwyg editor were visible.
     * @returns {null|boolean} true if the wysiwyg editor were visible
     */
    function getEditorSelection(questionid) {
        let result = null;
        if (!sessionStorage.getItem('editor_selection')) {
            result = null;
        } else {
            let rawData = sessionStorage.getItem('editor_selection');
            let editorSelectionData = JSON.parse(rawData);

            for (let key in editorSelectionData) {
                if (editorSelectionData.hasOwnProperty(key)) {
                    if (key === questionid) {
                        result = editorSelectionData[key]
                    }
                }
            }
            if (result === null) result = false;
        }
        return result;
    }

    /**
     * Saves the viewing state of the wysiwyg editor in the sessionStorage.
     */
    function saveEditorSelection(questionid, editorSelection) {
        let editorSelectionData;

        if (!sessionStorage.getItem('editor_selection')) {
            editorSelectionData = {};
            editorSelectionData[questionid] = editorSelection;

        } else {
            let rawData = sessionStorage.getItem('editor_selection');
            editorSelectionData = JSON.parse(rawData);

            let found = false;
            for (let key in editorSelectionData) {
                if (editorSelectionData.hasOwnProperty(key)) {
                    if (key == questionid) {
                        found = true;
                        editorSelectionData[key] = editorSelection;
                    }
                }
            }
            if (!found) {
                editorSelectionData[questionid] = editorSelection;
            }
        }
        sessionStorage.setItem('editor_selection', JSON.stringify(editorSelectionData));
    }


    return {
        initialize: (questionid, debug, prefix, stackInputIDs, latexInputIDs, latexResponses, questionOptions) => {
            if (!stackInputIDs.length > 0) return;
            let editor = new wysiwyg(questionid, debug, prefix, stackInputIDs, latexInputIDs, latexResponses, questionOptions);

        }
    };

});