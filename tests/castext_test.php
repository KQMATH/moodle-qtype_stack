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

require_once(__DIR__ . '/../locallib.php');
require_once(__DIR__ . '/test_base.php');
require_once(__DIR__ . '/../stack/cas/castext.class.php');


/**
 * Unit tests for {@link stack_cas_text}.
 * @group qtype_stack
 */
class stack_cas_text_test extends qtype_stack_testcase {

    public function basic_castext_instantiation($strin, $sa, $val, $disp) {

        if (is_array($sa)) {
            $s1 = array();
            foreach ($sa as $s) {
                $s1[] = new stack_cas_casstring($s);
            }
            $cs1 = new stack_cas_session($s1, null, 0);
        } else {
            $cs1 = null;
        }

        $at1 = new stack_cas_text($strin, $cs1, 0);
        $this->assertEquals($val, $at1->get_valid());
        $this->assertEquals($disp, $at1->get_display_castext());
    }

    public function test_basic_castext_instantiation() {

        $a1 = array('a:x^2', 'b:(x+1)^2');
        $a2 = array('a:x^2)', 'b:(x+1)^2');

        $cases = array(
                array('', null, true, ''),
                array('Hello world', null, true, 'Hello world'),
                array('$x^2$', null, true, '$x^2$'),
                array('\[{@x^2@}\]', null, true, '\[{x^2}\]'),
                array('\(x^2\)', null, true, '\(x^2\)'),
                array('{@x*x^2@}', null, true, '\({x^3}\)'),
                array('{@1+2@}', null, true, '\({3}\)'),
                array('\[{@x^2@}\]', null, true, '\[{x^2}\]'),
                array('\[{@a@}+\sin(x)\]', $a1, true, '\[{x^2}+\sin(x)\]'),
                array('\[{@a@}\]', $a1, true, '\[{x^2}\]'),
        		array('{@a@}', $a1, true, '\({x^2}\)'),
                array('{@sin(x)@}', $a1, true, '\({\sin \left( x \right)}\)'),
                array('\[{@a*b@}\]', $a1, true, '\[{x^2\cdot \left(x+1\right)^2}\]'),
                array('@', null, true, '@'),
                array('{#1+2#}', null, true, "3"),
                array('{#sin(x)#}', null, true, "sin(x)"),
                array('{#a#}...{#a^2#}', $a1, true, "x^2...x^4"),
        );

        foreach ($cases as $case) {
            $this->basic_castext_instantiation($case[0], $case[1], $case[2], $case[3]);
        }

    }

    public function test_various_delimiters() {

        $cs2 = new stack_cas_session(array(), null, 0);
        $at1 = new stack_cas_text('Inline \({@1+1@}\)', $cs2, 0, 't');
        $this->assertTrue($at1->get_valid());
        $at1->get_display_castext();
        $session = $at1->get_session();
        $this->assertEquals(array('caschat0'), $session->get_all_keys());
        $this->assertEquals('Inline \({2}\)', $at1->get_display_castext());

        $cs2 = new stack_cas_session(array(), null, 0);
        $at1 = new stack_cas_text('Display \[{@1+1@}\]', $cs2, 0, 't');
        $this->assertTrue($at1->get_valid());
        $at1->get_display_castext();
        $session = $at1->get_session();
        $this->assertEquals(array('caschat0'), $session->get_all_keys());
        $this->assertEquals('Display \[{2}\]', $at1->get_display_castext());

        $cs2 = new stack_cas_session(array(), null, 0);
        $at1 = new stack_cas_text('Implicit inline {@1+1@}', $cs2, 0, 't');
        $this->assertTrue($at1->get_valid());
        $at1->get_display_castext();
        $session = $at1->get_session();
        $this->assertEquals(array('caschat0'), $session->get_all_keys());
        $this->assertEquals('Implicit inline \({2}\)', $at1->get_display_castext());
    }

    public function test_if_block() {
        $a1 = array('a:true', 'b:is(1>2)');

        $cases = array(
                array('[[ if test="a" ]]ok[[/ if ]]', $a1, true, "ok"),
                array('[[ if test="b" ]]ok[[/ if ]]', $a1, true, ""),
                array('[[ if test="a" ]][[ if test="a" ]]ok[[/ if ]][[/ if ]]', $a1, true, "ok"),
                array('[[ if test="a" ]][[ if test="b" ]]ok[[/ if ]][[/ if ]]', $a1, true, ""),
        );

        foreach ($cases as $case) {
            $this->basic_castext_instantiation($case[0], $case[1], $case[2], $case[3]);
        }
    }

    public function test_if_block_error() {
        $a = array('a:true', 'b:is(1>2)');
        $cs = array();
        foreach ($a as $var) {
            $cs[] = new stack_cas_casstring($var);
        }
        $session = new stack_cas_session($cs, null, 0);

        $c = '[[ if test="a" ]][[ if ]]ok[[/ if ]][[/ if ]]';
        $ct = new stack_cas_text($c, $session);
        $ct->get_display_castext();
        $this->assertFalse($ct->get_valid());
        $this->assertEquals('<span class="error">CASText failed validation. </span>If-block needs a test attribute. ', $ct->get_errors(false));
    }

    public function test_define_block() {
        $a1 = array('a:2');

        $cases = array(
                array('{#a#} [[ define a="1" /]]{#a#}', $a1, true, "2 1"),
                array('{#a#} [[ define a="a^2" /]]{#a#}', $a1, true, "2 4"),
        );

        foreach ($cases as $case) {
            $this->basic_castext_instantiation($case[0], $case[1], $case[2], $case[3]);
        }
    }

    public function test_foreach_block() {
        $a1 = array('a:[1,2,3]','b:{4,5,6,7}');

        $cases = array(
                // The first one is a tricky one it uses the same variable name
                array('{#a#} [[ foreach a="a" ]]{#a#},[[/foreach]]', $a1, true, "[1,2,3] 1,2,3,"),
                array('[[ foreach a="b" ]]{#a#},[[/foreach]]', $a1, true, "4,5,6,7,"),
                array('[[ foreach I="a" K="b" ]]{#I#},{#K#},[[/foreach]]', $a1, true, "1,4,2,5,3,6,"),
                array('[[ foreach o="[[1,2],[3,4]]" ]]{[[ foreach k="o" ]]{#k#},[[/ foreach ]]}[[/foreach]]', $a1, true, "{1,2,}{3,4,}"),
        );

        foreach ($cases as $case) {
            $this->basic_castext_instantiation($case[0], $case[1], $case[2], $case[3]);
        }
    }

    public function test_not_confused_by_pluginfile() {
        $ct = new stack_cas_text('Here {@x@} is some @@PLUGINFILE@@ {@x + 1@} some input', null, 0);
        $this->assertTrue($ct->get_valid());
        $this->assertEquals(array('x', 'x + 1'), $ct->get_all_raw_casstrings());
        $this->assertEquals('Here \({x}\) is some @@PLUGINFILE@@ \({x+1}\) some input', $ct->get_display_castext());
    }

    public function test_not_confused_by_pluginfile_real_example() {
        $realexample = '<p><img style="display: block; margin-left: auto; margin-right: auto;" ' .
                'src="@@PLUGINFILE@@/inclined-plane.png" alt="" width="164" height="117" /></p>';
        $ct = new stack_cas_text($realexample);
        $this->assertTrue($ct->get_valid());
        $this->assertEquals(array(), $ct->get_all_raw_casstrings());
        $this->assertEquals($realexample, $ct->get_display_castext());
    }

    public function test_get_all_raw_casstrings() {
        $raw = 'Take {@x^2+2*x@} and then {@sin(z^2)@}.';
        $at1 = new stack_cas_text($raw, null, 0);
        $val = array('x^2+2*x', 'sin(z^2)');
        $this->assertEquals($val, $at1->get_all_raw_casstrings());
    }

    public function test_get_all_raw_casstrings_if() {
        $raw = 'Take {@x^2+2*x@} and then [[ if test="true"]]{@sin(z^2)@}[[/if]].';
        $at1 = new stack_cas_text($raw, null, 0);
        $val = array('x^2+2*x', 'true', 'sin(z^2)');
        $this->assertEquals($val, $at1->get_all_raw_casstrings());
    }

    public function test_get_all_raw_casstrings_foreach() {
        $raw = 'Take {@x^2+2*x@} and then [[ foreach t="[1,2,3]"]]{@t@}[[/foreach]].';
        $at1 = new stack_cas_text($raw, null, 0);
        // here the list is iterated over and the t-variable appears multiple times.
        $val = array('x^2+2*x', '[1,2,3]', '1','t','2','t','3','t');
        $this->assertEquals($val, $at1->get_all_raw_casstrings());
    }

    public function test_get_all_raw_casstrings_empty() {
        $raw = 'Take some text without cas commands.';
        $at1 = new stack_cas_text($raw, null, 0);
        $val = array();
        $this->assertEquals($val, $at1->get_all_raw_casstrings());
    }

    public function test_get_all_raw_casstrings_session() {

        $sa = array('p:diff(sans)', 'q=int(tans)');
        foreach ($sa as $s) {
            $cs    = new stack_cas_casstring($s);
            $cs->validate('t');
            $s1[] = $cs;
        }
        $cs1 = new stack_cas_session($s1, null, 0);

        $raw = 'Take {@ 1/(1+x^2) @} and then {@sin(z^2)@}.';
        $at1 = new stack_cas_text($raw, $cs1, 0);
        $val = array('p:diff(sans)', 'q=int(tans)', '1/(1+x^2)', 'sin(z^2)');
        $this->assertEquals($val, $at1->get_all_raw_casstrings());

    }

    public function check_external_forbidden_words($ct, $val, $words) {

        $a2 = array('a:x^2)', 'b:(sin(x)+1)^2');
        $s2 = array();
        foreach ($a2 as $s) {
            $s2[] = new stack_cas_casstring($s);
        }
        $cs2 = new stack_cas_session($s2, null, 0);

        $at1 = new stack_cas_text($ct, $cs2, 0);
        $at1->get_display_castext();
        $this->assertEquals($val, $at1->check_external_forbidden_words($words));

    }

    public function test_auto_generated_key_names() {

        $a2 = array('a:x^2', 'caschat0:x^3');
        $s2 = array();
        foreach ($a2 as $s) {
            $cs = new stack_cas_casstring($s);
            $cs->validate('t');
            $s2[] = $cs;
        }
        $cs2 = new stack_cas_session($s2, null, 0);

        $at1 = new stack_cas_text("This is some text {@x^2@}, {@x^3@}", $cs2, 0);
        $at1->get_display_castext();
        $session = $at1->get_session();
        $this->assertEquals(array('a', 'caschat0', 'caschat1', 'caschat2'), $session->get_all_keys());
    }

    public function test_redefine_variables() {
        // Notice this means that within a session the value of n has to be returned at every stage....
        $at1 = new stack_cas_text(
                'Let \(n\) be defined by \({@n:3@}\). Now add one to get \({@n:n+1@}\) and square the result \({@n:n^2@}\).', null, 0);
        $this->assertEquals('Let \(n\) be defined by \({3}\). Now add one to get \({4}\) and square the result \({16}\).',
                $at1->get_display_castext());
    }

    public function testcheck_external_forbidden_words() {
        $cases = array(
            array('', false, array()),
            array('$\sin(x)$', false, array()),
            array('$\cos(x)$', false, array('cos')),
            array('{@cos(x)@}', true, array('cos')),
            array('$\cos(x)$', true, array('sin')), // The session already has sin(x) above!
        );

        foreach ($cases as $case) {
            $this->check_external_forbidden_words($case[0], $case[1], $case[2]);
        }
    }

    public function test_fact_sheets() {
        $cs2 = new stack_cas_session(array(), null, 0);
        $at1 = new stack_cas_text("[[facts:calc_diff_linearity_rule]]", $cs2, 0);
        $output = stack_maths::process_display_castext($at1->get_display_castext());

        $this->assertContains(stack_string('calc_diff_linearity_rule_name'), $output);
        $this->assertContains(stack_string('calc_diff_linearity_rule_fact'), $output);
    }

    public function test_bad_variablenames() {
        $cs = new stack_cas_session(array(), null, 0);
        $rawcastext = '\[\begin{array}{rcl} & =& {@Ax2@} + {@double_cAx@} + {@c2A@} + {@Bx2@} + {@cBx@} + {@Cx@},\\ & =' .
                '& {@ApBx2@} + {@xterm@} + {@c2A@}. \end{array}\] Matching coefficients \[\begin{array}{rcl} A + B& =' .
                '& {@a@}\,\\ {@double_cA + cB@} + C& =& 0,\\ {@Ac2@}& =& {@b@}. \end{array}\]';
        $at1 = new stack_cas_text($rawcastext, $cs, 0, 't', false, 0);

        $this->assertFalse($at1->get_valid());
        $this->assertEquals($at1->get_errors(), '<span class="error">CASText failed validation. </span>' .
                        'CAS commands not valid. </br>You seem to be missing * characters. Perhaps you meant to type ' .
                        '<span class="stacksyntaxexample">c2<font color="red">*</font>A</span>.' .
                        'You seem to be missing * characters. Perhaps you meant to type ' .
                        '<span class="stacksyntaxexample">c2<font color="red">*</font>A</span>.');
    }

    public function test_assignmatrixelements() {
        // Assign a value to matrix entries.
        $cs = array('A:matrix([1,2],[1,1])', 'A[1,2]:3');

        foreach ($cs as $s) {
            $cs = new stack_cas_casstring($s);
            $cs->validate('t');
            $s1[] = $cs;
        }
        $at1 = new stack_cas_session($s1, null, 0);

        $at1 = new stack_cas_text("{@A@}", $at1, 0);
        $at1->get_display_castext();

        $this->assertEquals('\({\left[\begin{array}{cc} 1 & 3 \\\\ 1 & 1 \end{array}\right]}\)', $at1->get_display_castext());
    }

    public function test_assignmatrixelements_p1() {
        // Assign a value to matrix entries.
        $cs = array('A:matrix([1,2],[1,1])', 'A[1,2]:3');

        foreach ($cs as $s) {
            $cs = new stack_cas_casstring($s);
            $cs->validate('t');
            $s1[] = $cs;
        }
        $options = new stack_options();
        $options->set_option('matrixparens', '(');
        $at1 = new stack_cas_session($s1, $options, 0);

        $at1 = new stack_cas_text("{@A@}", $at1, 0);
        $at1->get_display_castext();

        $this->assertEquals('\({\left(\begin{array}{cc} 1 & 3 \\\\ 1 & 1 \end{array}\right)}\)', $at1->get_display_castext());
    }

    public function test_assignmatrixelements_p2() {
        // Assign a value to matrix entries.
        $cs = array('A:matrix([1,2],[1,1])', 'A[1,2]:3');

        foreach ($cs as $s) {
            $cs = new stack_cas_casstring($s);
            $cs->validate('t');
            $s1[] = $cs;
        }
        $options = new stack_options();
        $options->set_option('matrixparens', '');
        $at1 = new stack_cas_session($s1, $options, 0);

        $at1 = new stack_cas_text("{@A@}", $at1, 0);
        $at1->get_display_castext();

        $this->assertEquals('\({\begin{array}{cc} 1 & 3 \\\\ 1 & 1 \end{array}}\)', $at1->get_display_castext());
    }

    public function test_plot() {

        $a2 = array('p:x^3');
        $s2 = array();
        foreach ($a2 as $s) {
            $cs = new stack_cas_casstring($s);
            $cs->validate('t');
            $s2[] = $cs;
        }
        $cs2 = new stack_cas_session($s2, null, 0);

        $at1 = new stack_cas_text("This is some text {@plot(p, [x,-2,3])@}", $cs2, 0);
        $this->assertTrue($at1->get_valid());
        $at1->get_display_castext();

        $session = $at1->get_session();
        $this->assertEquals(array('p', 'caschat0'), $session->get_all_keys());

        $this->assertTrue(is_int(strpos($at1->get_display_castext(),
                ".png' alt='STACK auto-generated plot of x^3 with parameters [[x,-2,3]]'")));
    }

    public function test_plot_alttext() {

        $a2 = array('p:sin(x)');
        $s2 = array();
        foreach ($a2 as $s) {
            $cs = new stack_cas_casstring($s);
            $cs->validate('t');
            $s2[] = $cs;
        }
        $cs2 = new stack_cas_session($s2, null, 0);

        // Note, since we have spaces in the string we currently need to validate this as the teacher....
        $at1 = new stack_cas_text('This is some text {@plot(p, [x,-2,3], [alt,"Hello World!"])@}', $cs2, 0, 't');
        $this->assertTrue($at1->get_valid());
        $at1->get_display_castext();

        $session = $at1->get_session();
        $this->assertEquals(array('p', 'caschat0'), $session->get_all_keys());
        $this->assertTrue(is_int(strpos($at1->get_display_castext(), ".png' alt='Hello World!'")));
    }

    public function test_plot_alttext_error() {

        $a2 = array('p:sin(x)');
        $s2 = array();
        foreach ($a2 as $s) {
            $cs = new stack_cas_casstring($s);
            $cs->validate('t');
            $s2[] = $cs;
        }
        $cs2 = new stack_cas_session($s2, null, 0);

        // Alt tags must be a string.
        $at1 = new stack_cas_text('This is some text {@plot(p,[x,-2,3],[alt,x])@}', $cs2, 0, 't');
        $at1->get_display_castext();

        $this->assertTrue($at1->get_valid());
        $session = $at1->get_session();
        $this->assertEquals(array('p', 'caschat0'), $session->get_all_keys());
        $this->assertTrue(is_int(strpos($at1->get_errors(), "Plot error: the alt tag definition must be a string, but is not.")));
    }

    public function test_plot_option_error() {

        $cs2 = new stack_cas_session(array(), null, 0);

        // Alt tags must be a string.
        $at1 = new stack_cas_text('This is some text {@plot(x^2,[x,-2,3],[notoption,""])@}', $cs2, 0, 't');
        $at1->get_display_castext();
        $this->assertTrue($at1->get_valid());

        $session = $at1->get_session();
        $this->assertEquals(array('caschat0'), $session->get_all_keys());
        $this->assertTrue(is_int(strpos($at1->get_errors(),
                "Plot error: STACK does not currently support the following plot2d options:")));
    }

    public function test_multiplication_options() {

        $options = new stack_options();
        // dot
        $options->set_option('multiplicationsign', 'dot');
        $cs2 = new stack_cas_session(array(), $options, 0);

        $at1 = new stack_cas_text('Some text \({@a*sin(2*x)@}\)', $cs2, 0, 't');
        $this->assertTrue($at1->get_valid());
        $at1->get_display_castext();

        $session = $at1->get_session();
        $this->assertEquals(array('caschat0'), $session->get_all_keys());
        $this->assertEquals('Some text \({a\cdot \sin \left( 2\cdot x \right)}\)', $at1->get_display_castext());

        // cross
        $options->set_option('multiplicationsign', 'cross');
        $cs2 = new stack_cas_session(array(), $options, 0);

        $at1 = new stack_cas_text('Some text \({@a*sin(2*x)@}\)', $cs2, 0, 't');
        $this->assertTrue($at1->get_valid());
        $at1->get_display_castext();

        $session = $at1->get_session();
        $this->assertEquals(array('caschat0'), $session->get_all_keys());
        $this->assertEquals('Some text \({a\times \sin \left( 2\times x \right)}\)', $at1->get_display_castext());

        // none
        $options->set_option('multiplicationsign', 'none');
        $cs2 = new stack_cas_session(array(), $options, 0);

        $at1 = new stack_cas_text('Some text \({@a*sin(2*x)@}\)', $cs2, 0, 't');
        $this->assertTrue($at1->get_valid());
        $at1->get_display_castext();

        $session = $at1->get_session();
        $this->assertEquals(array('caschat0'), $session->get_all_keys());
        $this->assertEquals('Some text \({a\,\sin \left( 2\,x \right)}\)', $at1->get_display_castext());
    }

    public function test_currency_1() {

        $at1 = new stack_cas_text('This is system cost \$100,000 to create.', null, 0, 't');
        $this->assertTrue($at1->get_valid());
    }

    public function test_global_forbidden_words() {
        $at1 = new stack_cas_text('This is system cost \({@system(rm*)@}\) to create.', null, 0, 't');
        $at1->get_display_castext();
        $this->assertFalse($at1->get_valid());
        $this->assertEquals($at1->get_errors(), '<span class="error">CASText failed validation. </span>' .
                'The expression <span class="stacksyntaxexample">system</span> is forbidden.');
    }

    public function test_invalid_casstrings() {
        $at1 = new stack_cas_text('This is invalid \({@2*@}\).', null, 0, 't');
        $at1->get_display_castext();
        $this->assertFalse($at1->get_valid());
        $this->assertEquals($at1->get_errors(), '<span class="error">CASText failed validation. </span>' .
                    '\'*\' is an invalid final character in <span class="stacksyntaxexample">2*</span>');
    }

    public function test_mathdelimiters1() {
        $a2 = array('a:2');
        $s2 = array();
        foreach ($a2 as $s) {
            $cs = new stack_cas_casstring($s);
            $cs->validate('t');
            $s2[] = $cs;
        }
        $cs2 = new stack_cas_session($s2, null, 0);

        $at1 = new stack_cas_text('\begin{align*} x & = {@a@}+1 \\ & = {@a+1@} \end{align*}', $cs2, 0, 't');
        $this->assertTrue($at1->get_valid());
        $at1->get_display_castext();

        $this->assertEquals($at1->get_display_castext(), '\begin{align*} x & = {2}+1 \ & = {3} \end{align*}');
    }

    public function test_mathdelimiters2() {
        $a2 = array('a:x^2/(1+x^2)^3', 'p:diff(a,x)');
        $s2 = array();
        foreach ($a2 as $s) {
            $cs = new stack_cas_casstring($s);
            $cs->validate('t');
            $s2[] = $cs;
        }
        $cs2 = new stack_cas_session($s2, null, 0);

        $at1 = new stack_cas_text('\begin{multline*} {@a@} \\\\ {@p@} \end{multline*}', $cs2, 0, 't');
        $this->assertTrue($at1->get_valid());
        $at1->get_display_castext();

        $this->assertEquals($at1->get_display_castext(), '\begin{multline*} {\frac{x^2}{\left(x^2+1\right)^3}} \\\\ {\frac{2\cdot x}{\left(x^2+1\right)^3}-\frac{6\cdot x^3}{\left(x^2+1 \right)^4}} \end{multline*}');
    }
}