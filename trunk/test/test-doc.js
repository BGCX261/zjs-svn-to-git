/**
This is test
one.
*/

/**
 * This is test
 * two.
 */

var foo;//! This is three

/**
 This is test
 * four.
 */

        /**
         This is test
         five.
         */

        /**
         * This is test
         * six.
         */

        /**
         This is test
         * seven.
         */

         /** This is eight */

        /**
        This is test
        nine.
        {{{
            A
            @class This is not a tag!
            B
        }}}
        */

/**
@namespace NS This is a
    namespace.
*/
$namespace("NS",
{
    /**
    This is a class

    @class A
    */
    A : $class(
    {
        /**
        This is inner class B

        @class B
        */
        B : $class(
        {
            /**
             * This is method
             * bar.
             * {{{
             *     ab.bar({ x : { y: 10, s: "abc" }, z : 20 });
             * }}}
             *
             * @method bar
             *  @param foo The foo
             *  param
             * {{{
             *     A
             *     B
             * }}}
             *  @. x The x property of
             *  foo
             *  @.. y {int} The y property of
             *  foo.x
             *  @.. s {string} The s property of
             *  foo.x
             *  @. z {int} The z property of
             *  foo
             */
            bar : function (x, y)
            {
            }

        }) //! @end-class B

    }) //! @~class A
// not me

});  //! @~namespace NS
