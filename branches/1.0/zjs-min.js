
function $panic(msg)
{if(!console)
alert("PANIC: "+msg);else
{console.error("PANIC: "+msg);if(console.open)
console.open();}}
function $namespace(ns,sub,add)
{if(typeof(ns)=="string")
{add=sub;sub=ns;ns=$namespace.global;}
else if(typeof(sub)!="string")
{add=sub;sub=null;}
var parts=sub?sub.split("."):[];for(var i=0;i<parts.length;++i)
{var s=parts[i],fn=ns.$meta.fullname;if(!ns[s])
ns.$meta.subNamespaces.push(ns[s]={$meta:{subNamespaces:[],name:s,namespace:ns,fullname:fn?(fn+"."+s):s}});ns=ns[s];}
if(add)
for(var name in add)
{var v=add[name];if(ns[name])
$panic("Namespace "+ns.$meta.fullname+" conflict with '"+name+"'");ns[name]=v;if(v instanceof Function)
v.name=name;if(v&&v.$namespaceConnect)
v.$namespaceConnect(ns,name);}}
$namespace.global=function(){return this;}();var $meta={fullname:"",name:"",namespace:null,subNamespaces:[]};$namespace("zjs",{addMeta:function(obj,meta)
{zjs.copyProps(zjs.getMeta(obj),meta);return obj;},arrayCat:function()
{var ret=new Array(zjs.arrayLen.apply(null,arguments));for(var i=0,k=0;i<arguments.length;++i)
for(var a=arguments[i],n=(a?a.length:0),j=0;j<n;++j)
ret[k++]=a[j];return ret;},arrayLen:function()
{var ret=0;for(var a,i=0;i<arguments.length;++i)
if(a=arguments[i])
ret+=a.length;return ret;},copyProps:function(to,from)
{for(var s in from)
to[s]=from[s];},getMeta:function(obj)
{var ret=obj.$meta;if(!ret)
obj.$meta=ret=(obj.$metaInit?obj.$metaInit():{});return ret;}});zjs.copyProps(Function.prototype,{$metaInit:function()
{var name=this.name||this.toString().match(/function\s*(\w*)/)[1];name=name||"~anonymous~";return{fullname:name,name:name};},$namespaceConnect:function(ns,name)
{var fn=ns.$meta.fullname?(ns.$meta.fullname+"."+name):name;zjs.addMeta(this,{fullname:fn,name:name,namespace:ns});},getFullName:function()
{var meta=zjs.getMeta(this),s=meta.fullname;if(meta.target)
s+="~"+(meta.binding||"")+">"+meta.target.getFullName();return s;},getName:function()
{return zjs.getMeta(this).name;},bind:function(obj)
{var method=this;var f=function(){return method.apply(obj,arguments);}
return zjs.addMeta(f,{binding:"bind",target:method});},bind2:function(obj)
{var method=this;var f=function(){var args=zjs.arrayCat([this],arguments);return method.apply(obj,args);};return zjs.addMeta(f,{binding:"bind2",target:method});},head:function()
{var method=this,first=zjs.arrayCat(arguments);var f=function(){var args=zjs.arrayCat(first,arguments);return method.apply(this,args);};return zjs.addMeta(f,{binding:"head",target:method});},tail:function()
{var method=this,last=zjs.arrayCat(arguments);var f=function(){var args=zjs.arrayCat(arguments,last);return method.apply(this,args);};return zjs.addMeta(f,{binding:"tail",target:method});},returns:function(ret)
{var method=this;var f=function(){method.apply(this,arguments);return ret;};return zjs.addMeta(f,{binding:"returns",target:method});},seal:function()
{var method=this;var f=function(){return method();};return zjs.addMeta(f,{binding:"seal",target:method});}});zjs.copyProps(String.prototype,{capitalize:function()
{return this.charAt(0).toUpperCase()+this.substring(1);},camelize:function(splitChar)
{var parts=this.split(splitChar||"-"),ret=parts[0];for(var i=1,n=parts.length;i<n;++i)
ret+=parts[i].capitalize();return ret;},endsWith:function(s)
{return(this.length>=s.length)&&this.right(s.length)==s;},equalsIgnoreCase:function(s)
{return this.toLowerCase()==s.toLowerCase();},left:function(n)
{return this.substring(Math.min(n,this.length));},right:function(n)
{var k=this.length;return this.substring(k-Math.min(n,k));},startsWith:function(s)
{return(this.length>=s.length)&&this.left(s.length)==s;}});function $class(base,members)
{var klass=function(marker)
{if(marker===$class.marker)
return;var ctor=this.ctor;if(ctor)
ctor.apply(this,arguments);}
klass.$meta={$super:null};klass.$namespaceConnect=$class.namespaceConnect;if(arguments.length==1)
members=base;else if(base)
{klass.prototype=new base($class.marker);klass.$meta.$super=base;}
$mixin(klass,undefined,members);return $class.finish(klass);}
$class.marker={};$class.finish=function(klass)
{return $mixin(klass,undefined,{getClass:function(){return klass;}});}
$class.connectMethods=function(klass,scope)
{for(var name in scope)
{var member=scope[name];if(member instanceof Function)
if(zjs.getMeta(member).$class===klass)
member.$namespaceConnect(klass,name);}}
$class.namespaceConnect=function(ns,name)
{Function.prototype.$namespaceConnect.call(this,ns,name);$class.connectMethods(this,this);$class.connectMethods(this,this.prototype);}
function $mixin(klass,tag,members)
{var suffix=tag?("("+tag+")"):null;for(var name in members)
{var mem=members[name],isStatic=mem&&(mem.$static===$class.marker);if(isStatic)
mem=mem.value;else
isStatic=mem&&mem.$meta&&(mem.$meta.$super!==undefined);var scope=isStatic?klass:klass.prototype;if(mem instanceof Function)
if($mixin.func(klass,scope,mem,isStatic,name,suffix))
continue;scope[name]=mem;}
return klass;}
$mixin.func=function(klass,scope,mem,isStatic,name,suffix)
{zjs.addMeta(mem,{$class:klass,$static:isStatic,name:name});var meta=mem.$meta,mp=meta.priority=(meta.priority||0);if(suffix)
{mem.$namespaceConnect(klass,name);meta.fullname+=suffix;var cn,cm,cur=scope[name],GM=zjs.getMeta;if(cur&&(cm=GM(cur)).priority<=mp)
meta.callNext=cur;else if(cur)
{while(cm.callNext&&(cn=GM(cm.callNext)).priority>mp)
cm=cn;meta.callNext=cm.callNext;cm.callNext=mem;return true;}}
return false;}
function $priority(pr,fn)
{if(fn.$static===$class.marker)
fn=fn.value;if(fn instanceof Function)
zjs.addMeta(fn,{priority:pr});else
$panic("Invalid arg");return fn;}
function $static(member)
{return{$static:$class.marker,value:member};}
function $super(args,that,params)
{if(arguments.length<1||arguments.length>3)
$panic("Bad call to $super");var c,GM=zjs.getMeta,fm=GM(args.callee),sup=fm.callNext;if(!sup&&(c=GM(fm.$class).$super))
{if(!fm.$static)
sup=c.prototype[fm.name];else
for(;!sup;c=GM(c).$super)
sup=c[fm.name];}
var fn=sup||$super.none;return(arguments.length==1)?fn:fn.apply(that,params||args);}
$super.none=function(){}
function $using()
{var ret="";for(var i=0,n=arguments.length;i<n;++i)
{var sym=arguments[i];if(sym.$meta&&sym.$meta.subNamespaces)
{var fn=sym.$meta.fullname;for(var name in sym)
if(name!="$meta")
ret+="var "+name+" = "+fn+"."+name+";";}
else if(sym.$meta&&sym.$meta.namespace)
ret+="var "+sym.$meta.name+" = "+sym.$meta.fullname+";";}
return ret;}