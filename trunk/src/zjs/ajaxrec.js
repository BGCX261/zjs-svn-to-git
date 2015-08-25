/*=============================================================================
    zjs/ajaxrec.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/
//! @file zjs/ajaxrec.js This file provides for Ajax recording.

/**
@module zjs.ajaxrec
@requires zjs.ajax
*/
$module("zjs.ajaxrec");

$requires("zjs.ajax");

//! @namespace zjs The root namespace for ZJS.
$namespace(zjs, {

/**
This singleton class will record Ajax request and response data. When first created,
it intercepts newXHR and wraps the returned object in order to capture the results.

@class AjaxRecorder
*/
AjaxRecorder : $singleton( {
    ctor : function () {
        this.rec = [];

        var qs = window.location.search;
        qs = zjs.parseQueryString(qs);
        this.active = ("ajaxrec" in qs);

        var self = this;

        $namespace(zjs, {
            newXHR : $override(function () {
                var xhr = $super(arguments).call(this);
                return self.wrap(xhr);
            })
        });
    },

    /**
    Generates the code simulate the currently recorded requests and responses.

    @method generate
    @returns {string} The code to simulate the recorded data.
    */
    generate : function () {
        var ret = ["zjs.AjaxSimManager.getInstance()"];
        var already = {};

        $foreach(this.rec, function (r) {
            if (already[r._url])
                return;
            already[r._url] = 1;

            var /*headers = "";
            if (r._headers)
                headers = r._headers;
            else*/
                headers = JSON.stringify({ "Content-Type" : r._type });

            var s;

            if (zjs.getMimeType(r._type) !== zjs.mime.JSON)
                s = "          responseText: " + JSON.stringify(r.responseText) + "\n";
            else
                s = "          responseObj: " + r.responseText + "\n";

            s = "    .add(new zjs.AjaxSim(" + JSON.stringify(r._url) + ",\n" +
                "        { code : " + r.status + ",\n" +
                "          headers : " + headers + ",\n" +
                s +
                "        }))";

            ret.push(s);
        });

        return ret;
    },

    /**
    Wraps the given XHR to record its information.

    @method wrap
    @param xhr The XHR to wrap.
    @returns The wrapped object (an AjaxRecXHR).
    */
    wrap : function (xhr) {
        if (!this.active)
            return xhr;

        var ret = new zjs.AjaxRecXHR(xhr);
        this.rec.push(ret);
        return ret;
    }
}), //! @~class AjaxRecorder

/**
This class mimics the XmlHttpRequest object interface for recording a request. An
instance of this type may be returned by newXHR.

@class AjaxRecXHR
*/
AjaxRecXHR : $class( {
    ctor : function (xhr) {
        this._xhr = xhr;
        this._xhr.onreadystatechange = this._onReadyStateChange.bind(this);
    },

    open : function (verb, url, async, username, pswd) {
        this._url = url;
        this._verb = verb;

        return this._xhr.open(verb, url, async, username, pswd);
    },

    abort : function () {
        return this._xhr.abort();
    },

    getAllResponseHeaders : function () {
        return this._xhr.getAllResponseHeaders();
    },

    getResponseHeader : function (headerName) {
        return this._xhr.getResponseHeader(headerName);
    },

    send : function (content) {
        this._content = content;

        return this._xhr.send(content);
    },

    setRequestHeader : function (name, value) {
        return this._xhr.setRequestHeader(name, value);
    },

    _onReadyStateChange : function () {
        var xhr = this._xhr;
        if (!xhr)
            return;

        this.readyState = xhr.readyState;
        if (!this.status && xhr.readyState == zjs.xhr.DONE) {
            this.status = xhr.status;
            this.responseText = xhr.responseText;

            this._headers = xhr.getAllResponseHeaders();
            this._type = xhr.getResponseHeader(zjs.http.CONTENT_TYPE);

            try {
                this.statusText = xhr.statusText;
            } catch (e) {
                this.statusText = e.message + " (" + this.status + ")";
            }
        }

        this.onreadystatechange();

        if (xhr.readyState == zjs.xhr.DONE)
            this._xhr = null;
    }
}) //! @~class AjaxRecXHR

}); //! @~namespace zjs
