# SMX template for JSDoc 3

- [SMX](https://github.com/canvasplay/SMX)
- [SMX API Documentation](http://canvasplay.github.io/SMX/)

## Installation

Install the template using NPM:

```bash
npm install smx-jsdoc-template --save-dev
```

## Usage

If you already have JSDoc system, you can use this project as JSDoc template. More information about JSDoc command-line arguments can be found [here](http://usejsdoc.org/about-commandline.html).
 
```bash
jsdoc -c conf.json -R README.md
```

### conf.json

Customize your docs output under the `templates` object in your jsdoc `conf.json`. Notice the `"template"` field for setting the path to **smx-jsdoc-template**.

There are also two additional objects for customizing the content on the sidebar navigation menu.
`NavSections` determines wich section the menu will show, and `navRecursion` resolve tree item contents by kind. Only first level items are initially visible, but using the serach form will reveal them if the search matches the items' names.

Bonus tip. The template has some keyboard shortcuts, the `s` key will focus the search input and `ESC` will clear the search.

```json
"templates": {
    "applicationName": "Demo",
    "disqus": "",
    "googleAnalytics": "",
    "openGraph": {
        "title": "",
        "type": "website",
        "image": "",
        "site_name": "",
        "url": ""
    },
    "meta": {
        "title": "",
        "description": "",
        "keyword": ""
    },
    "linenums": true,
    "source": {
        "include": [
            "./src/"
        ],
        "includePattern": ".+\\.js(doc)?$",
        "excludePattern": "(^|\\/|\\\\)_"
    },
    "opts": {
        "encoding": "utf8",
        "recurse": true,
        "private": false,
        "lenient": true,
        "destination": "./docs",
        "template": "./node_modules/smx-jsdoc-template"
    },
    "navRecursion": {
      "global": ["module", "class", "mixin", "member", "function", "event", "typedef"],
      "namespace": ["member", "function", "event", "typedef"],
      "module": ["module", "class", "mixin", "member", "function", "event", "typedef"],
      "class": ["member", "function", "event", "typedef"],
      "mixin": ["member", "function", "event", "typedef"]
    },
    "navSections":[
      {
        "id": "index",
        "title": "Home"
      },
      {
        "id": "tutorials",
        "title": "Tutorials"
      },
      {
        "id": "namespaces",
        "title": "Namespaces"
      },
      {
        "id": "classes",
        "title": "Classes"
      },
      {
        "id": "modules",
        "title": "Modules"
      },
      {
        "id": "globals",
        "title": "Global"
      }
    ]
    
}
```

## License

This project is under the MIT License. And this project was inspired by by default template for JSDoc 3 and docdash.