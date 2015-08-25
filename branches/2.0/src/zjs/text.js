/*=============================================================================
    zjs/text.js
    Copyright (C) 2008-2009, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]

    Much of this code and documentation was taken from Prototype. The code is
    placed in the zjs namespace instead of in String.prototype to avoid any
    conflicts with other libraries.

    See http://www.prototypejs.org

=============================================================================*/
$module("zjs.text");

$requires("zjs.ext");

zjs.copyProps(String.prototype,
{
    /** Returns this string modified by capitalizing the first character. */
    capitalize : function ()
    {
        return this.charAt(0).toUpperCase() + this.substring(1);
    },

    /**
    Converts this string into "camel case". For example, "foo-bar" becomes
    "fooBar". The splitChar determines how the words are divided. The first
    word is unchanged. All other words are capitalized and concatenated. The
    primary use case for this conversion is to convert CSS names to script
    property names (e.g., "background-color" to "backgroundColor").
    */
    camelize : function (splitChar)
    {
        var parts = this.split(splitChar || "-"), ret = parts[0];

        for (var i = 1, n = parts.length; i < n; ++i)
            ret += parts[i].capitalize();

        return ret;
    },

    /** Returns true if this string ends with a given string. */
    endsWith : function (s)
    {
        return (this.length >= s.length) && this.right(s.length) == s;
    },

    /** Returns true if this and another string are equal ignoring case. */
    equalsIgnoreCase : function (s)
    {
        return this.toLowerCase() == s.toLowerCase();
    },

    /** Returns the left-most n character of this string. */
    left : function (n)
    {
        return this.substring(0, Math.max(0, Math.min(n, this.length)));
    },

    /** Returns the right-most n character of this string. */
    right : function (n)
    {
        var k = this.length;
        return this.substring(k - Math.max(0, Math.min(n, k)));
    },

    /** Returns true if this string starts with a given string. */
    startsWith : function (s)
    {
        return (this.length >= s.length) && this.left(s.length) == s;
    }
});

//-----------------------------------------------------------------------------

$namespace (zjs, function ()
{
    /**
    Helper method to normalize replacement types to be a function.
    */
    function prepare (replacement)
    {
        if (replacement instanceof Function)
            return replacement;

        var template = new zjs.Template(replacement);
        return function(match) { return template.format(match) };
    }

    return (
    {
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
        */
        gsubst : function (str, pattern, replacement)
        {
            var match, result = '', source = str;
            replacement = prepare(replacement);

            while (source.length > 0)
                if (!(match = source.match(pattern)))
                {
                    result += source;
                    source = '';
                }
                else
                {
                    result += source.slice(0, match.index);
                    result += zjs.safeStr(replacement(match));
                    source  = source.slice(match.index + match[0].length);
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
        */
        subst : function (str, pattern, replacement, count)
        {
            replacement = prepare(replacement);
            count = (count === undefined) ? 1 : count;

            return zjs.gsubst(str, pattern,
                function (match)
                {
                    if (--count < 0)
                        return match[0];
                    return replacement(match);
                });
        }
    });
}());

$namespace (zjs, {

/**
This function formats a text string with replacement parameters. This is similar
to Java's String.format, but uses Ruby-like named replacements. Templates are
strings that have embedded symbols in the form #{fieldName} that are replaced
by actual values when the template is applied to an object.

A simple example follows.

    var s = zjs.format("The TV show #{title} was created by #{author}.",
                            { title: "The Simpsons",
                              author: "Matt Groening",
                              network: "FOX" });

    // s = "The TV show The Simpsons was created by Matt Groening."

The next example shows the same template being used with a handful of distinct
objects.

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

To include a literal that looks like a symbol in template, but is not supposed
to be replaced, the backslash character ("\") can be used.

    // note: you're seeing two backslashes here because the backslash is also a 
    // escaping character in JavaScript strings
    var t = "in #{lang} we also use the \\#{variable} syntax for templates.";
    var data = {lang:"Ruby", variable: "(not used)"};

    var s = zjs.format(t, data);

    // s = "in Ruby we also use the #{variable} syntax for templates."

In the case where the default Ruby-like syntax is not desired, the format method
accepts an optional third argument that is a regular expression object to match
the replaceable symbols in the template string.

For example, a template that uses a syntax using "<%=" and "%>":

    var syntax = /(^|.|\r|\n)(\<%=\s*(\w+)\s*%\>)/; // "<%= field %>"
    var t = "<div>Name: <b><%= name %></b>, Age: <b><%=age%></b></div>";

    var s = zjs.format(t, {name: "John Smith", age: 26}, syntax);

    // s = "<div>Name: <b>John Smith</b>, Age: <b>26</b></div>"

Any syntax must provide at least three groupings in the regular expression. The
first grouping is to capture what comes before the symbol, to detect the backslash
escape character. The second grouping captures the entire symbol and will be
completely replaced upon evaluation. Lastly, the third required grouping captures
the name of the field inside the symbol.
*/
format : function ()
{
    var kDefSyntax = /(^|.|\r|\n)(#\{(.*?)\})/;

    return function (template, object, syntax)
    {
        var t = template.toString();
        syntax = syntax || kDefSyntax;

        if (object.toTemplateReplacements instanceof Function)
            object = object.toTemplateReplacements();

        return zjs.gsubst(t, syntax,
            function (m)
            {
                if (object == null)
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
*/
Template : $class(
{
    ctor : function (template, syntax)
    {
        this.template = template.toString();
        this.syntax = syntax;
    },

    /**
    Applies the template to the given object’s data, producing a formatted
    string with symbols replaced by corresponding object’s properties.
    */
    format : function (object)
    {
        return zjs.format(this.template, object, this.syntax);
    }
}),

/**
Returns true if str contains the given pattern, false if not.

@param str The string to check for containing the pattern.
@param pat The pattern find in the given string.
@return True if str contains the given pattern, false if not.
*/
contains : function (str, pat)
{
    return zjs.safeStr(str).indexOf(pat) > -1;
},

/**
Returns true if the given string is blank.

@param s The string to test.
@return True if the given string is blank.
*/
isBlank : function ()
{
    var regex = /^\s*$/;

    return function (s)
    {
        return regex.test(zjs.safeStr(s));
    };
}(),

/**
Returns true if the given string is empty.

@param s The string to test.
@return True if the given string is empty.
*/
isEmpty : function (s)
{
    return zjs.safeStr(s) == "";
},

/**
Makes a query pair of "key=value" or "key". If the value has a toQueryParam
method, it is called to stringify the value. Following that, the value is encoded
as a URI Component.

@param key The key of the pair.
@param value The value of the pair.
@return The formatted query pair.
*/
makeQueryPair : function (key, value)
{
    if (value === undefined)
        return key;
    if (typeof(value) === "object" && typeof(value.toQueryParam) === "function")
        value = value.toQueryParam();
    return key + '=' + encodeURIComponent(zjs.safeStr(value));
},

/**
Converts the keys and values in the given parameters to a string. Since query
parameters are basically unordered, the keys are sorted to ensure a consistent
ordering. This helps cache detection and testing, even if it is a performance
hit (albeit minor).

@param params The parameters to convert.
@return The query string with the given parameters.
*/
makeQueryString : function (params)
{
    var keys = [];
    for (var k in params)
        keys.push(k);
    keys.sort();

    var qs = [];

    for (var j = 0, m = keys.length; j < m; ++j)
    {
        k = keys[j];
        var key = encodeURIComponent(k), values = params[k];

        if (values instanceof Array)
        {
            for (var i = 0, n = values.length; i < n; ++i)
                qs.push(zjs.makeQueryPair(key, values[i]));
        }
        else
            qs.push(zjs.makeQueryPair(key, values));
    }

    return qs.join("&");
},

/**
Parses a query string into an object with properties named by the parameters. If
a parameter occurs multiple times, the value is an array of values.

@param str The query string to parse.
@param sep The separator (default is "&").
@return The object containing the query parameters.
*/
parseQueryString : function (str, sep)
{
    var m = zjs.trim(str).match(/([^?#]*)(#.*)?$/), ret = {};
    if (m && m[1])
    {
        var pair, parts = m[1].split(sep || "&");
        for (var i = 0, n = parts.length; i < n; ++i)
            if ((pair = parts[i].split('='))[0])
            {
                var key = decodeURIComponent(pair.shift());
                var value = pair.length > 1 ? pair.join('=') : pair[0];
                if (value != undefined)
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

@param str The "string" to make safe to treat as a string.
@return The safe string object.
*/
safeStr : function ()
{
    var empty = "";

    return function (str)
    {
        return (str == null) ? empty : String(str);
    }
}(),

/**
Removes leading and trailing spaces from the given string.

@param str The string to trim.
@return The trimmed string.
*/
trim : function ()
{
    var pre = /^\s+/,  post = /\s+$/;

    return function (str)
    {
        return zjs.safeStr(str).replace(pre, "").replace(post, "");
    }
}(),

/**
Pads the given number with 0's on the left to a specified length.

@param num The number to pad with 0's.
@param len The minimum length below which to pad.
@return The 0-padded number.
*/
zeroPad : function (num, len)
{
    var s = "" + num;
    for (var i = len - s.length; i > 0; --i)
        s = "0" + s;
    return s;
}

});

//-----------------------------------------------------------------------------
// These are very much like toJSON, but do query parameter stringification:

zjs.copyProps(Boolean.prototype,
{
    toQueryParam : function ()
    {
        return this.valueOf();
    }
});

zjs.copyProps(Date.prototype,
{
    toQueryParam : function ()
    {
        var v = this, dd = zjs.zeroPad.tail(2);
        return zjs.format("#{0}-#{1}-#{2}T#{3}:#{4}:#{5}Z",
                    [v.getUTCFullYear(), dd(v.getUTCMonth()+1), dd(v.getUTCDate()),
                     dd(v.getUTCHours()), dd(v.getUTCMinutes()), dd(v.getUTCSeconds())]);
    }
});

zjs.copyProps(Number.prototype,
{
    toQueryParam : function ()
    {
        return this.valueOf();
    }
});

zjs.copyProps(String.prototype,
{
    toQueryParam : function ()
    {
        return this.valueOf();
    }
});
