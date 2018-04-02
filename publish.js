/*global env: true */
'use strict';

var doop = require('jsdoc/util/doop');
var fs = require('jsdoc/fs');
var helper = require('jsdoc/util/templateHelper');
var logger = require('jsdoc/util/logger');
var path = require('jsdoc/path');
var taffy = require('taffydb').taffy;
var template = require('jsdoc/template');
var util = require('util');

var htmlsafe = helper.htmlsafe;
var resolveAuthorLinks = helper.resolveAuthorLinks;
var scopeToPunc = helper.scopeToPunc;
var hasOwnProp = Object.prototype.hasOwnProperty;

//get template config
var CONFIG = env && env.conf && env.conf.docplus || {};


//LINKTO METHODS
var customLinkTo = function(longname, linkText, cssClass, fragmentId){

  var link = helper.linkto(longname, linkText, cssClass, fragmentId);
  //strips "module:" preffix in generated links text
  //this way we also strip preffixes in array like formats
  //p.e. Array.<module:myType>
  //it fails for nested modules....
  //p.e. module:MyModule.module:MySubModule
  link = link.replace('>module:','>');
  
  return link;
}
var linkto = customLinkTo;
var linktoTutorial = function(longName, name) {
    return tutoriallink(name);
}
function tutoriallink(tutorial) {
    return helper.toTutorial(tutorial, null, { tag: 'em', classname: 'disabled', prefix: 'Tutorial: ' });
}
var linktoExternal = function(longName, name) {
    return linkto(longName, name.replace(/(^"|"$)/g, ''));
}



var data;
var view;

var outdir = path.normalize(env.opts.destination);

function find(spec) {
    return helper.find(data, spec);
}


function getAncestorLinks(doclet) {
    return helper.getAncestorLinks(data, doclet);
}

function hashToLink(doclet, hash) {
    if ( !/^(#.+)/.test(hash) ) { return hash; }

    var url = helper.createLink(doclet);

    url = url.replace(/(#.+|$)/, hash);
    return '<a href="' + url + '">' + hash + '</a>';
}



/*

  SIGNATURE BUILDING
  ------------------


  better aproach...
   
  function addSignature(f) {
    
    f.signature = {
      params = getSignatureParams(),
      attribs = getSignatureAttribs(),
      returns = getSignatureReturns(),
    }
    
  }
  
  function getSignatureParams(f) {
    var params = f.params ? addParamAttributes(f.params) : [];
    return params.join(', ');
  }
  
  ...


*/

function needsSignature(doclet) {
    var needsSig = false;

    // function and class definitions always get a signature
    if (doclet.kind === 'function' || doclet.kind === 'class' || doclet.kind === 'event') {
        needsSig = true;
    }
    // typedefs that contain functions get a signature, too
    else if (doclet.kind === 'typedef' && doclet.type && doclet.type.names &&
        doclet.type.names.length) {
        for (var i = 0, l = doclet.type.names.length; i < l; i++) {
            if (doclet.type.names[i].toLowerCase() === 'function') {
                needsSig = true;
                break;
            }
        }
    }

    return needsSig;
}

function getSignatureAttributes(item) {
    var attributes = [];

    if (item.optional) {
        attributes.push('opt');
    }

    if (item.nullable === true) {
        attributes.push('nullable');
    }
    else if (item.nullable === false) {
        attributes.push('non-null');
    }

    return attributes;
}

function updateItemName(item) {
    var attributes = getSignatureAttributes(item);
    var itemName = item.name || '';

    if (item.variable) {
        itemName = '&hellip;' + itemName;
    }

    /*
    if (attributes && attributes.length) {
        itemName = util.format( '%s<span class="attributes__>%s</span>', itemName,
            attributes.join(', ') );
    }
    */
    
    if (attributes && attributes.length && attributes[0] === 'opt')
      itemName = util.format('[%s]', itemName);


    return itemName;
}

function addParamAttributes(params) {
    return params.filter(function(param) {
        return param.name && param.name.indexOf('.') === -1;
    }).map(updateItemName);
}

function buildItemTypeStrings(item) {
  
  var types = [];
  
  if (item && item.type && item.type.names) {
    item.type.names.forEach(function(name){
      types.push(linkto(name, htmlsafe(name)));
    });
  }
  
  return types;
  
}

function buildAttribsString(attribs) {
    var attribsString = '';

    if (attribs && attribs.length) {
        attribsString = htmlsafe( util.format('(%s) ', attribs.join(', ')) );
    }

    return attribsString;
}

function addNonParamAttributes(items) {
    var types = [];

    items.forEach(function(item) {
        types = types.concat( buildItemTypeStrings(item) );
    });

    return types;
}

function addSignatureParams(f) {
    var params = f.params ? addParamAttributes(f.params) : [];
    f.signature = util.format( '%s<span class="par">(</span>%s<span class="par">)</span>', (f.signature || ''), params.join(', ') );
}

function addSignatureReturns(f) {
    var attribs = [];
    var attribsString = '';
    var returnTypes = [];
    var returnTypesString = '';

    // jam all the return-type attributes into an array. this could create odd results (for example,
    // if there are both nullable and non-nullable return types), but let's assume that most people
    // who use multiple @return tags aren't using Closure Compiler type annotations, and vice-versa.
    if (f.returns) {
        f.returns.forEach(function(item) {
            helper.getAttribs(item).forEach(function(attrib) {
                if (attribs.indexOf(attrib) === -1) {
                    attribs.push(attrib);
                }
            });
        });

        attribsString = buildAttribsString(attribs);
    }

    if (f.returns) {
        returnTypes = addNonParamAttributes(f.returns);
    }
    if (returnTypes.length) {
        returnTypesString = util.format( ' &rarr; %s{%s}', attribsString, returnTypes.join('|') );
    }

    f.signature = '<span class="signature__params">' + (f.signature || '') + '</span>' +
        '<span class="signature__returns">' + returnTypesString + '</span>';
}

function addSignatureTypes(f) {
    var types = f.type ? buildItemTypeStrings(f) : [];

    f.signature = (f.signature || '') + '<span class="signature__types">' +
        (types.length ? ':' + types.join('|') : '') + '</span>';
}

function addAttribs(f) {
    var attribs = helper.getAttribs(f);
    var attribsString = buildAttribsString(attribs);

    f.attribs = util.format('<span class="signature__attribs">%s</span>', attribsString);
    f.attribsList = attribs;
}

function addClassName(f) {
    
    var str = '';

    //adds attribute based classes
    var attribs = helper.getAttribs(f);
    for (var i = 0, len = attribs.length; i < len; i++)
        str+=' --is-'+attribs[i];

    //inherited?
    if (f.inherited) str+= ' --is-inherited';

    //mixed?
    if (f.mixed) str += ' --is-mixed';

    
    //add className property to doclet
    f.className = str;

    //console.log(f);
    //console.log('-----------------------');
}



/* PATH HANDLING */

function shortenPaths(files, commonPrefix) {
  Object.keys(files).forEach(function(file) {
      files[file].shortened = files[file].resolved.replace(commonPrefix, '')
          // always use forward slashes
          .replace(/\\/g, '/');
  });
  return files;
}

function getPathFromDoclet(doclet) {
  
  if (!doclet.meta)
    return null;
    
  return doclet.meta.path && doclet.meta.path !== 'null' ?
    path.join(doclet.meta.path, doclet.meta.filename) :
    doclet.meta.filename;
}



/* FILES GENERATION */

function generate(title, doc, filename, resolveLinks) {
    resolveLinks = resolveLinks === false ? false : true;

    var docData = {
        kind: doc.kind,
        title: title,
        doc: doc || {},
    };

    //console.log(docData);
    var outpath = path.join(outdir, filename),
        //html = view.render('container.tmpl', docData);
        html = view.partial('layout.tmpl', docData);
        
    if (resolveLinks) {
        html = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>
    }

    fs.writeFileSync(outpath, html, 'utf8');
}

function generateSourceFiles(sourceFiles, sourceFilePaths, encoding) {
    encoding = encoding || 'utf8';
    var commonPrefix = path.commonPrefix(sourceFilePaths);
    Object.keys(sourceFiles).forEach(function(file) {
        var source;
        // links are keyed to the shortened path in each doclet's `meta.shortpath` property
        var sourceOutfile = helper.getUniqueFilename(sourceFiles[file].shortened);
        helper.registerLink(sourceFiles[file].shortened, sourceOutfile);
        

        try {
            source = {
                kind: 'source',
                url: sourceFiles[file].resolved.replace(commonPrefix, ''),
                code: helper.htmlsafe( fs.readFileSync(sourceFiles[file].resolved, encoding) )
            };
        }
        catch(e) {
            logger.error('Error while generating source file %s: %s', file, e.message);
        }

        generate(sourceFiles[file].shortened, source, sourceOutfile, false);
    });
}

/**
 * Look for classes or functions with the same name as modules (which indicates that the module
 * exports only that class or function), then attach the classes or functions to the `module`
 * property of the appropriate module doclets. The name of each class or function is also updated
 * for display purposes. This function mutates the original arrays.
 *
 * @private
 * @param {Array.<module:jsdoc/doclet.Doclet>} doclets - The array of classes and functions to
 * check.
 * @param {Array.<module:jsdoc/doclet.Doclet>} modules - The array of module doclets to search.
 */
function attachModuleSymbols(doclets, modules) {
    var symbols = {};

    // build a lookup table
    doclets.forEach(function(symbol) {
        symbols[symbol.longname] = symbols[symbol.longname] || [];
        symbols[symbol.longname].push(symbol);
    });

    return modules.map(function(module) {
        if (symbols[module.longname]) {
            module.modules = symbols[module.longname]
                // Only show symbols that have a description. Make an exception for classes, because
                // we want to show the constructor-signature heading no matter what.
                .filter(function(symbol) {
                    return symbol.description || symbol.kind === 'class';
                })
                .map(function(symbol) {
                    symbol = doop(symbol);

                    if (symbol.kind === 'class' || symbol.kind === 'function') {
                        symbol.name = symbol.name.replace('module:', '(require("') + '"))';
                    }

                    return symbol;
                });
        }
    });
}

function buildNavItem(item, linkTo){

  var navRecursion = CONFIG.navRecursion[item.kind] || [];

  var children = [];

  
  if(item.kind==='tutorial'){
    
    children = item.children;
    children = children.map(function(t){ t.kind = 'tutorial'; return t });
    
  }
  else{
  
    for (var i=0; i<navRecursion.length;i++){
      
      var kind = navRecursion[i];
      var items = find({kind:kind, memberof: item.longname});
        
      if(items.length)
        Array.prototype.push.apply(children, items);
      
    }
    
  }
  
  for (var c=0; c<children.length; c++){
    children[c] = buildNavItem(children[c], linkTo);
  }
  
  return {
    kind: item.kind,
    link: linkTo(item.longname,item.name),
    children: children
  }
  
}

function buildNavSection(id, items, itemHeading, linkTo) {
  
  //nothing to build...
  if(!items || !items.length) return;
  
  //exclude non-root items
  //exclude namespace memberof namespace...
  //exclude module memberof module...
  items = items.filter((m)=>{
    if(!m.memberof) return true;
    var parents = find({ 'kind':m.kind, 'longname': m.memberof });
    return !parents.length;
  });

  var children = [];

  items.forEach(function(item) {
    children.push(buildNavItem(item, linkTo));
  });
  
  //nothing found...
  if(!children.length) return;

  return {
    id: id,
    heading: (id==='globals')? linkTo('global', itemHeading) : itemHeading,
    children: children
  }
  
}


/**
 * Create the navigation sidebar.
 * @param {object} members The members that will be used to create the sidebar.
 * @param {array<object>} members.classes
 * @param {array<object>} members.externals
 * @param {array<object>} members.globals
 * @param {array<object>} members.mixins
 * @param {array<object>} members.modules
 * @param {array<object>} members.namespaces
 * @param {array<object>} members.tutorials
 * @param {array<object>} members.events
 * @param {array<object>} members.interfaces
 * @return {string} The HTML for the navigation sidebar.
 */

function buildNav(members) {
  
  var sections = CONFIG.navSections || [];
  
  var nodes = [];

  for(var i=0; i<sections.length;i++){
    
    var node;
    var section = sections[i];
    var sectionId = section.id;
    var sectionTitle = section.title;
    var sectionMembers = members[sectionId];
    
    if(sectionId === 'index'){
      
      nodes.push({
        'id': 'index',
        'heading': '<a href="index.html">'+ sectionTitle +'</a>'
      });
      
    }
    else if(sectionId === 'tutorials'){
      
      if(sectionMembers){
        sectionMembers = sectionMembers.map(function(t){ t.kind = 'tutorial'; return t });
        node = buildNavSection(sectionId, sectionMembers, sectionTitle, linktoTutorial);
        if(node) nodes.push(node);
      }
      
    }
    else{
      
      if(sectionMembers){
        node = buildNavSection(sectionId, sectionMembers, sectionTitle, linkto);
        if(node) nodes.push(node);
      }
      
    }

  }
  
  //render template
  var html = view.partial('nav-menu.tmpl', {
    nodes: nodes,
    view: view
  });
  
  return html;
  
}

/**
    @param {TAFFY} taffyData See <http://taffydb.com/>.
    @param {object} opts
    @param {Tutorial} tutorials
 */
exports.publish = function(taffyData, opts, tutorials) {
  
    data = taffyData;

    var conf = env.conf.templates || {};
    conf.default = conf.default || {};

    var templatePath = path.normalize(opts.template);
    view = new template.Template( path.join(templatePath, 'tmpl') );

    // claim some special filenames in advance, so the All-Powerful Overseer of Filename Uniqueness
    // doesn't try to hand them out later
    var indexUrl = helper.getUniqueFilename('index');
    // don't call registerLink() on this one! 'index' is also a valid longname

    var globalUrl = helper.getUniqueFilename('global');
    helper.registerLink('global', globalUrl);

    // set up templating
    view.layout = conf.default.layoutFile ?
        path.getResourcePath(path.dirname(conf.default.layoutFile),
            path.basename(conf.default.layoutFile) ) :
        'layout.tmpl';

    // set up tutorials for helper
    helper.setTutorials(tutorials);

    data = helper.prune(data);

    //sort doclets
    if (CONFIG.sort !== false)
      data.sort('longname, version, since');
      
      
    helper.addEventListeners(data);

    var sourceFiles = {};
    var sourceFilePaths = [];
    data().each(function(doclet) {
         
         addClassName(doclet);
         
         doclet.attribs = '';

        if (doclet.examples) {
            doclet.examples = doclet.examples.map(function(example) {
                var caption, code;

                if (example.match(/^\s*<caption>([\s\S]+?)<\/caption>(\s*[\n\r])([\s\S]+)$/i)) {
                    caption = RegExp.$1;
                    code = RegExp.$3;
                }

                return {
                    caption: caption || '',
                    code: code || example
                };
            });
        }
        if (doclet.see) {
            doclet.see.forEach(function(seeItem, i) {
                doclet.see[i] = hashToLink(doclet, seeItem);
            });
        }

        // build a list of source files
        var sourcePath;
        if (doclet.meta) {
            sourcePath = getPathFromDoclet(doclet);
            sourceFiles[sourcePath] = {
                resolved: sourcePath,
                shortened: null
            };
            if (sourceFilePaths.indexOf(sourcePath) === -1) {
                sourceFilePaths.push(sourcePath);
            }
        }
    });

    // update outdir if necessary, then create outdir
    var packageInfo = ( find({kind: 'package'}) || [] ) [0];
    if (packageInfo && packageInfo.name) {
        outdir = path.join( outdir, packageInfo.name, (packageInfo.version || '') );
    }
    fs.mkPath(outdir);

    // copy the template's static files to outdir
    var fromDir = path.join(templatePath, 'static');
    var staticFiles = fs.ls(fromDir, 3);

    staticFiles.forEach(function(fileName) {
        var toDir = fs.toDir( fileName.replace(fromDir, outdir) );
        fs.mkPath(toDir);
        fs.copyFileSync(fileName, toDir);
    });

    // copy user-specified static files to outdir
    var staticFilePaths;
    var staticFileFilter;
    var staticFileScanner;
    if (conf.default.staticFiles) {
        // The canonical property name is `include`. We accept `paths` for backwards compatibility
        // with a bug in JSDoc 3.2.x.
        staticFilePaths = conf.default.staticFiles.include ||
            conf.default.staticFiles.paths ||
            [];
        staticFileFilter = new (require('jsdoc/src/filter')).Filter(conf.default.staticFiles);
        staticFileScanner = new (require('jsdoc/src/scanner')).Scanner();

        staticFilePaths.forEach(function(filePath) {
            var extraStaticFiles = staticFileScanner.scan([filePath], 10, staticFileFilter);

            extraStaticFiles.forEach(function(fileName) {
                var sourcePath = fs.toDir(filePath);
                var toDir = fs.toDir( fileName.replace(sourcePath, outdir) );
                fs.mkPath(toDir);
                fs.copyFileSync(fileName, toDir);
            });
        });
    }

    if (sourceFilePaths.length) {
        sourceFiles = shortenPaths( sourceFiles, path.commonPrefix(sourceFilePaths) );
    }
    data().each(function(doclet) {
        var url = helper.createLink(doclet);
        helper.registerLink(doclet.longname, url);

        // add a shortened version of the full path
        var docletPath;
        if (doclet.meta) {
            docletPath = getPathFromDoclet(doclet);
            docletPath = sourceFiles[docletPath].shortened;
            if (docletPath) {
                doclet.meta.shortpath = docletPath;
            }
        }
    });

    data().each(function(doclet) {
        var url = helper.longnameToUrl[doclet.longname];

        if (url.indexOf('#') > -1) {
            doclet.id = helper.longnameToUrl[doclet.longname].split(/#/).pop();
        }
        else {
            doclet.id = doclet.name;
        }

        if ( needsSignature(doclet) ) {
            addSignatureParams(doclet);
            addSignatureReturns(doclet);
            addAttribs(doclet);
        }
    });

    // do this after the urls have all been generated
    data().each(function(doclet) {
        doclet.ancestors = getAncestorLinks(doclet);

        if (doclet.kind === 'member') {
            addSignatureTypes(doclet);
            addAttribs(doclet);
        }

        if (doclet.kind === 'constant') {
            addSignatureTypes(doclet);
            addAttribs(doclet);
            doclet.kind = 'member';
        }
    });

    var members = helper.getMembers(data);
    members.tutorials = tutorials.children;

    // output pretty-printed source files by default
    var outputSourceFiles = conf.default && conf.default.outputSourceFiles !== false
        ? true
        : false;

    // add template helpers
    view.find = find;
    view.linkto = linkto;
    view.resolveAuthorLinks = resolveAuthorLinks;
    view.tutoriallink = tutoriallink;
    view.htmlsafe = htmlsafe;
    view.outputSourceFiles = outputSourceFiles;

    // once for all
    view.nav = buildNav(members);
    attachModuleSymbols( find({ longname: {left: 'module:'} }), members.modules );

    // generate the pretty-printed source files first so other pages can link to them
    if (outputSourceFiles) {
        generateSourceFiles(sourceFiles, sourceFilePaths, opts.encoding);
    }

    if (members.globals.length) {
        generate('Global', {kind: 'globalobj', doc: members.globals}, globalUrl);
    }

    // index page displays information from package.json and lists files
    var files = find({kind: 'file'});
    var packages = find({kind: 'package'});

    generate('Home', {
      kind: 'mainpage',
      readme: opts.readme,
      longname: (opts.mainpagetitle) ? opts.mainpagetitle : 'Main Page'
    },indexUrl);


    // set up the lists that we'll use to generate pages
    var classes = taffy(members.classes);
    var modules = taffy(members.modules);
    var namespaces = taffy(members.namespaces);
    var mixins = taffy(members.mixins);
    var externals = taffy(members.externals);
    var interfaces = taffy(members.interfaces);

    //console.log(helper.longnameToUrl);
    //console.log('.......................');
    var longNames = Object.keys(helper.longnameToUrl);
    //console.log(longNames);

    Object.keys(helper.longnameToUrl).forEach(function(longname) {
        var myModules = helper.find(modules, {longname: longname});
        if (myModules.length) {
            generate(myModules[0].name, myModules[0], helper.longnameToUrl[longname]);
        }

        var myClasses = helper.find(classes, {longname: longname});
        if (myClasses.length) {
            generate(myClasses[0].name, myClasses[0], helper.longnameToUrl[longname]);
        }

        var myNamespaces = helper.find(namespaces, {longname: longname});
        if (myNamespaces.length) {
            generate(myNamespaces[0].name, myNamespaces[0], helper.longnameToUrl[longname]);
        }

        var myMixins = helper.find(mixins, {longname: longname});
        if (myMixins.length) {
            generate(myMixins[0].name, myMixins[0], helper.longnameToUrl[longname]);
        }

        var myExternals = helper.find(externals, {longname: longname});
        if (myExternals.length) {
            generate(myExternals[0].name, myExternals[0], helper.longnameToUrl[longname]);
        }

        var myInterfaces = helper.find(interfaces, {longname: longname});
        if (myInterfaces.length) {
            generate(myInterfaces[0].name, myInterfaces[0], helper.longnameToUrl[longname]);
        }
    });

    // TODO: move the tutorial functions to templateHelper.js
    function generateTutorial(title, tutorial, filename) {
        var tutorialData = {
            kind: 'tutorial',
            title: tutorial.title,
            content: tutorial.parse(),
            children: tutorial.children
        };

        var tutorialPath = path.join(outdir, filename);
        //var html = view.render('tutorial.tmpl', tutorialData);
        var html = view.partial('layout.tmpl', tutorialData);

        // yes, you can use {@link} in tutorials too!
        html = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>
        fs.writeFileSync(tutorialPath, html, 'utf8');
    }

    // tutorials can have only one parent so there is no risk for loops
    function saveChildren(node) {
      node.children.forEach(function(child) {
        generateTutorial('Tutorial: ' + child.title, child, helper.tutorialToUrl(child.name));
        saveChildren(child);
      });
    }

    saveChildren(tutorials);
};