/*=============================================================================
    zjs/browser.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/
//! @file zjs/browser.js This file contains browser detection and support.

/**
@module zjs.browser
@requires zjs.core
*/
$module("zjs.browser");

$requires("zjs.core");

//! @namespace zjs The root namespace for ZJS.
$namespace(zjs, {

/**
This function performs browser and OS detection. It is derived from code found
here:

    http://www.quirksmode.org/js/detect.html

The license of QuirksMode (http://www.quirksmode.org/about/copyright.html) is
most friendly and compatible with the license of ZJS itself. In fact, it does
not even have attribution requirements.

The ZJS modifications to the code from QuirksMode are as follows:

  * Restructured into a function that can be unit tested.
  * The "attribs" objects found in the dataBrowser and dataOS arrays.

As browser detection is fragle in general, the work required to maintain this
code basically boils down to the maintenance of the two arrays. The mechanism
should be largely stable since it is data-driven.

@method detectBrowser
@param env The environment object
@{
    @. nav The navigator object.
    @. win The window object.
@}
@returns The details of the detected browser.
@{
    @. name The name of the browser.
    @. version The version of the browser.
    @. ie True if the browser is IE of any version.
    @. firefox True if the browser is Firefox of any version.
    @. gecko True if the browser is based on Gecko.
    @. chrome True if the browser is Google Chrome of any version.
    @. khtml True if the browser is based on KHTML.
    @. engine The name of the rendering engine ("msie", "gecko", etc.).
    @. safari True if the browser is Safari of any version.
    @. webkit True if the browser is based on WebKit.
    @. opera True if the browser is Opera.
    @. os The Operating System name ("Windows", "Mac" or "Linux").
    @. win True if the browser if is running on Windows.
    @. mac True if the browser if is running on Mac.
    @. linux True if the browser if is running on Linux.
@}
*/
detectBrowser : function (env) {
    // NOTE -- order is important:
    var dataBrowser = [{
        string: env.nav.userAgent, subString: "Chrome", identity: "Chrome",
        attribs : { chrome: true, khtml: true, engine : "webkit" }
      },{
        string: env.nav.userAgent, subString: "OmniWeb",
        versionSearch: "OmniWeb/", identity: "OmniWeb",
        attribs : { engine : "omniweb" }
      },{
        string: env.nav.vendor, subString: "Apple", identity: "Safari",
        attribs : { khtml : true, safari : true, webkit : true, engine : "webkit" }
      },{
        prop: env.win.opera, identity: "Opera",
        attribs : { opera : true, engine : "opera" }
      },{
        string: env.nav.vendor, subString: "iCab", identity: "iCab",
        attribs : { engine : "icab" }
      },{
        string: env.nav.vendor, subString: "KDE", identity: "Konqueror",
        attribs : { khtml : true, engine : "khtml" }
      },{
        string: env.nav.userAgent, subString: "Firefox", identity: "Firefox",
        attribs : { firefox : true, gecko : true, engine : "gecko" }
      },{
        string: env.nav.vendor, subString: "Camino", identity: "Camino",
        attribs : { engine : "camino" }
      },{  // for newer Netscapes (6+)
        string: env.nav.userAgent, subString: "Netscape", identity: "Netscape",
        attribs : { gecko : true, engine : "gecko" }
      },{
        string: env.nav.userAgent, subString: "MSIE", identity: "Explorer",
        versionSearch: "MSIE",
        attribs : { ie : true, engine : "msie" }
      },{
        string: env.nav.userAgent, subString: "Gecko", identity: "Mozilla",
        versionSearch: "rv",
        attribs : { gecko : true, engine : "gecko" }
      },{  // for older Netscapes (4-)
        string: env.nav.userAgent, subString: "Mozilla",
        identity: "Netscape", versionSearch: "Mozilla",
        attribs : { engine : "netscape" }
      }
    ];

    // NOTE -- order is important:
    var dataOS = [
      { string: env.nav.platform, subString: "Win", identity: "Windows",
        attribs : { win : true } },
      { string: env.nav.platform, subString: "Mac", identity: "Mac",
        attribs : { mac : true } },
      { string: env.nav.platform, subString: "Linux", identity: "Linux",
        attribs : { linux : true } }
    ];

    var attribs, versionSearchString;

    function searchString (data) {
        attribs = null;
        for (var i=0;i<data.length;i++)	{
            var dataString = data[i].string;
            var dataProp = data[i].prop;
            attribs = data[i].attribs;
            versionSearchString = data[i].versionSearch || data[i].identity;
            if (dataString) {
                if (dataString.indexOf(data[i].subString) != -1)
                    return data[i].identity;
            } else if (dataProp) {
                return data[i].identity;
            }
        }
        return null;
    }

    function searchVersion (dataString) {
        var index = dataString.indexOf(versionSearchString);
        if (index == -1)
            return null;
        return parseFloat(dataString.substring(index+versionSearchString.length+1));
    }

    var ret = { name : searchString(dataBrowser) || "???" };
    zjs.copy(ret, attribs);

    ret.version = searchVersion(env.nav.userAgent) ||
                    searchVersion(env.nav.appVersion) || "???";

    ret.os = searchString(dataOS) || "???";
    zjs.copy(ret, attribs);

    return ret;
},

/**
This class performs browser and OS detection and stores the results.

@class Browser
*/
Browser : $class(null, {
    //! @prop name The name of the browser.
    //! @prop version The version of the browser.
    //! @prop ie True if the browser is IE of any version.
    //! @prop firefox True if the browser is Firefox of any version.
    //! @prop gecko True if the browser is based on Gecko.
    //! @prop chrome True if the browser is Google Chrome of any version.
    //! @prop khtml True if the browser is based on KHTML.
    //! @prop engine The name of the rendering engine ("msie", "gecko", etc.).
    //! @prop safari True if the browser is Safari of any version.
    //! @prop webkit True if the browser is based on WebKit.
    //! @prop opera True if the browser is Opera.
    //! @prop os The Operating System name ("Windows", "Mac" or "Linux").
    //! @prop win True if the browser if is running on Windows.
    //! @prop mac True if the browser if is running on Mac.
    //! @prop linux True if the browser if is running on Linux.

    ctor : function (env) {
        var res = zjs.detectBrowser(env || { nav : navigator, win : window });
        zjs.copy(this, res);
    },

    /**
    Adds decorations (CSS classes) to the given element.

    The use of these class name in a CSS selector would be:

    {{{
        .lt_IE7 .myclass {
           ... some IE hack not needed in IE7 and newer
        }
    }}}

    The optimal place to use this method for the <body> element would be in a
    <script> block like so:

    {{{
        <body>
          <script>zjs.browser.addDecorations(document.body);</script>
          ...
    }}}

    This technique ensures that the CSS classes are used during the first
    rendering of the page. Doing this from an onload handler would allow the
    page to render without the class names and then render again (i.e., it
    would flicker) once the new class names are assigned.

    @method addDecorations
    @param el The element to which decorations are to be added.
    @returns The element.
    */
    addDecorations : function (el) {
        var css = el.className ? el.className.split(" ") : [];
        css.push.apply(css, this.getDecorations().add);
        el.className = css.join(" ");
        return el;
    },

    /**
    Returns decorations (CSS classes) based on this browser. These classes are
    useful when browser-specific CSS is needed since CSS does not have clean
    ways to detect the browser.

    The CSS classes are the following:

    {{{
      - *isIE | isFF | isSafari* : Added if IE, Firefox or Safari
      - *notIE | notFF | notSafari* : Added if not IE, Firefox or Safari
      - *isIE6 | isIE7 | isIE8*  : Added if IE and version == 6,7,8
      - *notIE6 | notIE7 | notIE8* : Added if IE and version != 6,7,8
      - *ge_IE6 | ge_IE7 | ge_IE8* : Added if IE and version greater or equal to 6,7,8
      - *lt_IE6 | lt_IE7 | lt_IE8* : Added if IE and version less than 6,7,8
      - *isFF2 | isFF3*  : Added if Firefox and version == 2,3
      - *notFF2 | notFF3* : Added if Firefox and version != 2,3
      - *ge_FF2 | ge_FF3* : Added if Firefox and version greater or equal 2,3
      - *lt_FF2 | lt_FF3* : Added if Firefox and version less than 2,3
    }}}

    For example, using IE6, the CSS class names are:
        {{{
            isIE isIE6 ge_IE6 notIE7 lt_IE7 notIE8 lt_IE8 notFF notSafari
        }}}

    And for Firefox 3, the CSS class names are:
        {{{
            notIE isFF notFF2 ge_FF2 isFF3 ge_FF3 notSafari
        }}}

    @method getDecorations
    @returns The CSS classes to add and delete.
    @{
        @. add {string[]} The classes to add.
        @. del {string[]} The classes to delete.
    @}
    */
    getDecorations : function () {
        var ret = { add : [], del : [] };

        function put (bool, prefixTrue, prefixFalse, suffix) {
            ret.add.push((bool ? prefixTrue : prefixFalse) + suffix);
            ret.del.push((bool ? prefixFalse : prefixTrue) + suffix);
        }

        function putIsOrNot (bool, suffix) {
            put(bool, "is", "not", suffix);
        }

        function putLevel (bool, suffix, minVer, maxVer) {
            putIsOrNot(bool, suffix);

            if (bool && arguments.length == 4)
                for (var ver = minVer; ver <= maxVer; ++ver) {
                    var s = suffix + ver;

                    putIsOrNot(this.version == ver, s);
                    put(this.version < ver, "lt_", "ge_", s);
                }
        }

        putLevel.call(this, this.ie, "IE", 6, 8);
        putLevel.call(this, this.firefox, "FF", 2, 3);
        putLevel.call(this, this.safari, "Safari");

        return ret;
    },

    /**
    Returns true if this browser's name matches any of the given names. The
    comparison ignores case.

    @method is
    @param name The name against which to match (more can follow).
    @returns True if this browser's name matches any of the given names.
    */
    is : function (name /* , name2, ... */) {
        var match = this.name.toLowerCase();
        for (var i = 0, n = arguments.length; i < n; ++i) {
            name = arguments[i].toLowerCase();
            if (match == name)
                return true;
        }
        return false;
    }
}) //! @~class

});

/**
This is the single instance of the Browser class for this browser.

@var browser
*/
zjs.browser = new zjs.Browser();

if (zjs.browser.webkit)
    $namespace(zjs, {
        arrayConv : $replace(function (it) {
            // In Safari, only use the `toArray` method if it's not a NodeList.
            // A NodeList is a function, has an function "item" property, and a
            // numeric "length" property. Taken from Prototype.js which adapted
            // it from Google Doctype.
            if (typeof it === 'function' && typeof it.length === 'number' &&
                                            typeof it.item === 'function')
                return null;

            return it.toArray ? it.toArray() : null;
        })
    });
