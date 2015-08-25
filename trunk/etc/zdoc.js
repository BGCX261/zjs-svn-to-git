/*=============================================================================
    etc/zdoc.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/

/*
@param cfg
@{
    @. files
    @. force {bool}
    @. format {string}
    @. output
    @. verbosity
@}
*/
$namespace("zdoc", {

run : function (cfg) {

    function outDirStale (dir) {
        mkdirs(dir);

        if (!cfg.force) {
            var oldFiles = cfg.files.outOfDateDir(dir);
            if (!oldFiles)
                return false;
        }

        return true;
    }

    function outFileStale (ofn) {
        var dir = ofn.substring(0, ofn.lastIndexOf(kSlash));
        mkdirs(dir);

        if (!cfg.force) {
            var oldFiles = cfg.files.outOfDateFile(ofn);
            if (!oldFiles)
                return false;
        }

        return true;
    }

    var parser = new zdoc.Parser(cfg);
    parser.logger = new zutil.Logger({
            verbosity: cfg.verbosity || "quiet"
        });
    echo("verbosity="+cfg.verbosity);

    parser.logger.capture();

    var G = zdoc.formats[cfg.format];
    var gen = new G(parser);
    var ofn = cfg.output;

    if (gen.isSingleFile ? outFileStale(ofn) : outDirStale(ofn)) {
        echo("stale");
        gen.logger = parser.logger;

        //echo("outofdate=" + ofn);
        parser.readFiles(cfg.files);
        if (parser.errors)
            $throw("zdoc failed with " + parser.errors + " errors.");

        parser.zdoc.link();

        if (cfg.beforebuild)
            cfg.beforebuild();

        gen.generate(ofn);

        if (cfg.afterbuild)
            cfg.afterbuild();
    }

    parser.logger.release();
},

formats: {},

Doc : $class({
    ctor : function () {
        $super(arguments).call(this);

        this.files = new zjs.Bag({
            dupKeyMsg: "File already parsed",
            indexBy: "name"
        });

        this.modules = new zjs.Bag({
            dupKeyMsg: "Module already defined",
            indexBy: "name"
        });

        this.scopes = new zjs.Bag({
            indexBy: "fullName"
        });

        this.globalScope = new zdoc.Doc.Namespace("");
        this.globalScope.fullName = "";
        this.scopes.add(this.globalScope);
    },

    getBrief : function (obj) {
        if (obj.name)
            return "'@" + obj.tag + " " + obj.name + "'";

        return "@" + obj.tag;
    },

    link : function ()
    {
        this.modules.each(function (mod)
        {
            mod.link();
        });

        //this.scopes.each(function (sc)
        //{
        //    sc.link();
        //});
        this.globalScope.link();
    },

    Item : $class(
    {
        access: null,
        deprecated : false,
        descr : null,
        isStatic: false,
        pragma: null,
        shortDescr: null,
        since : null,

        ctor : function (descr)
        {
            if (descr)
                this.addComment(descr);
        },

        bad : function (part)
        {
            $panic("Cannot apply " + zdoc.Doc.getBrief(part) + " to " +
                    zdoc.Doc.getBrief(this));
        },

        add : function (item)
        {
            $panic("Cannot add " + zdoc.Doc.getBrief(item) + " to " +
                    zdoc.Doc.getBrief(this));
        },

        addComment : function (descr)
        {
            if (!descr || !descr.length)
                return;

            if (this.descr)
                this.shortDescr = this.descr;
            else
            {
                //echo("descr:" + JSON.stringify(descr));
                var line = descr[0];
                if (!line.verbatim)
                {
                    var t = line.text, k = t.indexOf(". ");
                    if (k > 0)
                        t = t.substring(0, k+1);
                    this.shortDescr = t;
                }
            }

            this.descr = descr;
        },

        addCtor : function (part)
        {
            this.bad(part);
        },

        addExtends : function (part)
        {
            this.bad(part);
        },

        addImplements : function (part)
        {
            this.bad(part);
        },

        addPragma : function (key, name, value)
        {
            if (!this.pragma)
                this.pragma = {};

            var map = this.pragma[key];
            if (!map)
                this.pragma[key] = map = {};
            map[name] = value;
            echo("key: " + key + ", name: " + name + ", value: " + value);
        },

        hasComment : function ()
        {
            return this.descr && this.descr.length;
        },

        setAccess : function (access)
        {
            if (this.access != access)
                this.access = access;
        },

        setDeprecated : function (part)
        {
            this.deprecated = part.name || true; // the version when deprecated
        },

        setSince : function (part)
        {
            this.since = part.name;
        },

        setStatic : function ()
        {
            this.isStatic = true;
        }
    }),

    NamedItem : $class("Item",
    {
        ctor : function (name, descr)
        {
            $super(arguments).call(this, descr);
            this.name = name;
        }
    }),

    Container : $class("NamedItem",
    {
        ctor : function (name, descr)
        {
            $super(arguments).call(this, name, descr);

            this.children = new zjs.Bag({indexBy: "name"});
        },

        add : function (item)
        {
            this.children.add(item);
            item.parent = this;
        },

        find : function (name)
        {
            return this.children.pk.find(name);
        },

        getByTag : function (tag)
        {
            var ret = [];
            this.children.each(function (c)
            {
                if (c.tag == tag)
                    ret.push(c);
            });
            if (ret.length === 0)
                return null;
            zutil.sortByName(ret);
            return ret;
        },

        getContentTypes : function ()
        {
            var types = {};
            this.children.each(function (c)
            {
                if (!(c.tag in types))
                    types[c.tag] = true;
            });
            return types;
        },

        link : function ()
        {
            this.children.each(function (c)
            {
                if (c.link)
                    c.link();
            });
        },

        resolve : function (name)
        {
            var path = (typeof(name) === "string") ? name.split('.') : name;

            var c = this.children.pk.find(path[0]);
            if (c)
            {
                for (var i = 1, n = path.length; c && i < n; ++i)
                    c = c.children.pk.find(path[i]);
            }
            else if (this.parent)
                c = this.parent.resolve(path);

            return c;
        }
    }),

    Namespace : $class("Container",
    {
        tag: "namespace",

        add : function (c)
        {
            if (c.tag === "namespace" && this.children.contains(c.name))
                $assert(this.children.get(c.name) === c);
            else
                $super(arguments).call(this, c);
        }
    }),

    Interface : $class("Container",
    {
        bases: new zjs.Bag(),

        tag: "interface",

        addExtends : function (part)
        {
            if (this.bases.empty())
                this.bases = new zjs.Bag();

            var base = part.name;
            if (!this.bases.contains(base))
                this.bases.add(base);
        },

        getBases : function ()
        {
            var n = this.bases.count();
            if (n > 1)
                return null;
            if (n === 0)
                return [];
            var base = this.bases.items[0];
            var ret = base.getBases();
            ret.push(base);
            return ret;
        },

        getSupers : function (supers)
        {
            supers = supers || new zjs.Bag({indexBy: "fullName"});

            this.bases.each(function (base)
            {
                if (supers.contains(base))
                    return;

                base.getSupers(supers);
                supers.add(base);
            });

            return supers;
        },

        link : function ()
        {
            $super(arguments).call(this);

            var bases = this.linkChildNames(this.bases);
            if (bases)
                this.bases = bases;
        },

        linkChildNames : function (kids)
        {
            if (kids.empty())
                return null;

            var ret = new zjs.Bag({indexBy: "fullName"});
            var scope = this.parent;
            kids.each(function (kid)
            {
                var t = $assert(scope.resolve(kid), "Cannot resolve: '", kid,
                                (scope.fullName ? ("' in " + scope.fullName) : "'"));

                if (!ret.contains(t))
                    ret.add(t);
            });

            return ret;
        }
    }),

    Class : $class("Interface",
    {
        interfaces: new zjs.Bag(),

        ctorFn: null,
        tag: "class",

        addImplements : function (part)
        {
            if (this.interfaces.empty())
                this.interfaces = new zjs.Bag();

            var intf = part.name;
            if (!this.interfaces.contains(intf))
                this.interfaces.add(intf);
        },

        getInterfaces : function (intfs)
        {
            intfs = intfs || new zjs.Bag({indexBy: "fullName"});

            this.bases.each(function (base)
            {
                base.getInterfaces(intfs);
            });

            this.interfaces.each(function (intf)
            {
                if (intfs.contains(intf))
                    return;
                intf.getSupers(intfs);
                intfs.add(intf);
            });

            return intfs;
        },

        link : function ()
        {
            $super(arguments).call(this);

            var intfs = this.linkChildNames(this.interfaces);
            if (intfs)
                this.interfaces = intfs;
        }
    }),

    Enum : $class("Container",
    {
        values : new zjs.Bag(),

        tag: "enum",

        addValue : function (c)
        {
            if (this.values.empty())
                this.values = new zjs.Bag({indexBy: "name"});

            this.values.add(c);
        }
    }),

    EnumValue : $class("Container",
    {
        tag: "value"
    }),

    File : $class("Container",
    {
        tag: "file"
    }),

    Module : $class("Container",
    {
        tag: "module",

        ctor : function (name, descr)
        {
            $super(arguments).call(this, name, descr);

            this.requires = new zjs.Bag();
        },

        addRequires : function (name)
        {
            if (!this.requires.contains(name))
                this.requires.add(name);
        },

        link : function ()
        {
            // TODO
        }
    }),

    //--

    DataItem : $class("Item",
    {
        type : null,

        ctor : function (type, descr)
        {
            $super(arguments).call(this, descr);

            if (type)
                this.type = type;
        }
    }),

    DataObject : $class("DataItem",
    {
        isFunction: false,
        members: null,        
        returns: null,
        "throws" : null,

        addMember : function (name, type, descr)
        {
            var T = this.isFunction ? zdoc.Doc.Param : zdoc.Doc.Prop;
            var mem = new T(name, type, descr);
            mem.parent = this;

            if (this.members)
                this.members.push(mem);
            else
                this.members = [mem];

            return mem;
        },

        getReturnType : function (defType)
        {
            var ret = this.returns ? (this.returns.type || defType) : "void";
            return ret;
        },

        setReturns : function (r)
        {
            $assert(this.isFunction, "Cannot use @returns here");
            $assert(!this.returns, "Cannot have multiple @returns");
            this.returns = r;
        },

        setThrows : function (t)
        {
            $assert(this.isFunction, "Cannot use @returns here");
            $assert(!this["throws"], "Cannot have multiple @throws");
            this["throws"] = t;
        }
    }),

    NamedDataItem : $class("DataItem",
    {
        ctor : function (name, type, descr)
        {
            $super(arguments).call(this, type, descr);

            this.name = name;
        }
    }),

    NamedDataObject : $class("DataObject",
    {
        isOptional: false,

        ctor : function (name, type, descr)
        {
            $super(arguments).call(this, type, descr);

            this.name = name;
        }
    }),

    Cfg : $class("NamedDataObject",
    {
        tag: "cfg"
    }),

    Event : $class("NamedDataObject",
    {
        tag: "event"
    }),

    Prop : $class("NamedDataObject",
    {
        tag: "prop"
    }),

    Var : $class("NamedDataObject",
    {
        tag: "var"
    }),

    //------------------------------------------------

    Param : $class("NamedDataObject",
    {
        tag: "param"
    }),

    Returns : $class("DataObject",
    {
        tag: "returns"
    }),

    Throws : $class("DataObject",
    {
        tag: "throws"
    }),

    Signature : $class("Item",
    {
        isFunction: true,
        members: null,
        returns: null,
        "throws" : null,

        addMember : function (name, type, descr)
        {
            var param = new zdoc.Doc.Param(name, type, descr);
            param.parent = this;

            if (this.members)
                this.members.push(param);
            else
                this.members = [param];

            return param;
        },

        getReturnType : function (defType)
        {
            var ret = this.returns ? (this.returns.type || defType) : "void";
            return ret;
        },

        setReturns : function (r)
        {
            $assert(!this.returns, "Cannot have multiple @returns");
            this.returns = r;
        },

        setThrows : function (t)
        {
            $assert(!this["throws"], "Cannot have multiple @throws");
            this["throws"] = t;
        }
    }),

    GenericMethodBase : $static(function (B, tag)
    {
        return $class(B,
        {
            isFunction: true,
            isOptional: false,
            tag: tag,

            ctor : function () // ?
            {
                this.signatures = [];
                $super(arguments).apply(this, arguments);
            },

            addComment : function (descr)
            {
                var sig = this.getSignature();

                if (sig.descr)
                    $super(arguments).call(this, descr);
                else
                    sig.addComment(descr);
            },

            addMember : function (name, type, descr)
            {
                var sig = this.getSignature();
                return sig.addMember(name, type, descr);
            },

            addSignature : function (descr)
            {
                var sig;
                this.signatures.push(sig = new zdoc.Doc.Signature(descr));
                sig.name = this.name;
                return sig;
            },

            getSignature : function ()
            {
                var sig, n = this.signatures.length;
                if (n > 0)
                    sig = this.signatures[n - 1];
                else
                    this.signatures.push(sig = new zdoc.Doc.Signature());

                return sig;
            },

            setAccess : function (access)
            {
                this.getSignature().setAccess(access);
            },

            setThrows : function (t)
            {
                this.getSignature().setThrows(t);
            }
        });
    })
}) // ZDoc

}); // zdoc

$mixin(zdoc.Doc, "",
{
    CtorBase : zdoc.Doc.GenericMethodBase(zdoc.Doc.Item, "ctor"),

    Ctor : $class("CtorBase",
    {
        name: "ctor"
    }),

    MethodBase : zdoc.Doc.GenericMethodBase(zdoc.Doc.NamedItem, "method"),

    Method : $class("MethodBase",
    {
        setReturns : function (r)
        {
            this.getSignature().setReturns(r);
        }
    })
});

//-----------------------------------------------------------------------------

/**
The Parser processes source files by extracting comment blocks that begin with
"/**" or "//!". Each of these discrete comment blocks are processed for tags and
basic text content.

Tags are lines that begin (give or take leading whitespace) with "@" and a word such
as "@foo". The tag in this case would be "foo". Some tags only have meaning to the
comment block in which they appear ("since"). These are called "block tags" and are
denoted with "(B)" below. Other tags establish a context that persists until another
occurance of the tag (e.g., "file" and "module"). These are called "context tags" and
are denoted by "(C)". Yet other tags for a nested scope by "pushing" themselves on the
top of a scope stack to be later removed by their corresponding end tag (e.g.,
"class"). These are called "scope tags" and are denoted by "(S)".

Many tags in ZDoc describe top-level Entities. See the list of tags for those that
correspond to entities. All comment blocks must contain one and only one entity tag.
The only exceptions to this are the entity close tags, which cannot occur with any
other tags in the same comment block.

ZDoc recognizes the following tags (entities are prefixed by "*"):

  * file (C) - This tag names the current file. This is often a relative path and not
            just a simple filename, e.g., "zjs/core.js". This tag must occur before
            items that are to be contained in the file. This is reset between source
            files.

  * module (C) - This tag names the current module. Modules are contained in files, and
            while typically one file contains only one module, it is valid to have
            multiple modules in a single file. This tag must occur before items that
            are to be contained in the module. This is reset between source files.

    requires - This tag names a module that is required by the current module.

    deprecated (B) - This tag marks the current method or class as deprecated. If this
            tag has a value, it is assumed to be the version number at which the
            deprecation was made. This tag can only be applied to the entity being
            documented in the current block.

    since (B) - This tag names the version at which an entity was first available.

  * namespace (S) -
  * var
    ~namespace

  * class (S) -
    extends (B) -
    implements (B) -
  * ctor
  * event
  * prop
    ~class

  * interface (S) -
    ~interface

  * method
    signature (B) -
    . (B) -
    returns (B) -
    throws (B) -

    ..


Future maybe: @object, @struct
*/
$namespace(zdoc, {

Parser : $class(function () {
// private

    var blankLineRegex      = /^\s*$/;
    // Finds doc comments beginning with /** or //!.
    var commentRegex        = /(?:\/\*\*((?:[^*]+|\*(?!\/))*)\*\/)|(?:\/\/\!(.*))/g;
    var splitLinesRegex     = /[\r\n]/g;
    var stripLinePrefix     = /((?:\s*\*)|(?:\s+))(?:.*)/;
    var trimLeftRegex       = /\s*(.*)/;
    var trimRightRegex      = /(.*)\s*/;
    var tagRegex            = /^\s*\@(\S+)\s*/;
    var tagOptNameRegex     = /^\s*\@(?:\S+)(?:\s+(\S+))?\s*/;
    var tagNameRegex        = /^\s*\@(?:\S+)\s+(\S+)\s*/;
    var tagTypeRegex        = /^\s*\@(?:\S+)(?:\s*\{\s*(\S+)\s*\})?\s*/;
    var tagNameTypeRegex    = /^\s*\@(?:\S+)\s+(\S+)(?:\s*\{\s*(\S+)\s*\})?\s*/;
    var verbatimBeginRegex  = /^\s*(?:([^:]+)\:)?\{\{\{\s*$/;
    var verbatimEndRegex    = /^\s*\}\}\}\s*$/;

    function calcLineNumber (text, regex, match, last)
    {
        var pos = last ? last.pos : 0;
        var line = last ? last.line : 1;

        for (var i = pos, n = regex.lastIndex - match[0].length; i < n; ++i)
        {
            var c = text[i];
            if (c == '\n')
            {
            }
            else if (c == '\r')
            {
                if (text[i+1] == '\n')
                    ++i;
            }
            else
                continue;
            ++line;
        }

        return {pos: i, line: line};
    }

    function TAG (hasType, hasName, isEntity, fname)
    {
        var ret = {fname: fname, isEntity: isEntity, optName: hasName < 0};

        if (hasType && hasName)
            zjs.copyProps(ret, {hasName: 1, hasType: 2, regex: tagNameTypeRegex});
        else if (hasType)
            zjs.copyProps(ret, {hasName: 0, hasType: 1, regex: tagTypeRegex});
        else if (hasName)
            zjs.copyProps(ret, {hasName: 1, hasType: 0,
                                 regex: ret.optName ? tagOptNameRegex : tagNameRegex});
        else
            zjs.copyProps(ret, {hasName: 0, hasType: 0});

        return ret;
    }

    var tags =
    {
        //              Type  Name Entity
        file         : TAG(0,  1,  1, "doFile"),
        module       : TAG(0,  1,  1, "doModule"),
        requires     : TAG(0,  1,  0, "doRequires"),

        deprecated   : TAG(0,  1,  0, "doDeprecated"),
        pragma       : TAG(1,  1,  0, "doPragma"),
        since        : TAG(0,  1,  0, "doSince"),

        namespace    : TAG(0,  1,  1, "doNamespace"),
        "var"        : TAG(1,  1,  1, "doVar"),
        "~namespace" : TAG(0, -1, -1, "doEndNamespace"),

        "class"      : TAG(0,  1,  1, "doClass"),
        "extends"    : TAG(0,  1,  0, "doExtends"),
        "implements" : TAG(0,  1,  0, "doImplements"),
        ctor         : TAG(0,  0,  1, "doCtor"),
        cfg          : TAG(1,  1,  1, "doCfg"),
        event        : TAG(1,  1,  1, "doEvent"),
        prop         : TAG(1,  1,  1, "doProp"),
        "~class"     : TAG(0, -1, -1, "doEndClass"),

        "interface"  : TAG(0,  1,  1, "doInterface"),
        "~interface" : TAG(0, -1, -1, "doEndInterface"),

        "enum"       : TAG(0,  1,  1, "doEnum"),
        "value"      : TAG(0,  1,  1, "doEnumValue"),
        "~enum"      : TAG(0, -1, -1, "doEndEnum"),

        method       : TAG(0,  1,  1, "doMethod"),
        returns      : TAG(1,  0,  0, "doReturns"),
        "throws"     : TAG(1,  0,  0, "doThrows"),

        "public"     : TAG(0,  0,  0, "doAccess"),
        "protected"  : TAG(0,  0,  0, "doAccess"),
        "private"    : TAG(0,  0,  0, "doAccess"),
        "static"     : TAG(0,  0,  0, "doStatic"),

        '{'          : TAG(0,  0,  0, "doOpen"),
        '}'          : TAG(0,  0,  0, "doClose"),
        '('          : TAG(0,  0,  0, "doOpen"),
        ')'          : TAG(0,  0,  0, "doClose"),
        '?'          : TAG(1,  1,  0, "doMember"),
        '.'          : TAG(1,  1,  0, "doMember")
    };

// public
return {

    tagAliases :
    {
        "end-class"     : "~class",
        "end-interface" : "~interface",
        "end-namespace" : "~namespace",
        "end-ns"        : "~namespace",
        "~ns"           : "~namespace",
        constructor     : "ctor",
        config          : "cfg",
        "function"      : "method",
        impl            : "implements",
        ns              : "namespace",
        param           : ".",
        "param?"        : "?",
        property        : "prop",
        "return"        : "returns",
        sig             : "signature",
        "throw"         : "throws",
        variable        : "var"
    },

    ctor : function (project)
    {
        $super(arguments).call(this, project);

        this.errors = 0;
        this.zdoc = new zdoc.Doc();
    },

    breakParts : function (cmt)
    {
        //echo("Comment: " + cmt);

        var lines = cmt.split(splitLinesRegex);
        if (lines.length > 0 && blankLineRegex.test(lines[0]))
            lines.shift();
        if (lines.length > 0 && blankLineRegex.test(lines[lines.length - 1]))
            lines.splice(lines.length - 1, 1);

        var stripPrefix = null, stripLen;
        var ret = [ ], verbatim = false, verbatimType = null;
        var buf = push({lines: []});
        var self = this;

        function append (s)
        {
            if (buf.lines.length == 0)
            {
                var tag, m = tagRegex.exec(s);
                if (m)
                {
                    if (m[1] in self.tagAliases)
                        buf.tag = self.tagAliases[m[1]];
                    else
                        buf.tag = m[1];

                    tag = tags[buf.tag];
                    if (!tag)
                        throw new Error("Invalid ZDoc tag '" + buf.tag + "'");

                    if (tag.regex)
                    {
                        m = tag.regex.exec(s);
                        $assert(m, "Tag syntax error: ", s);

                        if (tag.hasName)
                            buf.name = m[tag.hasName];
                        if (tag.hasType)
                            buf.type = m[tag.hasType];
                    }

                    s = s.substring(m[0].length);
                }
            }

            buf.lines.push({text: s, verbatim: verbatimType || verbatim});
        }

        function push (b)
        {
            var n = ret.length;
            if (n > 0)
            {
                var r = ret[n-1], k = r.lines.length;
                while (k > 0)
                {
                    if (r.lines[k-1].text)
                        break;
                    r.lines.splice(--k, 1);
                }

                if (k == 0 && !r.tag)
                    ret.splice(n-1, 1);
            }

            if (b)
                ret.push(b);
            return b;
        }

        for (var m, k = 0; k < lines.length; ++k)
        {
            if (k == 0)
            {
                m = stripLinePrefix.exec(lines[k]);
                if (m)
                {
                    stripPrefix = m[1];
                    stripLen = stripPrefix.length;
                }
            }

            var line = lines[k];
            if (stripPrefix && line.substring(0, stripLen) === stripPrefix)
                line = line.substring(stripLen);

            //echo("Line " + k + ": " + line);

            if (verbatim)
            {
                if (verbatimEndRegex.test(line))
                    verbatim = verbatimType = false;
                else
                    append(blankLineRegex.test(line) ? "" : line);
            }
            else if ((m = verbatimBeginRegex.exec(line)))
            {
                verbatim = true;
                verbatimType = m[1];
            }
            else
            {
                var n = buf.lines.length;
                var rm = trimLeftRegex.exec(line);
                var rhs = (rm && rm[1]) || "";

                if (tagRegex.test(rhs))
                {
                    //echo("Tag");
                    buf = push({lines: []});
                    append(rhs);
                }
                else if (n === 0 || buf.lines[n-1].verbatim)
                {
                    //echo("A");
                    if (rhs)
                        append(rhs);
                }
                else if (!rhs)
                {
                    //echo("B");
                    append("");
                }
                else
                {
                    //echo("D");
                    var lm = trimRightRegex.exec(buf.lines[n-1].text);
                    var lhs = (lm && lm[1]) || "";
                    buf.lines[n-1].text = lhs ? (lhs + " " + rhs) : rhs;
                }
            }
        }

        push(); // END

        return ret;
    },

    parseComment : function (cmt)
    {
        var parts = this.breakParts(cmt);

        /* diag
        echo("------------------------");
        var i = 0;
        $foreach(parts, function (p)
        {
            if (!p.tag)
                echo("Part " + i);
            else if (p.type)
                echo("Part " + i + " [" + p.tag + ":" + p.name + "] {" + p.type + "}");
            else if (p.name)
                echo("Part " + i + " [" + p.tag + ":" + p.name + "]");
            else
                echo("Part " + i + " [" + p.tag + "]");

            for (var j = 0; j < p.lines.length; ++j)
            {
                var line = p.lines[j];
                echo((line.verbatim ? ">" : " ") + j + "-" + line.text);
            }
        });
        /* end diag */

        $foreach(parts, function (part)
        {
            //echo("tag=" + part.tag + " line0=" + (part.lines[0] && part.lines[0].text));
            if (part.tag)
                this.processPart(part);
        }, this);
        $foreach(parts, function (part)
        {
            //echo("line0=" + (part.lines[0] && part.lines[0].text));
            if (!part.tag)
                $assert(this.curEntity, "No entity for comment").addComment(part.lines);
        }, this);

        this.resetBlockState();
    },

    parseFile : function (code, fileName, filePath)
    {
        this.resetFileState();
        if (fileName)
            this.setFile(fileName);

        var pos;

        for (var i = 1, m; (m = commentRegex.exec(code)); ++i)
        {
            var cmt = m[1] || m[2];
            //this.parseComment(cmt); // move parse here for debugging

            try {
                this.parseComment(cmt); // debug better w/o try/catch
            } catch (e) {
                pos = calcLineNumber(code, commentRegex, m, pos);
                this.logger.echo(filePath+":"+pos.line+": "+e.message);
                ++this.errors;
            }
        }

        this.resetFileState();
    },

    processPart : function (part)
    {
        var tag = $assert(tags[part.tag], "Invalid tag ", part.tag);
        var fn = $assert(this[tag.fname], "No function ", tag.fname);

        if (this.curEntity)
            $assert(!tag.isEntity, "Cannot combine @", this.curEntity.tag,
                        " ", this.curEntity.name, " w/@", part.tag, " ", part.name);

        fn.call(this, part);
    },

    readFiles : function (files)
    {
        for (files.rewind(); !files.atEnd(); )
        {
            var f = files.next();
            var js = readFile(f.fullPath);

            this.parseFile(js, f.relPath, f.fullPath);
        }
    },

    resetBlockState : function ()
    {
        this.curEntity =
        this.curMethod =
        this.curAggregate =
        this.curAggregatable =
        this.aggregateStack =
            null;
    },

    resetFileState : function ()
    {
        this.curFile = null;
        this.curModule = null;
        this.curScope = this.zdoc.globalScope;
        this.scopeStack = [ this.zdoc.globalScope ];
    },

    setFile : function (fileName)
    {
        //
    },

    //-------------------------------------------------------------------------

    makeScopedName : function (name)
    {
        var scope = this.curScope && this.curScope.fullName;

        return scope ? (scope + '.' + name) : name;
    },

    popScope : function (type, part)
    {
        var n = $assert(this.scopeStack.length, "Scope stack empty");
        var sc = this.scopeStack[n-1];

        $assert(sc.tag == type, "Cannot end @", type, " ", sc.name, " w/@", part.tag);

        if (part.name)
            $assert(sc.name == part.name, "Invalid end ", sc.tag, " ", part.name,
                    " (expected ", sc.name, ")");

        this.scopeStack.pop();
        this.curScope = (n > 1) ? this.scopeStack[n-2] : null;
    },

    pushScope : function (part)
    {
        var fullName = this.makeScopedName(part.name);
        var sc = this.zdoc.scopes.pk.find(fullName);

        if (sc)
            $assert(sc.tag == part.tag,
                    "Scope type mismatch (", sc.tag, " vs. ", part.tag, ")");
        else
        {
            var type = part.tag.capitalize(), T = zdoc.Doc[type];

            sc = new T(part.name);
            sc.fullName = fullName;
            sc.addComment(part.lines);
            sc.file = this.curFile;
            sc.module = this.curModule;

            this.zdoc.scopes.add(sc);
            this.curScope.add(sc);
        }

        this.scopeStack.push(sc);

        this.curEntity = this.curScope = sc;
    },

    //-------------------

    doFile : function (part)
    {
        this.curEntity = this.curFile = new zdoc.Doc.File(part.name);
        this.zdoc.files.add(this.curFile);
        this.curFile.addComment(part.lines);
    },

    doModule : function (part)
    {
        this.curEntity = this.curModule = new zdoc.Doc.Module(part.name);
        this.zdoc.modules.add(this.curModule);
        this.curModule.file = this.curFile;
        this.curModule.addComment(part.lines);
    },

    doRequires : function (part)
    {
        $assert(this.curModule, "Cannot use @requires without @module");
        this.curModule.addRequires(part.name);
    },

    //-------------------

    doDeprecated : function (part)
    {
        $assert(this.curEntity, "Invalid location for @deprecated");
        this.curEntity.setDeprecated(part);
    },

    doPragma : function (part)
    {
        $assert(this.curEntity, "Invalid location for @pragma");

        var n = part.type, i = n.indexOf('='), v = true;

        if (i > 0)
        {
            v = n.substring(i+1);
            n = n.substring(0, i);
        }

        this.curEntity.addPragma(part.name, n, v);
    },

    doSince : function (part)
    {
        $assert(this.curEntity, "Invalid location for @since");
        this.curEntity.setSince(part);
    },

    //-------------------

    doNamespace : function (part)
    {
        this.pushScope(part);
    },

    doVar : function (part)
    {
        $assert(this.curScope.tag === "namespace",
                "Use @var in @namespace not in @", this.curScope.tag);
        $assert(!this.curAggregate, "Cannot use @var here");
        var v = new zdoc.Doc.Var(part.name, part.type, part.lines);
        this.curScope.add(v);
        this.curAggregatable = this.curEntity = v;
    },

    doEndNamespace : function (part)
    {
        this.popScope("namespace", part);
    },

    //-------------------

    doClass : function (part)
    {
        this.pushScope(part);
    },

    doExtends : function (part)
    {
        this.curScope.addExtends(part);
    },

    doImplements : function (part)
    {
        this.curScope.addImplements(part);
    },

    doAccess : function (part)
    {
        $assert(this.curEntity, "Cannot use @", part.tag, " here");
        this.curEntity.setAccess(part.tag);
    },

    doCtor : function (part)
    {
        $assert(this.curScope.tag === "class", "Cannot use @ctor here");
        var ctor = this.curScope.ctorFn;
        if (!ctor)
            this.curScope.ctorFn = ctor = new zdoc.Doc.Ctor();

        ctor.addSignature(part.lines);

        this.curMethod = this.curAggregate = this.curEntity = ctor;
        this.aggregateStack = [ctor];
    },

    doCfg : function (part)
    {
        $assert(this.curScope.tag === "class" || this.curScope.tag === "interface",
            "Use @cfg in @class or @interface");
        $assert(!this.curAggregate, "Cannot use @cfg here");
        var cfg = new zdoc.Doc.Cfg(part.name, part.type, part.lines);
        this.curScope.add(cfg);
        this.curAggregatable = this.curEntity = cfg;
    },

    doEvent : function (part)
    {
        $assert(this.curScope.tag === "class" || this.curScope.tag === "interface",
            "Use @event in @class or @interface");
        $assert(!this.curAggregate, "Cannot use @event here");
        var ev = new zdoc.Doc.Event(part.name, part.type, part.lines);
        this.curScope.add(ev);
        this.curAggregatable = this.curAggregate = this.curEntity = ev;
        this.aggregateStack = [ev];
    },

    doProp : function (part)
    {
        $assert(this.curScope.tag === "class" || this.curScope.tag === "interface",
            "Use @prop in @class or @interface");
        $assert(!this.curAggregate, "Cannot use @prop here");
        var prop = new zdoc.Doc.Prop(part.name, part.type, part.lines);
        this.curScope.add(prop);
        this.curAggregatable = this.curEntity = prop;
    },

    doEndClass : function (part)
    {
        this.popScope("class", part);
    },

    //-------------------

    doInterface : function (part)
    {
        this.pushScope(part);
    },

    doEndInterface : function (part)
    {
        this.popScope("interface", part);
    },

    //-------------------

    doEnum : function (part)
    {
        this.pushScope(part);
    },

    doEnumValue : function (part)
    {
        $assert(this.curScope.tag === "enum", "Use @value in @enum");
        var val = new zdoc.Doc.EnumValue(part.name, part.type, part.lines);
        this.curEntity = val;
        this.curScope.addValue(val);
    },

    doEndEnum : function (part)
    {
        this.popScope("enum", part);
    },

    //-------------------

    doMethod : function (part)
    {
        var method = this.curScope.find(part.name);
        if (!method)
        {
            method = new zdoc.Doc.Method(part.name);
            method.fullName = this.makeScopedName(part.name);
            this.curScope.add(method);
        }

        method.addSignature(part.lines);
        this.curMethod = this.curAggregate = this.curEntity = method;
        method.file = this.curFile;
        method.module = this.curModule;
        this.aggregateStack = [method];
    },

    doReturns : function (part)
    {
        $assert(this.curAggregate && this.curAggregate.isFunction &&
                    this.curAggregate.tag !== "ctor",
                "Cannot use @returns here");

        var r = new zdoc.Doc.Returns(part.type, part.lines);
        this.curAggregate.setReturns(r);
        this.curAggregatable = r;
    },

    doStatic : function (part)
    {
        var ok = this.curEntity && (this.curEntity.tag === "method" ||
                                    this.curEntity.tag === "prop" ||
                                    this.curEntity.tag === "class");
        $assert(ok, "Cannot use @", part.tag, " here");
        this.curEntity.setStatic();
    },

    doThrows : function (part)
    {
        $assert(this.curAggregate && this.curAggregate.isFunction,
                "Cannot use @throws here");

        var t = new zdoc.Doc.Throws(part.type, part.lines);
        this.curAggregate.setThrows(t);
        this.curAggregatable = t;
    },

    //-------------------

    doOpen : function (part)
    {
        var agg = this.curAggregatable;
        $assert(agg, "Cannot use @", part.tag, " here");
        if (!this.aggregateStack)
            this.aggregateStack = [agg];
        else if (this.aggregateStack[this.aggregateStack.length - 1] !== agg)
            this.aggregateStack.push(agg);
        this.curAggregate = agg;
        this.curAggregatable = null;

        if (part.tag === '(')
            agg.isFunction = true;
    },

    doClose : function (part)
    {
        var agg = this.curAggregate;
        $assert(agg, "Cannot use @", part.tag, " here");
        var close = agg.isFunction ? ')' : '}';
        $assert(part.tag === close, "Expected @", close, " not @", part.tag);

        this.aggregateStack.pop();
        this.curAggregatable = null;
        var n = this.aggregateStack.length;
        this.curAggregate = n && this.aggregateStack[n-1];
    },

    doMember : function (part)
    {
        $assert(this.curAggregate, "Cannot use @", part.tag, " here");
        var mem = this.curAggregate.addMember(part.name, part.type, part.lines);
        this.curAggregatable = mem;
        if (part.tag === '?')
            mem.isOptional = true;
    }
};

}), // Parser

Doxml : $class(function ()
{
// private
    function getAttrs (item)
    {
        var attrs = { };

        if ("name" in item)
            attrs.name = item.name;
        if ("fullName" in item)
            attrs.fullname = item.fullName;
        if (item.deprecated)
            attrs.deprecated = item.deprecated;
        if (item.since)
            attrs.since = item.since;
        if (item.shortDescr)
        {
            var s = "";
            $foreach(item.shortDescr, function (line)
            {
                s += line.text;
            });
            if (s)
                attrs.descr = s;
        }
        if (item.access)
            attrs.access = item.access;
        if (item.type)
            attrs.type = item.type;

        return attrs;
    }

    function getMemberAttrs (mem)
    {
        var attrs = getAttrs(mem);
        if (mem.isOptional)
            attrs.optional = true;
        return attrs;
    }

    var langAlias =
    {
        js: "javascript"
    };

// public
return {
    isSingleFile: true,

    ctor : function (parser)
    {
        this.parser = parser;
        this.xml = new zutil.XmlDoc();
        this.xml.scope = this;
        this.zdoc = parser.zdoc;
    },

    genClassIntf : function (ci)
    {
        var content = ci.getContentTypes();

        this.xml.add(this.xml.tag(ci.tag, getAttrs(ci)),
            function ()
            {
                if (!ci.bases.empty())
                    this.xml.add("extends",
                        function ()
                        {
                            ci.bases.each(function (base)
                            {
                                this.xml.add(this.xml.tag(base.tag,
                                    {
                                        fullname: base.fullName,
                                        name: base.name
                                    }));
                            }, this);
                        });

                if (ci.tag === "class" && !ci.interfaces.empty())
                    this.xml.add("implements",
                        function ()
                        {
                            ci.interfaces.each(function (base)
                            {
                                this.xml.add(this.xml.tag("interface",
                                            {fullname: base.fullName}));
                            }, this);
                        });

                this.genComment(ci);
                this.genSub(ci, "class", content, this.genClassIntf);
                this.genSub(ci, "interface", content, this.genClassIntf);

                if (ci.ctorFn)
                    this.xml.add(this.xml.tag("ctor", getAttrs(ci.ctorFn)),
                        function ()
                        {
                            this.genSignatures(ci.ctorFn);
                        });

                this.genSub(ci, "cfg", content, this.genCfg);
                this.genSub(ci, "prop", content, this.genMember);
                this.genSub(ci, "method", content, this.genMethod);
                this.genSub(ci, "event", content, this.genEvent);
            });
    },

    genComment : function (item)
    {
        if (!item.hasComment())
            return;

        var lines = item.descr;
        this.xml.add("comment",
            function ()
            {
                for (var i = 0, n = lines.length; i < n; )
                {
                    var line = lines[i];

                    if (!line.verbatim)
                        this.xml.add("text",
                            function ()
                            {
                                for (; i < n && !(line = lines[i]).verbatim; ++i)
                                    this.xml.push(zjs.encodeXml(line.text));
                            });
                    else
                    {
                        var tag = "pre", lang = line.verbatim;
                        if (lang !== true)
                        {
                            if (lang in langAlias)
                                lang = langAlias[lang];
                            tag = this.xml.tag("code", {language: lang});
                        }

                        this.xml.add(tag,
                            function ()
                            {
                                this.xml.push("<![CDATA[");
                                for (; i < n && (line = lines[i]).verbatim; ++i)
                                    this.xml.push(line.text);
                                this.xml.push("]]>");
                            });
                    }
                }
            });
    },

    genCfg : function (cfg)
    {
        var tag = this.xml.tag(cfg.isFunction ? "function" : "property", getAttrs(cfg));

        this.xml.add(tag,
            function ()
            {
                this.genComment(cfg);
                this.genMembers(cfg);
            });
    },

    genEvent : function (ev)
    {
        this.xml.add(this.xml.tag("event", getAttrs(ev)),
            function ()
            {
                this.genComment(ev);
                this.genMembers(ev);
            });
    },

    genFile : function (f)
    {
        var t = this.xml.tag("file", getAttrs(f));

        if (!f.descr)
            this.xml.add(t);
        else
            this.xml.add(t,
                function ()
                {
                    this.genComment(f);
                });
    },

    genMember : function (mem, tag)
    {
        if (!tag)
        {
            if (mem.parent.isFunction)
                tag = mem.isFunction ? "function" : "param";
            else
                tag = mem.isFunction ? "method" : "property";

            tag = this.xml.tag(tag, getMemberAttrs(mem));
        }

        this.xml.add(tag,
            function ()
            {
                this.genComment(mem);
                this.genMembers(mem);
            });
    },

    genMembers : function (aggregate)
    {
        if (!aggregate.members || !aggregate.members.length)
            return;

        this.xml.add(aggregate.isFunction ? "params" : "members",
            function ()
            {
                $foreach(aggregate.members, function (mem)
                {
                    this.genMember(mem);
                }, this);
            });

        if (aggregate.isFunction)
        {
            this.genReturnsThrows(aggregate, "returns");
            this.genReturnsThrows(aggregate, "throws");
        }
    },

    genMethod : function (method)
    {
        this.xml.add(this.xml.tag("method", getAttrs(method)),
            function ()
            {
                this.genComment(method);
                this.genSignatures(method);
            });
    },

    genModule : function (m)
    {
        var t = this.xml.tag("module", getAttrs(m));

        if (!m.descr && m.requires.empty())
            this.xml.add(t);
        else
            this.xml.add(t,
                function ()
                {
                    if (!m.requires.empty())
                        this.xml.add("requires",
                            function ()
                            {
                                m.requires.each(function (r)
                                {
                                    this.xml.add(this.xml.tag("module", {name: r}));
                                }, this);
                            });

                    this.genComment(m);
                });
    },

    genNamespace : function (ns)
    {
        var content = ns.getContentTypes();

        this.xml.add(this.xml.tag("namespace", getAttrs(ns)),
            function ()
            {
                this.genSub(ns, "namespace", content, this.genNamespace);
                this.genSub(ns, "class", content, this.genClassIntf);
                this.genSub(ns, "interface", content, this.genClassIntf);
                this.genSub(ns, "method", content, this.genMethod);
                this.genSub(ns, "var", content, this.genMember);
            });
    },

    genReturnsThrows : function (fn, which)
    {
        var rt = fn[which];
        if (rt)
            this.genMember(rt, this.xml.tag(which, getAttrs(rt)));
    },

    genSignatures : function (method)
    {
        this.xml.add("signatures",
            function ()
            {
                $foreach(method.signatures, function (sig)
                {
                    this.xml.add(this.xml.tag("signature", getAttrs(sig)),
                        function ()
                        {
                            this.genComment(sig);
                            this.genMembers(sig);
                        });
                }, this);
            });
    },

    genSub : function (cont, type, content, per)
    {
        if (type in content)
            this.xml.add(zutil.plural(type),
                function ()
                {
                    cont.children.each(function (c)
                    {
                        if (c.tag === type)
                            per.call(this, c);
                    }, this);
                });
    },

    generate : function (out)
    {
        this.xml.add("doxml",
            function ()
            {
                if (!this.zdoc.files.empty())
                    this.xml.add("files",
                        function ()
                        {
                            this.zdoc.files.each(this.genFile, this);
                        });

                if (!this.zdoc.modules.empty())
                    this.xml.add("modules",
                        function ()
                        {
                            this.zdoc.modules.each(this.genModule, this);
                        });

                this.xml.add("namespaces",
                    function ()
                    {
                        this.genNamespace(this.zdoc.globalScope);
                    });
            });

        var s = this.xml.getText();
        this.writeFile(out, s);
    }
};

}()), // Doxml

WebHelp : $class(function ()
{
// private
    function getAttrs (item)
    {
        var attrs = { };

        if ("name" in item)
            attrs.name = item.name;
        if ("fullName" in item)
            attrs.fullname = item.fullName;
        if (item.deprecated)
            attrs.deprecated = item.deprecated;
        if (item.since)
            attrs.since = item.since;
        if (item.shortDescr)
        {
            var s = "";
            $foreach(item.shortDescr, function (line)
            {
                s += line.text;
            });
            if (s)
                attrs.descr = s;
        }
        if (item.access)
            attrs.access = item.access;
        if (item.type)
            attrs.type = item.type;

        return attrs;
    }

    function getMemberAttrs (mem)
    {
        var attrs = getAttrs(mem);
        if (mem.isOptional)
            attrs.optional = true;
        return attrs;
    }

    var langAlias =
    {
        js: "javascript"
    };

// public
return {
    isSingleFile: false,

    ctor : function (parser)
    {
        this.parser = parser;
        this.zdoc = parser.zdoc;
    },

    genClassIntf : function (ci)
    {
        var content = ci.getContentTypes();

        this.xml.add(this.xml.tag(ci.tag, getAttrs(ci)),
            function ()
            {
                if (!ci.bases.empty())
                    this.xml.add("extends",
                        function ()
                        {
                            ci.bases.each(function (base)
                            {
                                this.xml.add(this.xml.tag(base.tag,
                                    {
                                        fullname: base.fullName,
                                        name: base.name
                                    }));
                            }, this);
                        });

                if (ci.tag === "class" && !ci.interfaces.empty())
                    this.xml.add("implements",
                        function ()
                        {
                            ci.interfaces.each(function (base)
                            {
                                this.xml.add(this.xml.tag("interface",
                                            {fullname: base.fullName}));
                            }, this);
                        });

                this.genComment(ci);
                this.genSub(ci, "class", content, this.genClassIntf);
                this.genSub(ci, "interface", content, this.genClassIntf);

                if (ci.ctorFn)
                    this.xml.add(this.xml.tag("ctor", getAttrs(ci.ctorFn)),
                        function ()
                        {
                            this.genSignatures(ci.ctorFn);
                        });

                this.genSub(ci, "cfg", content, this.genCfg);
                this.genSub(ci, "prop", content, this.genMember);
                this.genSub(ci, "method", content, this.genMethod);
                this.genSub(ci, "event", content, this.genEvent);
            });
    },

    genComment : function (item)
    {
        if (!item.hasComment())
            return;

        var lines = item.descr;
        this.xml.add("comment",
            function ()
            {
                for (var i = 0, n = lines.length; i < n; )
                {
                    var line = lines[i];

                    if (!line.verbatim)
                        this.xml.add("text",
                            function ()
                            {
                                for (; i < n && !(line = lines[i]).verbatim; ++i)
                                    this.xml.push(zjs.encodeXml(line.text));
                            });
                    else
                    {
                        var tag = "pre", lang = line.verbatim;
                        if (lang !== true)
                        {
                            if (lang in langAlias)
                                lang = langAlias[lang];
                            tag = this.xml.tag("code", {language: lang});
                        }

                        this.xml.add(tag,
                            function ()
                            {
                                this.xml.push("<![CDATA[");
                                for (; i < n && (line = lines[i]).verbatim; ++i)
                                    this.xml.push(line.text);
                                this.xml.push("]]>");
                            });
                    }
                }
            });
    },

    genCfg : function (cfg)
    {
        var tag = this.xml.tag(cfg.isFunction ? "function" : "property", getAttrs(cfg));

        this.xml.add(tag,
            function ()
            {
                this.genComment(cfg);
                this.genMembers(cfg);
            });
    },

    genEvent : function (ev)
    {
        this.xml.add(this.xml.tag("event", getAttrs(ev)),
            function ()
            {
                this.genComment(ev);
                this.genMembers(ev);
            });
    },

    genFile : function (f)
    {
        var t = this.xml.tag("file", getAttrs(f));

        if (!f.descr)
            this.xml.add(t);
        else
            this.xml.add(t,
                function ()
                {
                    this.genComment(f);
                });
    },

    genMember : function (mem, tag)
    {
        if (!tag)
        {
            if (mem.parent.isFunction)
                tag = mem.isFunction ? "function" : "param";
            else
                tag = mem.isFunction ? "method" : "property";

            tag = this.xml.tag(tag, getMemberAttrs(mem));
        }

        this.xml.add(tag,
            function ()
            {
                this.genComment(mem);
                this.genMembers(mem);
            });
    },

    genMembers : function (aggregate)
    {
        if (!aggregate.members || !aggregate.members.length)
            return;

        this.xml.add(aggregate.isFunction ? "params" : "members",
            function ()
            {
                $foreach(aggregate.members, function (mem)
                {
                    this.genMember(mem);
                }, this);
            });

        if (aggregate.isFunction)
        {
            this.genReturnsThrows(aggregate, "returns");
            this.genReturnsThrows(aggregate, "throws");
        }
    },

    genMethod : function (method)
    {
        this.xml.add(this.xml.tag("method", getAttrs(method)),
            function ()
            {
                this.genComment(method);
                this.genSignatures(method);
            });
    },

    genModule : function (m)
    {
        var t = this.xml.tag("module", getAttrs(m));

        if (!m.descr && m.requires.empty())
            this.xml.add(t);
        else
            this.xml.add(t,
                function ()
                {
                    if (!m.requires.empty())
                        this.xml.add("requires",
                            function ()
                            {
                                m.requires.each(function (r)
                                {
                                    this.xml.add(this.xml.tag("module", {name: r}));
                                }, this);
                            });

                    this.genComment(m);
                });
    },

    genNamespace : function (ns)
    {
        var content = ns.getContentTypes();

        this.xml.add(this.xml.tag("namespace", getAttrs(ns)),
            function ()
            {
                this.genSub(ns, "namespace", content, this.genNamespace);
                this.genSub(ns, "class", content, this.genClassIntf);
                this.genSub(ns, "interface", content, this.genClassIntf);
                this.genSub(ns, "method", content, this.genMethod);
                this.genSub(ns, "var", content, this.genMember);
            });
    },

    genReturnsThrows : function (fn, which)
    {
        var rt = fn[which];
        if (rt)
            this.genMember(rt, this.xml.tag(which, getAttrs(rt)));
    },

    genSignatures : function (method)
    {
        this.xml.add("signatures",
            function ()
            {
                $foreach(method.signatures, function (sig)
                {
                    this.xml.add(this.xml.tag("signature", getAttrs(sig)),
                        function ()
                        {
                            this.genComment(sig);
                            this.genMembers(sig);
                        });
                }, this);
            });
    },

    genSub : function (cont, type, content, per)
    {
        if (type in content)
            this.xml.add(zutil.plural(type),
                function ()
                {
                    cont.children.each(function (c)
                    {
                        if (c.tag === type)
                            per.call(this, c);
                    }, this);
                });
    },

    buildHierarchy : function (item)
    {
        var hierarchy = {text: item.name, fullName: item.fullName, leaf: true};
        var children = [];

        item.children.each(function (c)
        {
            if (c.tag === "namespace")
                children.push(this.buildHierarchy(c));
        }, this);

        if (children.length)
        {
            // todo - sort
            hierarchy.children = children;
            delete hierarchy.leaf;
            children = [];
        }

        item.children.each(function (c)
        {
            if (c.tag === "class" || c.tag === "interface")
                children.push(this.buildHierarchy(c));
        }, this);

        if (children.length)
        {
            // todo - sort
            if (hierarchy.children)
                hierarchy.children = hierarchy.children.concat(children);
            else
                hierarchy.children = children;

            delete hierarchy.leaf;
        }

        return hierarchy;
    },

    generate : function (out)
    {
        this.outDir = out + '\\';


        var hierarchy = this.buildHierarchy(this.zdoc.globalScope);
        hierarchy.text = "Global scope";
        hierarchy.expanded = true;
        var s = "var hierarchy = " + JSON.stringify(hierarchy, null, "  ") + ";";
        writeFile(this.outDir + "hierarchy.js", s);
        /*
        this.xml.add("doxml",
            function ()
            {
                if (!this.zdoc.files.empty())
                    this.xml.add("files",
                        function ()
                        {
                            this.zdoc.files.each(this.genFile, this);
                        });

                if (!this.zdoc.modules.empty())
                    this.xml.add("modules",
                        function ()
                        {
                            this.zdoc.modules.each(this.genModule, this);
                        });

                this.xml.add("namespaces",
                    function ()
                    {
                        this.genNamespace(this.zdoc.globalScope);
                    });
            });*/

        //return this.xml.getText();
    }
};

}()), // WebHelp

Gwiki : $class(function ()
{
// private
    var blockBegin = "<blockquote>";
    var blockEnd = "</blockquote>"
    var dots = /\./g;
    var invalidNameChars = /[^A-Za-z0-9.]/g;

    var ATTR = zjs.encodeAttr;

    var HTML = function ()
    {
        var regexes =
            [
                /[&]/g, "`&`",
                /\</g, "`<`",
                /\>/g, "`>`"
            ];

        return function (s)
        {
            var r = s || "";
            var n = regexes.length;

            for (var i = 0; i < n; i += 2)
                r = r.replace(regexes[i], regexes[i+1]);

            return r;
        }
    }();

    function addBlankLine (out)
    {
        var n = out.length;
        if (n > 0 && out[n-1].length > 0)
            out.push("");
    }
    function addColor (clr, s)
    {
        return "<font color='" + clr + "'>" + s + "</font>";
    }

    function genSupers (out, supers, title)
    {
        if (!supers || supers.empty())
            return;

        var all = [];
        supers.each(function (sp)
        {
            all.push(makeBoldLink(sp.fullName));
        })
        out.push(title);
        out.push(blockBegin);
        out.push(all.join(", "));
        out.push(blockEnd);
    }

    function genSummary (out, item, text, inclFile)
    {
        out.push("#summary " + (text || item.name));

        if (item.file && inclFile)
            out.push(" * *File:* " + item.file.name);
        if (item.module && inclFile)
            out.push(" * *Module:* " + item.module.name);
        if (item.since)
            out.push(" * *Since:* " + item.since);
        if (item.deprecated)
            out.push(" * *"+addColor("red", "Deprecated: *" + item.deprecated));
    }

    function makeBoldLink (fullName, shortName)
    {
        var ret = '*' + makeLink(fullName, shortName) + '*';
        return ret;
    }

    function makeLink (fullName, shortName)
    {
        var ret, s = makeName(fullName);
        if (!shortName)
            shortName = fullName;

        if (s == shortName)
            ret = '[' + s + ']';
        else
            ret = '[' + s + ' ' + shortName + ']';

        return ret;
    }

    function makeName (fullName)
    {
        var ret = fullName.replace(invalidNameChars, '');
        ret = ret.replace(dots, '_');
        return ret;
    }

    function makeParams (sig, fancy)
    {
        var params = [];
        $foreach(sig.members, function (p)
        {
            var s = p.type ? p.type+' ' : (p.isFunction ? "Function " : "");
            s += p.name;
            if (fancy)
            {
                var title = p.shortDescr || "", tag = 'b';
                if (p.isOptional)
                {
                    tag = 'i';
                    title = "(Optional) " + title;
                }
                s = "<"+tag+" title=\""+ATTR(title)+"\">" + s + "</"+tag+">";
            }
            else if (p.isOptional)
                s += '?';

            params.push(s);
        });
        var ret = '(' + params.join(", ") + ')';
        return ret;
    }

    function makeTitle (s, level)
    {
        var markup = '=';

        while (markup.length < level)
            markup += '=';

        return markup + ' ' + HTML(s) + ' ' + markup;
    }

    function addLinks (out, title, items)
    {
        if (items.length === 0)
            return;
        addBlankLine(out);
        out.push(HTML(title), "");
        $foreach(items, function (item)
        {
            var s = makeBoldLink(item.fullName, item.name);
            if (item.since)
                s += " (since " + item.since + ")";
            if (item.deprecated)
                s += addColor("red", " (deprecated as of " + item.deprecated + ")");
            out.push(" * " + s);
        });
    }

    var trimRegex = /^\s*(\S*)\s*$/;
    function trim (s)
    {
        if (!s)
            return s;
        var m = trimRegex.exec(s);
        if (!m)
            return s;
        return m[1];
    }

// public
return {
    codeLang: "js",
    isSingleFile: false,
    unknownReturnType: "object",

    ctor : function (parser)
    {
        this.parser = parser;
        this.zdoc = parser.zdoc;
    },

    genClassIntf : function (ci)
    {
        var out = [];
        var heading = (ci.tag === "class") ? "Class " : "Interface ";

        this.logger.verbose("Generate " + heading + ci.fullName);
        genSummary(out, ci, ci.fullName, true);

        out.push(makeTitle(heading + ci.name));

        var bases = ci.getBases();
        if (bases && bases.length)
        {
            var indent = "", vline;
            $foreach(bases, function (b)
            {
                if (!vline)
                    vline = " <tt>|<br/>";
                else
                {
                    out.push(vline);
                    vline = ' ' + vline;
                }

                out.push(indent + makeBoldLink(b.fullName));

                if (indent)
                    indent = ' ' + indent;
                else
                    indent = " +--</tt> ";
            });
            out.push(vline);
            out.push(indent + '*' + ci.fullName + "*");
        }
        else
            genSupers(out, ci.getSupers(), makeTitle("Base classes"));

        if (ci.getInterfaces)
        {
            addBlankLine(out);
            genSupers(out, ci.getInterfaces(), makeTitle("Implemented Interfaces",2));
        }

        out.push("----");
        this.genComment(out, ci);

        if (ci.since)
            out.push(makeTitle("Since", 3), blockBegin, ci.since, blockEnd);
        // TODO - See Also

        var ctor = ci.ctorFn && [ci.ctorFn];

        this.genSub(out, ci, "cfg", "Config Properties", this.genCfg, true);
        this.genSub(out, ci, "prop", "Properties", this.genProp, true);
        this.genSubItems(out, ctor, "Constructor Summary", this.genMethodSummary, true);
        this.genSub(out, ci, "method", "Method Summary", this.genMethodSummary, true);
        this.genSubItems(out, ctor, "Constructor Details", this.genMethodDetails, false);
        this.genSub(out, ci, "method", "Method Details", this.genMethodDetails, false);
        this.genSub(out, ci, "event", "Events", this.genEvent, true);

        this.writeLines(makeName(ci.fullName) + ".wiki", out);
    },

    genComment : function (out, item, title)
    {
        if (!item.hasComment())
            return;

        if (title)
        {
            this.logger.verbose("Generate comment " + title);
            out.push(makeTitle(title));
            addBlankLine(out);
        }
        else if (item.descr)
            this.logger.verbose("Generate comment: " + item.descr[0].text);
        else
            this.logger.verbose("Generate comment: null");

        var lines = item.descr;
        for (var i = 0, n = lines.length; i < n; )
        {
            var line = lines[i];
            var s = "";

            if (!line.verbatim)
            {
                s = trim(line.text);
                ++i;
                if (s)
                    out.push("<p>" + HTML(s) + "</p>");
            }
            else
            {
                var open = "<pre>", close = "</pre>", type = line.verbatim;
                if (type !== true)
                {
                    open = "<code language=\"" + type + "\">";
                    close = "</code>";
                }

                out.push(open);
                for (; i < n && (line = lines[i]).verbatim === type; ++i)
                    out.push(HTML(line.text));
                out[out.length - 1] += close;
            }
        }

        this.logger.verbose("Done generating comment");
    },

    genCfg : function (out, cfg)
    {
        out.push("<tr valign='top'>",
                 "<td><p><b>"+cfg.name+"</b></p></td>",
                 "<td>");

        this.genMember(out, cfg);
        out.push("</td></tr>");
    },

    genEvent : function (out, event)
    {
        out.push("<tr valign='top'>",
                 "<td><p><b>"+event.name+"</b></p></td>",
                 "<td>");

        this.genMember(out, event);
        out.push("</td></tr>");
    },

    genMember : function (out, mem)
    {
        if (mem.isFunction)
        {
            var parts = [];
            if (mem.access)
                parts.push(mem.access);
            if (mem.isStatic)
                parts.push("static");
            parts.push(mem.getReturnType(this.unknownReturnType));
            parts.push(mem.name);
            parts.push(makeParams(mem, false));

            out.push("<code language='"+this.codeLang+"'>"+parts.join(' ')+"</code>");

            out.push(blockBegin);
            this.genComment(out, mem);

            if (mem.members && mem.members.length)
                this.genMembers(out, mem);

            this.genReturnsThrows(out, mem, "returns");
            this.genReturnsThrows(out, mem, "throws");
            out.push(blockEnd);
        }
        else
        {
            this.genComment(out, mem);
            if (mem.members && mem.members.length)
                this.genMembers(out, mem);
        }
    },

    genMembers : function (out, agg)
    {
        if (agg.isFunction)
            out.push("<b>Parameters:</b><br/><ol>");
        else
            out.push("<b>Members:</b><br/><ul>");

        $foreach(agg.members, function (p)
        {
            var s = p.name;
            if (p.type)
                s += " : " + p.type;
            else if (p.isFunction)
                s += " : Function";

            if (p.isOptional)
                s += " <i>(optional)</i>";

            out.push("<li>" + s);
            this.genMember(out, p);
            out.push("</li>");
        }, this);

        out.push(agg.isFunction ? "</ol>" : "</ul>");
    },

    genMethodDetails : function (out, method)
    {
        $foreach(method.signatures, function (sig, etc)
        {
            if (etc.index)
                out.push("<hr/>");

            out.push(makeTitle(method.name, 3));

            this.genMember(out, sig);

        }, this);
    },

    genMethodSummary : function (out, method)
    {
        $foreach(method.signatures, function (sig, etc)
        {
            var href = method.name;
            var ret = sig.getReturnType(this.unknownReturnType);
            var params = makeParams(sig, true);

            out.push("<tr valign='top'>",
                     "<td><b>"+ret+"</b></td>",
                     "<td><b>[#"+href+" "+method.name+"]</b> "+params+"<br/>"+
                         HTML(sig.shortDescr)+"</td>",
                     "</tr>");
        }, this);
    },

    genNamespace : function (ns)
    {
        this.logger.verbose("Generate namespace " + ns.fullName);

        var classes = [], interfaces = [], functions = [], namespaces = [];

        ns.children.each(function (c)
        {
            switch (c.tag)
            {
                case "namespace":
                    namespaces.push(c);
                    this.genNamespace(c);
                    return;
                case "class":
                    classes.push(c);
                    this.genClassIntf(c);
                    break;
                case "interface":
                    interfaces.push(c);
                    this.genClassIntf(c);
                    break;
                case "method":
                    functions.push(c);
                    break;
            }
        }, this);

        var name = ns.fullName ? ("Namespace " + ns.fullName) : "Global";
        var lines = [];
        genSummary(lines, ns, name, false);
        this.genComment(lines, ns, "Description");

        zutil.sortByName(namespaces);
        zutil.sortByName(classes);
        zutil.sortByName(interfaces);

        addLinks(lines, makeTitle("Namespaces", 2), namespaces);
        addLinks(lines, makeTitle("Classes", 2), classes);
        addLinks(lines, makeTitle("Interfaces", 2), interfaces);
        //addLinks(lines, makeTitle("Functions", 2), functions);

        this.genSub(lines, ns, "method", "Method Summary", this.genMethodSummary, true);
        this.genSub(lines, ns, "method", "Method Details", this.genMethodDetails, false);
        this.genSub(lines, ns, "var", "Variables", this.genVar, true);

        var s = ns.fullName || "global";
        writeFile(this.outDir + s.replace(/\./g, "_") + ".wiki", lines.join("\n"));
    },

    genProp : function (out, prop)
    {
        out.push("<tr valign='top'>",
                 "<td><p><b>"+prop.name+"</b></p></td>",
                 "<td>");

        this.genMember(out, prop);
        out.push("</td></tr>");
    },

    genReturnsThrows : function (out, fn, which)
    {
        var rt = fn[which];
        if (!rt)
            return;

        out.push("<br/><b>"+which.capitalize()+":</b><br/><blockquote>");
        this.genMember(out, rt);
        out.push("</blockquote>");
    },

    genSub : function (out, parent, type, title, method, table)
    {
        var items = parent.getByTag(type);
        if (items)
            this.genSubItems(out, items, title, method, table);
    },

    genSubItems : function (out, items, title, method, table)
    {
        if (!items || !items.length)
            return;

        out.push("----");
        out.push(makeTitle(title, 2));

        if (table)
            out.push("<table border='1' cellspacing='0' cellpadding='2' width='100%'>");

        $foreach(items, function (c)
        {
            method.call(this, out, c);
        }, this);

        if (table)
            out.push("</table>");
    },

    genVar : function (out, prop)
    {
        out.push("<tr valign='top'>",
                 "<td><p><b>"+prop.name+"</b></p></td>",
                 "<td>");

        this.genMember(out, prop);
        out.push("</td></tr>");
    },

    generate : function (out)
    {
        this.outDir = out + '\\';
        this.logger.quiet("Generate " + out);

        this.genNamespace(this.zdoc.globalScope);
        // TODO - files
        // TODO - modules
    },

    writeLines : function (name, lines)
    {
        var s = this.outDir + name;
        this.logger.verbose("Writing " + name + " to " + this.outDir);
        writeFile(s, lines.join("\n"));
    }
};

}()) // Gwiki

}); // zdoc

zdoc.formats.doxml = zdoc.Doxml;
zdoc.formats.gwiki = zdoc.Gwiki;
zdoc.formats.webhelp = zdoc.WebHelp;
