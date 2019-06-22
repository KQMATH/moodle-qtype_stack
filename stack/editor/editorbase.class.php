<?php
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

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../../locallib.php');
require_once(__DIR__ . '/../options.class.php');
require_once(__DIR__ . '/../cas/casstring.class.php');

/**
 * The base class for editors in STACK.
 *
 * @package    qtype_stack
 * @author     André Storhaug <andr3.storhaug@gmail.com>
 * @copyright  2019 Norwegian University of Science and Technology (NTNU)
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
abstract class stack_editor {

    protected $inputs = array();
    protected $editoroptions;
    protected $runtime;

    /**
     * Constructor
     *
     * @param $inputs Stack inputs
     * @param null $options The options for this editor. Encoded as a JSON string.
     * @param bool $runtime This decides if we are at runtime (true) or in edit mode.
     */
    public function __construct($inputs, $options = null, $runtime = true) {
        $this->runtime = $runtime;
        $class = get_class($this);
        $this->editoroptions = $class::get_default_options();

        if (null === $inputs || !is_array($inputs)) {
            throw new stack_exception('stack_editor: __construct: 3rd argumenr, $inputs, ' .
                'must be an array of options and not null.');
        }
        foreach ($inputs as $name => $input) {
            if ($this->is_input_supported($input)) {
                $this->inputs[$name] = $input;
            }
        }

        if (null !== $options) {
            $decoptions = json_decode($options, true);
            if (null === $decoptions) {
                throw new stack_exception('stack_editor: __construct: 4rd argumenr, options must be valid JSON');
            }
            foreach ($decoptions as $name => $value) {

                $this->set_option($name, $value);
            }
        }
    }

    public function is_input_supported($input) {
        if ($input::get_supported_editors()[$this->get_editor_name()]) {
            return true;
        }
        return false;
    }

    /**
     * Return this editor's name.
     * @return string this editor's name.
     */
    abstract public function get_editor_name();

    /**
     * Sets the value of an editor option.
     * @param string $option the option name.
     * @param $value the option value.
     * @return void of parameters names.
     */
    public function set_option($option, $value) {
        if (!$this->is_option_used($option)) {
            throw new stack_exception('stack_editor: setting option ' . $option .
                ' which does not exist for editors of type ' . get_class($this));
        }

        $this->editoroptions[$option] = $value;
    }

    /**
     * @param string $param a settings option name.
     * @return bool whether this editor type uses this option.
     */
    public function is_option_used($param) {
        $class = get_class($this);
        return array_key_exists($param, $class::get_default_options());
    }

    /**
     * Add all the editor's options fields to the MoodleForm.
     * @param MoodleQuickForm $mform the form to add elements to.
     * @param stack_editor $editortype the editor type
     */
    public abstract static function add_options_to_moodleform(MoodleQuickForm $mform, $editortype);

    /**
     * Return the default values for the editor options.
     * @return array parameters => default value.
     */
    public static function get_default_options() {
        return array();
    }

    /**
     * Returns the XHTML for embedding this editor in a page.
     *
     * @param string $questionid the id of the question.
     * @return string HTML for this editor.
     */
    abstract public function render($questionid);

    public function is_used() {
        $isused = false;
        if (sizeof($this->inputs) > 0) {
            $isused = true;
        }

        return $isused;
    }

    /**
     * Get the parameters to be sent to the AMD JavaScript editor module.
     *
     * @param string $questionid the question id.
     * @param string $prefix the question prefix.
     * @param $response the question response
     * @return array returns an array of the required js parameters.
     */
    public function get_js_params_array($questionid, $prefix, $response) {
        global $CFG;

        $params = array(
            "editor" => $this->get_editor_name(),
            $questionid,
            $prefix,
            $this->get_input_options($response),
            $this->get_editor_options(),
            $CFG->debugdeveloper,
        );
        return $params;
    }

    /**
     * Get the relevant input options.
     * @param $response the question responce.
     * @return array returns an array of the relevant input options.
     */
    abstract protected function get_input_options($response);

    /**
     * Get this editor options.
     * @return array this editor options.
     */
    protected function get_editor_options() {
        return $this->editoroptions;
    }
}