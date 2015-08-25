/*=============================================================================
    zjs-browser.js
    Copyright (C) 2008-2009, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/
$module("zjs.browser");

$requires("zjs.core");

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
*/
detectBrowser : function (env)
{
    // NOTE -- order is important:
    var dataBrowser = [
      {
        string: env.nav.userAgent, subString: "Chrome", identity: "Chrome",
        attribs : { chrome: true, khtml: true, engine : "webkit" }
      },
      {
        string: env.nav.userAgent, subString: "OmniWeb",
        versionSearch: "OmniWeb/", identity: "OmniWeb",
        attribs : { engine : "omniweb" }
      },
      {
        string: env.nav.vendor, subString: "Apple", identity: "Safari",
        attribs : { khtml : true, safari : true, webkit : true, engine : "webkit" }
      },
      {
        prop: env.win.opera, identity: "Opera",
        attribs : { opera : true, engine : "opera" }
      },
      {
        string: env.nav.vendor, subString: "iCab", identity: "iCab",
        attribs : { engine : "icab" }
      },
      {
        string: env.nav.vendor, subString: "KDE", identity: "Konqueror",
        attribs : { khtml : true, engine : "khtml" }
      },
      {
        string: env.nav.userAgent, subString: "Firefox", identity: "Firefox",
        attribs : { firefox : true, gecko : true, engine : "gecko" }
      },
      {
        string: env.nav.vendor, subString: "Camino", identity: "Camino",
        attribs : { engine : "camino" }
      },
      {  // for newer Netscapes (6+)
        string: env.nav.userAgent, subString: "Netscape", identity: "Netscape",
        attribs : { gecko : true, engine : "gecko" }
      },
      {
        string: env.nav.userAgent, subString: "MSIE", identity: "Explorer",
        versionSearch: "MSIE",
        attribs : { ie : true, engine : "msie" }
      },
      {
        string: env.nav.userAgent, subString: "Gecko", identity: "Mozilla",
        versionSearch: "rv",
        attribs : { gecko : true, engine : "gecko" }
      },
      {  // for older Netscapes (4-)
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

    function searchString (data)
    {
        attribs = null;
        for (var i=0;i<data.length;i++)	{
            var dataString = data[i].string;
            var dataProp = data[i].prop;
            attribs = data[i].attribs;
            versionSearchString = data[i].versionSearch || data[i].identity;
            if (dataString) {
                if (dataString.indexOf(data[i].subString) != -1)
                    return data[i].identity;
            }
            else if (dataProp)
                return data[i].identity;
        }
        return null;
    }

    function searchVersion (dataString)
    {
        var index = dataString.indexOf(versionSearchString);
        if (index == -1)
            return null;
        return parseFloat(dataString.substring(index+versionSearchString.length+1));
    }

    var ret = { name : searchString(dataBrowser) || "???" };
    zjs.copyProps(ret, attribs);

    ret.version = searchVersion(env.nav.userAgent)
                    || searchVersion(env.nav.appVersion)
                    || "???";

    ret.os = searchString(dataOS) || "???";
    zjs.copyProps(ret, attribs);

    return ret;
},

/**
This class performs browser and OS detection and stores the results.
*/
Browser : $class(null,
{
    ctor : function (env)
    {
        var res = zjs.detectBrowser(env || { nav : navigator, win : window });
        zjs.copyProps(this, res);
    },

    /**
    Adds decorations (CSS classes) to the given element.

    The use of these class name in a CSS selector would be:

        .lt_IE7 .myclass {
           ... some IE hack not needed in IE7 and newer
        }

    The optimal place to use this method for the <body> element would be in a
    <script> block like so:

        <body>
          <script>zjs.browser.addDecorations(document.body);</script>
          ...

    This technique ensures that the CSS classes are used during the first
    rendering of the page. Doing this from an onload handler would allow the
    page to render without the class names and then render again (i.e., it
    would flicker) once the new class names are assigned.

    @param el The element to which decorations are to be added.
    @return The element.
    */
    addDecorations : function (el)
    {
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
      * is<IE | FF | Safari> : Added if IE, Firefox or Safari
      * not<IE | FF | Safari> : Added if not IE, Firefox or Safari
      * isIE<6 | 7 | 8>  : Added if IE and version == 6 (or 7 or 8)
      * notIE<6 | 7 | 8> : Added if IE and version != 6 (or 7 or 8)
      * ge_IE<6 | 7 | 8> : Added if IE and version >= 6 (or 7 or 8)
      * lt_IE<6 | 7 | 8> : Added if IE and version < 6 (or 7 or 8)
      * isFF<2 | 3>  : Added if Firefox and version == 2 (or 3)
      * notFF<2 | 3> : Added if Firefox and version != 2 (or 3)
      * ge_FF<2 | 3> : Added if Firefox and version >= 2 (or 3)
      * lt_FF<2 | 3> : Added if Firefox and version < 2 (or 3)

    For example, using IE6, the CSS class names are:
      isIE isIE6 ge_IE6 notIE7 lt_IE7 notIE8 lt_IE8 notFF notSafari

    And for Firefox 3, the CSS class names are:
      notIE isFF notFF2 ge_FF2 isFF3 ge_FF3 notSafari

    @return The CSS classes to add and delete.
    */
    getDecorations : function ()
    {
        var ret = { add : [], del : [] };

        function put (bool, prefixTrue, prefixFalse, suffix)
        {
            ret.add.push((bool ? prefixTrue : prefixFalse) + suffix);
            ret.del.push((bool ? prefixFalse : prefixTrue) + suffix);
        }

        function putIsOrNot (bool, suffix)
        {
            put(bool, "is", "not", suffix);
        }

        function putLevel (bool, suffix, minVer, maxVer)
        {
            putIsOrNot(bool, suffix);

            if (bool && arguments.length == 4)
                for (var ver = minVer; ver <= maxVer; ++ver)
                {
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

    @return True if this browser's name matches any of the given names.
    */
    is : function (/* name1, name2, ... */)
    {
        var name = this.name.toLowerCase();
        for (var i = 0, n = arguments.length; i < n; ++i)
        {
            var s = arguments[i].toLowerCase();
            if (name == s)
                return true;
        }
        return false;
    }
})

});

zjs.browser = new zjs.Browser();

if (zjs.browser.webkit)
{
    delete zjs.arrayConv;

    $namespace(zjs, {
        arrayConv : function (it)
        {
            // In Safari, only use the `toArray` method if it's not a NodeList.
            // A NodeList is a function, has an function `item` property, and a
            // numeric `length` property. Taken from Prototype.js which adapted
            // it from Google Doctype.
            if (typeof it === 'function' && typeof it.length === 'number'
                                         && typeof it.item === 'function')
                return null;

            return it.toArray ? it.toArray() : null;
        }
    });
}
