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

/**
 * STACK WYSIWYG editor class.
 *
 * @package    qtype_stack
 * @author     André Storhaug <andr3.storhaug@gmail.com>
 * @copyright  2019 Norwegian University of Science and Technology (NTNU)
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class stack_wysiwyg_editor extends stack_editor {

    public static function add_options_to_moodleform(MoodleQuickForm $mform, $editortype, $inputname) {
        $defaultoptions = self::get_default_options();

        $mform->addElement('select', $inputname . $editortype . 'mathinputmode', stack_string('mathinputmode' . $editortype), self::get_math_input_mode_options());
        $mform->setDefault($inputname, $editortype . 'mathinputmode', $defaultoptions['mathinputmode']);
        $mform->hideif($inputname . $editortype . 'mathinputmode', $inputname . 'editortype', 'neq', $editortype);
        $mform->addHelpButton($inputname . $editortype . 'mathinputmode', 'mathinputmode' . $editortype, 'qtype_stack');
    }

    public static function get_default_options() {
        return array(
            'mathinputmode' => 'normal',
        );
    }

    /**
     * @return array of choices for the mathematical input modes select menu.
     */
    private static function get_math_input_mode_options() {
        return array(
            'simple' => get_string('modesimple', 'qtype_stack'),
            'normal' => get_string('modenormal', 'qtype_stack'),
            'advanced' => get_string('modeadvanced', 'qtype_stack'),
            'none' => get_string('modenone', 'qtype_stack'),
        );
    }

    public function get_editor_name() {
        return 'wysiwyg';
    }

    public function get_input_data($response) {
        // Set initial question value to "" if no responses exists.
        if (isset($response[$this->input->get_name() . '_latex'])) {
            $latexresponse = $response[$this->input->get_name() . '_latex'];
        } else {
            $latexresponse = "";
        }

        $options = array(
            "input" => $this->input->get_name(),
            "latexresponse" => $latexresponse,
            "inputoptions" => array(
                "insertStars" => $this->input->get_parameter('insertStars', 0)
            ));
        return $options;
    }
}