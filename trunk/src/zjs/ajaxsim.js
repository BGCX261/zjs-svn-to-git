/*=============================================================================
    zjs/ajaxsim.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/
//! @file zjs/ajaxsim.js This file provides for Ajax simulation.

/**
@module zjs.ajaxsim
@requires zjs.ajax
*/
$module("zjs.ajaxsim");

$requires("zjs.ajax");

//! @namespace zjs The root namespace for ZJS.
$namespace(zjs, {

/**
This class manages a simulated Ajax request.

@class AjaxSim
*/
AjaxSim : $class({
    /**
    Initializes this object given the match criteria and result(s). At least one
    result must be provided. If multiple are provided, they will be delivered in
    a round-robin sequence.

    @ctor
    @param key The key(s) to match against request URL's. This can be a single
            string or regex or an array of the same. If request URL matches one
            of the strings or regex's, it is considered a match and the results
            held by this object are delivered.
    @param res The first result data.
    */
    ctor : function (key, res) {
        this.key = key;
        this.calls = 0;
        this.results = [];

        for (var i = 1, n = arguments.length; i < n; ++i) {
            res = arguments[i];

            if (!("code" in res))
                res.code = 200;
            if (!("message" in res))
                res.message = (res.code == 200) ? "OK" : ("" + res.code);

            this.results.push(res);
        }
    },

    /**
    This method provides the results for a simulated Ajax request. The URL and
    options are provided and a result object is returned.

    @method getResult
    @returns
    @{
        @. code The HTTP status code (e.g., 200).
        @. message The HTTP status message (e.g., "OK").
        @? headers The HTTP headers for the response. This is an object with
                properties for each header.
        @? responseXML The XML response object.
        @? responseText The text response.
        @? responseObj The response data object.
    @}
    */
    getResult : function (xhr) {
        var res = this.results[this.calls++ % this.results.length];
        return res;
    },

    /**
    This method returns true if the given URL should be simulated by this object.

    @method match
    @param url The URL of the request.
    @returns True if this object should provide the result, false if not.
    */
    match : function () {
        function test (key, url) {
            var kt = zjs.getType(key);
            if (kt == "regexp")
                return key.exec(url); // match array or null

            if (key == url) // if (exact match)
                return url;

            if (key.endsWith("?"))
                if (url.startsWith(key) || (url + "?" == key))
                    // "foo.com?" matches any URL starting with "foo.com?"
                    return url;

            return null;
        }

        return function (url) {
            var t = zjs.getType(this.key);
            if (t != "array")
                return test(this.key, url);

            var ret = null;

            for (var i = 0, n = this.key.length; i < n && !ret; ++i)
                ret = test(this.key[i], url);

            return ret;
        };
    }()
}), //! @~class AjaxSim

/**
This singleton class is used to manage Ajax simulations. When created, this object
will intercept the newXHR method. If the options object contains a "nosim" property,
the request is not simulated. Otherwise, an AjaxSimXHR is created to simulate the
normal Ajax usage.

js:{{{
    AjaxSimManager.getInstance().setDelay(100).
        add(new zjs.AjaxSim("foo/bar", { responseText: "Hello" })).
        add(new zjs.AjaxSim("bar/foo", { responseText: "World" }));
}}}

@class AjaxSimManager
*/
AjaxSimManager : $singleton({
    /**
    Intercepts newXHR and sets the default delay.
    @ctor
    */
    ctor : function () {
        $namespace(zjs, {
            newXHR : $override(function (opt) {
                if (opt.nosim)
                    return $super(arguments).apply(this, arguments);

                return new zjs.AjaxSimXHR();
            })
        });

        this.delay = 500;
        this.notFound = { code:404, message:"Not found",
                          headers : { "Content-Type" : "text/plain" } };
        this.sims = [];
    },

    /**
    Adds an AjaxSim object to simulate particular responses. The AjaxSim is added
    to the end of the set (and has least precedence).

    @method add
    @param sim The AjaxSim to add.
    @returns This object (for call chaining).
    */
    add : function (sim) {
        this.sims.push(sim);
        return this;
    },

    /**
    Adds an AjaxSim object to simulate particular responses. The AjaxSim is added
    to the front of the set (and has highest precedence).

    @method addFront
    @param sim The AjaxSim to add.
    @returns This object (for call chaining).
    */
    addFront : function (sim) {
        this.sims.unshift(sim);
        return this;
    },

    /**
    Returns the result to deliver for the particular request.

    @method getResult
    @param xhr The request to satisfy.
    @returns The result to use, perhaps the standard Not Found (404).
    */
    getResult : function (xhr) {
        var result = $foreach(this.sims, function (sim)
        {
            var m = sim.match(xhr.url);
            if (m)
                $break(sim.getResult(xhr));
        });

        return result || this.notFound;
    },

    /**
    Sets the delay between the request and delivery of the simulated response.

    @method setDelay
    @param delay The delay in milliseconds.
    @returns This object (for call chaining).
    */
    setDelay : function (delay) {
        this.delay = delay;
        return this;
    }
}), //! @~class AjaxSimManager

/**
This class mimics the XmlHttpRequest object interface for a simulated request. An
instance of this type may be returned by newXHR.

@class AjaxSimXHR
*/
AjaxSimXHR : $class({
    readyState : zjs.xhr.UNSENT,

    ctor : function () {
        this.requestHeaders = {};
    },

    onreadystatechange : function () {
        // nothing
    },

    open : function (verb, url) { //, async, username, pswd)
        $assert(this.readyState == zjs.xhr.UNSENT);
        this.readyState = zjs.xhr.OPENED;
        this.url = url;
        this.verb = verb;
    },

    abort : function () {
        if (this.tid) {
            window.clearInterval(this.tid);
            this.tid = null;
        }
    },

    getAllResponseHeaders : function () {
        // TODO ...
    },

    getResponseHeader : function (headerName) {
        return this.responseHeaders[headerName];
    },

    _onTick : function () {
        var r = this._result;
        if (!r)
            this._result = r = zjs.AjaxSimManager.getInstance().getResult(this);

        switch (++this.readyState) {
         case zjs.xhr.HEADERS_RECEIVED:
            this.responseHeaders = r.headers || {};
            break;

         case zjs.xhr.DONE:
            this.abort();

            /*
            Our results object has these properties:

                code         : The HTTP status code (e.g., 200).
                message      : The HTTP status message (e.g., "OK").
                responseXML  : The XML response object.
                responseText : The text response.
                responseObj  : The response data object.
            */
            this.status = r.code;
            this.statusText = r.message;
            if (r.responseObj) {
                this.responseText = JSON.stringify(r.responseObj);
                this.responseHeaders[zjs.http.CONTENT_TYPE] = zjs.mime.JSON;
            } else if (r.responseXML) {
                this.responseXML = r.responseXML;
                this.responseHeaders[zjs.http.CONTENT_TYPE] = zjs.mime.XML;
            } else {
                this.responseText = r.responseText;
            }

            break;
        }

        this.onreadystatechange();
    },

    send : function (content) {
        this.content = content;

        var mgr = zjs.AjaxSimManager.getInstance();

        this.tid = window.setInterval(this._onTick.bind(this), mgr.delay);
    },

    setRequestHeader : function (name, value) {
        this.requestHeaders[name] = value;
    }
}) //! @~class AjaxSimXHR

}); //! @~namespace zjs
