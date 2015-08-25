/*=============================================================================
    zjs/text.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/
//! @file zjs/text.js This file adds extensions to other classes.

/**
@module zjs.text
@requires zjs.core
*/
$module("zjs.text");

$requires("zjs.ext");

//! @class String
zjs.copyIf(String.prototype, {
    /**
    Returns this string modified by capitalizing the first character.
    
    @method capitalize
    @returns This string modified by capitalizing the first character.
    */
    capitalize : function () {
        return this.charAt(0).toUpperCase() + this.substring(1);
    },

    /**
    Converts this string into "camel case". For example, "foo-bar" becomes
    "fooBar". The splitChar determines how the words are divided. The first
    word is unchanged. All other words are capitalized and concatenated. The
    primary use case for this conversion is to convert CSS names to script
    property names (e.g., "background-color" to "backgroundColor").

    @method camelize
    @param splitChar The character to split up words.
    @returns The camel-case conversion of this string.
    */
    camelize : function (splitChar) {
        var parts = this.split(splitChar || "-"), ret = parts[0];

        for (var i = 1, n = parts.length; i < n; ++i)
            ret += parts[i].capitalize();

        return ret;
    },

    /**
    Returns this string modified by lower-casing the first character.

    @method decapitalize
    @returns This string modified by lower-casing the first character.
    */
    decapitalize : function () {
        return this.charAt(0).toLowerCase() + this.substring(1);
    },

    /**
    Returns true if this string ends with a given string.

    @method endsWith
    @param s The string to compare.
    @returns True if this string ends with a given string.
    */
    endsWith : function (s) {
        var n = s.length;
        return this.length >= n && this.right(n) == s;
    },

    /**
    Returns true if this string ends with a given string ignoring case.

    @method endsWithNoCase
    @param s The string to compare.
    @returns True if this string ends with a given string.
    */
    endsWithNoCase : function (s) {
        var n = s.length;
        return this.length >= n && this.right(n).equalsNoCase(s);
    },

    /**
    Returns true if this and another string are equal ignoring case.

    @method equalsNoCase
    @param s The string to compare.
    @returns True if this and another string are equal ignoring case.
    */
    equalsNoCase : function (s) {
        return this.toLowerCase() == s.toLowerCase();
    },

    /**
    Returns the left-most n character of this string. If n is negative, this
    will instead return the left-most characters upto the |n| characters on the
    right.

    For example:

    js:{{{
        s = "12345".left(2);     // == "12"
        s = "12345".left(-2);    // == "123" (upto the last 2 characters)
    }}}

    @method left
    @param n The number of characters
    @returns The left-most n character of this string.
    */
    left : function (n) {
        var len = this.length;

        n = (n < 0) ? (len + n) : Math.min(n, len);
        n = Math.max(0, n);

        return this.substring(0, n);
    },

    /**
    Returns the right-most n character of this string. If n is negative, this
    will be empty.

    @method right
    @param n The number of characters.
    @returns The right-most n character of this string.
    */
    right : function (n) {
        var k = this.length;
        return this.substring(k - Math.max(0, Math.min(n, k)));
    },

    /**
    Returns true if this string starts with a given string.

    @method startsWith
    @param s The string to compare.
    @returns True if this string starts with a given string.
    */
    startsWith : function (s) {
        var n = s.length;
        return this.length >= n && this.left(n) == s;
    },

    /**
    Returns true if this string starts with a given string ignoring case.

    @method startsWith
    @param s The string to compare.
    @returns True if this string starts with a given string.
    */
    startsWithNoCase : function (s) {
        var n = s.length;
        return this.length >= n && this.left(n).equalsNoCase(s);
    }
}); //! @~class String

//-----------------------------------------------------------------------------

//! @namespace zjs The root namespace for ZJS.
$namespace (zjs, function () {
    // Helper method to normalize replacement types to be a function.
    function prepare (replacement) {
        if (replacement instanceof Function)
            return replacement;

        var template = new zjs.Template(replacement);
        return function(match) { return template.format(match); };
    }

    return {
        /**
        Returns the string with every occurence of a given pattern replaced by
        either a regular string, the returned value of a function or a Template
        string. The pattern can be a string or a regular expression.

        If its replacement argument is a string this works just like the native
        JavaScript method replace() set to global match.

        If you pass it a function for the replacement argument, it is invoked
        for every occurrence of the pattern with the current match as its one
        argument. Note that this argument is the returned value of the match()
        method called on the current pattern. It is in the form of an array
        where the first element is the entire match and every subsequent one
        corresponds to a parenthesis group in the regex.

        Lastly, you can use a Template string as the replacement in which you
        can also access the returned value of the match() method using the ruby
        inspired notation: #{0} for the first element of the array, #{1} for the
        second one, and so on.

        If you need an equivalent but without global match set on, try zjs.subst
        instead.

        NOTE:
        Do not use the "g" regex flag as this will create an infinite loop.

        @method gsubst
        @param str The string to be substituted.
        @param pattern {string|regexp} The pattern to match.
        @param replacement {string|function|Template} The substitution value.
        @returns The string with every occurence of pattern replaced.
        */
        gsubst : function (str, pattern, replacement) {
            var match, result = '', source = str;
            replacement = prepare(replacement);

            while (source.length > 0) {
                if (!(match = source.match(pattern))) {
                    result += source;
                    source = '';
                } else {
                    result += source.slice(0, match.index);
                    result += zjs.safeStr(replacement(match));
                    source  = source.slice(match.index + match[0].length);
                }
            }

            return result;
        },

        /**
        Returns a string with the first count occurrences of pattern replaced by
        either a regular string, the returned value of a function or a Template
        string. The pattern can be a string or a regular expression.

        Unlike zjs.gsubst, this method takes an exttra optional parameter which
        specifies the number of occurrences of the pattern to be replaced. If
        not specified, it will default to 1.

        Apart from that, zjs.subst works just like zjs.gsubst. Please refer to
        it for a complete explanation.

        @method subst
        @param str The string to be substituted.
        @param pattern {string|regexp} The pattern to match.
        @param replacement {string|function|Template} The substitution value.
        @param? count The number of occurances to replace.
        @returns The string with the first count occurence of pattern replaced.
        */
        subst : function (str, pattern, replacement, count) {
            replacement = prepare(replacement);
            count = (count === undefined) ? 1 : count;

            return zjs.gsubst(str, pattern, function (match) {
                    if (--count < 0)
                        return match[0];
                    return replacement(match);
                });
        }
    };
}());

$namespace(zjs, function () {

    var amp  = { regex: /[&]/g, text: "&amp;" };
    var lt   = { regex: /</g,  text: "&lt;" };
    var gt   = { regex: />/g,  text: "&gt;" };
    var apos = { regex: new RegExp("[']", "g"),  text: "&apos;" };
    var quot = { regex: new RegExp("[\"]", "g"), text: "&quot;" };

    function encode (s) {
        var r = (typeof(s) === "undefined" || s === null) ? "" : (s+"");
        r = r.replace(amp.regex, amp.text);
        r = r.replace(lt.regex, lt.text);
        r = r.replace(gt.regex, gt.text);
        return r;
    }

    return {
        encodeAttr : function (s, style) {
            var r = encode(s);
            if (style === "'") {
                r = r.replace(apos.regex, apos.text);
            } else {
                r = r.replace(quot.regex, quot.text);
            }
            return r;
        },

        encodeHtml : function (s) {
            return encode(s);
        },

        encodeXml : function (s) {
            return encode(s);
        }
    };
}); // zjs

$namespace (zjs, {

/**
This function formats a text string with replacement parameters. This is similar
to Java's String.format, but uses Ruby-like named replacements. Templates are
strings that have embedded symbols in the form #{fieldName} that are replaced
by actual values when the template is applied to an object.

A simple example follows.

js:{{{
    var s = zjs.format("The TV show #{title} was created by #{author}.",
                            { title: "The Simpsons",
                              author: "Matt Groening",
                              network: "FOX" });

    // s = "The TV show The Simpsons was created by Matt Groening."
}}}

The next example shows the same template being used with a handful of distinct
objects.

js:{{{
    //creating a few similar objects
    var conversion1 = {from: "meters", to: "feet", factor: 3.28};
    var conversion2 = {from: "kilojoules", to: "BTUs", factor: 0.9478};
    var conversion3 = {from: "megabytes", to: "gigabytes", factor: 1024};

    //the template  
    var tl = "Multiply by #{factor} to convert from #{from} to #{to}.";

    var s1 = zjs.format(t1, conversion1);
    var s2 = zjs.format(t1, conversion2);
    var s3 = zjs.format(t1, conversion3);

    // s1 = "Multiply by 3.28 to convert from meters to feet."
    // s2 = "Multiply by 0.9478 to convert from kilojoules to BTUs."
    // s3 = "Multiply by 1024 to convert from megabytes to gigabytes."
}}}

To include a literal that looks like a symbol in template, but is not supposed
to be replaced, the backslash character ("\") can be used.

js:{{{
    // note: you're seeing two backslashes here because the backslash is also a 
    // escaping character in JavaScript strings
    var t = "in #{lang} we also use the \\#{variable} syntax for templates.";
    var data = {lang:"Ruby", variable: "(not used)"};

    var s = zjs.format(t, data);

    // s = "in Ruby we also use the #{variable} syntax for templates."
}}}

In the case where the default Ruby-like syntax is not desired, the format method
accepts an optional third argument that is a regular expression object to match
the replaceable symbols in the template string.

For example, a template that uses a syntax using "[%=" and "%]":

js:{{{
    var syntax = /(^|.|\r|\n)(\[%=\s*(\w+)\s*%\])/; // "[%= field %]"
    var t = "Name: [%= name %], Age: [%=age%]";

    var s = zjs.format(t, {name: "John Smith", age: 26}, syntax);

    // s = "Name: John Smith, Age: 26"
}}}

Any syntax must provide at least three groupings in the regular expression. The
first grouping is to capture what comes before the symbol, to detect the backslash
escape character. The second grouping captures the entire symbol and will be
completely replaced upon evaluation. Lastly, the third required grouping captures
the name of the field inside the symbol.

@method format
@param template {string} The template text.
@param object {object} The object containing the values to be inserted.
@param? syntax {regexp} The regex that captures the parts of a replacement.
@returns The string with the parts of the template replaced by the given object values.
*/
format : function () {
    var kDefSyntax = /(^|.|\r|\n)(#\{(.*?)\})/;

    return function (template, object, syntax) {
        var t = template.toString();
        syntax = syntax || kDefSyntax;

        if (object.toTemplateReplacements instanceof Function)
            object = object.toTemplateReplacements();

        return zjs.gsubst(t, syntax,
            function (m) {
                if (!object)
                    return "";

                var before = m[1] || "";
                if (before == '\\')
                    return m[2];

                var s = zjs.deref(object, m[3]);
                if (s === undefined)
                    return before;

                return before + s;
            });
    };
}(),

/**
This class provides a means to connect a template string and syntax for later use.
The mechanics are performed by the zjs.format method.

@class Template
*/
Template : $class({
    /**
    Captures the definition of the template and its syntax.

    @ctor
    @param template {string} The template text.
    @param? syntax {regexp} The regex that captures the parts of a replacement.
    */
    ctor : function (template, syntax) {
        this.template = template.toString();
        this.syntax = syntax;
    },

    /**
    Applies the template to the given object’s data, producing a formatted
    string with symbols replaced by corresponding object’s properties.

    @method format
    @param object {object} The object containing the values to be inserted.
    */
    format : function (object) {
        return zjs.format(this.template, object, this.syntax);
    }
}), //! @~class Template

/**
Returns true if str contains the given pattern, false if not.

@method contains
@param str The string to check for containing the pattern.
@param pat The pattern find in the given string.
@return True if str contains the given pattern, false if not.
*/
contains : function (str, pat) {
    return zjs.safeStr(str).indexOf(pat) > -1;
},

/**
Returns true if the given string is blank.

@method isBlank
@param s The string to test.
@return True if the given string is blank.
*/
isBlank : function () {
    var regex = /^\s*$/;

    return function (s) {
        return regex.test(zjs.safeStr(s));
    };
}(),

/**
Returns true if the given string is empty.

@method isEmpty
@param s The string to test.
@return True if the given string is empty.
*/
isEmpty : function (s) {
    return zjs.safeStr(s) === "";
},

/**
Makes a query pair of "key=value" or "key". If the value has a toQueryParam
method, it is called to stringify the value. Following that, the value is encoded
as a URI Component.

@method makeQueryPair
@param key The key of the pair.
@param value The value of the pair.
@return The formatted query pair.
*/
makeQueryPair : function (key, value) {
    var t = typeof(value);
    if (t === "undefined" || value === null)
        return key;
    if (t === "object" && typeof(value.toQueryParam) === "function")
        value = value.toQueryParam();
    return key + '=' + encodeURIComponent(zjs.safeStr(value));
},

/**
Converts the keys and values in the given parameters to a string. Since query
parameters are basically unordered, the keys are sorted to ensure a consistent
ordering. This helps cache detection and testing, even if it is a performance
hit (albeit minor).

@method makeQueryString
@param params The parameters to convert.
@return The query string with the given parameters.
*/
makeQueryString : function (params) {
    var keys = [];
    for (var k in params)
        keys.push(k);
    keys.sort();

    var qs = [];

    for (var j = 0, m = keys.length; j < m; ++j) {
        k = keys[j];
        var key = encodeURIComponent(k), values = params[k];

        if (values instanceof Array) {
            for (var i = 0, n = values.length; i < n; ++i)
                qs.push(zjs.makeQueryPair(key, values[i]));
        } else {
            qs.push(zjs.makeQueryPair(key, values));
        }
    }

    return qs.join("&");
},

/**
Parses a query string into an object with properties named by the parameters. If
a parameter occurs multiple times, the value is an array of values.

@method parseQueryString
@param str The query string to parse.
@param sep The separator (default is "&").
@return The object containing the query parameters.
*/
parseQueryString : function (str, sep) {
    var m = zjs.trim(str).match(/([^?#]*)(#.*)?$/), ret = {};
    if (m && m[1]) {
        var pair, parts = m[1].split(sep || "&");
        for (var i = 0, n = parts.length; i < n; ++i)
            if ((pair = parts[i].split('='))[0]) {
                var key = decodeURIComponent(pair.shift());
                var value = pair.length > 1 ? pair.join('=') : pair[0];
                if (typeof(value) !== "undefined")
                    value = decodeURIComponent(value);

                if (!(key in ret))
                    ret[key] = value;
                else if (ret[key] instanceof Array)
                    ret[key].push(value);
                else
                    ret[key] = [ret[key], value];
            }
    }

    return ret;
},

/**
Ensures the given argument is a string (and not null). This can be important if
accessing string methods or properties.

@method safeStr
@param str The "string" to make safe to treat as a string.
@return The safe string object.
*/
safeStr : function () {
    var empty = "";

    return function (str) {
        return (str === null || typeof(str) === "undefined") ? empty : String(str);
    };
}(),

/**
Removes leading and trailing spaces or characters from the given string.

@method trim
@param str The string to trim.
@param ch The character to trim (default is all whitespace).
@return The trimmed string.
*/
trim : function () {
    var regex = /^\s*(.*?)\s*$/;

    return function (str, ch) {
        var s = zjs.safeStr(str);
        if (ch)
            return zjs.trimRight(zjs.trimLeft(str, ch), ch);
        var m = regex.exec(s);
        return (m && m[1]) || "";
    };
}(),

/**
Removes leading spaces or characters from the given string.

@method trimLeft
@param str The string to trim.
@param ch The character to trim (default is all whitespace).
@returns The trimmed string.
*/
trimLeft: function () {
    var regex = /^\s*(.*?)$/;

    return function (str, ch) {
        var s = zjs.safeStr(str);
        if (ch) {
            for (var i = 0, n = s.length; i < n && s.charAt(i) == ch; )
                ++i;
            return i ? s.substring(i, n) : s;
        }
        var m = regex.exec(s);
        return (m && m[1]) || "";
    };
}(),

/**
Removes trailing spaces or characters from the given string.

@method trimRight
@param str The string to trim.
@param ch The character to trim (default is all whitespace).
@returns The trimmed string.
*/
trimRight: function () {
    var regex = /^(.*?)\s*$/;

    return function (str, ch) {
        var s = zjs.safeStr(str);
        if (ch) {
            for (var n = s.length, i = n; i > 0 && s.charAt(i-1) == ch; )
                --i;
            return (i < n) ? s.substring(0, i) : s;
        }
        var m = regex.exec(s);
        return (m && m[1]) || "";
    };
}(),

/**
Pads the given number with 0's on the left to a specified length.

@method zeroPad
@param num The number to pad with 0's.
@param len The minimum length below which to pad.
@return The 0-padded number.
*/
zeroPad : function (num, len) {
    var s = zjs.safeStr(num);
    for (var i = len - s.length; i > 0; --i)
        s = "0" + s;
    return s;
}

}); //! @~namespace zjs

//-----------------------------------------------------------------------------
// These are very much like toJSON, but do query parameter stringification:

//! @class Boolean
zjs.copy(Boolean.prototype, {
    toQueryParam : function () {
        return this.valueOf();
    }
});
//! @~class Boolean

//! @class Date
zjs.copy(Date.prototype, {
    /**
    Returns the value of this object formatted for a Query Parameter.

    @method toQueryParam
    @returns The value of this object formatted for a Query Parameter.
    */
    toQueryParam : function () {
        var v = this, dd = zjs.zeroPad.tail(2);
        return zjs.format("#{0}-#{1}-#{2}T#{3}:#{4}:#{5}Z",
                    [v.getUTCFullYear(), dd(v.getUTCMonth()+1), dd(v.getUTCDate()),
                     dd(v.getUTCHours()), dd(v.getUTCMinutes()), dd(v.getUTCSeconds())]);
    }
});
//! @~class Date

//! @class Number
zjs.copy(Number.prototype, {
    /**
    Returns the value of this object formatted for a Query Parameter.

    @method toQueryParam
    @returns The value of this object formatted for a Query Parameter.
    */
    toQueryParam : function () {
        return this.valueOf();
    }
});
//! @~class Number

//! @class String
zjs.copy(String.prototype, {
    /**
    Returns the value of this object formatted for a Query Parameter.

    @method toQueryParam
    @returns The value of this object formatted for a Query Parameter.
    */
    toQueryParam : function () {
        return this.valueOf();
    }
});
//! @~class String
