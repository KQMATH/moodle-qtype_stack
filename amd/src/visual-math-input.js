/**
 * AMD module for a visual math input. This uses MathQuill.
 *
 * @package    qtype_stack
 * @author     André Storhaug <andr3.storhaug@gmail.com>
 * @copyright  2019 Norwegian University of Science and Technology (NTNU)
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['jquery', './mathquill'], function ($, MathQuill) {

    // When a control button is clicked, the input blurs.
    // This lets the control button know which input to act on.
    // let lastFocusedInput = null;

    class Input {

        constructor(input, parent, lastFocusedInput) {
            this.$input = $(input);
            this.$parent = $(parent);
            this.lastFocusedInput = lastFocusedInput;
            let wrapper = document.createElement('div');
            this.wrapper = $(wrapper).addClass('visual-math-input-field');
            let MQ = MathQuill.getInterface(2);
            this.field = MQ.MathField(wrapper, {
                spaceBehavesLikeTab: true,
                handlers: {
                    edit: field => {
                        this.onEdit($(input), field);
                    }
                }
            });
            this.$parent.append(wrapper);
            this.onEdit = ($input, field) => $input.val('\\[ ' + field.latex() + ' \\]'); // TODO FIX !! /[..../]
            this.$textarea.on('blur', () => this.lastFocusedInput.input = this);
        }

        get $textarea() {
            return $(this.field.el()).find('textarea');
        }

        enable() {
            this.$textarea.prop('disabled', false);
        }

        disable() {
            this.$textarea.prop('disabled', true);
        }

    }

    class StaticInput {

        constructor(input, parent) {
            this.$input = $(input);
            this.$parent = $(parent);
            let wrapper = document.createElement('div');
            this.wrapper = $(wrapper).addClass('visual-math-input-field');
            let MQ = MathQuill.getInterface(2);
            this.field = MQ.StaticMath(wrapper, {
                spaceBehavesLikeTab: true,
            });

            this.$parent.append(wrapper);
        }
    }

    class Control {

        constructor(name, text, onClick, lastFocusedInput) {
            this.lastFocusedInput = lastFocusedInput;
            this.name = name;
            this.text = text;
            this.onClick = onClick;
            this.$element = null;
        }

        enable() {
            if (this.$element !== null) {
                return;
            }
            let element = document.createElement('button');
            this.$element = $(element);
            this.$element.html(this.text);
            this.$element.addClass('visual-math-input-control btn btn-primary');
            this.$element.on('click', event => {
                event.preventDefault();
                if (this.lastFocusedInput.input !== null) {
                    this.onClick(this.lastFocusedInput.input.field);
                    this.lastFocusedInput.input.field.focus();
                }
            });
        }

    }

    class ControlList {

        constructor(wrapper, lastFocusedInput) {
            this.controls = [];
            this.lastFocusedInput = lastFocusedInput;
            this.$wrapper = $(wrapper);
            this.$wrapper.addClass('visualmathinputwrapper');
            this.defineDefault();
        }

        define(name, text, onClick) {
            this.controls[name] = new Control(name, text, onClick, this.lastFocusedInput);
        }

        enable(names) {
            for (let name of names) {
                let control = this.controls[name];
                control.enable();
                this.$wrapper.append(control.$element);
            }
        }

        enableAll() {
            for (let name in this.controls) {
                let control = this.controls[name];
                control.enable();
                this.$wrapper.append(control.$element);
            }
        }

        defineDefault() {
            // It is also possible to render \\[ \\binom{n}{k} \\] with MathJax.
            // Using MathQuill's HTML output is slightly less clean, but we avoid using YUI and MathJax.

            let sqrt = '<span class="mq-root-block">&radic;</span>';
            let int = '<span class="mq-root-block">&int;</span>';
            let sum = '<span class="mq-root-block"><span class="mq-large-operator mq-non-leaf">&sum;</span></span>';
            let lim = '<span class="mq-root-block">lim</span>';

            let nchoosek = '<div class="mq-math-mode" style="cursor:pointer;font-size:100%;">';
            nchoosek += '<span class="mq-root-block">';
            nchoosek += '<span class="mq-non-leaf">';
            nchoosek += '<span class="mq-paren mq-scaled" style="transform: scale(0.8, 1.5);">(</span>';
            nchoosek += '<span class="mq-non-leaf" style="margin-top:0;">';
            nchoosek += '<span class="mq-array mq-non-leaf">';
            nchoosek += '<span style="font-size: 14px;"><var>n</var></span>';
            nchoosek += '<span style="font-size: 14px;"><var>k</var></span>';
            nchoosek += '</span></span>';
            nchoosek += '<span class="mq-paren mq-scaled" style="transform: scale(0.8, 1.5);">)</span></span>';
            nchoosek += '</span></div>';

            let divide = '<span class="mq-root-block">/</span>';
            let plusminus = '<span class="mq-root-block">&plusmn;</span>';
            let theta = '<span class="mq-root-block">&theta;</span>';
            let pi = '<span class="mq-root-block">&pi;</span>';
            let infinity = '<span class="mq-root-block">&infin;</span>';

            let caret = '<div class="mq-math-mode" style="cursor:pointer;font-size:100%;">';
            caret += '<span class="mq-root-block">';
            caret += '<var>x</var>';
            caret += '<span class="mq-supsub mq-non-leaf mq-sup-only">';
            caret += '<span class="mq-sup">';
            caret += '<var>y</var>';
            caret += '</span></span></span></div>';


            this.define('sqrt', sqrt, field => field.cmd('\\sqrt'));
            this.define('int', int, field => field.cmd('\\int'));
            this.define('sum', sum, field => field.cmd('\\sum'));
            this.define('lim', lim, field => {
                field.cmd('\\lim').typedText('_').write('x').cmd('\\to').write('0').moveToRightEnd();
            });
            this.define('nchoosek', nchoosek, field => field.cmd('\\choose'));
            this.define('divide', divide, field => field.cmd('\\frac'));
            this.define('plusminus', plusminus, field => field.cmd('\\pm'));
            this.define('theta', theta, field => field.cmd('\\theta'));
            this.define('pi', pi, field => field.cmd('\\pi'));
            this.define('infinity', infinity, field => field.cmd('\\infinity'));
            this.define('caret', caret, field => field.cmd('^'));
        }

    }

    return {
        Input: Input,
        StaticInput: StaticInput,
        Control: Control,
        ControlList: ControlList
    };

});