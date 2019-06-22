<?php
// This file is part of Stack - http://stack.maths.ed.ac.uk/
//
// Stack is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Stack is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Stack.  If not, see <http://www.gnu.org/licenses/>.

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../options.class.php');
require_once(__DIR__ . '/editorbase.class.php');

/**
 * Input factory. Provides a convenient way to create an editor of any type,
 * and to get metadata about the editor types.
 *
 * @package    qtype_stack
 * @author     André Storhaug <andr3.storhaug@gmail.com>
 * @copyright  2019 Norwegian University of Science and Technology (NTNU)
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class stack_editor_factory {
    /**
     * @var array type name => array of parameter names used. Used to cache the
     *      results of {@link get_default_options()}.
     */
    protected static $optionsdefaults = null;

    /**
     * Create an editor of a given type and return it.
     * @param string $type the required type. Must be one of the values retured by
     *      {@link get_available_types()}.
     * @param $inputs Stack inputs
     * @param string $options optional editor options as a JSON string
     * @param bool $runtime whether the editor is being used at run-time or just constructed elswhere.
     * @return stack_editor the requested editor.
     */
    public static function make($type, $inputs, $options = null, $runtime = true) {
        $class = self::class_for_type($type);

        return new $class($inputs, $options, $runtime);
    }

    /**
     * The class name corresponding to an editor type.
     * @param string $type editor type name.
     * @return string corresponding class name.
     */
    protected static function class_for_type($type) {
        $typelc = strtolower($type);
        $file = __DIR__ . "/{$typelc}/{$typelc}.class.php";
        $class = "stack_{$typelc}_editor";

        if (!is_readable($file)) {
            throw new stack_exception('stack_editor_factory: unknown editor type ' . $type);
        }
        include_once($file);

        if (!class_exists($class)) {
            throw new stack_exception('stack_editor_factory: editor type ' . $type .
                ' does not define the expected class ' . $class);
        }
        return $class;
    }

    /**
     * @return array editor type internal name => display name.
     */
    public static function get_available_type_choices() {
        $types = self::get_available_types();
        $choices = array();
        $choices['none'] = get_string('none', 'moodle');

        foreach ($types as $type => $notused) {
            $choices[$type] = stack_string('editortype' . $type);
        }
        stack_utils::sort_array($choices);
        return $choices;
    }

    /**
     * @return array of available type names.
     */
    public static function get_available_types() {
        $ignored = array('CVS', '_vti_cnf', 'tests', 'yui', 'phpunit');
        $types = array();

        $types = array();
        foreach (new DirectoryIterator(__DIR__) as $item) {
            // Skip . and .. and non-dirs.
            if ($item->isDot() or !$item->isDir()) {
                continue;
            }

            // Skip folders from the ignored array above.
            $foldername = $item->getFilename();
            if (in_array($foldername, $ignored)) {
                continue;
            }

            // Skip folders with dubious names.
            $editorname = clean_param($foldername, PARAM_PLUGIN);
            if (empty($editorname) || $editorname != $foldername) {
                continue;
            }

            // Skip folders that don't contain the right file.
            $file = __DIR__ . "/{$editorname}/{$editorname}.class.php";
            if (!is_readable($file)) {
                continue;
            }

            // Skip folders that don't define the right class.
            include_once($file);
            $class = "stack_{$editorname}_editor";
            if (!class_exists($class)) {
                continue;
            }

            // Yay! finally we have confirmed we have a valid editor plugin!
            $types[$editorname] = $class;
        }

        return $types;
    }

    /**
     * Add all the editor's options fields to the MoodleForm.
     * @param MoodleQuickForm $mform the form to add elements to.
     * @param stack_editor $editortype the editor type
     */
    public static function add_options_to_moodleform(MoodleQuickForm $mform, $editortype) {
        $class = "stack_{$editortype}_editor";
        if (!class_exists($class)) {
            return;
        }
        $class::add_options_to_moodleform($mform, $editortype);
    }

    /**
     * Return array of the options used by each type of editor, for
     * use in authoring interface.
     * @return array $typename => array of names of options used.
     */
    public static function get_options_used() {

        $used = array();
        foreach (self::get_default_options() as $type => $defaults) {
            $used[$type] = array_keys($defaults);
        }
        return $used;
    }

    /**
     * Return array of the default option values for each type of editor,
     * for use in authoring interface.
     * @return array $typename => array of option names => default.
     */
    public static function get_default_options() {
        if (!is_null(self::$optionsdefaults)) {
            return self::$optionsdefaults;
        }
        self::$optionsdefaults = array();
        foreach (self::get_available_types() as $type => $class) {
            self::$optionsdefaults[$type] = $class::get_default_options();
        }
        return self::$optionsdefaults;
    }
}
