<?php
// This file is part of Stack - http://stack.bham.ac.uk/
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

/**
 * Unit tests for the stack_boolean_input class.
 *
 * @copyright  2012 The Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


require_once(dirname(__FILE__) . '/../factory.class.php');
require_once(dirname(__FILE__) . '/../boolean.class.php');


/**
 * Unit tests for stack_boolean_input_test.
 *
 * @copyright  2012 The Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class stack_boolean_input_test extends UnitTestCase {

    protected function expected_choices() {
        return array(
            stack_boolean_input::F => stack_string('false'),
            stack_boolean_input::T => stack_string('true'),
            stack_boolean_input::NA => stack_string('notanswered'),
        );
    }

    public function test_get_xhtml_not_answered() {
        $el = stack_input_factory::make('boolean', 'ans1', stack_boolean_input::T);
        $this->assert(new ContainsSelectExpectation('stack1__ans1', $this->expected_choices(),
                stack_boolean_input::NA), $el->get_xhtml(stack_boolean_input::NA, 'stack1__ans1', false));
    }

    public function test_get_xhtml_true() {
        $el = stack_input_factory::make('boolean', 'ans2', stack_boolean_input::T);
        $this->assert(new ContainsSelectExpectation('stack1__ans2', $this->expected_choices(),
                stack_boolean_input::T), $el->get_xhtml(stack_boolean_input::T, 'stack1__ans2', false));
    }

    public function test_get_xhtml_false() {
        $el = stack_input_factory::make('boolean', 'ans3', stack_boolean_input::T);
        $this->assert(new ContainsSelectExpectation('stack1__ans3', $this->expected_choices(),
                stack_boolean_input::F), $el->get_xhtml(stack_boolean_input::F, 'stack1__ans3', false));
    }

    public function test_get_xhtml_disabled() {
        $el = stack_input_factory::make('boolean', 'input', stack_boolean_input::T);
        $this->assert(new ContainsSelectExpectation('stack1__ans1', $this->expected_choices(),
                stack_boolean_input::NA, false), $el->get_xhtml('', 'stack1__ans1', true));
    }

    public function test_validate_student_response_true() {
        $options = new stack_options();
        $el = stack_input_factory::make('boolean', 'sans1', 'true');
        $state = $el->validate_student_response('true', $options);
        $this->assertEqual(stack_input::SCORE, $state->status);
    }

    public function test_validate_student_response_false() {
        $options = new stack_options();
        $el = stack_input_factory::make('boolean', 'sans1', 'true');
        $state = $el->validate_student_response('false', $options);
        $this->assertEqual(stack_input::SCORE, $state->status);
    }

    public function test_validate_student_response_na() {
        $options = new stack_options();
        $el = stack_input_factory::make('boolean', 'sans1', 'true');
        $state = $el->validate_student_response('', $options);
        $this->assertEqual(stack_input::BLANK, $state->status);
    }
}
