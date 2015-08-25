/*=============================================================================
    zjs/import.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/
//! @file zjs/import.js This file implements dynamic Javascript loading.

/**
@module zjs.import
@requires zjs.core
@requires zjs.ajax
@requires zjs.browser
@requires zjs.ext
*/
$module("zjs.import");

$requires("zjs.core");
$requires("zjs.ajax");
$requires("zjs.browser");
$requires("zjs.ext");

//! @namespace zjs The root namespace for ZJS.
$namespace(zjs, {

/**
This is the interface that must be implemented to a valid Package Manager. To get
started, there are several terms that need to be understood:

*Package:* A Java-like hierarchical naming structure that maps to a folder. It is
best practice to keep packages equivalent to namespaces, though this is not enforced.
Packages can be nested as with Java and are then often called "sub-packages". Package
names are separated by dots, like namespaces and also like Java, to form a
Package Path.

*Package Path:* A sequence of package names separated by dots. For example, take the
string "foo.bar.bif". These are always absolute. In other words, "foo" is the top-level
package with a "bar" sub-package, in turn with a "bif" sub-package.

*Root Package:* A top-level (non-nested) package. For example, the root package of
"foo.bar.bif" is "foo".

*Module:* A member of a package in a single Javascript (.js) file. There can be
multiple modules in a Javascript file, but modules do not span files. A file that
contains multiple modules is called a Bundle.

*Bundle:* A Javascript file that contains multiple modules. These are typically
produced by a build process that combines individual files into one for efficiency.

*Module Name:* The leaf file name, sans extent and path. For example, the name of
this module is "import" (no ".js" and no "zjs").

*Module Path:* The concatenation of the package and module name separated by a dot
character ("."). For example, the module path of this module is "zjs.import".

Similar to Java, sub-packages are assumed to be in a file-system hierarchy
(in this case, via the src URL).

@interface IPackageManager
*/
    /**
    Returns the modules required by the given Javascript source text string. In
    this implementation, this is done by parsing the $requires statements and
    capturing the module paths they contain.

    @method getRequiredModules
    @param scriptText {string} The Javascript source text.
    @returns {string[]} The array of module paths of the required modules.
    */
    //getRequiredModules : function (scriptText)

    //-----------

    /**
    Maps the given module path to its corresponding URL. The module path is the
    standard "foo.bar.module" format.

    For example:

    js:{{{
        var url = pkg.makeUrl("foo.bar.module");

        // url == "../js/foo/bar/module.js;jsessionid=4321"
    }}}

    @method makeUrl
    @param modpath {string} The module path to map to a URL.
    @returns {string} The URL to use to retrieve the specified module's JS file.
    */
    //makeUrl : function (modpath)

//! @~interface IPackageManager
//-------------------------------------

/**
This class provides the logic to manage modules for a package. This implementation of
getRequiredModules uses a simple regex to parse out any $requires statements in the
source. This does not respect block comments, but does understand "//" commented lines.

The implementation of makeUrl provided by this class is a concatenatination of
stored prefix and suffix text with a given relative path to form the URL. For
most tasks, this is sufficient. In many cases, there is no suffix. The suffix
is required in cases where cookies are disabled and URL rewriting is used. In
particular, J2EE web containers use a suffix of ";jsessionid=xyz" to maintain
association with the server-side session. While it *may* work to just ditch the
suffix, one ought not make that assumption.

@class PackageManager
@implements IPackageManager
*/
PackageManager : $class({
    /**
    Stores the given prefix and (optional) suffix for forming URL's.

    @ctor
    @param? prefix {string} The URL prefix text.
    @param? suffix {string} The suffix text.
    */
    ctor : function (prefix, suffix) {
        this.prefix = prefix || "";
        this.suffix = suffix || "";

        if (this.prefix.length > 0 && !this.prefix.endsWith("/"))
            this.prefix += "/";
    },

    /*
    This regex matches $requires statements and extracts their arguments.
    */
    kReqRegEx : $static(/^\s*\$requires\(\"([^"]+)\"\)(?:\s|;)*(\/\/[^\r\n]*)?$/gm),

    getRequiredModules : function (scriptText) {
        var m, ret = [], regex = zjs.PackageManager.kReqRegEx;

        while ((m = regex.exec(scriptText)))
            ret.push(m[1]);

        return ret;
    },

    /**
    Converts the given module path into a relative path. This is called by
    makeUrl and the result is then concatenated with the prefix and suffix.

    The most likely reason to override this method is to remove the root package
    name from the path. This would be useful for mapping a non-ZJS body of code
    into the module path hierarchy. For example, to place a directory of JS code
    files from a library named "foo", one could register the "foo" package with
    a custom PackageManager that did not include "foo" in the conversion of a
    module path.

    @method makeRelPath
    @param modpath {string} The module path to convert to a relative path.
    @returns {string} The relative path for the given module path.
    */
    makeRelPath : function () {
        var dots = /\./g;

        return function (modpath) {
            return modpath.replace(dots, "/") + ".js";
        };
    }(),

    makeUrl : function (modpath) {
        var path = this.makeRelPath(modpath);
        var ret = this.prefix + path + this.suffix;
        return ret;
    }
}), //! @~class PackageManager

/**
This class is used to manage a single module. These objects are collected and
managed by the Importer singleton object.

@class Module
*/
Module : $class({
    /*
    An enumeration of the various states for a module.
    @enum State
    */
    State : $static($enum([
        /*
        The module was just initialized and needs to be moved to either LOADING
        or READY (depending on usage).

        @value INIT
        */
        "INIT",

        /*
        The module is loading. There are two phases here: 1) Ajax and 2) Script tag.
        Phase 1 is always performed, while phase 2 is only used when debugging on
        compatible browsers (!Safari).

        @value LOADING
        */
        "LOADING",

        /*
        The module is loaded into the DOM and live. This is the case for code
        loaded via explicit script tags and is also the eventual state for
        dynamically loaded code (if successful).

        @value READY
        */
        "READY",

        /*
        The module failed to load. Consult the module object's error property for
        details.

        @value ERROR
        */
        "ERROR"
    ])), // @~enum

    /**
    Initialize this object given is module path and manager.

    @ctor
    @param pkgmgr The PackageManager-like object for this module.
    @param path This object's module path.
    */
    ctor : function (pkgmgr, path) {
        // The last dot in this module path (e.g., 7 for "foo.bar.jazz").
        var dot = path.lastIndexOf(".");

        // The PackageManager-like object for this module.
        this.pkgmgr = pkgmgr;

        // The leaf module name for this module (e.g., "jazz").
        this.name = (dot > 0) ? path.substring(dot+1) : path;

        // The full module path for this module (e.g., "foo.bar.jazz").
        this.path = path;

        // The callbacks to make when this module becomes fully loaded (null
        // when not LOADING).
        this.callbacks = null;

        // The state of this module.
        this.state = zjs.Module.State.INIT;
    },

    /**
    Returns true if this module is ready.

    @method isReady
    @returns True if this module is ready.
    */
    isReady : function () {
        return this.state === zjs.Module.State.READY;
    },

    /**
    Starts loading this module. The first step is to request it via an Ajax
    GET. This allows us to handle error conditions and process the script
    before it gets interpreted by the browser. When the script text loads,
    this object's onLoad method will be called.

    It is assumed that this module is not currently loaded. The source URL
    is captured (for later use), the callback is stored and the Ajax call is
    started.

    @method load
    @param onready The callback to make when this module is ready.
    */
    load : function (onready) {
        $assert(this.state === zjs.Module.State.INIT);

        var src = this.pkgmgr.makeUrl(this.path);

        this.state = zjs.Module.State.LOADING;
        this.callbacks = onready ? [ onready ] : [];
        this.xact = zjs.ajax(src, { nosim: 1, ondone : this.onLoad.bind(this) });
    },

    /**
    Adds the given callback to the list to call when this module is ready.
    It is assumed that this module is currently loading.

    @method notifyWhenReady
    @param fn The callback to make when this module is ready.
    */
    notifyWhenReady : function (fn) {
        $assert(this.state === zjs.Module.State.LOADING);
        this.callbacks.push(fn);
    },

    /**
    This callback method is called when a script has downloaded. This is the
    first load via Ajax request. We examine the $requires content and then
    decide if we must load any dependencies before injecting the code into
    the DOM.

    If this module has requirements, these are loaded first. Once they have
    been made ready, the onPreReady method is called. If this module has no
    requirements, onPreReady is called now.

    @method onLoad
    @param tr {AjaxTransaction} The AjaxTransaction object (same as this.xact).
    */
    onLoad : function (tr) {
        $assert(this.state === zjs.Module.State.LOADING);

        // not needed anymore, so discard (allows garbage collection):
        this.xact = null;

        // TODO - handle failures

        this.scriptText = tr.response.text;

        var requires = this.pkgmgr.getRequiredModules(this.scriptText);

        if (!requires || requires.length < 1)
            this.onPreReady();
        else
            zjs.Importer.getInstance().load(requires, this.onPreReady.bind(this));
    },

    /**
    This method is called once the pre-requisite modules are ready. Only
    when these modules are fully ready can we inject this module's code.

    If we are not debugging, we can inject this module's code now. If we
    are debugging, we really need to use a script node with its "src"
    attribute (where this works). In this case, we'll be called back in
    this object's onReady method once the script node is ready. If we
    are ready now, we call onReady immediately.

    @method onPreReady
    */
    onPreReady : function () {
        $assert(this.state === zjs.Module.State.LOADING);
        var imp = zjs.Importer.getInstance();

        // For debuggers, we want to inject code using <script src=''>. In
        // some browsers, however, this technique cannot detect readyState,
        // so we have to live with what we have (stupid Safari).
        //
        // This should pull from the cache since we just did a GET on that
        // URL to get our scriptText, but browsers will be browsers...
        //
        if (imp.debug && imp.canUseScriptSrcLoad) {
            var src = this.pkgmgr.makeUrl(this.path);
            zjs.loadScript(src, this.onReady.bind(this), this.path);
        } else {
            zjs.injectScript(this.scriptText, this.path);
            this.onReady();
        }
    },

    /**
    This callback is called when a script has been loaded into the DOM. This
    may be due to a newly ready <script src=''> or Ajax injection.

    @method onReady
    */
    onReady : function () {
        $assert(this.state === zjs.Module.State.LOADING);
        //console.info(this.path + " is ready");
        $module.register(this.path);

        this.scriptText = null; // not needed (allow garbage collection)
        this.state = zjs.Module.State.READY;

        var callbacks = this.callbacks;
        this.callbacks = null;

        for (var i = 0, n = callbacks.length; i < n; ++i)
            callbacks[i]();
    }
}), //! @~class Module

/**
This class manages dynamic imports of Javascript code. One of the jobs of this
class then is to track the association of base URL's and top-level package
names. Only different top-level packages may have different base URL's.
Sub-packages must be located under the base URL of its top-level package.

There are two ways to establish this association.

  1. Using "id" attributes on script tags. For example, to declare the module
     path of a .js file, one can do this:

            <script src="/base/foo/bar/module.js" id="foo.bar.module"></script>

     In the above example, ZJS can now determine the base URL of the "foo"
     top-level package. Given the above, we would have the following:

            foo : /base/

     The algorithm is that for any script tag, its base URL sets the base
     URL for the appropriate top-level package if there is not a base URL
     already set.

  2. Explicit calls to:

        zjs.Importer.getInstance().addPackageManager (pkg, pkgmgr)
        zjs.Importer.getInstance().addPackagePath (pkg, root)
        zjs.Importer.getInstance().addPackagePath (pkg, root, suffix)

@class Importer
*/
Importer : $singleton(null, function () {
    // This regex recognizes ZJS urls so as to not require id's to tag them.
    var zjsModuleRegex = /^(.*\/)?(zjs\/\w+)\.js([&;].*)?$/i;

    /*
    This method is called to add a module that is already loaded. These are
    found by scanning the DOM for script elements.

    @param modpath The module path for the module.
    @param pkgobj The object that will form URL's to modules in the package.
    */
    function addLoadedModule (modpath, pkgobj) {
        var dot = modpath.indexOf(".");
        var rootPkg = modpath.substring(0, dot);

        this.addPackageManager(rootPkg, pkgobj);
        this.getModule(modpath); // creates as necessary
    }

    /*
    This method is called by $module so we can watch modules being registered.

    @param modpath The module path for the module.
    */
    function onModuleRegister (modpath) {
        var mod = this.getModule(modpath, true); // may create

        // If we just created the Module, we need to mark it as READY. If it was
        // marked as LOADING, we need to let the loader make the transition.
        if (mod.state === zjs.Module.State.INIT)
            mod.state = zjs.Module.State.READY;
    }

    /*
    Scans the DOM for preloaded script elements. The id of these elements is
    assumed to contain the module path and must match the src URL if present.

    On some browsers, script.src is an exact copy of the src attribute (IE6/7),
    but on others it is the canonicalized URL (FF, IE8). For some details, see:

    http://blogs.msdn.com/ie/archive/2008/04/10/
            html-and-dom-standards-compliance-in-ie8-beta-1.aspx

    <QUOTE>
    Big-impact improvements in Beta 1

    Within the scope of attribute-related fixes, the following address some of
    the well-known, oft-cited, compliance issues in IE's HTML and DOM support.

       1. <BUTTON> type attribute defaults to 'submit' rather than 'button' in
          IE8 standards mode.
       2. setAttribute now uses the content attribute name (rather than the DOM
          attribute name) for applying an attribute value (also camelCase no
          longer required).
              * This fixes the commonly reported issues regarding the 'style',
                'class', and 'for' attributes not working.
       3. getElementById finds only elements with matching id (not name) and
          performs case-sensitive matching.
       4. <BUTTON> value attribute text now submitted iin form submit in IE8
          standards mode. IE7 standards mode continues to submit the innerText.
       5. <OBJECT> now supports native image loading (see the whitepaper for
          more details).
       6. <OBJECT> now supports fallback for two additional scenarios: HTML
          embedding and native image loading (where the HTML/image resource
          cannot be loaded, i.e., 4xx-5xx HTTP response codes. ActiveX controls
          still do not support fallback (see the whitepaper for more details).
       7. URL-type DOM attributes separated from content attributes. For
          example: <A>.href (DOM attribute) != <A>.getAttribute('href')
          (content attribute).

          You will find that all URL-type DOM attributes return an absolute URL,
          while the content attribute returns the string that was provided in
          the source. These changes apply to the Attr.value and getAttributeNode
          as well. Specifically:

              * The following element's DOM attributes now return absolute URLs:
                applet [codebase], base [href], body [background], del [cite],
                form [action], frame [src, longdesc], head [profile],
                iframe [src, longdesc], img [longdesc], ins [cite], link [href],
                object [codebase, data], q [cite], script [src].
              * The following element's content attributes now return relative
                URLs: a [href], area [href], img [src], input [src].
    </QUOTE>

    In particular, item #7 relates to this issue. So, in IE8, the src attribute
    will behave like it does in FF (the standard behavior).
    */
    function scanLoadedModules () {
        var mod, scripts = document.getElementsByTagName("script");

        for (var i = 0, n = scripts.length; i < n; ++i) {
            var src = scripts[i].src;
            if (!src)
                continue;

            // See if the tag looks like <script id="foo.bar">, and if it does,
            // extract the module path:
            var match;
            mod = scripts[i].id;
            if (mod) {
                var s = mod.replace(".", "\\/") + "\\.js"; // foo/bar.js
                var re = new RegExp("^(.*\\/)?" + s + "([&;].*)?$");

                match = re.exec(src);
                if (match)
                    addLoadedModule.call(this, mod,
                               new zjs.PackageManager(match[1], match[2]));
            } else { // explicitly check for ZJS modules...
                match = zjsModuleRegex.exec(src);
                if (match)
                    addLoadedModule.call(this, match[2].replace("/", "."),
                               new zjs.PackageManager(match[1], match[3]));
            }
        }

        // Add all modules registered by $module calls:
        for (i = 0, n = $module.inventory.length; i < n; ++i)
            onModuleRegister.call(this, $module.inventory[i]);
    }

    return {
        /**
        Controls whether or not we use loadScript. See that method for
        compatibility notes.

        @prop canUseScriptSrcLoad
        */
        canUseScriptSrcLoad : !zjs.browser.khtml,

        /**
        Set to true to use debugger-friendly injection technique. While
        less efficient, it is much better than breaking Firebug et.al..

        @prop debug
        */
        debug : zjs.config.debug,

        /*
        Initializes this object. Since this is a singleton, there are no ctor
        arguments.
        */
        ctor : function () {
            $super(arguments).apply(this, arguments);

            /**
            An object indexed by root package name to get a PackageManager.
            @prop packages
            */
            this.packages = { };

            /**
            Modules that are loaded indexed by module path. The value is a Module object.
            @prop modules
            */
            this.modules = { };

            scanLoadedModules.call(this);
            $module.hook = onModuleRegister.bind(this);
        },

        /**
        Adds a package and its associated object, if not already defined. The
        object should be substitutable for a PackageManager.

        @method addPackageManager
        @param pkg The package name.
        @param pkgmgr The object that will manage modules in the package.
        */
        addPackageManager : function (pkg, pkgmgr) {
            $super(arguments).apply(this, arguments);

            if (!this.packages[pkg])
                this.packages[pkg] = pkgmgr;
        },

        /**
        Adds a package and its associated manager, if not already defined. The
        root is the base URL for modules in that package. The optional suffix
        can be supplied to deal with things like URL rewriting (such as with
        J2EE web containers and ";jsessionid=" warts).

        @method addPackagePath
        @param pkg The package name.
        @param root The base URL for modules in this package.
        @param suffix The suffix for modules in this package (optional).
        */
        addPackagePath : function (pkg, root, suffix) {
            $super(arguments).apply(this, arguments);

            if (!this.packages[pkg])
                this.packages[pkg] = new zjs.PackageManager(root, suffix);
        },

        /**
        Returns the Module object given its module path. Creates as necessary
        the bookkeeping data for the module. If the Module object is created, it
        is placed in the INIT state. The caller must adjust the object's state
        as necessary.

        @method getModule
        @param modpath The module path for the module.
        @param pkgMgrOptional True if the module does not need a package manager.
        */
        getModule : function (modpath, pkgMgrOptional) {
            var mod = this.modules[modpath];

            if (!mod) {
                var pkgmgr = this.getModulePackageManager(modpath, pkgMgrOptional);
                mod = new zjs.Module(pkgmgr, modpath);
                this.modules[modpath] = mod;
            }

            return mod;
        },

        /**
        Returns the PackageManager object for the given module. If the package
        manager is optional, the 2nd parameter can be passed as true to return
        null instead of throwing an exception.

        @method getModulePackageManager
        @param modpath The module path of the desired module.
        @param optional True if the package manager is optional (no throw).
        @returns The PackageManager for the given module or null.
        @throws Error if there is no PackageManager for the specified modpath.
        */
        getModulePackageManager : function (modpath, optional) {
            var dot = modpath.indexOf(".");
            var pkg = (dot > 0) ? modpath.substring(0, dot) : null;

            var pkgmgr = this.packages[pkg];
            $assert(pkgmgr || optional, "No manager for package ", modpath);

            return pkgmgr;
        },

        /**
        Returns true if the given module is loaded (loading doesn't count).

        @method isReady
        @param modpath The module path in question.
        */
        isReady : function (modpath) {
            var mod = this.modules[modpath];
            return mod && mod.isReady();
        },

        /**
        Loads a given array of module paths and calls the given onload when done.
        Most likely, the $import method should be used instead of calling this
        method directly.

        @method load
        @param modulePaths The array of module paths to load.
        @param onload The callback to make when the load is complete.
        */
        load : function (modulePaths, onload) {
            $super(arguments).apply(this, arguments);

            var pending = 1; // the number of modules yet to finish loading

            function onready () {
                if (--pending === 0 && onload)
                    onload();
            }

            for (var i = 0, n = modulePaths.length; i < n; ++i) {
                var modpath = modulePaths[i];
                var mod = this.modules[modpath];
                if (mod && mod.isReady()) // if (already ready)
                    continue;

                ++pending;

                if (mod) { // if (currently loading)
                    mod.notifyWhenReady(onready);
                } else { // first encounter
                    mod = this.getModule(modpath); // creates as necessary
                    mod.load(onready);
                }
            }

            // Since we started our counter at 1, we now decrement it. This is
            // just paranoia (maybe). The concern is that requests may complete
            // immediately if they were in the cache . If so, we don't want to
            // call the user's completion handler in the middle (repeatedly)
            // while we are working. So, we start the counter at 1 so we can be
            // sure it cannot reach zero until here.
            --pending;

            // If we have no loads pending, we schedule a call to the user's
            // completion handler. The setTimeout method passes arguments to
            // its callback, but we don't want them to be passed on (and be
            // potentially confusing).
            if (pending === 0 && onload)
                window.setTimeout(onload.seal(), 1);
        }
    };
}()), //! @~class Importer

/**
Adds the given script element to the document.

@method addScript
@param script
*/
addScript : function (script) {
    // Revised with logic from jQuery 1.2.6 - Use insertBefore instead of appendChild
    // to circumvent an IE6 bug. This arises when a base node is used (#2709).
    var head = document.getElementsByTagName("head")[0] || document.documentElement;

    head.insertBefore(script, head.firstChild);
    //head.appendChild(script);
},

/**
Creates a new script element given its source text (and optional ID). The new
script element is added to the document and returned. This works on all of
the supported browsers and the code is immediately "live" or "ready". This is
a much better and more correct way to inject code than eval. The problem with
evail is that the code is evaluated in the current context. Using this approach
the code is added to the global scope as it ought to be.

@method injectScript
@param text The Javascript source code.
@param? id The ID of the new script element.
@return The new script element.
*/
injectScript : function (text, id) {
    var script = zjs.newScript(id);

    if (zjs.browser.ie)
        script.text = text;
    else
        script.appendChild(document.createTextNode(text));

    zjs.addScript(script);
    return script;
},

/**
Creates a new script element given its source URL (and optional ID). The new
script element is added to the document and returned. When the script loads,
the onload handler is called.

NOTE: This does not work on Safari. Neither onreadystatechange nor onload events
fire when the script text loads. It will load, we just cannot detect when the
ready (code live) state is reached. This is believed to be true for all of the
KHTML/WebKit-based browsers.

@method loadScript
@param src The Javascript source URL.
@param onload The handler to call when the script is fully loaded.
@param? id The ID of the new script element.
@returns The new script element.
*/
loadScript : function () {
    var regex = /complete|loaded/i;

    /*
    Creates a function that adapts onreadystatechange calls to onload. The
    given onload is called when the returned callback reaches its final state.
    */
    function makeReadyStateHandler (onload) {
        var pending = true;

        return function () {
            if (pending && regex.test(this.readyState)) {
                pending = false;
                onload();
            }
        };
    }

    // The real function for loadScript (uses hidden stuff above).
    return function (src, onload, id) {
        var script = zjs.newScript(id);

        script.src = src;

        if (zjs.browser.ie)
            script.onreadystatechange = makeReadyStateHandler(onload);
        else
            script.onload = onload;

        zjs.addScript(script);
        return script;
    };
}(),

/**
Creates a new script element, optionally setting its ID, and returns it. The
new element is NOT added to the document.

@method newScript
@param? id The ID of the new script element.
@returns The new script element.
*/
newScript : function (id) {
    var script = document.createElement("script");

    script.type = "text/javascript";
    if (id)
        script.id = id;

    return script;
}

}); //! @~namespace zjs

/**
Loads a sequence of modules and calls an optional completion callback. For example:

js:{{{
    $import(["foo.bar.bif", "bar.fiz.baz"],
            ["bif.boo.zip", "jazz.rip.fifi"],
            "bonzi.booze",
            onload);
}}}

Batch 1 (foo.bar.bif and bar.fiz.baz) is requested in parallel. When complete, the
next batch (bif.boo.zip and jazz.rip.fifi) is requested in parallel. Then the single
module bonzi.booze is requested. Finally, when that module loads, the user's onload
method is called.

This kind of loading is not necessary for modules that use $requires since they are
automatically loaded in their transitive dependency order. For loading code that does
not use $requires, however, its dependency needs are not expressed in the code.

@method $import
@param modpaths {string|string[]} One or more module paths. These can be a single
    a module path string (e.g., "foo.bar.bif") or an array of modpath strings
    (e.g., ["foo.bar.bif", "bar.fiz.baz"]). In the case of an array, all of the
    modules are requested in parallel. When all are loaded, the next argument is
    started or the user callback (if any) is made.
@param? onload {function} The method to call once all modules have been loaded.
*/
function $import (modpaths, onload) {
    var imp = zjs.Importer.getInstance();
    var n = arguments.length;

    if (n > 1) {
        if (typeof(arguments[n-1]) === "function")
            onload = arguments[--n];
    }

    for (var i = n; i-- > 0; ) {
        modpaths = arguments[i];
        if (! (modpaths instanceof Array))
            modpaths = [ modpaths ];

        if (i > 0)
            onload = imp.load.bind(imp).head(modpaths, onload);
    }

    imp.load(modpaths, onload);
}
