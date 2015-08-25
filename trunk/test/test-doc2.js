//! @file test-doc2.js This is a file.

/**
@module abc This is module abc.
@pragma gwiki {page=foo}
@pragma gwiki {after=$foreach}
@pragma html {foo}
@requires xyz
@since 2.0
*/

/**
@namespace foo The foo namespace has some useful stuff.
A little of this and some of that.

{{{
    abcd
    1234
}}}
javascript:{{{
    somecode();
    morecode();
}}}
@since 1.0
@deprecated 2.0
*/

/**
    @method bar A namespace level method
    @. a The a parameter
    @? b The optional b parameter
    @? c The optional c parameter
    @returns When finished
    @throws When it fails
*/
/**
Some variable of the namespace.
@var someVar
*/
//--------------------------------------------------
/**
This is test
class one.
javascript:{{{
    some.code();
    more.code();
}}}
More comments..
js:{{{
    andsome.code();
    yetmore.code();
}}}
Final thoughts.

@class One
*/

/**
Some property of the class.
@prop some
*/

/**
A config property.
@cfg configuratorinator
*/

/**
Something exciting.
@event excitement
@{
@. foo The foo part of the excitement.
@. bar And the bar part.
@}
*/

/**
Something more exciting.
@event moreexcitement
@(
@. foo The first of the excitement.
@. bar The second part.
    @{
    @. biff The biff piece.
    @. jazz The jazz piece.
    @}
@)
*/

    /** @class SubA
    @deprecated 1.1.2
    @implements Intf2
    */

    //! @~class SubA

/**
    @ctor Initializes things for this object.
    @. m The m parameter
    @? n The optional n parameter
    @throws When the mood strikes it.
*/
/**
Some comments about the stuff this method does.

@method doStuff Useful info on the first form
@protected
@. x The x parameter
@. y The y parameter
@? z The optional z parameter
@returns Some value
@throws Sometimes if it gets cranky
*/
/**
@method doStuff Useful info on the other form
@. obj Some object of relevance
@{
    @. x {int} The x property
    @. y {int} The y property
    @? fn {function} The fn function (optional)
    @(
        @. foo {int} An integer argument
        @returns {string} The string value.
        @throws {Error} Some error on occasion.
    @)
@}
@returns Yes
@{
    @. foo Some foo
    @? goo Some goo
@}
@throws Once in a while
@{
    @. bar Some bar
    @? jazz Some jazz
@}
*/
/**
    @method doStuff Another form for doStuff
    @. a The a parameter
    @? b The optional b parameter
    @? c The optional c parameter
    @returns Random stuff
    @throws On a whim
*/

//! @~class



//--------------------------------------------------

/** @interface Intf1 This is interface
       Intf1.
*/
//! @~interface


//--------------------------------------------------
/** @interface Intf2 This is interface
       Intf2.
@since 2.0
@deprecated 2.2
*/
//! @extends Intf1

//! @~interface

//--------------------------------------------------

/** @interface Intf3 This is interface
       Intf3.
*/
//! @~interface

/**
This is test
class two.
js:{{{
    some.code();
    more.code();
}}}
Final comments..

@class Two
@extends One
@implements Intf2
@implements Intf3
*/

//! @~class

/**
This is test
class three.
js:{{{
    this.code();
    that.code();
}}}
comments..

@class Three
@extends Two
*/

/**
The foo event is fired when something happens. It has some data as well.

@event foo
@. bar {int} The number of interest.
@. jazz {string} And a string as well.
*/

/**
This config property does something.

And should be used when appropriate.

@cfg init1
@{
@. bar {int} The number of interest.
@. jazz {string} And a string as well.
@}
*/

/**
This property represents something.

And can be used when needed.

@prop prop1
@{
@. foo {int} The foo thing.
@. bar {string} And the bar thing.
@}
*/

/**
This method iterates over a collection. Each iteration calls a user-supplied method
passing the current item and related information.

This is a 2nd paragraph.

@method $foreach
@param it {array|object} The sequence overwhich to iterate.
@param? opt {object} Options that control the iteration.
@{
    @? begin The begin index for the iteration (default = 0).
    @? end The end index for the iteration (default = length).
    @? delta The number of slots in the array to skip (default = 1).
    @? value The initial value to pass to fn (default = undefined).
    @? args The arguments to pass to each function (only if fn is a method name).
@}
@param fn The function to call for each iteration or the method name on the object.
@(
    @. value The current value being iterated.
    @. etc An object containing other useful information passed to each call.
    @{
        @. array True if the iteration is over an array.
        @. key The name of the current element (same as index for an array).
        @. index The current index being iterated.
        @. value The value returned from the last call of fn (starts as undefined).
        @. $break A boolean that can be set to true to end the loop.
    @}
    @returns The value to store in etc.value and/or return from $foreach.
@)
@param? scope {object} The object scope ("this" pointer) to pass to fn function.
    This does not apply when fn is a method name.
@returns The last value returned by fn or passed to $break.
@{
    @. foo Some foo
    @? goo Some goo
@}
@throws Once in a while
@{
    @. bar Some bar
    @? jazz Some jazz
@}
*/
