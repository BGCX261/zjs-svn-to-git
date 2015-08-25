/*=============================================================================
    test/faux-browser.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/

function faux ()
{
    importPackage(java.lang);
    importPackage(java.io);

    window = function () { return this; }();

    window.alert = function (msg) {
        System.out.println("[ALERT] " + msg);
    };

    window.console = {
        debug : function (msg) { System.out.println("[DEBUG] " + msg) },
        error : function (msg) { System.out.println("[ERROR] " + msg) },
        info : function (msg) { System.out.println("[INFO] " + msg) }
    };

    function Node (tagName)
    {
        this.childNodes = [];
        this.tagName = tagName;
    }

    function strNode (indent, node)
    {
        var s = "";
        for (var n in node)
            if (node.hasOwnProperty(n) && n != "childNodes" && n != "tagName" &&
                    !(node[n] instanceof Node))
                s += " " + n + "=\"" + node[n] + "\"";

        s = indent + "<" + node.tagName + s;

        if (node.childNodes.length == 0)
            s += "/>";
        else
        {
            s += ">\n";
            var indent2 = indent + "   ";

            for (var i = 0; i < node.childNodes.length; ++i)
                s += strNode(indent2, node.childNodes[i]) + "\n";

            s += indent + "</" + node.tagName + ">";
        }

        return s;
    }

    Node.prototype =
    {
        appendChild : function (el)
        {
            if (el.parentNode)
                el.parentNode.removeChild(el);

            this.childNodes.push(el);
            el.parentNode = this;
        },

        removeChild : function (el)
        {
            if (el.parentNode === this)
                for (var i = 0; i < this.childNodes.length; ++i)
                {
                    if (el !== this.childNodes[i])
                        return;

                    this.childNodes.splice(i, 1);
                    el.parentNode = null;
                    break;
                }

            return el;
        },

        toString : function ()
        {
            return strNode("", this);
        }
    };

    function findElem (el, id)
    {
        if (el.id === id)
            return el;

        for (var i = 0; i < el.childNodes.length; ++i)
        {
            var c = findElem(el.childNodes[i], id);
            if (c != null)
                return c;
        }

        return null;
    }

    function Doc ()
    {
        this.body = new Node("body");
        this.head = new Node("head");
    }
    Doc.prototype =
    {
        createElement : function (tagName)
        {
            return new Node(tagName);
        },

        getElementById : function (id)
        {
            return findElem(this.body, id);
        },

        toString : function ()
        {
            return "<html>" + this.head + this.body + "</html>";
        }
    };

    document = new Doc();

    /*var el = document.createElement("div");
    el.id = "hey";
    el.foo = "foobar";
    document.body.appendChild(el);
    alert("doc: " + document);
    var el2 = document.getElementById(el.id);
    alert("el2.foo: " + el2.foo);*/

    navigator =
    {
        userAgent : "Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.9.0.5) Gecko/2008120122 Firefox/3.0.5"
    };
}

if (typeof(alert) == "undefined")
    faux();
