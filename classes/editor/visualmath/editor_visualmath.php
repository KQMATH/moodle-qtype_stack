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

/**
 * STACK VisualMath editor class.
 *
 * @package    qtype
 * @subpackage stack
 * @author     André Storhaug <andr3.storhaug@gmail.com>
 * @copyright  2018 NTNU
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace qtype_stack\editor;

require_once(__DIR__ . '/debug_renderer.php');
use html_writer;

class editor_visualmath {

    private $inputs = array();
    private $questionid;
    private $prefix;
    private $response;
    private $editoroptions;


    public function __construct($questionid, $prefix, $response, $editoroptions) {
        $this->questionid = $questionid;
        $this->prefix = $prefix;
        $this->response = $response;
        $this->editoroptions = $editoroptions;
    }

    public function render() {
        $result = html_writer::div('', '', ['id' => $this->questionid . 'controls_wrapper']);
        $result .= html_writer::div('Change editor ', 'btn btn-primary editor_selection', ['id' => $this->questionid . 'editor_selection']);

        return $result;
    }

    public function render_debug_info() {
        global $CFG;
        $result = "";
        if ($CFG->debugdeveloper) {
            $result .= debug_renderer::render_debug_view($this->get_input_options());
        }
        return $result;
    }

    public function is_used() {
        $isused = false;
        if (sizeof($this->inputs) > 0) {
            $isused = true;
        }

        return $isused;
    }

    public function is_enabled() {
        $isenabled = false;
        if ($this->editoroptions->editorvisualmath == 1) {
            $isenabled = true;
        }

        return $isenabled;
    }

    public function register_input($name, $input) {
        if ($input->get_supported_editors()['visualmath']) {
            $this->inputs[$name] = $input;
        }
    }

    public function get_js_params_array() {
        global $CFG;

        $params = array(
            $this->questionid,
            $CFG->debugdeveloper,
            $this->prefix,
            $this->get_input_options(),
            $this->get_editor_options()
        );

        return $params;
    }

    private function get_input_options() {
        $options = [];

        foreach ($this->inputs as $name => $input) {
            $inputid = $this->get_field_name($name);
            $latexinputid = $this->get_latex_field_name($name); // Name for hidden raw LaTeX input field.

            // Set initial question value to "" if no responses exists.
            if (isset($this->response[$name . '_latex'])) {
                $latexresponse = $this->response[$name . '_latex'];
            } else {
                $latexresponse = "";
            }

            array_push($options, array("inputid" => $inputid,
                "latexinputid" => $latexinputid,
                "latexresponse" => $latexresponse,
                "inputoptions" => array(
                    "insertStars" => $input->get_parameter('insertStars', 0)
                )));
        }

        return $options;
    }

    private function get_field_name($name) {
        return $this->prefix . $name;
    }

    private function get_latex_field_name($name) {
        return $this->prefix . $name . '_' . 'latex';
    }

    private function get_editor_options() {
        $editor_options = [];
        $editor_options['mathinputmode'] = $this->editoroptions->mathinputmode;

        return $editor_options;
    }

}