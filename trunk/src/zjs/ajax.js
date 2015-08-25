/*=============================================================================
    zjs/ajax.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/

//! @file zjs/ajax.js This file contains an Ajax wrapper implementation.

/**
@module zjs.ajax
@requires zjs.core
*/
$module("zjs.ajax");

$requires("zjs.core");

//! @namespace zjs The root namespace for ZJS.
$namespace(zjs, {

/**
Some HTTP constants.
@var http
*/
http : {
    /**
    The HTTP header that tells the MIME type the client accepts as the response (Accept)
    @var ACCEPT
    */
    ACCEPT : "Accept",

    /**
    The HTTP header that holds the content length (Content-Length).
    @var CONTENT_LENGTH
    */
    CONTENT_LENGTH : "Content-Length",

    /**
    The HTTP header that specifies the content type (for request and response).
    @var CONTENT_TYPE The Content-Type header.
    */
    CONTENT_TYPE : "Content-Type"
},

/**
Some MIME type constants.
@var mime
*/
mime : {
    /**
    The MIME type for JSON content (application/json, see RFC 4627).
    See http://www.ietf.org/rfc/rfc4627.txt?number=4627

    @var JSON
    */
    JSON : "application/json",

    /**
    The MIME type for XML content (text/xml). One of them anyway (application/xml
    is also standard). See http://en.wikipedia.org/wiki/XML_and_MIME as well as
    http://www.ietf.org/rfc/rfc3023.txt?number=3023 for more details.

    @var XML
    */
    XML : "text/xml"
},

/**
The various readyStates of the XHR object.
@var xhr
*/
xhr : {
    /**
    open() has not yet been called.

    The AjaxTransaction ctor calls open, so this state should be invisible in
    that case.
    @var UNSENT
    */
    UNSENT:0,

    /**
    send() has not yet been called.
    @var OPENED
    */
    OPENED:1,

    /**
    send() has been called, headers and status are available.
    @var HEADERS_RECEIVED
    */
    HEADERS_RECEIVED:2,

    /**
    The responseText property holds partial data (not true in IE).
    @var LOADING
    */
    LOADING:3,

    /**
    All content has been received.
    @var DONE
    */
    DONE:4
},

/**
Returns the MIME type given a Content-Type value. This requires some parsing due
to the ";charset" muck that can appear following the MIME type.

@method getMimeType
@param contentType The HTTP Content-Type header value.
@return The MIME type.
*/
getMimeType : function (contentType) {
    if (contentType) {
        var semi = contentType.indexOf(";");
        if (semi > 0)
            return contentType.substring(0, semi);
    }

    return contentType;
},

/**
Creates a new XHR (XMLHttpRequest) object and returns it. This handles IE vs.
The Rest Of The World issues.

NOTE: It is *NOT* recommended to call this method. All the features of XHR are
better handled by the zjs.AjaxTransaction class and the zjs.ajax method. This
method is exposed only in the unlikely case that the more friendly wrappers are
unsuited for some situation.

@method newXHR
@param opt The Ajax options object.
@return A new and uninitialized XHR object.
*/
newXHR : function (opt) {
    /*
    From http://msdn.microsoft.com/en-us/library/ms757837(VS.85).aspx:

       "After you install MSXML 4.0 or later, applications that use
        version-independent ProgIDs continue to run using the most
        recent version of MSXML prior to version 4.0. Typically, for
        most current Windows systems, this will be MSXML 3.0. To use
        version 4.0 or later, however, applications must be written
        to use the appropriate version-dependent class IDs (CLSIDs)
        and ProgIDs that reference the appropriate DLL (Msxml4.dll,
        Msxml5.dll, and so on).

    See also:
      http://blogs.msdn.com/xmlteam/archive/2006/10/23/
        using-the-right-version-of-msxml-in-internet-explorer.aspx

      "If you want the full story please read on, but if you’re short
       on time and want the quick scoop here it is in 4 bullets:

        * Use MSXML 6.0 - it is “in the box” on Vista and available for
          download on Win2k, XP, and 2003.  It has the best security,
          performance, reliability, and W3C conformance.

        * MSXML 3.0 is our preferred “fallback” - It is installed on
          every OS from a fully patched Win2k SP4 installation on up,
          so it requires “zero-deployment” and is serviced regularly
          with the OS.

        * MSXML 4.0 was released to the web about 5 years ago, but at
          this point has been superseded by MSXML 6.0 and is only
          intended to support legacy applications.

        * MSXML 5.0 for Microsoft Office Applications is purpose-built
          for Office applications and isn’t intended for broad deployment.
          Internet Explorer 7 actually has the MSXML5 components
          "off-by-default" in the Internet zone so your customers will
          get a goldbar for each MSXML5 control on a page if your code
          tries to instantiate it. The best recommendation is to avoid
          MSXML5 in your web apps (only machines with Office 2003 or
          higher will have it, anyway.).

       This essentially leads to two options:

        * Try MSXML6 and fallback to MSXML3
        * Standardize on MSXML3

       Ideally, customers should standardize on MSXML6 ..."
    */
    var msxml2 = "MSXML2.XMLHTTP";
    var progIds = [ msxml2+".6.0", msxml2, "Microsoft.XMLHTTP" ];

    try {
        return new XMLHttpRequest(); // try the best first... native support
    } catch (e) {
        /*global ActiveXObject: true */

        // try fall-backs if native support is not available...
        if (window.ActiveXObject)
            for (var i = 0, n = progIds.length; i < n; ++i)
                try { return new ActiveXObject(progIds[i]); } catch(ignore) {}

        throw e; // throw original failure...
    }
},

/**
This class manages an XHR transaction (request/response). It provides easy to
control mechanisms for using XHR via the "options" parameter to the ctor. The
underlying XHR object is available via the "xhr" property. The active options
are stored in the "opt" property, but this should be viewed as read-only.

@class AjaxTransaction
*/
AjaxTransaction : $class(function () {
    // There are two standard XML MIME types: application/xml and text/xml. But
    // beyond that, XML-based formats typically have a "+xml" suffix.
    // See http://en.wikipedia.org/wiki/XML_and_MIME
    var xmlRegex = /^(((application|text)\/xml)|(.+[+]xml))$/;

    /*
    This method is called when the XHR first reaches the DONE state. This is
    the time to capture status and response data and populate the "response"
    object.
    */
    function onDone () {
        var xhr = this.xhr;
        var resp = null, code = xhr.status, message = null;

        xhr.onreadystatechange = $super.none; // break ref cycle

        try {
            message = xhr.statusText; // may throw (at least on FF)

            var type = xhr.getResponseHeader(zjs.http.CONTENT_TYPE);
            if (type) {
                type = zjs.getMimeType(type);
            } else { // in FF, file:// requests have no type (may happen other ways)
                // Sniff out an XML response (this probably needs work in IE by
                // using its proprietary parseError property and may also not
                // work in other browsers).
                var x = xhr.responseXML, c = x && x.documentElement;
                if (c && c.tagName.toLowerCase() != "parsererror")
                    type = "text/xml";
            }

            var temp = { success: (code === 0 || code == 200), type: type };

            if (xmlRegex.test(type)) {
                temp.data = temp.xml = xhr.responseXML;
            } else if (type == zjs.mime.JSON) {
                temp.data = temp.object =
                      // see json2.js (from http://www.json.org/js.html):
                      JSON.parse(xhr.responseText, this.opt.jsonReviver);
            } else {
                temp.data = temp.text = xhr.responseText;
            }

            resp = temp;
        } catch (ex) {
            // The XHR object may throw if the request fails for network
            // level reasons (i.e., not due a non-2xx HTTP response code).
            // So about the only reasonable thing to do is capture this
            // exception's message.
            message = ex.message + " (" + code + ")";
            code = 0xBADF00D;
        }

        this.response = resp || { success : false };
        this.response.code = code;
        this.response.message = message;

        if (!this.response.success)
            this.response.error = new Error(message);
    }

    /*
    This method is called by the XHR on each state change. There are two jobs
    done by this method: 1) call onDone when appropriate; 2) call any callbacks
    specified by the user.
    */
    function onReadyStateChange () {
        var handler = null;
        var xhr = this.xhr;
        var rs = xhr.readyState;

        if (rs != this._readyState) { // if (state changed from last time)
            this._readyState = rs; // remember new state
            handler = this.opt.handlers[rs]; // user handler, if there is one

            if (rs == zjs.xhr.DONE)
                onDone.call(this);
        }

        // Call this one on every call we receive:
        var fn = this.opt.onreadystatechange;
        if (fn instanceof Function)
            fn(this);

        // This is only called on entry to the new state (that is, once):
        if (handler instanceof Function)
            handler(this);
    }

    return {
        /**
        This property is set to true if this object's destroy method is called.

        @prop aborted
        */
        aborted: false,

        /**
        Construct given URL (required) and an optional bag of options.

        @ctor
        @param url The requested URL (required).
        @param opt The options for the transaction.
        @{
            @. ondone Callback for transition to DONE(4) state.
            @(
                @. tx {AjaxTransaction} This object instance.
            @)
            @? accept The HTTP "Accept" header to send to the server.
            @? onheaders Callback for transition to HEADERS_RECEIVED(2) state.
            @(
                @. tx {AjaxTransaction} This object instance.
            @)
            @? onloading Callback for transition to LOADING(3) state.
            @(
                @. tx {AjaxTransaction} This object instance.
            @)
            @? onreadystatechange Callback for each state transition. This is called
                    on all calls from the XHR object, whether the state has changed
                    or not. The other "onX" callbacks are only called on the initial
                    transition to that state.
            @(
                @. tx {AjaxTransaction} This object instance.
            @)
            @? jsonReplacer Controls JSON-ification of objects (see json2.js)
            @? jsonReviver Transformation method for parsed JSON values (see json2.js)
            @? jsonSpace Controls spaces/indents in JSON output (see json2.js)
            @? headers An array of [key, value] arrays of HTTP headers.
            @? username The user's login name (for HTTP auth).
            @? password The user's password (for HTTP auth).
            @? object The object to convert to JSON (typically for a POST).
            @? content The content of the request (typically a POST).
            @? contentType The type of content for the request.
            @? verb The HTTP request verb (e.g., "GET", "POST"). This is infered
                    as GET or POST based on the presence of content to send.
        @}
        */
        ctor : function (url, opt) {
            opt = opt || { };

            var o = this.opt = {
                accept   : opt.accept,
                handlers : [ null, null, opt.onheaders, opt.onloading, opt.ondone ],
                headers  : opt.headers || {},
                username : opt.username || null,
                password : opt.password || null,
                url      : url
            };

            var defs = this.getClass().defaults;
            zjs.copyIf(o, opt, defs);

            if (opt.object) {
                if (!o.accept)
                    o.accept = zjs.mime.JSON;

                // see json2.js (from http://www.json.org/js.html):
                o.content = JSON.stringify(opt.object, o.jsonReplacer, o.jsonSpace);
                o.contentType = zjs.mime.JSON;
                o.object = opt.object;
            } else {
                o.content = opt.content;
                o.contentType = opt.contentType;
            }

            this._readyState = zjs.xhr.UNSENT;
            o.verb = opt.verb || (o.content ? "POST" : "GET");

            if (o.verb == "POST" && !o.content) {
                o.content = " ";
                o.contentType = "application/x-www-form-urlencoded";
            }

            var xhr = this.xhr = zjs.newXHR(o);
            xhr.onreadystatechange = onReadyStateChange.bind(this);

            xhr.open(o.verb, o.url, true, o.username, o.password);

            for (var hdr in o.headers)
                xhr.setRequestHeader(hdr, o.headers[hdr]);

            if (o.content)
                this.xhr.setRequestHeader(zjs.http.CONTENT_LENGTH, o.content.length);

            if (o.accept)
                xhr.setRequestHeader(zjs.http.ACCEPT, o.accept);
            if (o.contentType)
                xhr.setRequestHeader(zjs.http.CONTENT_TYPE, o.contentType);
        },

        /**
        This static object holds default values for transactions.

        @prop defaults
        @{
            @. jsonReplacer Used in JSON.stringify
            @. jsonReviver Used in JSON.parse
            @. jsonSpace USed in JSON.stringify
        @}
        @static
        */
        defaults : $static({
            jsonReplacer : null,
            jsonReviver : null,
            jsonSpace : null
        }),

        /**
        This property holds the details of the response. It is set when the response
        is ready and is null prior to that time.

        @prop response
        @{
            @. code The HTTP status code (from *status* property of XHR).
            @. error This property is only set on failure. This is a Javascript Error
                    object and is suitable for throwing as an exception.
            @. message The HTTP status text (from *statusText* property of XHR) or
                    the exception message if no status text was received.
            @. success This property is true if the request was successful, false
                    otherwise. This property attempts to take into account the various
                    protocols and success codes, but may be fallible (please report bugs
                    as discovered, but be specific about protocols and root causes).
            @. data The data (an alias for either *object*, *text* or *xml* property).
            @. object The deserialized JSON object (via json2.js) from the responseText
                  (if type is application/json).
            @. text The responseText (if type is not xml or JSON).
            @. type The MIME type from the "Content-Type" header.
            @. xml The responseXML (if type is "application/xml").
        @}
        */
        response: null,

        /**
        Destroys this object, aborting the underlying XHR.
        @method destroy
        */
        destroy : function () {
            try {
                this.aborted = true;
                this.xhr.onreadystatechange = $super.none; // break ref cycle
                this.xhr.abort();
            } catch (ignore) {
            }
        },

        /**
        Calls the underlying XHR's getAllResponseHeaders method.
        @method getAllResponseHeaders
        @returns {string[]} The value returned by the wrapped object.
        */
        getAllResponseHeaders : function () {
            return this.xhr.getAllResponseHeaders();
        },

        /**
        Calls the underlying XHR's getResponseHeader method.
        @method getResponseHeader
        @returns {string} The value returned by the wrapped object.
        */
        getResponseHeader : function (headerName) {
            return this.xhr.getResponseHeader(headerName);
        },

        /**
        Calls the underlying XHR's send method.
        @method send
        */
        send : function () {
            this.xhr.send(this.opt.content || null);
        }
    };
}()), //! @~class AjaxTransaction

/**
Creates an AjaxTransaction object, sends it and then returns it.

@method ajax
@param url The requested URL (required).
@param opt The options for the transaction.
@returns {AjaxTransaction} The newly created and sent AjaxTransaction.
*/
ajax : function (url, opt) {
    var ret = new zjs.AjaxTransaction(url, opt);
    ret.send();
    return ret;
}

}); //! @~namespace zjs
