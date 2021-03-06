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
 * A javascript module to handle the creation of different editor types.
 *
 * @package    qtype_stack
 * @author     André Storhaug <andr3.storhaug@gmail.com>
 * @copyright  2019 Norwegian University of Science and Technology (NTNU)
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['jquery', 'qtype_stack/wysiwyg-editor'], function($, WYSIWYG) {

    return {
        initialize: function(questionid, prefix, inputsdata, debug) {
            if (!inputsdata.length > 0) {
                return false;
            }

            Object.keys(inputsdata).forEach(function(input) {

                if (inputsdata[input].editor === 'wysiwyg') {
                    new WYSIWYG(questionid, prefix, inputsdata[input].inputdata, inputsdata[input].editoroptions, debug);
                    return true;
                }

            });
            return false;
        },
    };
});
